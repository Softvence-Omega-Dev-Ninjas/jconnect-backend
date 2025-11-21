// /src/service/dto/create-service.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateServiceDto {
    @ApiProperty({
        example: "Track Review",
        description:
            "The name of the creative service offered (e.g., Mixing, Promo Collaboration).",
    })
    @IsString()
    @IsNotEmpty()
    serviceName: string;

    @ApiProperty({
        example: "I'll review your song and share actionable feedback.",
        description: "A short description (1-2 lines) of what the service entails.",
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        example: 50.0,
        description: "The price for the service.",
    })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({
        example: "USD",
        description: "The currency code (e.g., USD, EUR).",
        required: false,
    })
    @IsOptional()
    @IsString()
    currency?: string = "USD";

    @ApiProperty({
        example: false,
        description: "Indicates if the service is a custom offering.",
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isCustom?: boolean = false;
}
