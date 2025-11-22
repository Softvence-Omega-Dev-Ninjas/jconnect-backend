import { HandleError } from "@common/error/handle-error.decorator";
import { errorResponse } from "@common/utilsResponse/response.util";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Service } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import Stripe from "stripe";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
@Injectable()
export class ServiceService {
    constructor(
        private prisma: PrismaService,
        @Inject("STRIPE_CLIENT") private stripe: Stripe,
    ) {}

    @HandleError("Failed to create service")
    async create(payload: CreateServiceDto, user: any): Promise<any> {
        if (!user.userId) return errorResponse("User ID is missing");

        // ------------------------------------------------------------
        // STEP 3: CHECK IF SERVICE EXISTS
        // ------------------------------------------------------------
        const existingService = await this.prisma.service.findFirst({
            where: { serviceName: payload.serviceName, creatorId: user.userId },
        });
        if (existingService) return errorResponse("Service already exists");

        // ------------------------------------------------------------
        // STEP 4: CREATE NEW SERVICE
        // ------------------------------------------------------------
        const service = await this.prisma.service.create({
            data: { ...payload, creatorId: user.userId },
        });

        return { message: "Service created successfully", service };
    }

    async findAll(): Promise<Service[]> {
        return this.prisma.service.findMany({
            where: { isCustom: false },
            include: {
                creator: {
                    select: {
                        sellerIDStripe: true,
                        email: true,
                        full_name: true,
                    },
                },
                serviceRequests: true,
            },
        });
    }

    async findOne(id: string): Promise<Service> {
        const service = await this.prisma.service.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        sellerIDStripe: true,
                        email: true,
                        full_name: true,
                    },
                },
            },
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
