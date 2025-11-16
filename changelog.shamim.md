## 6/11/2025 Thursday

- [x] Created and finalized the **User Database ER Diagram user,profile,service** using [dbdiagram.io](https://dbdiagram.io/d/JConnect-690d1cc96735e11170a35d29)

## 7/11/2025 Friday

- [x] Completed **User Model CRUD Operations And Proper Relation**
- [x] Completed **Profile Model CRUD Operations Field collection**
- [x] Implemented **Password Hashing generate with argon2**
- [x] Implemented **URL Generation from Username/Social Links**
- [x] Properly Implemented **Swagger Documentation proper setup**

## 8/11/2025 Friday

- [x] Completed **social service module**
- [x] Completed **request social service module**
- [x] Implemented **authentication explore from joy**
- [x] Implemented **auth guards impliment with jwt**
- [x] Properly Implemented **Swagger Documentation proper setup**

## 10/11/2025 Monday

- [x] **probleme solving** user module add guard

                    authGuard problem then solving and check again authentication then work start

## 11/11/2025 Tuesday

- [x] **User Module:** Implemented pagination and active/inactive filtering using query parameters
- [x] **file Upload in aws s3:** file uploader aws s3 global module/service create

                but i cant use this  file uploading module use from joy

- [x] **User DTOs:** Added all fields from Prisma model with full validation and Swagger documentation
- [x] **Profile Module:** Updated DTO, controller, and service structure for better consistency
- [x] **Refactor:** Improved code organization and validation in both User and Profile modules

## 13/11/2025 Saturday

- [ ] **Stripe Webhook Setup**  
       Successfully configured the Stripe webhook on the local server, and signature validation is now working correctly.

- [ ] **Stripe Checkout Session Debugging**  
       Fixed the 400 webhook errors by correctly using `rawBody`, proper webhook routing, and the correct endpoint secret.

- [ ] **Stripe Payment Flow Testing**  
       Successfully received events like `charge.succeeded`, `checkout.session.completed`, and `payment_intent.*` during testing.

- [ ] **Manual Capture Flow Planning**  
       Finalized the Fiverr-style payment flow: hold payment → release/capture payment after the task is completed by the seller.

- [ ] **Capture Payment Endpoint Planning**  
       Planned the backend endpoint structure for capturing a PaymentIntent when the order is completed.

## 14/11/2025 Saturday

- [x] **Stripe Webhook Setup**  
       Successfully configured the Stripe webhook on the local server, and signature validation is now working correctly.

- [x] **Stripe Checkout Session Debugging**  
       Fixed the 400 webhook errors by correctly using `rawBody`, proper webhook routing, and the correct endpoint secret.

- [x] **Stripe Payment Flow Testing**  
       Successfully received events like `charge.succeeded`, `checkout.session.completed`, and `payment_intent.*` during testing.

- [x] **Manual Capture Flow Planning**  
       Finalized the Fiverr-style payment flow: hold payment → release/capture payment after the task is completed by the seller.

- [x] **Capture Payment Endpoint Planning**  
       Planned the backend endpoint structure for capturing a PaymentIntent when the order is completed.

## 15/11/2025 Sunday

- [x] **ngrok install and run** ngrok install but not connect to webhook
- [x] **properly create order model and crud operation** but custiomization is still running pending for proper status management follow by the figma file
- [x] **solved service problem and reusable with guard** service create when he/she avalable for artist like minimum requirement is a seller account in stripe then create a service
- [x] **payment system tesing done** payment system increment with escrow system like fiverr

         important things
         stripe listen --forward-to http://localhost:5050/payments/webhook
         testing purpuse use this card 4000 0000 0000 0077
         enable seller for transer :
                capabilities: {
                       transfers: { requested: true },
                }

- [x] **payment with fee** stripe include self fee and admin platform fee

         admin platform fee to minus the stripe self fee
         like 10% platform fee
         70$ pay from buyer
         stripe fee 2.9% + 30 cent = 2.33$
         so seller get 63$
         admin platform fee 7 - 2.33 = 4.7

- [x] **create a setting model for defaul platform fee and furure usable** increase next time
