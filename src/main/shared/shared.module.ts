import { Module } from "@nestjs/common";
import { awsModule } from "./aws/aws.module";
import { LivechatModule } from "./livechat/livechat.module";
import { PaymentModule } from "./payment/payment.module";
import { PrivateMessageModule } from "./private-message/private-message.module";

@Module({
    imports: [LivechatModule, PaymentModule, awsModule, PrivateMessageModule],
    controllers: [],
    providers: [],
    exports: [LivechatModule, PaymentModule],
})
export class SharedModule {}
