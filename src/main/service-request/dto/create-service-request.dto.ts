// /src/servicerequest/dto/create-servicerequest.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateServiceRequestDto {
    @ApiProperty({
        description: "The unique ID of the Service being purchased.",
        example: "clx0j2h8j000001a1bc3de4f", // Example of a CUID or UUID
    })
    @IsString()
    @IsNotEmpty()
    // If you use UUIDs, you should use @IsUUID() instead of @IsString()
    serviceId: string;

    @ApiProperty({
        description:
            "The ID of the user initiating the purchase (buyer). Must be obtained securely from the authentication context.",
        example: "clx0j2h8j000101a1bc3de4g",
    })
    @ApiProperty({
        description:
            "Detailed instructions from the buyer to the seller, required for service execution.",
        required: false,
        example:
            "Please focus the review specifically on the track's drum patterns and bassline mix. Attached file is the final version.",
    })
    @IsOptional()
    @IsString()
    captionOrInstructions?: string;

    @ApiProperty({
        description:
            "Optional date specified by the buyer for promotion or delivery deadline (format YYYY-MM-DD).",
        required: false,
        example: "2026-12-25",
    })
    @IsOptional()
    @IsDateString()
    promotionDate?: string;

    @ApiProperty({
        description:
            "Any additional private notes or disclosures for the seller (e.g., embargo details).",
        required: false,
        example: "This track is under an embargo; do not post publicly before January 1st.",
    })
    @IsOptional()
    @IsString()
    specialNotes?: string;

    @ApiProperty({
        description:
            "The final URL of the media file uploaded by the buyer (e.g., S3 or CDN link).",
        required: false,
        example: "https://cdn.yourplatform.com/assets/req/track-id-123.mp3",
    })
    @IsOptional()
    @IsString() // Using IsString for a generic URL storage, but IsUrl() could be more strict
    uploadedFileUrl?: string;

    // --- CRITICAL GUARDRAIL NOTE ---
    @ApiProperty({
        description:
            "The **final total** charged to the buyer (Service Price + Platform Fee). This value MUST be verified or recalculated on the server side using the serviceId to prevent fraud.",
        example: 82.5,
    })
    @IsNumber()
    @Min(0.01)
    totalAmount: number;
}
