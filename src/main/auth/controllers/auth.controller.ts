import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleLoginDto } from '../dto/google-login.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../services/auth.service';

import { VerifyOtpAuthDto } from '../dto/varify-otp.dto';

import type { Response } from 'express';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordAuthDto } from '../dto/reset-password';
import { AuthGoogleService } from '../services/auh-google.service';

@ApiTags('Authentication apis')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly authGoogleService: AuthGoogleService,
    ) { }

    // -------------- User Registration --------------
    @ApiOperation({ summary: 'User Registration with Email' })
    @Post('register')
    async register(@Body() body: RegisterDto) {
        const result = await this.authService.register(body);
        return {
            statusCode: HttpStatus.CREATED,
            success: true,
            message: 'Registration successful! Please verify your email.',
            data: result,
        };
    }

    // -------------- User Login --------------
    @ApiOperation({ summary: 'User Login with Email' })
    @Post('login')
    async login(
        @Body() body: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = (await this.authService.login(body)) as any;

        // Set HTTP-only cookie
        res.cookie('token', result?.data?.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return result;
    }

    // -------------- Google Login --------------
    @ApiOperation({ summary: 'Google Login or Sign Up' })
    @Post('google-login')
    async googleLogin(
        @Body() body: GoogleLoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = (await this.authGoogleService.googleLogin(body)) as any;

        // Set HTTP-only cookie for Google login too
        res.cookie('token', result?.data?.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return result;
    }

    // -------------- Verify OTP (Signup) --------------
    @ApiOperation({ summary: 'Verify OTP after Registration' })
    @Post('signup-verify-otp')
    async verifyOtp(
        @Body() payload: VerifyOtpAuthDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.verifyOtp(payload);

        // -----------Set HTTP-only cookie after successful verification
        if (result.data?.token) {
            res.cookie('token', result.data.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
        }

        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'OTP verified successfully!',
            data: result,
        };
    }

    // -------------- Verify OTP (Password Reset) --------------
    @ApiOperation({ summary: 'Verify OTP for Password Reset' })
    @Post('reset-verify-otp')
    async resetverifyOtp(@Body() payload: VerifyOtpAuthDto) {
        const result = await this.authService.resetverifyOtp(payload);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Reset OTP verified successfully!',
            data: result,
        };
    }

    // -------------- Forgot Password --------------
    @ApiOperation({ summary: 'Request Password Reset' })
    @Post('forget-password')
    async forgetPassword(@Body() payload: ForgotPasswordDto) {
        const result = await this.authService.forgetPassword(payload);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Password reset email sent successfully!',
            data: result,
        };
    }

    // -------------- Reset Password --------------
    @ApiOperation({ summary: ' Forgot Reset Password with Token' })
    @Post('reset-password')
    async resetPassword(@Body() payload: ResetPasswordAuthDto) {
        const result = await this.authService.resetPassword(payload);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Password reset successfully!',
            data: result,
        };
    }
}