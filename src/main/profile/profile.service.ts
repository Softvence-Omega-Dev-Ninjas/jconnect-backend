// src/profile/profile.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { CreateProfileDto, UpdateProfileDto } from "./dto/profile.dto";
import { PrismaService } from "src/lib/prisma/prisma.service";

@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateProfileDto) {
        // Check if user exists
        const user = await this.prisma.user.findUnique({ where: { id: data.user_id } });
        if (!user) throw new BadRequestException("User not found");

        // Check if profile already exists
        const existing = await this.prisma.profile.findUnique({ where: { user_id: data.user_id } });
        if (existing) throw new BadRequestException("Profile already exists for this user");

        return this.prisma.profile.create({ data });
    }

    async findAll() {
        return this.prisma.profile.findMany({
            include: { user: true },
        });
    }

    async findOne(user_id: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { user_id },
            include: { user: true },
        });
        if (!profile) throw new NotFoundException("Profile not found");
        return profile;
    }

    async update(user_id: string, data: UpdateProfileDto) {
        const profile = await this.prisma.profile.findUnique({ where: { user_id } });
        if (!profile) throw new NotFoundException("Profile not found");

        return this.prisma.profile.update({
            where: { user_id },
            data,
        });
    }

    async remove(user_id: string) {
        const profile = await this.prisma.profile.findUnique({ where: { user_id } });
        if (!profile) throw new NotFoundException("Profile not found");

        return this.prisma.profile.delete({ where: { user_id } });
    }
}
