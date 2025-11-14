import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Service } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { HandleError } from "@common/error/handle-error.decorator";
import { errorResponse } from "@common/utilsResponse/response.util";
@Injectable()
export class ServiceService {
    constructor(private prisma: PrismaService) {}

    @HandleError("Failed to create service")
    async create(payload: CreateServiceDto, userId: string): Promise<any> {
        if (!userId) return errorResponse("User ID is missing");

        // Check for existing service
        const existingService = await this.prisma.service.findFirst({
            where: { serviceName: payload.serviceName, creatorId: userId },
        });
        if (existingService) return errorResponse("Service already exists");

        // ----------Create new service-------------
        const service = await this.prisma.service.create({
            data: { ...payload, creatorId: userId },
        });
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

    async update(id: string, user, updateServiceDto: UpdateServiceDto): Promise<Service> {
        console.log(user);
        const service = await this.prisma.service.findUnique({
            where: { id },
        });

        if (!service) {
            throw new NotFoundException(`Service with ID ${id} not found`);
        }

        // check ownership or super admin
        const isOwner = service.creatorId === user?.userId;
        const isSuperAdmin = user?.roles === "SUPER_ADMIN";

        if (!isOwner && !isSuperAdmin) {
            console.log("You are not authorized to access this service");
            throw new ForbiddenException("You are not authorized to access this service");
        }

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
