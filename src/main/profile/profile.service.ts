// src/profile/profile.service.ts
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateProfileDto, UpdateProfileDto } from "./dto/profile.dto";

@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) {}

    async create(data: CreateProfileDto) {
        // 1️⃣ Check if user exists
        const user = await this.prisma.user.findUnique({
            where: { id: data.user_id },
        });
        if (!user) throw new BadRequestException("User not found");

        // 2️⃣ Check if profile already exists
        const existing = await this.prisma.profile.findUnique({
            where: { user_id: data.user_id },
        });
        if (existing) throw new BadRequestException("Profile already exists for this user");

        // 3️⃣ Normalize social links (handle both username or full URL)
        const normalizeUrl = (input: string | null | undefined, base: string) => {
            if (!input) return null;
            if (input.startsWith("http")) return input; // already a full URL
            return `${base}${input}`;
        };

        const profileData = {
            user_id: data.user_id,
            instagram: normalizeUrl(data.instagram, "https://instagram.com/"),
            facebook: normalizeUrl(data.facebook, "https://facebook.com/"),
            tiktok: normalizeUrl(data.tiktok, "https://tiktok.com/@"),
            youtube: normalizeUrl(data.youtube, "https://youtube.com/"),
        };

        // 4️⃣ Create Profile
        return this.prisma.profile.create({ data: profileData });
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
        // 1️⃣ Check if profile exists
        const profile = await this.prisma.profile.findUnique({
            where: { user_id },
        });
        if (!profile) throw new NotFoundException("Profile not found");

        // 2️⃣ Normalize URLs (handle username or full URL)
        const normalizeUrl = (input: string | null | undefined, base: string) => {
            if (!input) return undefined; // skip undefined fields
            if (input.startsWith("http")) return input; // already full URL
            return `${base}${input}`;
        };

        const updatedData = {
            ...data,
            instagram: normalizeUrl(data.instagram, "https://instagram.com/"),
            facebook: normalizeUrl(data.facebook, "https://facebook.com/"),
            tiktok: normalizeUrl(data.tiktok, "https://tiktok.com/@"),
            youtube: normalizeUrl(data.youtube, "https://youtube.com/"),
        };

        // 3️⃣ Update the profile
        return this.prisma.profile.update({
            where: { user_id },
            data: updatedData,
        });
    }

    async remove(user_id: string) {
        const profile = await this.prisma.profile.findUnique({ where: { user_id } });
        if (!profile) throw new NotFoundException("Profile not found");

        return this.prisma.profile.delete({ where: { user_id } });
    }
}
