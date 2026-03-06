import { Module } from "@nestjs/common";

import { NotificationModule } from "../notification/notification.module";
import { PrivateChatController } from "./controller/private-message.controller";
import { PrivateChatGateway } from "./privateChatGateway/privateChatGateway";
import { PrivateChatService } from "./service/private-message.service";

@Module({
    imports: [NotificationModule],
    controllers: [PrivateChatController],
    providers: [PrivateChatService, PrivateChatGateway],
})
export class PrivateMessageModule {}
