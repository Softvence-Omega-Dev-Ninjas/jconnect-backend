import { Global, Module } from "@nestjs/common";
import Stripe from "stripe";
import { StripeService } from "./stripe.service";

@Global()
@Module({
    providers: [
        {
            provide: "STRIPE_CLIENT",
            useFactory: () => {
                return new Stripe(process.env.STRIPE_SECRET_KEY!);
            },
        },
        StripeService,
    ],
    exports: ["STRIPE_CLIENT", StripeService],
})
export class StripeModule {}
