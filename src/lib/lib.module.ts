import { Module } from "@nestjs/common";
import { DeviceModule } from "./device/device.module";
import { MailModule } from "./mail/mail.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TwilioModule } from "./twilio/twilo.module";
import { UtilsModule } from "./utils/utils.module";

@Module({
    imports: [PrismaModule, MailModule, UtilsModule, TwilioModule, DeviceModule],
    exports: [],
    providers: [],
})
export class LibModule {}
