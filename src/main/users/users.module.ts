import { Module } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
    controllers: [UsersController],
    providers: [UsersService],
})
export class UsersModule {}
