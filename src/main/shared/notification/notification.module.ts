import { Module } from "@nestjs/common";
import { NotificationSettingController } from "./notification.controller";
import { NotificationSettingService } from "./notification.service";

@Module({
    controllers: [NotificationSettingController],
    providers: [NotificationSettingService],
})
export class NotificationModule {}
