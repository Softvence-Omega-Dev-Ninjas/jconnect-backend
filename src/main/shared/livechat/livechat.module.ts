import { Module } from "@nestjs/common";

import { LivechatController } from "./livechat.controller";
import { LivechatService } from "./service/livechat.service";

@Module({
    controllers: [LivechatController],
    providers: [LivechatService],
})
export class LivechatModule { }
