import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { UtilsModule } from "./utils/utils.module";

@Module({
    imports: [
        PrismaModule,
        MailModule,
        UtilsModule,
    ],
    exports: [
        PrismaModule,
        MailModule,
        UtilsModule
    ],
    providers: [],
})
export class LibModule { }
