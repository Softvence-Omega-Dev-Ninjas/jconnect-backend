import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ENVEnum } from 'src/common/enum/env.enum';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor(private configService: ConfigService) {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        const mailUser = this.configService.get<string>(ENVEnum.MAIL_USER);
        const mailPass = this.configService.get<string>(ENVEnum.MAIL_PASS);

        // Validate required environment variables
        if (!mailUser || !mailPass) {
            this.logger.warn(
                '⚠️  Email configuration is incomplete. Email functionality will be disabled.',
            );
            this.logger.warn('Required: MAIL_USER, MAIL_PASS');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: mailUser,
                    pass: mailPass,
                },
            });

            this.logger.log('✅ Email transporter initialized successfully');
        } catch (error) {
            this.logger.error('❌ Failed to initialize email transporter:', error);
        }
    }

    async sendLoginCodeEmail(
        email: string,
        code: string,
    ): Promise<nodemailer.SentMessageInfo> {
        if (!this.transporter) {
            throw new Error('Email service is not configured. Please contact support.');
        }

        const mailOptions = {
            from: `"No Reply" <${this.configService.get<string>(ENVEnum.MAIL_USER)}>`,
            to: email,
            subject: 'Login Code',
            html: `
                <h3>Welcome!</h3>
                <p>Please login by using the code below:</p>
                <p>Your login code is ${code}</p>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`📧 Login code email sent successfully to ${email}`);
            return info;
        } catch (error) {
            this.logger.error(`❌ Failed to send login code to ${email}:`, error);
            throw new Error('Failed to send email. Please try again later.');
        }
    }

    async sendEmail(
        email: string,
        subject: string,
        message: string,
    ): Promise<nodemailer.SentMessageInfo> {
        if (!this.transporter) {
            throw new Error('Email service is not configured. Please contact support.');
        }

        const mailOptions = {
            from: `"No Reply" <${this.configService.get<string>(ENVEnum.MAIL_USER)}>`,
            to: email,
            subject,
            html: message,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`📧 Email sent successfully to ${email}`);
            return info;
        } catch (error) {
            this.logger.error(`❌ Failed to send email to ${email}:`, error);
            throw new Error('Failed to send email. Please try again later.');
        }
    }

    // Enhanced OTP email with better styling
    async sendOtpEmail(
        email: string,
        otp: number,
        userName?: string,
    ): Promise<nodemailer.SentMessageInfo> {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        background: white;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .content {
                        padding: 30px;
                    }
                    .otp-box {
                        background: #f8f9fa;
                        border: 2px dashed #667eea;
                        padding: 20px;
                        text-align: center;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .otp-code {
                        font-size: 36px;
                        font-weight: bold;
                        color: #667eea;
                        letter-spacing: 8px;
                        margin: 10px 0;
                    }
                    .info-box {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        background: #f8f9fa;
                        color: #666;
                        font-size: 12px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📧 Email Verification</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${userName || 'there'}! 👋</h2>
                        <p>Thank you for registering with us. To complete your registration, please verify your email address using the OTP code below:</p>
                        
                        <div class="otp-box">
                            <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
                            <div class="otp-code">${otp}</div>
                            <p style="margin: 0; font-size: 12px; color: #999;">Enter this code to verify your email</p>
                        </div>
                        
                        <div class="info-box">
                            <strong>⏰ Important:</strong> This OTP will expire in <strong>10 minutes</strong>.
                        </div>
                        
                        <p>If you didn't request this code, please ignore this email or contact our support team if you have concerns.</p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                        <p>&copy; ${new Date().getFullYear()} ${this.configService.get<string>('APP_NAME') || 'Your App'}. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail(email, 'Verify Your Email Address', html);
    }

    // Password reset email with better styling
    async sendPasswordResetEmail(
        email: string,
        otp: number,
        userName?: string,
    ): Promise<nodemailer.SentMessageInfo> {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        background: white;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .content {
                        padding: 30px;
                    }
                    .otp-box {
                        background: #f8f9fa;
                        border: 2px dashed #f5576c;
                        padding: 20px;
                        text-align: center;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .otp-code {
                        font-size: 36px;
                        font-weight: bold;
                        color: #f5576c;
                        letter-spacing: 8px;
                        margin: 10px 0;
                    }
                    .warning-box {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .security-box {
                        background: #d1ecf1;
                        border-left: 4px solid #0c5460;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        background: #f8f9fa;
                        color: #666;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${userName || 'there'}!</h2>
                        <p>We received a request to reset the password for your account. Use the OTP code below to proceed with resetting your password:</p>
                        
                        <div class="otp-box">
                            <p style="margin: 0; font-size: 14px; color: #666;">Your Password Reset OTP</p>
                            <div class="otp-code">${otp}</div>
                            <p style="margin: 0; font-size: 12px; color: #999;">Enter this code to reset your password</p>
                        </div>
                        
                        <div class="warning-box">
                            <strong>⏰ Time Sensitive:</strong> This OTP will expire in <strong>10 minutes</strong>.
                        </div>
                        
                        <div class="security-box">
                            <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure. Consider changing your password if you suspect unauthorized access.
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                        <p>&copy; ${new Date().getFullYear()} ${this.configService.get<string>('APP_NAME') || 'Your App'}. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail(email, 'Reset Your Password', html);
    }

    // Test email connection
    async testConnection(): Promise<boolean> {
        if (!this.transporter) {
            this.logger.error('❌ Email transporter not initialized');
            return false;
        }

        try {
            await this.transporter.verify();
            this.logger.log('✅ Email connection test successful');
            return true;
        } catch (error) {
            this.logger.error('❌ Email connection test failed:', error);
            return false;
        }
    }
}