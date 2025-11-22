import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional } from "class-validator";

export class TopSellerFilterDto {
    @ApiProperty({
        example: 1,
        description: "Page number for pagination.",
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    page: number;

    @ApiProperty({
        example: 10,
        description: "Page number for pagination.",
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    limit: number;
}
