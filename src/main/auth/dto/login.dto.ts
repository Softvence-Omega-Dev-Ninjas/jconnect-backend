import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
    @ApiProperty({
        example: "mijn78146@gmail.com",
        description: "Email address of the user",
    })
    @IsNotEmpty({ message: "Email is required" })
    @IsEmail({}, { message: "Please provide a valid email address" })
    email: string;

    @ApiProperty({
        example: "12345678",
        description: "User password",
    })
    @IsNotEmpty({ message: "Password is required" })
    @IsString()
    password: string;
}
