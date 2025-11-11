// src/profile/dto/profile.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";

export class CreateProfileDto {
    @IsOptional()
    @IsString()
    userId: string;

    @ApiProperty({ example: "https://example.com/image.jpg", required: false })
    @IsOptional()
    @IsUrl()
    profile_image_url?: string;

    @ApiProperty({ example: "I am a web developer", required: false })
    @IsOptional()
    @IsString()
    short_bio?: string;

    @ApiProperty({ example: "john_instagram", required: false })
    @IsOptional()
    @IsString()
    instagram?: string;

    @ApiProperty({ example: "john.facebook", required: false })
    @IsOptional()
    @IsString()
    facebook?: string;

    @ApiProperty({ example: "john.tiktok", required: false })
    @IsOptional()
    @IsString()
    tiktok?: string;

    @ApiProperty({ example: "@shamimrana2006", required: false })
    @IsOptional()
    @IsString()
    youtube?: string;
}

export class UpdateProfileDto {
    @ApiProperty({ example: "https://example.com/image_new.jpg", required: false })
    @IsOptional()
    @IsUrl()
    profile_image_url?: string;

    @ApiProperty({ example: "Updated short bio", required: false })
    @IsOptional()
    @IsString()
    short_bio?: string;

    @ApiProperty({ example: "new_instagram_username", required: false })
    @IsOptional()
    @IsString()
    instagram?: string;

    @ApiProperty({ example: "new_facebook_username", required: false })
    @IsOptional()
    @IsString()
    facebook?: string;

    @ApiProperty({ example: "new_tiktok_username", required: false })
    @IsOptional()
    @IsString()
    tiktok?: string;

    @ApiProperty({ example: "https://youtube.com/newchannel", required: false })
    @IsOptional()
    @IsString()
    youtube?: string;
}
