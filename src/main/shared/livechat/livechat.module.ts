import { Module } from "@nestjs/common";
import { LivechatService } from "./livechat.service";
import { LivechatController } from "./livechat.controller";

@Module({
    controllers: [LivechatController],
    providers: [LivechatService],
})
export class LivechatModule {}
