import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post, Req } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiBody,
    ApiExcludeEndpoint,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
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
    // Admin/buyer Approve Payment Release
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

    @ApiBearerAuth()
    @ValidateUser()
    @Post("refund/:orderId")
    @ApiOperation({ summary: "Request a refund for an order" })
    @ApiParam({ name: "orderId", description: "ID of the order to refund" })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: "Refund issued successfully" })
    @ApiResponse({ status: 403, description: "User not authorized to request refund" })
    @ApiResponse({ status: 404, description: "Order not found" })
    @ApiResponse({ status: 400, description: "Invalid request / PaymentIntent missing" })
    @HttpCode(HttpStatus.OK)
    async refundPayment(@Param("orderId") orderId: string, @GetUser() user: any) {
        return await this.paymentService.refundPayment(orderId, user);
    }

    @ApiExcludeEndpoint()
    @Post("webhook")
    async stripeWebhook(@Req() req, @Headers("stripe-signature") signature: string) {
        return this.paymentService.handleWebhook(req.body, signature);
    }
}
