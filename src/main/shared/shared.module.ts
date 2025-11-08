import { Module } from "@nestjs/common";
import { LivechatModule } from "./livechat/livechat.module";
import { PaymentModule } from "./payment/payment.module";


@Module({
    imports: [LivechatModule, PaymentModule],
    controllers: [],
    providers: [],
    exports: [LivechatModule, PaymentModule],
})
export class SharedModule { }