// /src/servicerequest/servicerequest.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { ServiceRequest } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { UpdateServiceRequestDto } from "./dto/update-service-request.dto";

@Injectable()
export class ServiceRequestService {
    constructor(private prisma: PrismaService) {}

    async create(createRequestDto: CreateServiceRequestDto, user: any): Promise<ServiceRequest> {
        // Validate referenced Service exists to avoid foreign key constraint errors
        if (createRequestDto.serviceId) {
            const service = await this.prisma.service.findUnique({
                where: { id: createRequestDto.serviceId },
            });
            if (!service) {
                throw new NotFoundException(
                    `Service with ID "${createRequestDto.serviceId}" not found.`,
                );
            }
        }

        return this.prisma.serviceRequest.create({
            data: {
                ...createRequestDto,
                buyerId: user.userId,
                promotionDate: createRequestDto.promotionDate
                    ? new Date(createRequestDto.promotionDate)
                    : null,
            },
        });
    }

    // 2. READ ALL
    async findAll(): Promise<ServiceRequest[]> {
        return this.prisma.serviceRequest.findMany();
    }

    // 3. READ ONE
    async findOne(id: string): Promise<ServiceRequest> {
        const request = await this.prisma.serviceRequest.findUnique({
            where: { id },
        });

        if (!request) {
            throw new NotFoundException(`Service Request with ID "${id}" not found.`);
        }
        return request;
    }

    // 4. UPDATE (PATCH)
    async update(id: string, updateRequestDto: UpdateServiceRequestDto): Promise<ServiceRequest> {
        // Check if the request exists before trying to update
        await this.findOne(id);

        // Convert date string if provided
        const updateData = {
            ...updateRequestDto,
            promotionDate: updateRequestDto.promotionDate
                ? new Date(updateRequestDto.promotionDate)
                : undefined,
        };

        return this.prisma.serviceRequest.update({
            where: { id },
            data: updateData,
        });
    }

    // 5. DELETE
    async remove(id: string): Promise<ServiceRequest> {
        // Check if the request exists before trying to delete
        await this.findOne(id);

        return this.prisma.serviceRequest.delete({
            where: { id },
        });
    }
}
