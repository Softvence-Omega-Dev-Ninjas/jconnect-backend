import {
    BadRequestException,
    HttpException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import Stripe from "stripe";

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private prisma: PrismaService,
        @Inject("STRIPE_CLIENT")
        private readonly stripe: Stripe,
    ) {}

    async createCheckoutSession(userId: string, serviceId: string, frontendUrl: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        console.log("ami to asol user", user, userId);
        const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) throw new NotFoundException("Service not found");

        // create stripe checkout session with payment_intent expanded
        const session = await this.stripe.checkout.sessions.create({
            mode: "payment",
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
            metadata: { userId, serviceId },
            expand: ["payment_intent"],
        });

        const paymentIntent = session.payment_intent as Stripe.PaymentIntent | undefined;
        const paymentIntentId =
            typeof session.payment_intent === "string" ? session.payment_intent : paymentIntent?.id;

        // create order record in DB (if not already created). status: PENDING
        // use transaction to avoid race (optional)

        const order = await this.prisma.order.create({
            data: {
                orderCode: `ORD-${Date.now()}`,
                buyerId: userId,
                sellerId: service.creatorId || "unknown",
                sellerIdStripe: user?.sellerIDStripe || "",
                sessionId: session.id,
                serviceId: service.id,
                paymentIntentId: paymentIntentId ?? undefined,
                amount: service.price,
                platformFee: 0, // set later (or compute here)
                status: OrderStatus.PENDING,
            },
        });

        return {
            url: session.url,
            sessionId: session.id,
            paymentIntentId,
            orderId: order.id,
        };
    }

    async approvePayment(orderId: string) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        const paymentIntentId = order?.paymentIntentId;
        const sellerStripeAccountId = order?.sellerIdStripe;
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

        const platformFeePercent = Number(setting?.platformFee); // e.g. 10%
        const amountCents = Math.floor(order.amount * 100);
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

        return { transfer, platformFee: setting?.platformFee, order: updated };
    }

    /**
     * 3) Manual releasePayment (alias) — similar to approvePayment but given orderId & amount
     */
    async releasePaymentByOrder(orderId: string, sellerStripeAccountId: string, amount: number) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException("Order not found");

        if (!order.paymentIntentId) {
            throw new BadRequestException("Order does not have a paymentIntentId");
        }

        // Capture intent if needed
        const intent = await this.stripe.paymentIntents.retrieve(order.paymentIntentId);
        if (intent.status !== "succeeded" && intent.capture_method === "manual") {
            await this.stripe.paymentIntents.capture(order.paymentIntentId);
        }

        const transfer = await this.stripe.transfers.create({
            amount: Math.round(amount * 100),
            currency: intent.currency || "usd",
            destination: sellerStripeAccountId,
            transfer_group: order.paymentIntentId,
        });

        const totalReceived = (intent.amount_received || intent.amount || 0) / 100;
        const adminFee = totalReceived - amount;

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.RELEASED,
                isReleased: true,
                releasedAt: new Date(),
                platformFee: adminFee,
            },
        });

        return { transfer, adminFee, order: updated };
    }

    /**
     * 4) Webhook handler
     *
     * - constructs stripe event and handles:
     *   - checkout.session.completed: create order if missing OR attach paymentIntentId
     *   - payment_intent.succeeded: set order status = PAID
     *   - other useful events logged
     */
    async handleWebhook(rawBody: Buffer, signature: string) {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_LOCAL!;
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
