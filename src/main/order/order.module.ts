import { Module } from "@nestjs/common";

import { AwsService } from "@main/aws/aws.service";
import { StripeModule } from "@main/stripe/stripe.module";
import { OrdersController } from "./order.controller";
import { OrdersService } from "./order.service";

@Module({
    imports: [StripeModule],
    controllers: [OrdersController],
    providers: [OrdersService, AwsService],
})
export class OrdersModule {}
