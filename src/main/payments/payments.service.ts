import {
    BadRequestException,
    HttpException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import Stripe from "stripe";

@Injectable()
export class PaymentService {
    constructor(
        private prisma: PrismaService,
        @Inject("STRIPE_CLIENT")
        private readonly stripe: Stripe,
    ) {}

    // @HandleError("Failed to create payment")
    // async createCheckoutSession(userId: string, payload: any) {
    //     const service = await this.prisma.service.findUnique({
    //         where: { id: payload.serviceId },
    //     });
    //     if (!service) throw new NotFoundException("Payment service not found");

    //     const seller = await this.prisma.user.findUnique({
    //         where: { id: service.creatorId },
    //     });

    //     if (!seller?.sellerIDStripe) {
    //         throw new BadRequestException(
    //             "Seller Stripe Account Missing – Connect account not created",
    //         );
    //     }

    //     const frontendUrl = process.env.FRONTEND_URL!
    //         ? process.env.FRONTEND_URL
    //         : `https://${process.env.FRONTEND_URL}`;

    //     const adminFee = service.price * 0.1;

    //     const session = await this.stripe.checkout.sessions.create({
    //         mode: "payment",
    //         payment_method_types: ["card"],
    //         payment_intent_data: {
    //             capture_method: "manual",
    //             application_fee_amount: Math.round(adminFee * 100),
    //         },

    //         line_items: [
    //             {
    //                 price_data: {
    //                     currency: "usd",
    //                     product_data: {
    //                         name: service.serviceName,
    //                         description: service.description || "",
    //                     },
    //                     unit_amount: service.price * 100,
    //                 },
    //                 quantity: 1,
    //             },
    //         ],

    //         success_url: `${frontendUrl}/success-payment`,
    //         cancel_url: `${frontendUrl}/cancel-payment`,
    //         metadata: { userId, serviceId: service.id },
    //     });

    //     return { url: session.url };
    // }

    // 1️⃣ Checkout Session create
    async createCheckoutSession(userId: string, serviceId: string, frontendUrl: string) {
        const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) throw new NotFoundException("Service not found");

        const session = await this.stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            payment_intent_data: {
                capture_method: "manual", // hold
            },
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: service.serviceName },
                        unit_amount: service.price * 100,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${frontendUrl}/success-payment`,
            cancel_url: `${frontendUrl}/cancel-payment`,
            metadata: { userId, serviceId: service.id },
            expand: ["payment_intent"],
        });

        return {
            url: session.url,
            sessionId: session.id,
            indtent: session.payment_intent as Stripe.PaymentIntent,
        };
    }

    // 2️⃣ Admin approve → seller transfer + fee calculate
    async approvePayment(
        paymentIntentId: string,
        sellerStripeAccountId: string,
        sellerAmount: number,
    ) {
        // Capture payment (hold → paid)
        const intent = await this.stripe.paymentIntents.capture(paymentIntentId);

        const totalReceived = (intent.amount_received || 0) / 100;

        if (sellerAmount > totalReceived) {
            throw new BadRequestException(
                "Seller amount cannot be more than total payment received",
            );
        }

        // Transfer to seller
        const transfer = await this.stripe.transfers.create({
            amount: sellerAmount * 100,
            currency: "usd",
            destination: sellerStripeAccountId,
            transfer_group: paymentIntentId,
        });

        // Remaining amount is admin fee
        const adminFee = totalReceived - sellerAmount;

        return { transfer, adminFee };
    }

    async releasePayment(paymentIntentId: string, sellerId: string, amount: number) {
        const transfer = await this.stripe.transfers.create({
            amount: amount * 100, // cents
            currency: "usd",
            destination: sellerId,
            transfer_group: paymentIntentId, // optional but recommended for tracking
        });

        return { success: true, message: "Payment manually transferred", transfer };
    }

    async handleWebhook(rawBody: Buffer, signature: string) {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_LOCAL!;

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
        } catch (err) {
            console.log("❌ Webhook signature verification failed");
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }

        console.log("📌 Webhook Received:", event.type);

        switch (event.type) {
            // Checkout complete
            // case "checkout.session.completed": {
            //     const session = event.data.object as Stripe.Checkout.Session;

            //     // metadata থেকে fields আনো
            //     const userId = session.metadata?.userId;
            //     const serviceId = session.metadata?.serviceId;

            //     console.log("🎉 Checkout Completed");
            //     console.log({ userId, serviceId });

            //     // এখানে Order Save করতে পারো
            //     // await this.prisma.order.create({
            //     //     data: {
            //     //         buyerId: userId,
            //     //         serviceId: serviceId,
            //     //         amount: session.amount_total! / 100,
            //     //         paymentIntentId: session.payment_intent as string,
            //     //         status: "ACTIVE"
            //     //     }
            //     // });

            //     break;
            // }

            // Payment captured (Seller payout will happen)
            case "payment_intent.succeeded": {
                const intent = event.data.object as Stripe.PaymentIntent;

                if (!intent) throw new HttpException("intent not found", 404);
                // Save status
                await this.prisma.order.update({
                    where: { paymentIntentId: intent.id },
                    data: { status: "PAID" },
                });

                console.log("ami intent id", intent.id);

                console.log("Payment completed - Awaiting manual transfer");
                break;
            }

            case "checkout.session.completed":
                const session = event.data.object as Stripe.Checkout.Session;

                // PaymentIntent ID safely get করা
                const piId =
                    typeof session.payment_intent === "string"
                        ? session.payment_intent
                        : (session.payment_intent as Stripe.PaymentIntent)?.id;

                if (!piId) {
                    console.log("❌ PaymentIntent ID not found in session");
                    break;
                }

                console.log("💳 PaymentIntent ID (from session):", piId);

                // Manual capture
                const capturedIntent = await this.stripe.paymentIntents.capture(piId);
                console.log(
                    "✅ Payment captured:",
                    capturedIntent.id,
                    "Amount:",
                    capturedIntent.amount_received / 100,
                );

                // এখানে database update করতে পারেন
                // await this.prisma.order.update({ ... })

                break;

            case "payment_intent.created":
            case "payment_intent.amount_capturable_updated":
            case "charge.succeeded":
                const intent = event.data.object as Stripe.PaymentIntent;
                console.log("💳 PaymentIntent ID (from intent):", intent.id);
                break;
        }
        // Payment refunded or canceled
        // case "payment_intent.payment_failed": {
        //     console.log("❌ Payment Failed");
        //     break;
        // }

        return { received: true };
    }
}
