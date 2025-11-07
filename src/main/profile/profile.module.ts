// src/profile/profile.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Module({
    controllers: [ProfileController],
    providers: [ProfileService],
})
export class ProfileModule {}
