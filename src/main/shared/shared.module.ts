import { Module } from "@nestjs/common";

import { ChatModule } from "./livechat/livechat.module";
import { PaymentModule } from "./payment/payment.module";
import { AwsUploadModule } from "./upload-aws/upload-aws.module";

@Module({
    imports: [PaymentModule, AwsUploadModule, ChatModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class SharedModule {}
