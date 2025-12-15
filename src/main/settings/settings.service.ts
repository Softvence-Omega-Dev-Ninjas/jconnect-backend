import { HandleError } from "@common/error/handle-error.decorator";
import { successResponse } from "@common/utilsResponse/response.util";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { Announcement } from "./dto/announcement.dto";
import { UpdateSettingDto } from "./dto/create-dto";

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getSettings() {
        const settings = await this.prisma.setting.findUnique({
            where: { id: "platform_settings" },
        });

        if (!settings) throw new NotFoundException("Settings not found");

        return settings;
    }

    async updateSettings(dto: UpdateSettingDto) {
        await this.getSettings();
        return this.prisma.setting.update({
            where: { id: "platform_settings" },
            data: {
                platformFee_percents: dto.platformFee_percents ?? undefined,
                minimum_payout: dto.minimum_payout ?? undefined,
            },
        });
    }

    // ----------------------------- NOTIFICATION SETTINGS -----------------------------
    @HandleError("Failed to update notification settings")
    async updateNotificationSettingsToggleAdmin(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                notificationToggles: true,
            },
        });

        if (!user) {
            throw new NotFoundException("Admin user not found");
        }

        return {
            message: "Notification settings updated successfully",
            data: user.notificationToggles,
        };
    }

    // -------------------createAnnouncement------------
    @HandleError("Failed to create announcement")
    async createAnnouncement(dto: Announcement) {
        const announcement = await this.prisma.announcement.create({
            data: {
                title: dto.title,
                description: dto.description,
            },
        })

        return successResponse(announcement, "Announcement created");
    }

    @HandleError("Failed to get announcement")
    async getAnnouncement() {
        const announcement = await this.prisma.announcement.findMany();
        return successResponse(announcement, "Announcement fetched");
    }

    //  deleteAnnouncement

    @HandleError("Failed to delete announcement")
    async deleteAnnouncement(id: string) {
        const announcement = await this.prisma.announcement.delete({
            where: {
                id: id,
            },
        });
        return successResponse(announcement, "Announcement deleted");
    }

    // ------------updateAnnouncement---
    @HandleError("Failed to update announcement")
    async updateAnnouncement(id: string, dto: Announcement) {
        const announcement = await this.prisma.announcement.update({
            where: {
                id: id,
            },
            data: {
                title: dto.title,
                description: dto.description,
            },
        });
        return successResponse(announcement, "Announcement updated");
    }

}
