import { HandleError } from "@common/error/handle-error.decorator";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import Stripe from "stripe";

@Injectable()
export class PaymentService {
    constructor(
        private prisma: PrismaService,
        @Inject("STRIPE_CLIENT")
        private readonly stripe: Stripe,
    ) {}

    @HandleError("Failed to create payment")
    async createCheckoutSession(userId: string, payload: any) {
        const service = await this.prisma.service.findUnique({
            where: { id: payload.serviceId },
        });
        if (!service) throw new NotFoundException("Payment service not found");

        const seller = await this.prisma.user.findUnique({
            where: { id: service.creatorId },
        });

        if (!seller?.sellerIDStripe) {
            throw new BadRequestException(
                "Seller Stripe Account Missing – Connect account not created",
            );
        }

        const frontendUrl = process.env.FRONTEND_URL!
            ? process.env.FRONTEND_URL
            : `https://${process.env.FRONTEND_URL}`;

        const adminFee = service.price * 0.1;

        const session = await this.stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            payment_intent_data: {
                capture_method: "manual",
                transfer_data: {
                    destination: seller.sellerIDStripe,
                },
                application_fee_amount: Math.round(adminFee * 100),
            },

            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: service.serviceName,
                            description: service.description || "",
                        },
                        unit_amount: service.price * 100,
                    },
                    quantity: 1,
                },
            ],

            success_url: `${frontendUrl}/success-payment`,
            cancel_url: `${frontendUrl}/cancel-payment`,
            metadata: { userId, serviceId: service.id },
        });

        return { url: session.url };
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
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                // metadata থেকে fields আনো
                const userId = session.metadata?.userId;
                const serviceId = session.metadata?.serviceId;

                console.log("🎉 Checkout Completed");
                console.log({ userId, serviceId });

                // এখানে Order Save করতে পারো
                // await this.prisma.order.create({
                //     data: {
                //         buyerId: userId,
                //         serviceId: serviceId,
                //         amount: session.amount_total! / 100,
                //         paymentIntentId: session.payment_intent as string,
                //         status: "ACTIVE"
                //     }
                // });

                break;
            }

            // Payment captured (Seller payout will happen)
            case "payment_intent.succeeded": {
                const intent = event.data.object as Stripe.PaymentIntent;

                console.log("💰 Payment Captured & Transferred to seller");
                console.log(intent.id);

                break;
            }

            // Payment refunded or canceled
            case "payment_intent.payment_failed": {
                console.log("❌ Payment Failed");
                break;
            }
        }

        return { received: true };
    }
}
