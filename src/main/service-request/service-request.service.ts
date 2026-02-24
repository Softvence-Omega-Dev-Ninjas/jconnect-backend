import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";

import { AwsService } from "@main/aws/aws.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@Injectable()
export class ServiceRequestService {
    constructor(
        private prisma: PrismaService,
        private awsService: AwsService,
    ) { }

    async create(dto: CreateServiceRequestDto, files: Express.Multer.File[], user: any) {
        // -------------------------------
        // 1️⃣ Validate serviceId exists
        // -------------------------------
        if (!dto.serviceId) {
            throw new HttpException("serviceId is required", 400);
        }

        const service = await this.prisma.service.findUnique({
            where: { id: dto.serviceId },
        });

        if (!service) {
            throw new HttpException("Service not found with the given ID", 404);
        }

        // -------------------------------
        // 2️⃣ Handle file uploads
        // -------------------------------
        let uploadedUrls: string[] = [];
        if (files && files.length > 0) {
            uploadedUrls = await Promise.all(
                files.map(async (file) => {
                    const result = await this.awsService.upload(file);
                    return result.url;
                }),
            );
        } else {
            uploadedUrls = ["no file"];
        }

        // console.log("amar url ", uploadedUrls);

        // -------------------------------
        // 3️⃣ Create serviceRequest
        // -------------------------------
        try {
            const serviceRequest = await this.prisma.serviceRequest.create({
                data: {
                    serviceId: service.id, 
                    buyerId: user.userId,
                    captionOrInstructions: dto.captionOrInstructions || null,
                    promotionDate: dto.promotionDate || null,
                    specialNotes: dto.specialNotes || null,
                    price: dto.price || null,
                    uploadedFileUrl: uploadedUrls,
                    messageID: dto.messageID || "",
                },
            });

            return {
                message: "Service request created successfully",
                serviceRequest,
            };
        } catch (error) {
            console.error("Error creating serviceRequest:", error);

            // Prisma foreign key error
            if (error.code === "P2003") {
                throw new HttpException(
                    "Foreign key constraint failed: invalid serviceId or buyerId",
                    400,
                );
            }

            throw new HttpException("Failed to create service request", 500);
        }
    }

    async findAll() {
        return this.prisma.serviceRequest.findMany({
            include: {
                service: { include: { creator: { omit: { password: true } } } },
                buyer: { omit: { password: true } },
            },
        });
    }

    async testAWSConnection() {
        return this.awsService.testConnection();
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
