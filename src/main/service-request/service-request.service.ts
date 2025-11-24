import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";

import { AwsService } from "@main/aws/aws.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@Injectable()
export class ServiceRequestService {
    constructor(
        private prisma: PrismaService,
        private awsService: AwsService,
    ) {}

    async create(dto: CreateServiceRequestDto, files: Express.Multer.File[], user: any) {
        let uploadedUrls: string[] = ["no file"];
        if (files && files.length > 0) {
            uploadedUrls = await Promise.all(
                files.map(async (file) => {
                    const result = await this.awsService.upload(file);
                    return result.url;
                }),
            );
        }

        const serviceRequest = await this.prisma.serviceRequest.create({
            data: {
                serviceId: dto.serviceId || null,
                buyerId: user.userId,
                captionOrInstructions: dto.captionOrInstructions || null,
                promotionDate: dto.promotionDate || null,
                specialNotes: dto.specialNotes || null,
                price: dto.price || null,
                uploadedFileUrl: uploadedUrls,
            },
        });

        return serviceRequest;
    }

    async findAll() {
        return this.prisma.serviceRequest.findMany({
            include: {
                service: { include: { creator: { omit: { password: true } } } },
                buyer: { omit: { password: true } },
            },
        });
    }

    async findOne(id: string) {
        return this.prisma.serviceRequest.findUnique({
            where: { id },
            include: {
                service: { include: { creator: { omit: { password: true } } } },
                buyer: { omit: { password: true } },
            },
        });
    }
}
