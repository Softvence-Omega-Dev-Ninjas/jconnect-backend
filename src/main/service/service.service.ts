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

        const seller = await this.prisma.user.findUnique({
            where: { id: user.userId },
        });

        if (!seller) return errorResponse("Seller not found");
        // 1. Check if seller has Stripe account
        if (!seller.sellerIDStripe) {
            // Create new Stripe connect account
            const account = await this.stripe.accounts.create({ type: "express" });

            // Save account id
            await this.prisma.user.update({
                where: { id: user.userId },
                data: { sellerIDStripe: account.id },
            });

            // Create onboarding link
            const link = await this.stripe.accountLinks.create({
                account: account.id,
                refresh_url: "http://localhost:3000/reauth",
                return_url: "http://localhost:3000/onboarding-success",
                type: "account_onboarding",
            });

            return {
                status: "onboarding_required",
                url: link.url,
            };
        }

        // Check for existing service
        const existingService = await this.prisma.service.findFirst({
            where: { serviceName: payload.serviceName, creatorId: user.userId },
        });
        if (existingService) return errorResponse("Service already exists");

        // ----------Create new service-------------
        const service = await this.prisma.service.create({
            data: { ...payload, creatorId: user.userId },
        });
        return { message: "Service created successfully", service };
    }

    async findAll(): Promise<Service[]> {
        return this.prisma.service.findMany({
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
