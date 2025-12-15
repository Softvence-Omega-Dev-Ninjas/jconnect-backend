import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";

import { GetUser, ValidateAdmin, ValidateUser } from "@common/jwt/jwt.decorator";
import { UpdateSettingDto } from "./dto/create-dto";

@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @ValidateUser()
    @Get()
    @ApiOperation({ summary: "Get platform settings" })
    get() {
        return this.settingsService.getSettings();
    }

    @ValidateAdmin()
    @Patch()
    @ApiOperation({ summary: "Update platform settings" })
    update(@Body() dto: UpdateSettingDto) {
        return this.settingsService.updateSettings(dto);
    }

    // ----------------- notification settings ---------------------
    @ValidateAdmin()
    @Patch("notification-toggle-settings-only-admin")
    @ApiOperation({ summary: "Update notification settings for only admin" })
    updateNotificationSettingsToggleAdmin(@GetUser("userId") userId: string) {
        return this.settingsService.updateNotificationSettingsToggleAdmin(userId);
    }
}
