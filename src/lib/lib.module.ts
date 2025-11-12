import { Module } from "@nestjs/common";
import { DeviceModule } from "./device/device.module";
import { MailModule } from "./mail/mail.module";
import { MulterModule } from "./multer/multer.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SeedModule } from "./seed/seed.module";
import { TwilioModule } from "./twilio/twilo.module";
import { UtilsModule } from "./utils/utils.module";

@Module({
    imports: [
        PrismaModule,
        MailModule,
        UtilsModule,
        TwilioModule,
        DeviceModule,
        SeedModule,
        MulterModule,
    ],
    controllers: [],
    exports: [
        PrismaModule,
        MailModule,
        UtilsModule,
        TwilioModule,
        DeviceModule,
        SeedModule,
        MulterModule,
    ],
    providers: [],
})
export class LibModule { }
