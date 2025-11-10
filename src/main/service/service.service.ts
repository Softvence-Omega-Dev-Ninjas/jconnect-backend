import { HandleError } from "@common/error/handle-error.decorator";
import { errorResponse, successResponse } from "@common/utilsResponse/response.util";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Service } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";

@Injectable()
export class ServiceService {
    constructor(private prisma: PrismaService) { }

    @HandleError('Failed to create service')
    async create(payload: CreateServiceDto, userId: string): Promise<any> {
        if (!userId) return errorResponse('User ID is missing');

        // Check for existing service
        const existingService = await this.prisma.service.findFirst({
            where: { serviceName: payload.serviceName, creatorId: userId },
        });
        if (existingService) return errorResponse('Service already exists');

        // Create new service
        const service = await this.prisma.service.create({
            data: { ...payload, creatorId: userId },
        });

        return successResponse(service, 'Service created successfully');
    }



    async findAll(): Promise<Service[]> {
        return this.prisma.service.findMany();
    }

    async findOne(id: string): Promise<Service> {
        const service = await this.prisma.service.findUnique({
            where: { id },
        });

        if (!service) {
            throw new NotFoundException(`Service with ID ${id} not found`);
        }

        return service;
    }

    async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
        return this.prisma.service.update({
            where: { id },
            data: updateServiceDto,
        });
    }

    async remove(id: string): Promise<Service> {
        return this.prisma.service.delete({
            where: { id },
        });
    }
}
