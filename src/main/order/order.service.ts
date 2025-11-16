import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { OrderStatus } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) {}

    // CREATE ORDER
    async createOrder(buyerId: string, dto: any) {
        const service = await this.prisma.service.findUnique({
            where: { id: dto.serviceId },
        });

        if (!service) throw new NotFoundException("Service not found");

        if (service.creatorId === buyerId)
            throw new BadRequestException("You cannot buy your own service");

        const order = await this.prisma.order.create({
            data: {
                orderCode: "ORD-" + Date.now(),
                buyerId,
                sellerId: dto.sellerId,
                sessionId: dto.sessionId,
                serviceId: dto.serviceId,
                amount: dto.amount,
                platformFee: dto.platformFee,
                status: OrderStatus.PENDING,
            },
        });

        return order;
    }

    // GET ALL ORDERS OF BUYER
    async getOrdersByBuyer(buyerId: string) {
        return this.prisma.order.findMany({
            where: { buyerId },
            include: { service: true },
        });
    }

    // GET ONE ORDER
    async getOrder(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { service: true, buyer: true, seller: true },
        });

        if (!order) throw new NotFoundException("Order not found");

        return order;
    }

    // UPDATE ORDER STATUS
    async updateStatus(id: string, status: OrderStatus, userId: string) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException("Order not found");

        // Seller only allowed some statuses
        if (status === OrderStatus.IN_PROGRESS || status === OrderStatus.PROOF_SUBMITTED) {
            if (order.sellerId !== userId)
                throw new ForbiddenException("Only seller can update this status");
        }

        // Buyer confirms delivery
        if (status === OrderStatus.COMPLETED) {
            if (order.buyerId !== userId)
                throw new ForbiddenException("Only buyer can confirm delivery");
        }

        const updated = await this.prisma.order.update({
            where: { id },
            data: { status },
        });

        return updated;
    }

    // DELETE ORDER
    async deleteOrder(id: string) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException("Order not found");

        if (order.status !== OrderStatus.PENDING)
            throw new BadRequestException("Only pending orders can be deleted");

        return this.prisma.order.delete({ where: { id } });
    }

    // STRIPE WEBHOOK → PAYMENT SUCCESS → AUTO UPDATE
    async markPaid(paymentIntentId: string) {
        return this.prisma.order.update({
            where: { paymentIntentId },
            data: { status: OrderStatus.PAID },
        });
    }

    // RELEASE PAYMENT
    async releasePayment(orderId: string) {
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.RELEASED,
                isReleased: true,
                releasedAt: new Date(),
            },
        });
    }
}
