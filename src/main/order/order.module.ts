import { Module } from "@nestjs/common";

import { OrdersController } from "./order.controller";
import { OrdersService } from "./order.service";
import { AwsService } from "@main/aws/aws.service";

@Module({
    controllers: [OrdersController],
    providers: [OrdersService, AwsService],
})
export class OrdersModule {}
