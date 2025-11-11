// /src/servicerequest/servicerequest.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "src/lib/prisma/prisma.module";
import { ServiceRequestController } from "./service-request.controller";
import { ServiceRequestService } from "./service-request.service";

@Module({
    imports: [PrismaModule],
    controllers: [ServiceRequestController],
    providers: [ServiceRequestService],
})
export class ServiceRequestModule {}
