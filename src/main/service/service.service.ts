import { HandleError } from "@common/error/handle-error.decorator";
import { errorResponse } from "@common/utilsResponse/response.util";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ServiceEvent } from "@common/interface/events-payload";
import { EVENT_TYPES } from "@common/interface/events.name";
import { PrismaService } from "src/lib/prisma/prisma.service";
import Stripe from "stripe";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
@Injectable()
export class ServiceService {
    constructor(
        private prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        @Inject("STRIPE_CLIENT") private stripe: Stripe,
    ) {}

    @HandleError("Failed to create service")
    async create(dto: CreateServiceDto, user: any): Promise<any> {
        if (!user.userId) return errorResponse("User ID is missing");

        // Check if service already exists
        const existingService = await this.prisma.service.findFirst({
            where: { serviceName: dto.serviceName, creatorId: user.userId },
        });
        if (existingService) return errorResponse("Service already exists");

        // Create new service
        const service = await this.prisma.service.create({
            data: {
                ...dto,
                creatorId: user.userId,
            },
        });

        // -----------------------------------------
        // Get users who enabled SERVICE notifications
        // -----------------------------------------
        const recipients = await this.prisma.notificationToggle.findMany({
            where: { serviceCreate: true },
            select: {
                user: { select: { id: true, email: true } },
            },
        });

        // -----------------------------------------
        // Create Notification entry
        // -----------------------------------------
        const notification = await this.prisma.notification.create({
            data: {
                title: `New Service Created: ${service.serviceName}`,
                message: `${user.email} created a service: ${service.serviceName}`,
                userId: user.userId,
                entityId: service.id,
                metadata: {
                    serviceId: service.id,
                    serviceName: service.serviceName,
                    description: service.description,
                    author: user.email,
                },
            },
        });

        await this.prisma.$transaction(
            recipients.map((r) =>
                this.prisma.userNotification.create({
                    data: {
                        userId: r.user.id,
                        notificationId: notification.id,
                    },
                }),
            ),
        );

        // -----------------------------------------
        // Emit Service Event
        // -----------------------------------------
        const payload: ServiceEvent = {
            action: "CREATE",
            meta: {
                serviceName: service.serviceName,
                description: service.description || "",
                authorId: user.userId,
                publishedAt: new Date(),
            },
            info: {
                serviceName: service.serviceName,
                description: service.description || "",
                authorId: user.userId,
                publishedAt: new Date(),
                recipients: recipients.map((r) => ({
                    id: r.user.id,
                    email: r.user.email,
                })),
            },
        };

        this.eventEmitter.emit(EVENT_TYPES.SERVICE_CREATE, payload);

        return { message: "Service created successfully", service };
    }

    @HandleError("Failed to find service")
    async findAll() {
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

    @HandleError("Failed to find service")
    async Myservice(user: any) {
        return this.prisma.service.findMany({
            where: { creatorId: user.userId },
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

    @HandleError("Failed to find service")
    async findOne(id: string) {
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

    @HandleError("Failed to update service")
    async update(id: string, dto: UpdateServiceDto, user: any): Promise<any> {
        if (!user.userId) return errorResponse("User ID is missing");

        // Check if service exists
        const service = await this.prisma.service.findUnique({
            where: { id },
        });

        if (!service) return errorResponse("Service not found");

        // Check ownership
        if (service.creatorId !== user.userId)
            return errorResponse("You are not allowed to update this service");

        // Update service
        const updatedService = await this.prisma.service.update({
            where: { id },
            data: {
                ...dto,
            },
        });
        return {
            message: "Service updated successfully",
            service: updatedService,
        };
    }

    @HandleError("Failed to delete service")
    async remove(id: string) {
        return this.prisma.service.delete({
            where: { id },
        });
    }
}
