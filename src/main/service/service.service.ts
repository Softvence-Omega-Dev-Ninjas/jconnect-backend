import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Service } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
@Injectable()
export class ServiceService {
    constructor(private prisma: PrismaService) {}

    async create(createServiceDto: CreateServiceDto): Promise<Service> {
        return this.prisma.service.create({
            data: createServiceDto,
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
