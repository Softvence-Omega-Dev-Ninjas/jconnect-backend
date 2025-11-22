import { Module } from "@nestjs/common";
import { awsModule } from "./aws/aws.module";

import { ChatModule } from "./livechat/livechat.module";

@Module({
    imports: [ChatModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class SharedModule {}
