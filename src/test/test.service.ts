import { Injectable } from "@nestjs/common";
import Stripe from "stripe";

@Injectable()
export class testService {
    private stripe = new Stripe(process.env.STRIPE_SECRET_KEY_DELETE_SELLER_ID!);

    async deleteAllStripeTestAccounts() {
        const accounts = await this.stripe.accounts.list({ limit: 100 });

        for (const acc of accounts.data) {
            try {
                // Try normal delete (V1 accounts)
                await this.stripe.accounts.del(acc.id);
                console.log("Deleted (V1):", acc.id);
            } catch (error) {
                if (error.message.includes("linked to a V2 Account")) {
                    console.log("Closing V2 Account:", acc.id);

                    // Close V2 Account manually using Stripe's V2 endpoint
                    await fetch(`https://api.stripe.com/v2/core/accounts/${acc.id}/close`, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    });

                    console.log("Closed (V2):", acc.id);
                } else {
                    console.log("Failed:", acc.id, error.message);
                }
            }
        }

        return {
            message: "All test connected accounts processed.",
            totalAccounts: accounts.data.length,
        };
    }
}
