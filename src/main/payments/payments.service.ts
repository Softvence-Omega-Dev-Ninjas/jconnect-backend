import { errorResponse } from "@common/utilsResponse/response.util";
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
import { ConfirmSetupIntentDto, CreateSetupIntentDto } from "./dto/confirm-setup-intent.dto";

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private prisma: PrismaService,
        @Inject("STRIPE_CLIENT")
        private readonly stripe: Stripe,
        private readonly mail: MailService,
    ) {}

    async createSetupIntent(body: CreateSetupIntentDto, userReq: any) {
        const user = await this.prisma.user.findUnique({ where: { id: userReq?.userId } });
        if (!user?.customerIdStripe)
            throw new BadRequestException("User does not have a Stripe Customer ID");
        const setupIntent = await this.stripe.setupIntents.create({
            customer: user.customerIdStripe,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never",
            },
        });
        return { client_secret: setupIntent.client_secret };
    }

    async confirmSetupIntent(body: ConfirmSetupIntentDto, ReqUser: any) {
        const setupIntentId = body.clientSecret.split("_secret")[0];

        const paymentMethod = await this.stripe.paymentMethods.create({
            type: "card",

            card: {
                token: body.token,
            },
        });

        const useGET = await this.prisma.user.findUnique({ where: { id: ReqUser.userId } });

        if (!useGET?.customerIdStripe)
            throw new BadRequestException("User does not have a Stripe Customer ID");
        await this.stripe.paymentMethods.attach(paymentMethod.id, {
            customer: useGET.customerIdStripe,
        });

        const result = await this.stripe.setupIntents.confirm(setupIntentId, {
            payment_method: paymentMethod.id,
        });

        await this.prisma.user.update({
            where: { id: ReqUser.userId },
            data: {
                paymentMethod: {
                    create: {
                        paymentMethod: paymentMethod.id,
                        cardBrand: paymentMethod.card?.brand || "unknown",
                        last4: paymentMethod.card?.last4 || "0000",
                        expMonth: paymentMethod.card?.exp_month || 0,
                        expYear: paymentMethod.card?.exp_year || 0,
                    },
                },
            },
        });

        return {
            status: "success",
            paymentMethodId: result.payment_method,
        };
    }

    // async createCheckoutSession(userFromReq: any, serviceId: string, frontendUrl: string) {
    //     const user: any = await this.prisma.user.findUnique({ where: { id: userFromReq?.userId } });
    //     // console.log("ami to asol user", user, userFromReq.userId);
    //     const service = await this.prisma.service.findUnique({
    //         where: { id: serviceId },
    //         include: { creator: { omit: { password: true } } },
    //     });

    //     if (!service) throw new NotFoundException("Service not found");

    //     // create stripe checkout session with payment_intent expanded
    //     const session = await this.stripe.checkout.sessions.create({
    //         mode: "payment",
    //         customer: user?.customerIdStripe || undefined,
    //         payment_method_types: ["card"],
    //         payment_intent_data: {
    //             capture_method: "manual", // hold funds until capture
    //         },
    //         line_items: [
    //             {
    //                 price_data: {
    //                     currency: service.currency?.toLowerCase() || "usd",
    //                     unit_amount: Math.round(service.price * 100),
    //                 },
    //                 quantity: 1,
    //             },
    //         ],
    //         success_url: `${frontendUrl}/success-payment?session_id={CHECKOUT_SESSION_ID}`,
    //         cancel_url: `${frontendUrl}/cancel-payment`,
    //         metadata: { userId: userFromReq.userId, serviceId },
    //         expand: ["payment_intent"],
    //     });

    //     // ******* if you want to include application fee and transfer to connected account
    //     //  then you need to instant payment you cant use manual capture
    //     // -----------------------------
    //     // const session = await this.stripe.checkout.sessions.create({
    //     //     mode: "payment",
    //     //     customer: user.customerIdStripe || undefined,
    //     //     payment_method_types: ["card"],
    //     //     payment_intent_data: {
    //     //         capture_method: "manual", //
    //     //         application_fee_amount: Math.round(service.price * 100 * 0.1),
    //     //         transfer_data: {
    //     //             // seller's Stripe account ID
    //     //             destination: service.creator?.sellerIDStripe,
    //     //         },
    //     //     },
    //     //     line_items: [
    //     //         {
    //     //             price_data: {
    //     //                 currency: service.currency?.toLowerCase() ?? "usd",
    //     //                 product_data: {
    //     //                     name: service.serviceName,
    //     //                     description: service.description || "",
    //     //                 },
    //     //                 unit_amount: Math.round(service.price * 100),
    //     //             },
    //     //             quantity: 1,
    //     //         },
    //     //     ],
    //     //     success_url: `${frontendUrl}/success-payment?session_id={CHECKOUT_SESSION_ID}`,
    //     //     cancel_url: `${frontendUrl}/cancel-payment`,
    //     //     metadata: { userId: userFromReq.userId, serviceId },
    //     //     expand: ["payment_intent"],
    //     // });

    //     const paymentIntent = session.payment_intent as Stripe.PaymentIntent | undefined;
    //     const paymentIntentId =
    //         typeof session.payment_intent === "string" ? session.payment_intent : paymentIntent?.id;

    //     const order = await this.prisma.order.create({
    //         data: {
    //             orderCode: `ORD-${Date.now()}`,
    //             buyerId: userFromReq.userId,
    //             sellerId: service.creatorId || "unknown",
    //             sellerIdStripe: service.creator?.sellerIDStripe || "",
    //             sessionId: session.id,
    //             serviceId: service.id,
    //             paymentIntentId: paymentIntentId ?? undefined,
    //             amount: service.price,
    //             platformFee: 0, // set later (or compute here)
    //             status: OrderStatus.PENDING,
    //         },
    //     });

    //     await this.mail.sendEmail(
    //         service.creator?.email,
    //         "Order Placed Successfully",
    //         `
    //     <h1>Your order is successfully placed!</h1>
    //     <p>Order Code: ${order.orderCode}</p>
    //     <p>Amount: $${order.amount}</p>
    //      <p>Buyer: ${userFromReq.email}</p>
    //     <p>Status: ${order.status}</p>
    //     `,
    //     );

    //     await this.mail.sendEmail(
    //         userFromReq.email,
    //         "You Got a New Order",
    //         `
    //     <h1>New Order Received!</h1>
    //     <p>Order Code: ${order.orderCode}</p>
    //     <p>Service: ${service.serviceName}</p>
    //     <p>Seller: ${service.creator?.email}</p>
    //     <p>Amount: $${order.amount}</p>
    //     `,
    //     );

    //     return {
    //         url: session.url,
    //         sessionId: session.id,
    //         paymentIntentId,
    //         orderId: order.id,
    //     };
    // }

    async transferToSeller(userID: string, amount: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userID },
            omit: { password: true },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const seller = user;

        //  seller account create
        //  seller account create
        // const seller = await this.prisma.user.findUnique({
        //     where: { id: userID },
        // });

        if (!seller) return errorResponse("Seller not found");

        // ------------------------------------------------------------
        // STEP 1: CHECK IF SELLER HAS EXISTING STRIPE CONNECT ACCOUNT
        // ------------------------------------------------------------
        if (seller.sellerIDStripe) {
            try {
                // Fetch account info from Stripe
                const account: any = await this.stripe.accounts.retrieve(seller.sellerIDStripe);

                // Check account status conditions
                const isDisabled = !!account.disabled_reason;
                const isRequirementsPending = account.requirements?.currently_due?.length > 0;

                if (isDisabled || isRequirementsPending) {
                    // Need re-onboarding
                    const link = await this.stripe.accountLinks.create({
                        account: account.id,
                        refresh_url: "http://localhost:3000/reauth",
                        return_url: "http://localhost:3000/onboarding-success",
                        type: "account_onboarding",
                    });

                    return {
                        status: "re_onboarding_required",
                        message: "Your Stripe account needs verification",
                        url: link.url,
                    };
                }
                // If everything OK → continue creating service
            } catch (err) {
                // If account retrieve fails → re-create new account
                const newAccount = await this.stripe.accounts.create({
                    type: "express",
                    email: seller.email,
                    capabilities: { transfers: { requested: true } },
                });

                await this.prisma.user.update({
                    where: { id: seller.id },
                    data: { sellerIDStripe: newAccount.id },
                });

                const link = await this.stripe.accountLinks.create({
                    account: newAccount.id,
                    refresh_url: "http://localhost:3000/reauth",
                    return_url: "http://localhost:3000/onboarding-success",
                    type: "account_onboarding",
                });

                return {
                    status: "onboarding_required",
                    url: link.url,
                };
            }
        }

        // ------------------------------------------------------------
        // STEP 2: IF NO STRIPE ACCOUNT → CREATE NEW
        // ------------------------------------------------------------
        if (!seller.sellerIDStripe) {
            const account = await this.stripe.accounts.create({
                type: "express",
                email: seller.email,
                capabilities: {
                    transfers: { requested: true },
                },
            });

            await this.prisma.user.update({
                where: { id: userID },
                data: { sellerIDStripe: account.id },
            });

            const link = await this.stripe.accountLinks.create({
                account: account.id,
                refresh_url: "http://localhost:3000/reauth",
                return_url: "http://localhost:3000/onboarding-success",
                type: "account_onboarding",
            });

            return {
                status: "onboarding_required",
                url: link.url,
            };
        }
        //  seller account create
        //  seller account create

        // --------------------------------------------
        const totalReleased = await this.prisma.order.aggregate({
            where: { sellerId: userID },
            _sum: { seller_amount: true },
        });

        const totalCancelled = await this.prisma.order.aggregate({
            where: { sellerId: userID, status: OrderStatus.CANCELLED },
            _sum: { seller_amount: true },
        });

        // const user = await this.prisma.user.findUnique({
        //     where: { id: sellerId },
        // });

        // 2️⃣ Pending Clearance: IN_PROGRESS + PENDING + PROOF_SUBMITTED
        const onlyPending = await this.prisma.order.aggregate({
            where: {
                sellerId: userID,
                status: {
                    in: [OrderStatus.PENDING],
                },
            },
            _sum: { seller_amount: true },
        });

        const onlyPedningSum = onlyPending._sum.seller_amount || 0;
        const totalEarning =
            (totalReleased._sum.seller_amount || 0) -
            (totalCancelled._sum.seller_amount || 0) -
            (onlyPending._sum.seller_amount || 0);

        // 2️⃣ Pending Clearance: IN_PROGRESS + PENDING + PROOF_SUBMITTED
        const pendingOrders = await this.prisma.order.aggregate({
            where: {
                sellerId: userID,
                status: {
                    in: [OrderStatus.IN_PROGRESS, OrderStatus.PROOF_SUBMITTED],
                },
            },
            _sum: { seller_amount: true },
        });

        const pendingClearance = pendingOrders._sum.seller_amount || 0;

        // 3️⃣ Available balance
        const availableBalance = totalEarning - pendingClearance - user?.withdrawn_amount!;

        // --------------------------------------------

        const setting = await this.prisma.setting.findUnique({
            where: { id: "platform_settings" },
        });

        const sellerStripeAccountId = user?.sellerIDStripe;

        if (!sellerStripeAccountId) {
            throw new BadRequestException("Seller Stripe account not found");
        }

        amount = amount * 100;

        if (!amount || amount < setting?.minimum_payout!) {
            throw new BadRequestException(
                `Invalid transfer amount please follow minimum payout : ${setting?.minimum_payout! / 100}`,
            );
        }

        if (amount > availableBalance) {
            throw new BadRequestException(`Insufficient balance to transfer`);
        }
        const balance = await this.stripe.balance.retrieve();

        const available = balance.available[0].amount;

        if (amount > available) {
            throw new Error(
                `Cannot transfer ${amount / 100}, Platform balance only ${available / 100} is available. please wait and try again later`,
            );
        }

        const amountInCents = Math.round(amount);

        // Transfer money from your platform balance → seller’s connected account
        const transfer = await this.stripe.transfers.create({
            amount: amountInCents,
            currency: "usd",
            destination: sellerStripeAccountId,
        });

        // const payout = await this.stripe.payouts.create( { amount: amountInCents, currency: "usd", }, { stripeAccount: sellerStripeAccountId, } );

        await this.prisma.user.update({
            where: { id: userID },
            data: { withdrawn_amount: { increment: amountInCents } },
        });
        await this.mail.sendEmail(
            user.email,
            "Withdrawal Successfully",
            `
    <h1>Your withdrawal successfully added in your stripe account</h1>
    <p>Amount: $${amountInCents / 100}</p>
    <p>Status: It will be payout in your external account within 48 hour</p>
    `,
        );

        return {
            success: true,
            message: "Transfer completed",
            transfer,
        };
    }

    async createOrderWithPaymentMethod(userFromReq: any, serviceId: string, frontendUrl: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userFromReq.userId },
            include: { paymentMethod: true },
        });
        const service = await this.prisma.service.findUnique({
            where: { id: serviceId },
            include: { creator: { omit: { password: true } } },
        });

        if (!user) throw new NotFoundException("User not found");
        if (!user.customerIdStripe)
            throw new BadRequestException("User does not have a Stripe Customer ID");
        if (!service) throw new NotFoundException("Service not found");

        const setting = await this.prisma.setting.findUnique({
            where: { id: "platform_settings" },
        });
        if (!setting?.platformFee_percents)
            throw new BadRequestException("Platform fee is not set in settings");

        service.price = service.price * 100;

        // Calculate fee amount
        const feeAmount = service.price * (setting?.platformFee_percents / 100);

        // Final price = original price + random fee
        const finalPrice = service.price + feeAmount;

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: finalPrice,
            currency: service.currency?.toLowerCase() || "usd",
            customer: user?.customerIdStripe,
            payment_method: user.paymentMethod?.[0]?.paymentMethod,
            off_session: true,
            confirm: true,
            capture_method: "manual",
            metadata: {
                userId: userFromReq.userId,
                serviceId: service.id,
            },
        });

        const priceInCents = Math.round(service.price);
        const sellerAmount = priceInCents - (priceInCents * setting.platformFee_percents) / 100;
        const order = await this.prisma.order.create({
            data: {
                orderCode: `ORD-${Date.now()}`,
                buyerId: userFromReq.userId,
                sellerId: service.creatorId || "unknown",
                sellerIdStripe: service.creator?.sellerIDStripe || "",
                paymentIntentId: paymentIntent.id,
                serviceId: service.id,
                platformFee: 0.0,
                amount: service.price,
                seller_amount: sellerAmount,
                status: OrderStatus.PENDING,
            },
        });

        await this.mail.sendEmail(
            userFromReq.email,
            "Order Placed Successfully",
            `
    <h1>Your order is successfully placed!</h1>
    <p>Order Code: ${order.orderCode}</p>
    <p>Amount: $${order.amount / 100}</p>
    <p>seller: ${service.creator?.email}</p>
    <p>Status: ${order.status}</p>
    `,
        );

        await this.mail.sendEmail(
            service.creator?.email,
            "You Got a New Order",
            `
    <h1>New Order Received!</h1>
    <p>Order Code: ${order.orderCode}</p>
    <p>Service: ${service.serviceName}</p>
    <p>Buyer: ${userFromReq.email}</p>
    <p>Amount: $${order.amount / 100}</p>
    `,
        );

        return {
            paymentIntentId: paymentIntent.id,
            orderId: order.id,
            amount: service.price,
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
        if (!order) throw new NotFoundException("Order not found for this payment intent");
        if (order.status == OrderStatus.RELEASED)
            throw new HttpException("Order already released", 404);

        const setting = await this.prisma.setting.findUnique({
            where: { id: "platform_settings" },
        });
        if (!setting?.platformFee_percents)
            throw new BadRequestException("Platform fee is not set in settings");

        // PaymentIntent রিটারিভ করা
        const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

        // যদি ম্যানুয়াল ক্যাপচার হয়, তাহলে ক্যাপচার করা
        let capturedIntent: Stripe.PaymentIntent = intent;
        if (intent.status !== "succeeded" && intent.capture_method === "manual") {
            capturedIntent = (await this.stripe.paymentIntents.capture(
                paymentIntentId,
            )) as Stripe.PaymentIntent;
            this.logger.log(`Captured PaymentIntent ${paymentIntentId}`);
        }

        // PaymentIntent‑এর সাথে যুক্ত চার্জগুলোর লিস্ট পাওয়া
        const chargesList = await this.stripe.charges.list({
            payment_intent: capturedIntent.id,
        });

        // প্রথম চার্জ (যদি থাকে) পাওয়া
        const charge = chargesList.data[0];
        this.logger.log("চার্জ তথ্য:", charge);
        if (!charge) {
            this.logger.log("এই PaymentIntent‑এর সাথে কোনো চার্জ পাওয়া যায়নি।");
            return;
        }

        // ব্যালান্স ট্রানজ্যাকশন থেকে ফি ও নেট অ্যামাউন্ট পাওয়া
        const balanceTransaction = await this.stripe.balanceTransactions.retrieve(
            charge.balance_transaction as string,
        );

        this.logger.log("Stripe ফি:", balanceTransaction.fee);
        this.logger.log("নেট অ্যামাউন্ট:", balanceTransaction.net);

        const updated = await this.prisma.order.update({
            where: { id: order.id },
            data: {
                status: OrderStatus.RELEASED,
                isReleased: true,
                releasedAt: new Date(),
                PlatfromRevinue: balanceTransaction.net - order.seller_amount,
                buyerPay: balanceTransaction.net,
                platformFee: (order.amount * setting.platformFee_percents) / 100,
                stripeFee: Number(balanceTransaction.fee),
            },
        });

        await this.mail.sendEmail(
            order.buyer.email,
            "Order Payment Successfully",
            `
        <h1>Your ${order.service.serviceName} order is successfully Paid!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>Amount: $${order.amount / 100}</p>
        `,
        );

        await this.mail.sendEmail(
            order?.seller.email,
            "Order Payment Released",
            `
        <h1>Your ${order.service.serviceName}  Order Released!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>Service: ${order.service.serviceName}</p>
        <p>buyer: ${order.buyer.email}</p>
        <p>Amount: $${order.amount / 100}</p>
        `,
        );

        return {
            platformFee: setting?.platformFee_percents,
            order: updated,
            stripefee: balanceTransaction.fee,
            stripeneet: balanceTransaction.net,
        };
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

        if (!isBuyer && !isAdmin && !isSuperAdmin) {
            throw new HttpException("You cannot request a refund for this order.", 403);
        }

        if (!order.paymentIntentId)
            throw new BadRequestException(
                "buyer not paid yet/PaymentIntent ID not found for this order",
            );

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
                data: {
                    status: OrderStatus.CANCELLED,
                    seller_amount: 0,
                    buyerPay: 0,
                    stripeFee: 0,
                    PlatfromRevinue: 0,
                    platformFee: 0,
                },
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
                PlatfromRevinue: 0,
                seller_amount: 0,
                buyerPay: 0,
                stripeFee: 0,
            },
        });

        // 5) Send Email to Buyer
        await this.mail.sendEmail(
            order.buyer.email,
            "Refund Issued Successfully",
            `
        <h1>Your refund has been processed!</h1>
        <p>Order Code: ${order.orderCode}</p>
        <p>Amount Refunded: $${order.amount / 100}</p>
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
                        data: { status: OrderStatus.RELEASED },
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
