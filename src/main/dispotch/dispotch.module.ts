import { AwsService } from "@main/aws/aws.service";
import { Module } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { DisputeController } from "./dispotch.controller";
import { DisputeService } from "./dispotch.service";
// তোমার PrismaService path অনুযায়ী

@Module({
    controllers: [DisputeController],
    providers: [DisputeService, PrismaService, AwsService],
    exports: [DisputeService],
})
export class DisputeModule {}
