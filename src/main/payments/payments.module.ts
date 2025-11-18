import { Module } from "@nestjs/common";
import { PaymentController } from "./payments.controller";
import { PaymentService } from "./payments.service";
import { StripeModule } from "@main/stripe/stripe.module";
import { LibModule } from "src/lib/lib.module";

@Module({
    imports: [StripeModule],
    controllers: [PaymentController],
    providers: [PaymentService],
})
export class PaymentsModule {}
