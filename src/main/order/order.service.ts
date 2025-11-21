import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { OrderStatus, Role } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";

const orderStatusFilter = {
    active: [OrderStatus.IN_PROGRESS],
    pending: [OrderStatus.PENDING],
    paymentConfirm: [OrderStatus.PROOF_SUBMITTED],
    complete: [OrderStatus.RELEASED],
    cancelled: [OrderStatus.CANCELLED],
};

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

    // // GET ALL ORDERS OF BUYER
    // async getOrdersByBuyer(buyerId: string) {
    //     console.log("ami buyer id", buyerId);

    //     return this.prisma.order.findMany({
    //         where: { buyerId },
    //         include: { service: true },
    //     });
    // }

    // GET ONE ORDER
    async getOrder(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                service: true,
                buyer: { select: { full_name: true, id: true, email: true } },
                seller: { select: { full_name: true, id: true, email: true } },
            },
        });

        if (!order) throw new NotFoundException("Order not found");

        return order;
    }

    // UPDATE ORDER STATUS
    async updateStatus(id: string, status: OrderStatus, user: any) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException("Order not found");

        // Seller only allowed some statuses
        if (status === OrderStatus.IN_PROGRESS || status === OrderStatus.PROOF_SUBMITTED) {
            if (order.sellerId !== user.userId)
                throw new ForbiddenException("Only seller can update this status");
        }

        // Buyer confirms delivery
        if (status === OrderStatus.RELEASED) {
            if (order.buyerId !== user.userId)
                throw new ForbiddenException("Only buyer can confirm delivery");
        }

        const updated = await this.prisma.order.update({
            where: { id },
            data: { status },
        });

        return updated;
    }

    // DELETE ORDER
    async deleteOrder(orderId: string, user: any) {
        // 1) Load order
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) throw new NotFoundException("Order not found");

        // 2) Access Rules:
        // Buyer → can delete own order
        const isBuyer = order.buyerId === user.userId;

        // Admin / SuperAdmin → can delete any order
        const isAdmin = user.roles.includes(Role.ADMIN);
        const isSuperAdmin = user.roles.includes(Role.SUPER_ADMIN);

        if (!isBuyer && !isAdmin && !isSuperAdmin) {
            throw new ForbiddenException("You are not allowed to delete this order.");
        }

        // Optional rule: If order already released, block delete
        if (order.isReleased) {
            throw new ForbiddenException("Released orders cannot be deleted.");
        }

        // 3) Delete the order
        await this.prisma.order.delete({
            where: { id: orderId },
        });

        return {
            message: "Order deleted successfully",
            orderId,
        };
    }

    // STRIPE WEBHOOK → PAYMENT SUCCESS → AUTO UPDATE
    // async markPaid(paymentIntentId: string) {
    //     return this.prisma.order.update({
    //         where: { paymentIntentId },
    //         data: { status: OrderStatus.PAID },
    //     });
    // }

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

    async submitProof(orderId: string, userFromReq: any, proofUrls: string[]) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        const user = await this.prisma.user.findUnique({
            where: { id: userFromReq.userId },
        });

        if (!order) throw new NotFoundException("Order not found");

        // Only seller can upload proof
        if (order.sellerId !== user?.id) {
            throw new ForbiddenException("Only seller can upload proof");
        }

        if (!proofUrls || proofUrls.length === 0) {
            throw new BadRequestException("Proof URLs are required");
        }

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.PROOF_SUBMITTED,
                proofUrl: {
                    push: proofUrls, // <-- NEW URLs will be appended
                },
            },
        });

        return updated;
    }

    async updateDeliveryDate(orderId: string, user: any, deliveryDate: string) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });

        if (!order) throw new NotFoundException("Order not found");

        // Only seller or admin can update delivery date
        const isSeller = order.sellerId === user.userId;
        const isAdmin = user.roles.includes("ADMIN");
        const isSuperAdmin = user.roles.includes("SUPER_ADMIN");

        if (!isSeller && !isAdmin && !isSuperAdmin) {
            throw new ForbiddenException(
                "You cannot update delivery date for this order permission only seller or admin",
            );
        }

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                deliveryDate: new Date(deliveryDate),
            },
        });

        return updated;
    }

    async getOrdersByBuyer(
        buyerId: string,
        filter?: "active" | "paymentConfirm" | "complete" | "cancelled" | "pending",
    ) {
        console.log("ami call hoychi buyer order ", buyerId);

        const where: any = { buyerId };

        if (filter && orderStatusFilter[filter]) {
            where.status = { in: orderStatusFilter[filter] };
        }

        return this.prisma.order.findMany({
            where,
            include: {
                service: true,
                seller: { select: { full_name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    // Get seller earnings summary
    async getMyEarnings(sellerId: string) {
        // 1️⃣ Total earning: released orders - cancelled
        const totalReleased = await this.prisma.order.aggregate({
            where: { sellerId },
            _sum: { seller_amount: true },
        });

        const totalCancelled = await this.prisma.order.aggregate({
            where: { sellerId, status: OrderStatus.CANCELLED },
            _sum: { seller_amount: true },
        });

        const user = await this.prisma.user.findUnique({
            where: { id: sellerId },
        });

        const onlyPending = await this.prisma.order.aggregate({
            where: {
                sellerId,
                status: {
                    in: [OrderStatus.PENDING],
                },
            },
            _sum: { seller_amount: true },
        });

        const onlyPedningSum = onlyPending._sum.seller_amount || 0;
        const totalEarning =
            (totalReleased._sum.seller_amount || 0) -
            (totalCancelled._sum.seller_amount || 0) -
            (onlyPending._sum.seller_amount || 0);

        // 2️⃣ Pending Clearance: IN_PROGRESS + PENDING + PROOF_SUBMITTED
        const pendingOrders = await this.prisma.order.aggregate({
            where: {
                sellerId,
                status: {
                    in: [OrderStatus.IN_PROGRESS, OrderStatus.PROOF_SUBMITTED],
                },
            },
            _sum: { seller_amount: true },
        });

        const pendingClearance = pendingOrders._sum.seller_amount || 0;

        // 3️⃣ Available balance
        const availableBalance = totalEarning - pendingClearance - user?.withdrawn_amount!;

        return {
            totalEarning: totalEarning / 100,
            pendingClearance: pendingClearance / 100,
            availableBalance: availableBalance / 100,
            withdrawn_amount: user?.withdrawn_amount! / 100,
        };
    }
}
