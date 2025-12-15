import { HandleError } from "@common/error/handle-error.decorator";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { UpdateSettingDto } from "./dto/create-dto";

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) {}

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
}
