import { NotificationModule } from "@main/shared/notification/notification.module";
import { Module } from "@nestjs/common";
import { FollowFunctionController } from "./follow-function.controller";
import { FollowFunctionService } from "./follow-function.service";

@Module({
    imports: [NotificationModule],
    providers: [FollowFunctionService],
    controllers: [FollowFunctionController],
})
export class FollowFunctionModule {}
