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
        await this.getSettings(); // exists check

        return this.prisma.setting.update({
            where: { id: "platform_settings" },
            data: {
                platformFee_percents: dto.platformFee_percents ?? undefined,
                minimum_payout: dto.minimum_payout ?? undefined,
            },
        });
    }
}
