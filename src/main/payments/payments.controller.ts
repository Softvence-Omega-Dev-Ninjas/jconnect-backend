import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PaymentService } from "./payments.service";

@ApiTags("Payment practise") // Swagger group name
@Controller("payments")
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    @ApiBearerAuth()
    @ValidateUser()
    @Post("create-session")
    @ApiOperation({
        summary: "Create Stripe Checkout Session",
        description:
            "Creates a Stripe checkout session for purchasing a service. Requires a valid logged-in user.",
    })
    @ApiBody({
        description: "Stripe checkout session payload",
        schema: {
            type: "object",
            properties: {
                serviceId: {
                    type: "string",
                    example: "5f342d4d-b12e-4a0a-aa32-2341c908d221",
                    description: "ID of the service being purchased",
                },
            },
            required: ["serviceId"],
        },
    })
    createSession(@Req() req, @Body() body: any, @GetUser() user: any) {
        return this.paymentService.createCheckoutSession(req.user.id, body);
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
