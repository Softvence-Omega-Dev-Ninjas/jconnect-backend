import { ENVEnum } from '@common/enum/env.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
    private readonly twilio: Twilio;
    private readonly fromPhone: string;
    private readonly logger = new Logger(TwilioService.name);

    constructor(private readonly config: ConfigService) {
        this.twilio = new Twilio(
            this.config.getOrThrow(ENVEnum.TWILIO_ACCOUNT_SID),
            this.config.getOrThrow(ENVEnum.TWILIO_AUTH_TOKEN),
        );
        this.fromPhone = this.config.getOrThrow(ENVEnum.TWILIO_PHONE_NUMBER);
    }

    async sendWelcomeSms(to: string, email: string): Promise<void> {
        // Ensure phone number has '+' prefix
        if (!to.startsWith('+')) {
            to = `+${to}`;
        }

        const loginUrl = 'https://lgcglobalcontractingltd.com';

        const body = `🎉 Welcome to LGC Global Contracting Ltd!
Your account has been created.
Login with either your email (${email}) or phone (${to}). 
An OTP will be sent during login.
👉 Login here: ${loginUrl}`;

        try {
            const message = await this.twilio.messages.create({
                body,
                from: this.fromPhone,
                to,
            });

            this.logger.log(`Welcome SMS sent: ${message.sid}`);
        } catch (error) {
            this.logger.error(`Failed to send welcome SMS: ${error.message}`);

        }
    }

    async sendSms(to: string, title: string, message: string): Promise<void> {
        // Ensure phone number has '+' prefix
        if (!to.startsWith('+')) {
            to = `+${to}`;
        }

        const body = `${title}\n\n${message}`;

        try {
            const message = await this.twilio.messages.create({
                body,
                from: this.fromPhone,
                to,
            });

            this.logger.log(`SMS sent: ${message.sid}`);
        } catch (error) {
            this.logger.error(`Failed to send SMS: ${error.message}`);
            // no throw — just log
        }
    }
}