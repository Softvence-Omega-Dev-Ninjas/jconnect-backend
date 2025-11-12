// import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Res } from "@nestjs/common";
// import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
// import { GoogleLoginDto } from "../dto/google-login.dto";
// import { LoginDto } from "../dto/login.dto";
// import { RegisterDto } from "../dto/register.dto";
// import { AuthService } from "../services/auth.service";

// import { VerifyOtpAuthDto } from "../dto/varify-otp.dto";

// import IpAddress from "@common/decorators/ip-address.decorator";
// import { UserAgent } from "@common/decorators/user-agent.decorator";
// import { GetUser } from "@common/jwt/jwt.decorator";
// import type { Response } from "express";
// import { DeviceService } from "src/lib/device/device.service";
// import { TwilioService } from "src/lib/twilio/twilio.service";
// import { ForgotPasswordDto } from "../dto/forgot-password.dto";
// import { SendPhoneOtpDto, VerifyPhoneOtpDto } from "../dto/phone-login";
// import { ResetPasswordAuthDto } from "../dto/reset-password";
// import { AuthGoogleService } from "../services/auh-google.service";

// @ApiTags("Authentication apis")
// @Controller("auth")
// export class AuthController {
//     constructor(
//         private readonly authService: AuthService,
//         private readonly authGoogleService: AuthGoogleService,
//         private readonly deviceService: DeviceService,
//         private readonly twilio: TwilioService,
//     ) { }

//     // -------------- User Registration --------------
//     @ApiOperation({ summary: "User Registration with Email" })
//     @Post("register")
//     async register(
//         @Body() body: RegisterDto,
//         @UserAgent() userAgent: string,
//         @IpAddress() ipAddress: string,
//     ) {
//         const result = await this.authService.register(body, userAgent, ipAddress);
//         return {
//             statusCode: HttpStatus.CREATED,
//             success: true,
//             message: "Registration successful! Please verify your email.",
//             data: result,
//         };
//     }

//     // -------------- User Login --------------
//     @ApiOperation({ summary: "User Login with Email" })
//     @Post("login")
//     async login(
//         @Body() body: LoginDto,
//         @UserAgent() userAgent: string,
//         @IpAddress() ipAddress: string,
//         @Res({ passthrough: true }) res: Response,
//     ) {
//         const result = (await this.authService.login(body)) as any;

//         // Set HTTP-only cookie
//         res.cookie("token", result?.data?.token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === "production",
//             sameSite: "lax",
//             path: "/",
//             maxAge: 30 * 24 * 60 * 60 * 1000,
//         });

//         return result;
//     }

//     // -------------- Google Login --------------
//     @ApiOperation({ summary: "Google Login or Sign Up" })
//     @Post("google-login")
//     async googleLogin(@Body() body: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
//         const result = (await this.authGoogleService.googleLogin(body)) as any;

//         // Set HTTP-only cookie for Google login too
//         res.cookie("token", result?.data?.token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === "production",
//             sameSite: "lax",
//             path: "/",
//             maxAge: 30 * 24 * 60 * 60 * 1000,
//         });

//         return result;
//     }

//     // -------------- Verify OTP (Signup) --------------
//     @ApiOperation({ summary: "Verify OTP after Registration" })
//     @Post("signup-verify-otp")
//     async verifyOtp(@Body() payload: VerifyOtpAuthDto, @Res({ passthrough: true }) res: Response) {
//         const result = await this.authService.verifyOtp(payload);

//         // -----------Set HTTP-only cookie after successful verification
//         if (result.data?.token) {
//             res.cookie("token", result.data.token, {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === "production",
//                 sameSite: "lax",
//                 path: "/",
//                 maxAge: 30 * 24 * 60 * 60 * 1000,
//             });
//         }

//         return {
//             statusCode: HttpStatus.OK,
//             success: true,
//             message: "OTP verified successfully!",
//             data: result,
//         };
//     }

//     // -------------- Verify OTP (Password Reset) --------------
//     @ApiOperation({ summary: "Verify OTP for Password Reset" })
//     @Post("reset-verify-otp")
//     async resetverifyOtp(@Body() payload: VerifyOtpAuthDto) {
//         const result = await this.authService.resetverifyOtp(payload);
//         return {
//             statusCode: HttpStatus.OK,
//             success: true,
//             message: "Reset OTP verified successfully!",
//             data: result,
//         };
//     }

//     // -------------- Forgot Password --------------
//     @ApiOperation({ summary: "Request Password Reset" })
//     @Post("forget-password")
//     async forgetPassword(@Body() payload: ForgotPasswordDto) {
//         const result = await this.authService.forgetPassword(payload);
//         return {
//             statusCode: HttpStatus.OK,
//             success: true,
//             message: "Password reset email sent successfully!",
//             data: result,
//         };
//     }

//     // -------------- Reset Password --------------
//     @ApiOperation({ summary: " Forgot Reset Password with Token" })
//     @Post("reset-password")
//     async resetPassword(@Body() payload: ResetPasswordAuthDto) {
//         const result = await this.authService.resetPassword(payload);
//         return {
//             statusCode: HttpStatus.OK,
//             success: true,
//             message: "Password reset successfully!",
//             data: result,
//         };
//     }

//     // -------------------- otp varification via sms --------------------
//     // ---------- SEND PHONE OTP (signup / login / forgot) ----------
//     @Post("phone/send-otp")
//     @ApiOperation({ summary: "Send OTP to phone (signup / login / forgot)" })
//     async sendPhoneOtp(@Body() dto: SendPhoneOtpDto) {
//         const result = await this.authService.sendPhoneOtp(dto);
//         return {
//             statusCode: HttpStatus.OK,
//             success: true,
//             message: result.message,
//             data: result,
//         };
//     }

//     // ---------- VERIFY PHONE OTP (login after signup) ----------
//     @Post("phone/verify-otp")
//     @ApiOperation({ summary: "Verify phone OTP – login" })
//     async verifyPhoneOtp(
//         @Body() dto: VerifyPhoneOtpDto,
//         @Res({ passthrough: true }) res: Response,
//     ) {
//         const result = await this.authService.verifyPhoneOtp(dto);

//         // set HTTP-only cookie
//         res.cookie("token", result.data.token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === "production",
//             sameSite: "lax",
//             path: "/",
//             maxAge: 30 * 24 * 60 * 60 * 1000,
//         });

//         return result;
//     }

//     // ---------- FORGOT PASSWORD VIA PHONE ----------
//     @Post("phone/forgot-password")
//     @ApiOperation({ summary: "Request password reset via phone" })
//     async phoneForgotPassword(@Body() dto: SendPhoneOtpDto) {
//         const result = await this.authService.phoneForgotPassword(dto);
//         return {
//             statusCode: HttpStatus.OK,
//             success: true,
//             message: "OTP sent to phone",
//             data: result,
//         };
//     }

//     // ---------- VERIFY PHONE OTP FOR PASSWORD RESET ----------
//     @Post("phone/reset-verify-otp")
//     @ApiOperation({ summary: "Verify phone OTP for password reset" })
//     async phoneResetVerifyOtp(@Body() dto: VerifyPhoneOtpDto) {
//         const result = await this.authService.phoneResetVerifyOtp(dto);
//         return {
//             statusCode: HttpStatus.OK,
//             success: true,
//             message: "OTP verified – you may now reset password",
//             data: result,
//         };
//     }
//     // New endpoint: Get user's devices
//     @Get("devices")
//     @ApiBearerAuth()
//     async getUserDevices(@GetUser("userId") userId: string) {
//         const devices = await this.deviceService.getUserDevices(userId);
//         return {
//             statusCode: 200,
//             success: true,
//             data: devices,
//         };
//     }

//     // New endpoint: Remove a specific device
//     @Delete("devices/:deviceId")
//     @ApiBearerAuth()
//     async removeDevice(@GetUser("userId") userId: string, @Param("deviceId") deviceId: string) {
//         await this.deviceService.removeDevice(userId, deviceId);
//         return {
//             statusCode: 200,
//             success: true,
//             message: "Device removed successfully",
//         };
//     }

//     // : Logout from all devices
//     @Post("logout-all-devices")
//     @ApiBearerAuth()
//     async logoutAllDevices(@GetUser() userId: string) {
//         await this.deviceService.removeAllUserDevices(userId);
//         return {
//             statusCode: 200,
//             success: true,
//             message: "Logged out from all devices successfully",
//         };
//     }
// }
