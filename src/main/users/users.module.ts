import { AwsService } from "@main/aws/aws.service";
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
    controllers: [UsersController],
    providers: [UsersService, AwsService],
})
export class UsersModule {}
