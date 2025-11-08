import { ApiProperty } from "@nestjs/swagger";
import { AuthProvider, Role } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
    @ApiProperty({ example: "John Doe" })
    @IsString()
    full_name: string;

    @ApiProperty({ example: "john@example.com" })
    @IsEmail()
    email: string;

    // @ApiProperty({ example: "+880" })
    // @IsOptional()
    // @IsString()
    // country_code?: string;

    // @ApiProperty({ example: "01700000000" })
    // @IsOptional()
    // @IsString()
    // phone_number?: string;

    @ApiProperty({ example: "MIn6@ssa" })
    @IsString()
    @MinLength(6, { message: "Password must be at least 6 characters long" })
    password: string;

    @ApiProperty({ example: true })
    @IsOptional()
    @IsBoolean()
    is_terms_agreed?: boolean;

    // @ApiProperty({ example: "email", enum: ["email", "google", "facebook"] })
    // @IsOptional()
    // @IsString()
    // auth_provider?: string;

    @IsOptional()
    @IsEnum(AuthProvider)
    auth_provider?: AuthProvider;

    @ApiProperty({ example: "USER", enum: Role })
    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}

export class UpdateUserDto {
    @ApiProperty({ example: "John Doe Updated", required: false })
    @IsOptional()
    @IsString()
    full_name?: string;

    @ApiProperty({ example: "john_new@example.com", required: false })
    @IsOptional()
    @IsEmail()
    email_address?: string;

    @ApiProperty({ example: "+880", required: false })
    @IsOptional()
    @IsString()
    country_code?: string;

    @ApiProperty({ example: "01800000000", required: false })
    @IsOptional()
    @IsString()
    phone_number?: string;

    @ApiProperty({ example: "MIn6@ssa", required: false })
    @IsOptional()
    @IsString()
    @MinLength(6, { message: "Password must be at least 6 characters long" })
    password?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @ApiProperty({ example: "ADMIN", enum: Role, required: false })
    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}
