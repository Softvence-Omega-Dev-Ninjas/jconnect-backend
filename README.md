# JCONNECT BACKND

## docker run

```bash
docker compose --profile dev up -d

```

# nest cli rest api command

```bash
nest g resource main/shared/live-chat
```

This is the backend service for JConnect application built with NestJS framework.

## PAYMENT EVENT

The payment module handles all payment-related functionalities, including creating payment sessions, handling webhooks, and managing user payments.

# checkout.session.completed

# payment_intent.payment_failed

# invoice.payment_failed

# checkout.session.async_payment_failed

## Features

- User Authentication and Authorization
- Payment Processing with Stripe
- RESTful API Endpoints
- Database Integration with Prisma ORM
- Modular Architecture for Scalability
