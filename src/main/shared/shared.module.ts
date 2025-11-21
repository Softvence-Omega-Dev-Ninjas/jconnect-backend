import { Module } from "@nestjs/common";

import { ChatModule } from "./livechat/livechat.module";

@Module({
    imports: [ChatModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class SharedModule {}
