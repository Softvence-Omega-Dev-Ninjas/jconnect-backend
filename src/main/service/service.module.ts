import { Module } from "@nestjs/common";
import { PrismaModule } from "src/lib/prisma/prisma.module";
import { ServiceController } from "./service.controller";
import { ServiceService } from "./service.service";

@Module({
    imports: [PrismaModule],
    providers: [ServiceService],
    controllers: [ServiceController],
})
export class ServiceModule {}
