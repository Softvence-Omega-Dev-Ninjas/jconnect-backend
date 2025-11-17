import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PaymentService } from "./payments.service";

@ApiTags("Payment")
@Controller("payments")
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    // ----------------------------
    // Create Checkout Session
    // ----------------------------
    @ApiBearerAuth()
    @ValidateUser()
    @Post("create-session")
    @ApiOperation({ summary: "Create Stripe Checkout Session for a service" })
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                serviceId: { type: "string" },
                frontendUrl: { type: "string", example: "https://your-frontend.com" },
            },
            required: ["serviceId", "frontendUrl"],
        },
    })
    async createSession(@GetUser() user, @Body() body: { serviceId: string; frontendUrl: string }) {
        return this.paymentService.createCheckoutSession(user, body.serviceId, body.frontendUrl);
    }

    // ----------------------------
    // Admin Approve Payment Release
    // ----------------------------
    @ApiBearerAuth()
    @ValidateUser()
    @Post("approve-payment")
    @ApiOperation({
        summary: "Admin approves escrow payment & transfers money to seller",
        description: `
This endpoint is used by Admin/Buyer only.
✔ Finds the order using paymentIntentId  
✔ Captures the charge if still uncaptured  
✔ Calculates platform fee from Settings table  
✔ Transfers seller's portion to their Stripe Connected Account  
✔ Marks order as RELEASED  
`,
    })
    @ApiBody({
        description: "Payment approval payload",
        schema: {
            type: "object",
            properties: {
                orderID: {
                    type: "string",
                    example: "dsafsdf_32432",
                    description: "Order ID associated with the payment to be approved",
                },
            },
            required: ["orderID"],
        },
    })
    async approvePayment(
        @Body()
        body: {
            orderID: string;
        },
        @GetUser() user: any,
    ) {
        return this.paymentService.approvePayment(body.orderID, user);
    }

    @ApiExcludeEndpoint()
    @Post("webhook")
    async stripeWebhook(@Req() req, @Headers("stripe-signature") signature: string) {
        return this.paymentService.handleWebhook(req.body, signature);
    }
}
