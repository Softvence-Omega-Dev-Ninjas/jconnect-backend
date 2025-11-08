import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyOtpAuthDto {
    @ApiProperty({ example: 'token' })
    @IsString()
    resetToken: string;

    @ApiProperty({ example: 'otp' })
    @IsString()
    emailOtp: string;
}