import { Module } from "@nestjs/common";
import { LivechatModule } from "./livechat/livechat.module";
import { PaymentModule } from "./payment/payment.module";
import { AwsUploadModule } from "./upload-aws/upload-aws.module";

@Module({
    imports: [LivechatModule, PaymentModule, AwsUploadModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class SharedModule {}
