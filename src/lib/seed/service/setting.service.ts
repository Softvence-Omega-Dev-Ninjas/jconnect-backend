import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "src/lib/prisma/prisma.service";
import { UtilsService } from "src/lib/utils/utils.service";

@Injectable()
export class seedSettingSrvice implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly utils: UtilsService,
        private readonly configService: ConfigService,
    ) {}

    onModuleInit(): Promise<void> {
        return this.seedSettings();
    }

    async seedSettings(): Promise<void> {
        const settingExitst = await this.prisma.setting.findFirst({
            where: {
                id: "platform_settings",
            },
        });

        // * create super admin
        if (!settingExitst) {
            await this.prisma.setting.create({
                data: {
                    platformFee_percents: 0,
                    minimum_payout: 0,
                },
            });
            return;
        }

        // * Log & update if super admin already exists
    }
}
