import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";

import { ValidateAdmin, ValidateUser } from "@common/jwt/jwt.decorator";
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
}
