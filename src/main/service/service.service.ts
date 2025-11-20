import { HandleError } from "@common/error/handle-error.decorator";
import { errorResponse } from "@common/utilsResponse/response.util";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Service } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import Stripe from "stripe";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
@Injectable()
export class ServiceService {
    constructor(
        private prisma: PrismaService,
        @Inject("STRIPE_CLIENT") private stripe: Stripe,
    ) {}

    @HandleError("Failed to create service")
    async create(payload: CreateServiceDto, user: any): Promise<any> {
        if (!user.userId) return errorResponse("User ID is missing");

        const seller = await this.prisma.user.findUnique({
            where: { id: user.userId },
        });

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
                where: { id: user.userId },
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

        // ------------------------------------------------------------
        // STEP 3: CHECK IF SERVICE EXISTS
        // ------------------------------------------------------------
        const existingService = await this.prisma.service.findFirst({
            where: { serviceName: payload.serviceName, creatorId: user.userId },
        });
        if (existingService) return errorResponse("Service already exists");

        // ------------------------------------------------------------
        // STEP 4: CREATE NEW SERVICE
        // ------------------------------------------------------------
        const service = await this.prisma.service.create({
            data: { ...payload, creatorId: user.userId },
        });

        return { message: "Service created successfully", service };
    }

    async findAll(): Promise<Service[]> {
        return this.prisma.service.findMany({
            where: { isCustom: false },
            include: {
                creator: {
                    select: {
                        sellerIDStripe: true,
                        email: true,
                        full_name: true,
                    },
                },
                serviceRequests: true,
            },
        });
    }

    async findOne(id: string): Promise<Service> {
        const service = await this.prisma.service.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        sellerIDStripe: true,
                        email: true,
                        full_name: true,
                    },
                },
            },
        });

        if (!service) {
            throw new NotFoundException(`Service with ID ${id} not found`);
        }
        return service;
    }

    async update(id: string, user, updateServiceDto: UpdateServiceDto): Promise<Service> {
        console.log(user);
        const service = await this.prisma.service.findUnique({
            where: { id },
        });

        if (!service) {
            throw new NotFoundException(`Service with ID ${id} not found`);
        }

        // check ownership or super admin
        const isOwner = service.creatorId === user?.userId;
        const isSuperAdmin = user?.roles === "SUPER_ADMIN";

        if (!isOwner && !isSuperAdmin) {
            console.log("You are not authorized to access this service");
            throw new ForbiddenException("You are not authorized to access this service");
        }

        return this.prisma.service.update({
            where: { id },
            data: updateServiceDto,
        });
    }

    async remove(id: string): Promise<Service> {
        return this.prisma.service.delete({
            where: { id },
        });
    }
}
