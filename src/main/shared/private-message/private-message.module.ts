import { Module } from "@nestjs/common";

import { PrivateChatController } from "./controller/private-message.controller";
import { PrivateChatGateway } from "./privateChatGateway/privateChatGateway";
import { PrivateChatService } from "./service/private-message.service";

@Module({
    controllers: [PrivateChatController],
    providers: [PrivateChatService, PrivateChatGateway],
})
export class PrivateMessageModule {}
