import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class FirebaseLoginDto {
    @ApiProperty({
        example: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2...",
        description:
            "Firebase ID token obtained from Firebase Authentication (Google or Apple Sign-In)",
    })
    @IsString()
    @IsNotEmpty()
    idToken: string;

    @ApiProperty({
        example: "google",
        description: "Provider type: 'google' or 'apple'",
        enum: ["google", "apple"],
    })
    @IsString()
    @IsNotEmpty()
    provider: "google" | "apple";

    @ApiProperty({
        example: "john_doe",
        description: "Optional username for new user registration",
        required: false,
    })
    @IsString()
    @IsOptional()
    username?: string;
}
