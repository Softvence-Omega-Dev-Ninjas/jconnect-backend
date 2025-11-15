import { ValidateUser } from "@common/jwt/jwt.decorator";
import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PaymentService } from "./payments.service";

@ApiTags("Payment practise") // Swagger group name
@Controller("payments")
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    // @ApiBearerAuth()
    // @ValidateUser()
    // @Post("create-session")
    // @ApiOperation({
    //     summary: "Create Stripe Checkout Session",
    //     description:
    //         "Creates a Stripe checkout session for purchasing a service. Requires a valid logged-in user.",
    // })
    // @ApiBody({
    //     description: "Stripe checkout session payload",
    //     schema: {
    //         type: "object",
    //         properties: {
    //             serviceId: {
    //                 type: "string",
    //                 example: "5f342d4d-b12e-4a0a-aa32-2341c908d221",
    //                 description: "ID of the service being purchased",
    //             },
    //         },
    //         required: ["serviceId"],
    //     },
    // })
    // createSession(@Req() req, @Body() body: any, @GetUser() user: any) {
    //     return this.paymentService.createCheckoutSession(req.user.id, body);
    // }

    @Post("create-session")
    @ApiOperation({ summary: "Create Stripe Checkout Session for a service" })
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                userId: { type: "string", example: "user-uuid" },
                serviceId: { type: "string", example: "service-uuid" },
                frontendUrl: { type: "string", example: "https://example.com" },
            },
            required: ["userId", "serviceId", "frontendUrl"],
        },
    })
    @ApiResponse({ status: 201, description: "Checkout session created successfully" })
    async createSession(@Body() body: { userId: string; serviceId: string; frontendUrl: string }) {
        return this.paymentService.createCheckoutSession(
            body.userId,
            body.serviceId,
            body.frontendUrl,
        );
    }

    @Post("approve-payment")
    @ApiOperation({ summary: "Admin approve payment and transfer to seller" })
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                paymentIntentId: { type: "string", example: "pi_12345" },
                sellerStripeAccountId: { type: "string", example: "acct_12345" },
                sellerAmount: { type: "number", example: 100 },
            },
            required: ["paymentIntentId", "sellerStripeAccountId", "sellerAmount"],
        },
    })
    @ApiResponse({
        status: 201,
        description: "Payment transferred to seller and admin fee calculated",
    })
    async approvePayment(
        @Body()
        body: {
            paymentIntentId: string;
            sellerStripeAccountId: string;
            sellerAmount: number;
        },
    ) {
        return this.paymentService.approvePayment(
            body.paymentIntentId,
            body.sellerStripeAccountId,
            body.sellerAmount,
        );
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Post("release-payment")
    @ApiOperation({ summary: "Release escrow payment to seller manually" })
    @ApiBody({
        description: "Send paymentIntent ID, seller Stripe account ID & amount",
        schema: {
            type: "object",
            properties: {
                paymentIntentId: { type: "string", example: "pi_3Zxyz123" },
                sellerId: { type: "string", example: "acct_1ABCxyz" },
                amount: { type: "number", example: 100 },
            },
        },
    })
    async releasePayment(
        @Body() body: { paymentIntentId: string; sellerId: string; amount: number },
    ) {
        return this.paymentService.releasePayment(body.paymentIntentId, body.sellerId, body.amount);
    }

    @Post("webhook")
    @ApiOperation({
        summary: "Stripe Webhook Receiver",
        description:
            "এই endpoint টি Stripe স্বয়ংক্রিয়ভাবে কল করবে। আপনি Swagger থেকে এটি টেস্ট করতে পারবেন না কারণ signature validation লাগবে।",
    })
    @ApiBody({
        description: "Stripe webhook raw event body",
        schema: {
            type: "object",
            example: {
                id: "evt_1Pxxxxxx",
                type: "checkout.session.completed",
                data: {
                    object: {
                        id: "cs_test_xxxxxx",
                        object: "checkout.session",
                        payment_intent: "pi_xxxxx",
                    },
                },
            },
        },
    })
    async stripeWebhook(@Req() req, @Headers("stripe-signature") signature: string) {
        return this.paymentService.handleWebhook(req.body, signature);
    }
}
