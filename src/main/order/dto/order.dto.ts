import { IsString, IsUUID, IsNumber, IsOptional } from "class-validator";

export class CreateOrderDto {
    @IsUUID()
    serviceId: string;

    @IsUUID()
    sellerId: string;

    @IsNumber()
    amount: number;

    @IsNumber()
    platformFee: number;
}

export class UpdateOrderStatusDto {
    @IsString()
    status: string;
}
