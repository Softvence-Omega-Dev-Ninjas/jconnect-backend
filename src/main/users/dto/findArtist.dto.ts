import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export class FindArtistDto {
    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number;

    @ApiPropertyOptional({
        example: "top-rated",
        description: 'Filter options: "recently-updated" | "suggested" | "top-rated"',
    })
    @IsOptional()
    @IsString()
    filter?: string;

    @ApiPropertyOptional({ example: "john", description: "Search by artist or service name" })
    @IsOptional()
    @IsString()
    search?: string;
}
