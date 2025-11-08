import { Module } from "@nestjs/common";
import { MailModule } from "./mail/mail.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TwilioModule } from "./twilio/twilo.module";
import { UtilsModule } from "./utils/utils.module";

@Module({
    imports: [
        PrismaModule,
        MailModule,
        UtilsModule,
        TwilioModule
    ],
    exports: [
        PrismaModule,
        MailModule,
        UtilsModule,
        TwilioModule
    ],
    providers: [],
})
export class LibModule { }
