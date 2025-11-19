import { Module } from "@nestjs/common";
import { awsModule } from "./aws/aws.module";

import { PrivateMessageModule } from "./private-message/private-message.module";

@Module({
    imports: [awsModule, PrivateMessageModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class SharedModule {}
