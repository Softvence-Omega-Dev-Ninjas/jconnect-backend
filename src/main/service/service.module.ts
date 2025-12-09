import { Module } from "@nestjs/common";
import { PrismaModule } from "src/lib/prisma/prisma.module";
import { ServiceController } from "./service.controller";
import { ServiceService } from "./service.service";
import { StripeModule } from "@main/stripe/stripe.module";

@Module({
    imports: [PrismaModule, StripeModule],
    providers: [ServiceService],
    controllers: [ServiceController],
})
export class ServiceModule {}
