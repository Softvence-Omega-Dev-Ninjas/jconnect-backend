import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AppError } from 'src/common/error/handle-error.app';
import {
    successResponse,
    TResponse,
} from 'src/common/utilsResponse/response.util';
import { MailService } from 'src/lib/mail/mail.service';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { UtilsService } from 'src/lib/utils/utils.service';

import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from '../dto/register.dto';

import { UserResponseDto } from '@common/enum/dto/user.response';
import { HandleError } from 'src/common/error/handle-error.decorator';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { ResetPasswordAuthDto } from '../dto/reset-password';
import { VerifyOtpAuthDto } from '../dto/varify-otp.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly utils: UtilsService,
        private readonly mail: MailService,
        private readonly jwt: JwtService,
    ) { }

    // ---------- REGISTER (send email verification OTP) ----------
    @HandleError('Failed to Register profile', 'Register ')
    async register(payload: RegisterDto) {
        const { email, password, full_name } = payload;



        // Check if user already exists
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new AppError(400, 'User already exists with this email');
        }

        // Hash the password
        const hashedPassword = await this.utils.hash(password);

        // Generate OTP
        const { otp, expiryTime } = this.utils.generateOtpAndExpiry();

        // Create new user with OTP
        const newUser = await this.prisma.user.create({
            data: {
                email,
                full_name: full_name,
                password: hashedPassword,
                isVerified: false,
                emailOtp: otp,
                otpExpiresAt: expiryTime,
            },
        });
        console.log('the new user', newUser);

        // Send OTP email
        await this.mail.sendEmail(
            email,
            'Verify Your Email',
            `
      <h3>Hi ${full_name},</h3>
      <p>Use the OTP below to verify your email:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
    `,
        );

        // Generate JWT token for verification
        const jwtPayload = { id: newUser.id };
        const resetToken = await this.jwt.signAsync(jwtPayload, {
            expiresIn: '10m',
        });

        return { resetToken };
    }

    // ---------- LOGIN (require verified) ----------
    @HandleError('Failed to Login profile', 'Login ')
    async login(dto: LoginDto): Promise<TResponse<any>> {
        const { email, password } = dto;

        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new AppError(404, 'User not found');

        if (!user.isVerified)
            throw new AppError(400, 'Please verify your email first');

        if (!user.password)
            throw new AppError(400, 'No password set for this account');

        const isMatch = await this.utils.compare(password, user.password);
        if (!isMatch) throw new AppError(400, 'Invalid credentials');

        // Update last login timestamp
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                last_login_at: new Date(),
                isLogin: true
            },
        });

        const token = this.utils.generateToken({
            sub: user.id,
            email: user.email,
            roles: user.role as any,
        });

        const safeUser = this.utils.sanitizedResponse(UserResponseDto, user);

        return successResponse({ token, user: safeUser }, 'Login successful');
    }

    // ---------- FORGOT PASSWORD ----------
    @HandleError('Failed to process forgot password', 'ForgotPassword')
    async forgetPassword(payload: ForgotPasswordDto) {
        const { email } = payload;

        // Find user by email
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new NotFoundException('User does not exist!');
        }

        // Generate OTP
        const { otp, expiryTime } = this.utils.generateOtpAndExpiry();

        // Store OTP and expiry in user record
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailOtp: otp,
                otpExpiresAt: expiryTime, // Fixed: use otpExpiresAt instead of otpExpiry
            },
        });

        // Send OTP email
        await this.mail.sendEmail(
            email,
            'Reset Your Password',
            `
      <h3>Hi ${user.full_name || 'there'},</h3>
      <p>Use the OTP below to reset your password:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
    `,
        );

        // Generate JWT token for verification
        const jwtPayload = { id: user.id };
        const resetToken = await this.jwt.signAsync(jwtPayload, {
            expiresIn: '10m',
        });

        return { resetToken };
    }

    // ---------- VERIFY OTP (for signup) ----------
    @HandleError('Failed to verify OTP', 'VerifyOTP')
    async verifyOtp(payload: VerifyOtpAuthDto) {
        // Verify the JWT token
        let decoded: any;
        try {
            decoded = await this.jwt.verifyAsync(payload.resetToken);
        } catch (err) {
            throw new ForbiddenException('Invalid or expired token!');
        }

        // Find user by ID from the token
        const user = await this.prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user) {
            throw new ForbiddenException('User not found!');
        }

        // Check if OTP has expired
        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            throw new ForbiddenException('OTP has expired!');
        }

        // Check OTP match
        if (user.emailOtp !== parseInt(payload.emailOtp)) {
            throw new ForbiddenException('OTP does not match!');
        }

        // Clear OTP and expiry, mark as verified
        const updatedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailOtp: null,
                otpExpiresAt: null, // Fixed: use otpExpiresAt instead of otpExpiry
                isVerified: true,
            },
        });

        // Generate a new JWT token for authentication
        const token = await this.jwt.signAsync(
            { id: user.id, email: user.email, roles: user.role },
            { secret: process.env.JWT_SECRET, expiresIn: '77d' },
        );

        const safeUser = this.utils.sanitizedResponse(UserResponseDto, updatedUser);

        return {
            success: true,
            message: 'OTP verified successfully',
            data: {
                token,
                user: safeUser,
            },
        };
    }

    // ---------- VERIFY OTP (for password reset) ----------
    @HandleError('Failed to verify reset OTP', 'ResetVerifyOTP')
    async resetverifyOtp(payload: VerifyOtpAuthDto) {
        // Verify the JWT token
        let decoded: any;
        try {
            decoded = await this.jwt.verifyAsync(payload.resetToken);
        } catch (err) {
            throw new ForbiddenException('Invalid or expired token!');
        }

        // Find user by ID from the token
        const user = await this.prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user) {
            throw new ForbiddenException('User not found!');
        }

        // Check if OTP has expired
        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            throw new ForbiddenException('OTP has expired!');
        }

        // Check OTP match
        if (user.emailOtp !== parseInt(payload.emailOtp)) {
            throw new ForbiddenException('OTP does not match!');
        }

        // Clear OTP and expiry
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailOtp: null,
                otpExpiresAt: null,
            },
        });

        // Generate a new JWT token for password reset
        const jwtPayload = { id: user.id };
        const resetToken = await this.jwt.signAsync(jwtPayload, {
            expiresIn: '10m',
        });

        return { resetToken };
    }

    // ---------- RESET PASSWORD ----------
    @HandleError('Failed to reset password', 'ResetPassword')
    async resetPassword(payload: ResetPasswordAuthDto) {
        // Verify token
        let decoded: any;
        try {
            decoded = await this.jwt.verifyAsync(payload.resetToken);
        } catch (err) {
            throw new ForbiddenException('Invalid or expired token!');
        }

        // Find user by ID
        const user = await this.prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user) {
            throw new NotFoundException('User not found!');
        }

        // Hash new password
        const hashedPassword = await this.utils.hash(payload.password);

        // Update user password
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        return { message: 'Password reset successfully' };
    }
}