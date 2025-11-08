// ==================== register.dto.ts ====================
import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    Matches,
} from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        example: 'John Doe',
        description: 'Full name of the user',
    })
    @IsNotEmpty({ message: 'Full name is required' })
    @IsString()
    @MinLength(2, { message: 'Full name must be at least 2 characters' })
    @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
    fullName: string;

    @ApiProperty({
        example: 'user@example.com',
        description: 'Email address of the user',
    })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;

    @ApiProperty({
        example: 'Password@123',
        description: 'Password (min 8 chars, must include uppercase, lowercase, number, and special character)',
    })
    @IsNotEmpty({ message: 'Password is required' })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
        {
            message:
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        },
    )
    password: string;

    @ApiProperty({
        example: 'Password@123',
        description: 'Confirm password (must match password)',
    })
    @IsNotEmpty({ message: 'Confirm password is required' })
    @IsString()
    confirmPassword: string;
}