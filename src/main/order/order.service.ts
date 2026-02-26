import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { OrderStatus, Role } from "@prisma/client";
import { MailService } from "src/lib/mail/mail.service";
import { PrismaService } from "src/lib/prisma/prisma.service";

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private mail: MailService,
    ) { }

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
                buyer: {
                    select: {
                        full_name: true,
                        id: true,
                        email: true,
                        username: true,
                        profilePhoto: true,
                    },
                },
                seller: {
                    select: {
                        full_name: true,
                        id: true,
                        email: true,
                        username: true,
                        profilePhoto: true,
                    },
                },
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

    async getOrdersByBuyer(buyerId: string, status?: OrderStatus) {
        // console.log("ami call hoychi buyer order ", buyerId);

        const where: any = { buyerId };

        if (status) {
            where.status = status;
        }

        return this.prisma.order.findMany({
            where,
            include: {
                service: true,
                seller: {
                    select: { full_name: true, email: true, username: true, profilePhoto: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async myServiceOrder(sellerId: string) {
        // console.log("ami call hoychi buyer order ", buyerId);

        const where: any = { sellerId };

        // if (filter && orderStatusFilter[filter]) {
        //     where.status = { in: orderStatusFilter[filter] };
        // }
        // const seller = buyerId
        return this.prisma.order.findMany({
            where,
            include: {
                service: true,
                // seller: { select: { full_name: true, email: true } },
                buyer: {
                    select: { full_name: true, email: true, username: true, profilePhoto: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    // Get seller earnings summary
    async getMyEarnings(sellerId: string) {
        // 1️⃣ Total earning: released orders - cancelled
        const totalReleased = await this.prisma.order.aggregate({
            where: { sellerId, status: OrderStatus.RELEASED },
            _sum: { seller_amount: true },
        });
        const totalSuccessfullREleaseAmount = totalReleased._sum.seller_amount || 0;

        // const totalCancelled = await this.prisma.order.aggregate({
        //     where: { sellerId, status: OrderStatus.CANCELLED },
        //     _sum: { seller_amount: true },
        // });

        const user = await this.prisma.user.findUnique({
            where: { id: sellerId },
        });

        // const onlyPending = await this.prisma.order.aggregate({
        //     where: {
        //         sellerId,
        //         status: {
        //             in: [OrderStatus.PENDING],
        //         },
        //     },
        //     _sum: { seller_amount: true },
        // });

        // const onlyPedningSum = onlyPending._sum.seller_amount || 0;
        // const totalEarning =
        //     (totalReleased._sum.seller_amount || 0) -
        //     (totalCancelled._sum.seller_amount || 0) -
        //     (onlyPending._sum.seller_amount || 0);

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
        // const availableBalance = totalEarning - pendingClearance - user?.withdrawn_amount!;

        const totalEarning = totalSuccessfullREleaseAmount + pendingClearance;
        const availableBalance = totalSuccessfullREleaseAmount - user?.withdrawn_amount!;
        return {
            totalEarning: totalEarning / 100,
            pendingClearance: pendingClearance / 100,
            availableBalance: availableBalance / 100,
            withdrawn_amount: user?.withdrawn_amount! / 100,
        };
    }

    async updateCancalProofSubmitted(orderId: string, isCancalProofSubmitted: boolean) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                service: true,
                seller: {
                    select: {
                        full_name: true,
                        id: true,
                        email: true,
                        username: true,
                        profilePhoto: true,
                    },
                },
                buyer: {
                    select: {
                        full_name: true,
                        id: true,
                        email: true,
                        username: true,
                        profilePhoto: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException("Order not found");
        }

        // যদি true হয় তাহলে proofUrl empty করে দিবে
        if (isCancalProofSubmitted) {
            const updatedOrder = await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    isCancalProofSubmitted: true,
                    proofUrl: [],
                },
                include: {
                    service: true,
                    buyer: {
                        select: {
                            full_name: true,
                            id: true,
                            email: true,
                            username: true,
                            profilePhoto: true,
                        },
                    },
                    seller: {
                        select: {
                            full_name: true,
                            id: true,
                            email: true,
                            username: true,
                            profilePhoto: true,
                        },
                    },
                },
            });

            // Send email notification to seller
            try {
                await this.mail.sendEmail(
                    order.seller.email,
                    "DaConnect - Proof Submission Cancelled 📋",
                    `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f7fa; }
                            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
                            .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px; }
                            .header-subtitle { font-size: 16px; opacity: 0.95; }
                            .content { padding: 40px 30px; }
                            .order-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 6px; }
                            .info-item { margin: 10px 0; }
                            .label { font-weight: 600; color: #374151; }
                            .value { color: #6b7280; }
                            .footer { text-align: center; padding: 25px; background: #f8fafc; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
                            .brand-name { color: #f59e0b; font-weight: 600; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <div class="logo">🎵 DaConnect</div>
                                <div class="header-subtitle">Order Proof Status Update</div>
                            </div>
                            <div class="content">
                                <h2 style="color: #1e293b; margin-bottom: 20px;">Hello ${order.seller.full_name || "Seller"}! 👋</h2>
                                <p style="font-size: 16px; color: #475569;">We wanted to inform you about an important update regarding one of your orders.</p>
                                
                                <div class="order-box">
                                    <h3 style="margin-top: 0; color: #92400e;">📋 Proof Submission Cancelled</h3>
                                    <div class="info-item">
                                        <span class="label">Order Code:</span>
                                        <span class="value">${order.orderCode}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Service:</span>
                                        <span class="value">${order.service?.serviceName || "N/A"}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Buyer username:</span>
                                        <span class="value">${order.buyer.username || order.buyer.email}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Buyer Name:</span>
                                        <span class="value">${order.buyer.full_name || order.buyer.email}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Amount:</span>
                                        <span class="value">$${(order.amount / 100).toFixed(2)}</span>
                                    </div>
                                </div>

                                <p style="font-size: 15px; color: #475569; margin: 25px 0;">The proof submission for this order has been cancelled and all previously uploaded proof files have been removed. You may need to re-upload the proof when ready.</p>
                                
                                <p style="font-size: 15px; color: #475569;">If you have any questions or concerns about this order, please don't hesitate to reach out to our support team.</p>
                                
                                <p style="font-size: 14px; color: #64748b; margin-top: 25px;">Thank you for being a valued member of the <span class="brand-name">DaConnect</span> community!</p>
                            </div>
                            
                            <div class="footer">
                                <p style="margin: 5px 0;">This is an automated email from <strong class="brand-name">DaConnect</strong>. Please do not reply.</p>
                                <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} DaConnect. All rights reserved.</p>
                                <p style="margin: 10px 0; font-size: 12px;">Empowering artists and connecting communities through music.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    `,
                );
            } catch (error) {
                console.error("Failed to send email notification:", error);
                // Continue even if email fails
            }

            return updatedOrder;
        }

        // যদি false হয় তাহলে শুধু isCancalProofSubmitted আপডেট হবে, proofUrl unchanged
        return await this.prisma.order.update({
            where: { id: orderId },
            data: {
                isCancalProofSubmitted: false,
            },
            include: {
                service: true,
                buyer: {
                    select: {
                        full_name: true,
                        id: true,
                        email: true,
                        username: true,
                        profilePhoto: true,
                    },
                },
                seller: {
                    select: {
                        full_name: true,
                        id: true,
                        email: true,
                        username: true,
                        profilePhoto: true,
                    },
                },
            },
        });
    }
}
