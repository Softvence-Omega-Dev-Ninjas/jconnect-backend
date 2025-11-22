import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import {
    BadRequestException,
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiBody,
    ApiExcludeEndpoint,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { ConfirmSetupIntentDto, CreateSetupIntentDto } from "./dto/confirm-setup-intent.dto";
import { WithdrawDto } from "./dto/withdraw.dto";
import { PaymentService } from "./payments.service";

@ApiTags("Payment")
@Controller("payments")
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    @ApiBearerAuth()
    @ValidateUser()
    @Post("create-setup-intent")
    @ApiOperation({ summary: "Create SetupIntent for buyer to save card" })
    @ApiBody({ type: CreateSetupIntentDto })
    async createSetupIntent(@Body() body: CreateSetupIntentDto, @GetUser() user: any) {
        return this.paymentService.createSetupIntent(body, user);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Post("confirm-setup-intent")
    @ApiOperation({ summary: "Confirm SetupIntent (Swagger test mode)" })
    @ApiBody({ type: ConfirmSetupIntentDto })
    async confirmSetupIntent(@Body() body: ConfirmSetupIntentDto, @GetUser() user: any) {
        return this.paymentService.confirmSetupIntent(body, user);
    }

    // ----------------------------
    // Create Checkout Session
    // ----------------------------
    @ApiBearerAuth()
    @ValidateUser()
    @Post("make-payment")
    @ApiOperation({ summary: "buyer make payment with payment-methode with 5% vat charge" })
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                serviceId: { type: "string" },
                frontendUrl: {
                    type: "string",
                    example: "https://shamimrana2006.github.io/shamimrana2006",
                },
            },
            required: ["serviceId", "frontendUrl"],
        },
    })
    async createSession(@GetUser() user, @Body() body: { serviceId: string; frontendUrl: string }) {
        return this.paymentService.createOrderWithPaymentMethod(
            user,
            body.serviceId,
            body.frontendUrl,
        );
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

    // ----------------------------
    // Refund Payment
    // ----------------------------
    @ApiExcludeEndpoint()
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

    @ApiBearerAuth()
    @ValidateUser()
    @Post()
    @ApiOperation({ summary: "Request withdrawal to seller Stripe account" })
    @ApiBody({
        description: "Withdraw amount",
        type: WithdrawDto,
    })
    async withdraw(@Body() body: WithdrawDto, @GetUser() user: any) {
        if (!body.amount) {
            throw new BadRequestException("Withdraw amount is required");
        }

        return this.paymentService.transferToSeller(user.userId, body.amount);
    }
}
