import {
    BadRequestException,
    HttpException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { OrderStatus, Role } from "@prisma/client";
import { MailService } from "src/lib/mail/mail.service";
import { PrismaService } from "src/lib/prisma/prisma.service";
import Stripe from "stripe";

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private prisma: PrismaService,
        @Inject("STRIPE_CLIENT")
        private readonly stripe: Stripe,
        private readonly mail: MailService,
    ) {}

    async createCheckoutSession(userFromReq: any, serviceId: string, frontendUrl: string) {
        const user: any = await this.prisma.user.findUnique({ where: { id: userFromReq?.userId } });
        // console.log("ami to asol user", user, userFromReq.userId);
        const service = await this.prisma.service.findUnique({
            where: { id: serviceId },
            include: { creator: { omit: { password: true } } },
        });

        if (!service) throw new NotFoundException("Service not found");

        // create stripe checkout session with payment_intent expanded
        const session = await this.stripe.checkout.sessions.create({
            mode: "payment",
            customer: user?.customerIdStripe || undefined,
            payment_method_types: ["card"],
            payment_intent_data: {
                capture_method: "manual", // hold funds until capture
            },
            line_items: [
                {
                    price_data: {
                        currency: service.currency?.toLowerCase() || "usd",
                        product_data: {
                            name: service.serviceName,
                            description: service.description || "",
                        },
                        unit_amount: Math.round(service.price * 100),
                    },
                    quantity: 1,
                },
            ],
            success_url: `${frontendUrl}/success-payment?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/cancel-payment`,
            metadata: { userId: userFromReq.userId, serviceId },
            expand: ["payment_intent"],
        });

        // ******* if you want to include application fee and transfer to connected account
        //  then you need to instant payment you cant use manual capture
        // -----------------------------
        // const session = await this.stripe.checkout.sessions.create({
        //     mode: "payment",
        //     customer: user.customerIdStripe || undefined,
        //     payment_method_types: ["card"],
        //     payment_intent_data: {
        //         capture_method: "manual", //
        //         application_fee_amount: Math.round(service.price * 100 * 0.1),
        //         transfer_data: {
        //             // seller's Stripe account ID
        //             destination: service.creator?.sellerIDStripe,
        //         },
        //     },
        //     line_items: [
        //         {
        //             price_data: {
        //                 currency: service.currency?.toLowerCase() ?? "usd",
        //                 product_data: {
        //                     name: service.serviceName,
        //                     description: service.description || "",
        //                 },
        //                 unit_amount: Math.round(service.price * 100),
        //             },
        //             quantity: 1,
        //         },
        //     ],
        //     success_url: `${frontendUrl}/success-payment?session_id={CHECKOUT_SESSION_ID}`,
        //     cancel_url: `${frontendUrl}/cancel-payment`,
        //     metadata: { userId: userFromReq.userId, serviceId },
        //     expand: ["payment_intent"],
        // });

        const paymentIntent = session.payment_intent as Stripe.PaymentIntent | undefined;
        const paymentIntentId =
            typeof session.payment_intent === "string" ? session.payment_intent : paymentIntent?.id;

        // create order record in DB (if not already created). status: PENDING
        // use transaction to avoid race (optional)

        const order = await this.prisma.order.create({
            data: {
                orderCode: `ORD-${Date.now()}`,
                buyerId: userFromReq.userId,
                sellerId: service.creatorId || "unknown",
                sellerIdStripe: service.creator?.sellerIDStripe || "",
                sessionId: session.id,
                serviceId: service.id,
                paymentIntentId: paymentIntentId ?? undefined,
                amount: service.price,
                platformFee: 0, // set later (or compute here)
                status: OrderStatus.PENDING,
            },
        });

        await this.mail.sendEmail(
            service.creator?.email,
            "Order Placed Successfully",
            `
        <h1>Your order is successfully placed!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>Amount: $${order.amount}</p>
         <p>Buyer: ${userFromReq.email}</p>
        <p>Status: ${order.status}</p>
        `,
        );

        await this.mail.sendEmail(
            userFromReq.email,
            "You Got a New Order",
            `
        <h1>New Order Received!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>Service: ${service.serviceName}</p>
        <p>Seller: ${service.creator?.email}</p>
        <p>Amount: $${order.amount}</p>
        `,
        );

        return {
            url: session.url,
            sessionId: session.id,
            paymentIntentId,
            orderId: order.id,
        };
    }

    async approvePayment(orderId: string, user: any) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: { omit: { password: true } },
                seller: { omit: { password: true } },
                service: { include: { creator: { omit: { password: true } } } },
            },
        });
        const paymentIntentId = order?.paymentIntentId;
        const sellerStripeAccountId = order?.sellerIdStripe;

        console.log(user.roles.includes(Role.ADMIN));

        if (
            order?.buyerId !== user.userId &&
            !user.roles.includes(Role.ADMIN) &&
            !user.roles.includes(Role.SUPER_ADMIN)
        ) {
            throw new HttpException("Only buyer or admin can approve payment", 403);
        }

        if (!paymentIntentId)
            throw new BadRequestException(
                "buyer not place the payment or Order does not have a paymentIntentId",
            );
        if (!sellerStripeAccountId)
            throw new BadRequestException("Order does not have a seller Stripe Account ID");

        // const order = await this.prisma.order.findUnique({ where: { paymentIntentId } });
        if (!order) throw new NotFoundException("Order not found for this payment intent");
        if (order.status == OrderStatus.RELEASED)
            throw new HttpException("Order already released", 404);
        const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

        let capturedIntent: Stripe.PaymentIntent = intent;
        if (intent.status !== "succeeded" && intent.capture_method === "manual") {
            capturedIntent = await this.stripe.paymentIntents.capture(paymentIntentId);
            this.logger.log(`Captured PaymentIntent ${paymentIntentId}`);
        }

        const setting = await this.prisma.setting.findUnique({
            where: { id: "platform_settings" },
        });

        if (!setting?.platformFee)
            throw new BadRequestException("Platform fee is not set in settings");

        const platformFeePercent = Number(setting?.platformFee); // e.g. 10%
        const amountCents = Math.floor(Number(order.amount) * 100);
        const adminFeeCents = Math.floor((amountCents * platformFeePercent) / 100);
        const transferableSellerAmount = amountCents - adminFeeCents;
        const transfer = await this.stripe.transfers.create({
            amount: transferableSellerAmount,
            currency: capturedIntent.currency || "usd",
            destination: sellerStripeAccountId,
            transfer_group: paymentIntentId,
        });

        // update order in DB
        const updated = await this.prisma.order.update({
            where: { id: order.id },
            data: {
                status: OrderStatus.RELEASED,
                isReleased: true,
                releasedAt: new Date(),
                platformFee: setting?.platformFee,
            },
        });

        await this.mail.sendEmail(
            order.buyer.email,
            "Order Payment Successfully",
            `
        <h1>Your order is successfully Paid!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>Amount: $${order.amount}</p>
        <p>Status: ${order.status}</p>
        `,
        );

        await this.mail.sendEmail(
            order?.seller.email,
            "Order Payment Released",
            `
        <h1>Your Order Released!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>Service: ${order.service.serviceName}</p>
        <p>Buyer: ${order.service.creator?.email}</p>
        <p>Amount: $${order.amount}</p>
        `,
        );

        return { transfer, platformFee: setting?.platformFee, order: updated };
    }

    async refundPayment(orderId: string, user: any) {
        // 1) Load order with relations
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: { omit: { password: true } },
                seller: { omit: { password: true } },
                service: true,
            },
        });

        if (!order) throw new NotFoundException("Order not found");

        // Only buyer or admin can request refund
        const isBuyer = order.buyerId === user.userId;
        const isAdmin = user.roles.includes(Role.ADMIN);
        const isSuperAdmin = user.roles.includes(Role.SUPER_ADMIN);
        console.log(isBuyer, isAdmin, isSuperAdmin, user);

        if (!isBuyer && !isAdmin && !isSuperAdmin) {
            throw new HttpException("You cannot request a refund for this order.", 403);
        }

        if (!order.paymentIntentId)
            throw new BadRequestException("PaymentIntent ID not found for this order");

        if (order.status === OrderStatus.RELEASED)
            throw new BadRequestException("Order already released, refund not possible");

        // Load payment intent
        const intent = await this.stripe.paymentIntents.retrieve(order.paymentIntentId);

        // 2) If payment is not captured yet (requires_capture)
        //    → Cancel PaymentIntent (refund not needed)
        if (intent.status === "requires_capture") {
            await this.stripe.paymentIntents.cancel(order.paymentIntentId);

            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: OrderStatus.CANCELLED },
            });

            await this.mail.sendEmail(
                order.buyer.email,
                "Payment Cancelled",
                `
            <h1>Your payment was cancelled.</h1>
            <p>Order Code: ${order.orderCode}</p>
            <p>Status: Cancelled</p>
        `,
            );

            return { message: "Payment authorization cancelled. No refund needed." };
        }

        // 3) Payment was captured → refund the payment
        const refund = await this.stripe.refunds.create({
            payment_intent: order.paymentIntentId,
            amount: Math.round(Number(order.amount) * 100),
        });

        // 4) Update order status
        const updated = await this.prisma.order.update({
            where: { id: order.id },
            data: {
                status: OrderStatus.CANCELLED,
                isReleased: false,
                platformFee: 0,
            },
        });

        // 5) Send Email to Buyer
        await this.mail.sendEmail(
            order.buyer.email,
            "Refund Issued Successfully",
            `
        <h1>Your refund has been processed!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>Amount Refunded: $${order.amount}</p>
        <p>Status: CANCELLED</p>
    `,
        );

        // 6) Notify Seller
        await this.mail.sendEmail(
            order.seller.email,
            "Order Refunded",
            `
        <h1>The order has been refunded!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>No payout will be issued for this order.</p>
    `,
        );

        return {
            message: "Refund issued successfully",
            refund,
            order: updated,
        };
    }

    /**
     * 3) Manual releasePayment (alias) — similar to approvePayment but given orderId & amount
     */
    // async releasePaymentByOrder(orderId: string, sellerStripeAccountId: string, amount: number) {
    //     const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    //     if (!order) throw new NotFoundException("Order not found");

    //     if (!order.paymentIntentId) {
    //         throw new BadRequestException("Order does not have a paymentIntentId");
    //     }

    //     // Capture intent if needed
    //     const intent = await this.stripe.paymentIntents.retrieve(order.paymentIntentId);
    //     if (intent.status !== "succeeded" && intent.capture_method === "manual") {
    //         await this.stripe.paymentIntents.capture(order.paymentIntentId);
    //     }

    //     const transfer = await this.stripe.transfers.create({
    //         amount: Math.round(amount * 100),
    //         currency: intent.currency || "usd",
    //         destination: sellerStripeAccountId,
    //         transfer_group: order.paymentIntentId,
    //     });

    //     const totalReceived = (intent.amount_received || intent.amount || 0) / 100;
    //     const adminFee = totalReceived - amount;

    //     const updated = await this.prisma.order.update({
    //         where: { id: orderId },
    //         data: {
    //             status: OrderStatus.RELEASED,
    //             isReleased: true,
    //             releasedAt: new Date(),
    //             platformFee: adminFee,
    //         },
    //     });
    //     const userFromReq = await this.prisma.user.findUnique({
    //         where: { id: order.buyerId },
    //     });
    //     // await this.mail.sendEmail(
    //     //     userFromReq?.email,
    //     //     "Order Placed Successfully",
    //     //     `
    //     // <h1>Your order is successfully placed!</h1>
    //     // <p>Order Code: ${order.orderCode}</p>
    //     // <p>Amount: $${order.amount}</p>
    //     // <p>Status: ${order.status}</p>
    //     // `
    //     // );

    //     // await this.mail.sendEmail(
    //     //     service.creator?.email,
    //     //     "You Got a New Order",
    //     //     `
    //     // <h1>New Order Received!</h1>
    //     // <p>Order Code: ${order.orderCode}</p>
    //     // <p>Service: ${service.serviceName}</p>
    //     // <p>Buyer: ${service.creator?.email}</p>
    //     // <p>Amount: $${order.amount}</p>
    //     // `
    //     // );

    //     return { transfer, adminFee, order: updated };
    // }

    /**
     * 4) Webhook handler
     *
     * - constructs stripe event and handles:
     *   - checkout.session.completed: create order if missing OR attach paymentIntentId
     *   - payment_intent.succeeded: set order status = PAID
     *   - other useful events logged
     */
    async handleWebhook(rawBody: Buffer, signature: string) {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_S!;
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
        } catch (err: any) {
            this.logger.error("Webhook signature verification failed", err?.message || err);
            throw new BadRequestException(`Webhook Error: ${err?.message || err}`);
        }

        this.logger.log(`Webhook received: ${event.type}`);

        try {
            switch (event.type) {
                case "checkout.session.completed": {
                    const session = event.data.object as Stripe.Checkout.Session;
                    console.log("payment_intent.completed call here");
                    // get paymentIntent id
                    const piId =
                        typeof session.payment_intent === "string"
                            ? session.payment_intent
                            : (session.payment_intent as Stripe.PaymentIntent)?.id;

                    if (!piId) {
                        this.logger.warn("checkout.session.completed without payment_intent");
                        break;
                    }

                    // If order already exists with this paymentIntentId, skip or update
                    const existing = await this.prisma.order.findUnique({
                        where: { paymentIntentId: piId },
                    });

                    if (existing?.paymentIntentId) {
                        this.logger.log(`Order already exists for PI ${piId}, skipping create`);
                        break;
                    }

                    // create order record (still PENDING — we'll mark PAID on payment_intent.succeeded)
                    await this.prisma.order.update({
                        where: { sessionId: session.id },
                        data: {
                            paymentIntentId: piId,
                        },
                    });

                    this.logger.log(`Order created for PaymentIntent ${piId}`);
                    break;
                }

                case "payment_intent.succeeded": {
                    const intent = event.data.object as Stripe.PaymentIntent;
                    if (!intent?.id) {
                        this.logger.warn("payment_intent.succeeded without id");
                        break;
                    }

                    // find order and mark PAID
                    const order = await this.prisma.order.findUnique({
                        where: { paymentIntentId: intent.id },
                    });
                    if (!order) {
                        this.logger.warn(`No order found for paymentIntent ${intent.id}`);
                        break;
                    }

                    await this.prisma.order.update({
                        where: { id: order.id },
                        data: { status: OrderStatus.PAID },
                    });

                    this.logger.log(`Order ${order.id} marked PAID`);
                    break;
                }

                // optional other events
                case "payment_intent.payment_failed":
                    this.logger.warn("payment_intent.payment_failed", event.data.object);
                    break;

                default:
                    this.logger.debug(`Unhandled event type ${event.type}`);
            }
        } catch (e) {
            this.logger.error("Error handling webhook", e as any);
            // don't throw — return 200 to Stripe after logging? but for now bubble up
            throw e;
        }

        return { received: true };
    }

    /**
     * helper: find service.creatorId (sellerId)
     */
    private async findServiceCreatorId(serviceId: string) {
        const svc = await this.prisma.service.findUnique({ where: { id: serviceId } });
        return svc?.creatorId ?? "unknown";
    }
}
