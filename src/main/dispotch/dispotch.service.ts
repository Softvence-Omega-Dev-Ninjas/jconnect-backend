import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateDisputeDto } from "./dto/create-dispute.dto";
import { UpdateDisputeDto } from "./dto/update-dispute.dto";
import { AwsService } from "@main/aws/aws.service";

@Injectable()
export class DisputeService {
    constructor(
        private prisma: PrismaService,
        private awsService: AwsService,
    ) {}

    async create(userId: string, dto: CreateDisputeDto, files?: Express.Multer.File[]) {
        // 1️⃣ Check if order exists and belongs to user
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId, buyerId: userId },
        });
        if (!order) throw new NotFoundException("Order not found");

        // 2️⃣ Check for existing dispute under review
        const existingDispute = await this.prisma.dispute.findFirst({
            where: {
                orderId: dto.orderId,
                userId,
                status: "UNDER_REVIEW",
            },
        });

        if (existingDispute) {
            throw new BadRequestException(
                "You already have a dispute under review for this order.",
            );
        }

        // 3️⃣ Upload files to S3
        let proofUrls: string[] = [];
        if (files && files.length > 0) {
            proofUrls = await Promise.all(
                files.map(async (file) => {
                    const uploadResult = await this.awsService.upload(file);
                    return uploadResult.url;
                }),
            );
        }

        // 4️⃣ Create dispute
        const dispute = await this.prisma.dispute.create({
            data: {
                userId,
                orderId: dto.orderId,
                description: dto.description,
                proofs: proofUrls, // save S3 URLs
                status: "UNDER_REVIEW",
            },
            include: {
                order: true,
                user: { omit: { password: true } },
            },
        });

        return { dispute };
    }

    async findAll() {
        return this.prisma.dispute.findMany({
            include: {
                order: true,
                user: { select: { id: true, full_name: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async findMyDisputes(userId: string) {
        return this.prisma.dispute.findMany({
            where: { userId },
            include: { order: true },
            orderBy: { createdAt: "desc" },
        });
    }

    async findOne(id: string) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id },
            include: {
                order: true,
                user: true,
            },
        });

        if (!dispute) throw new NotFoundException("Dispute not found");
        return dispute;
    }

    async update(id: string, dto: UpdateDisputeDto, user: any) {
        // 1️⃣ Fetch the dispute to check existence and ownership
        const dispute = await this.findOne(id); // assuming findOne throws NotFoundException if not found

        // 2️⃣ Check permissions
        const isAdmin = user.role === "ADMIN";
        const isOwner = dispute.userId === user.userId;

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("You do not have permission to update this dispute.");
        }

        await this.findOne(id); // exists check

        return this.prisma.dispute.update({
            where: { id },
            data: {
                ...dto,
                status: dto.status ?? undefined,
            },
            include: {
                order: true,
                user: true,
            },
        });
    }

    async remove(id: string, user: any) {
        const dispute = await this.findOne(id);

        const isAdmin = user.role === "ADMIN";
        const isSuperAdmin = user.role === "SUER_ADMIN";
        const isOwner = dispute.userId === user.userId;

        if (!isAdmin && !isOwner && !isSuperAdmin) {
            throw new ForbiddenException("You do not have permission to update this dispute.");
        }

        return this.prisma.dispute.delete({ where: { id } });
    }
}
