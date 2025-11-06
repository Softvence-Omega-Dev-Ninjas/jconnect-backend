import { Module } from "@nestjs/common";
import { UserRepository } from "./auth.repository";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
    providers: [UserRepository, UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
