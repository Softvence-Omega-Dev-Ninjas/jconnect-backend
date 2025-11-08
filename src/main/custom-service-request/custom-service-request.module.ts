import { Module } from "@nestjs/common";
import { PrismaModule } from "src/lib/prisma/prisma.module";
import { CustomServiceRequestController } from "./custom-service-request.controller";
import { CustomServiceRequestService } from "./custom-service-request.service";

@Module({
    imports: [PrismaModule],
    controllers: [CustomServiceRequestController],
    providers: [CustomServiceRequestService],
})
export class CustomServiceRequestModule {}
