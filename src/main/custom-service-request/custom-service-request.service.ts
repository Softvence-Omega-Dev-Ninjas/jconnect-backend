import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomServiceRequest } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateCustomRequestDto } from "./dto/create-custom-request.dto";
import { UpdateCustomRequestDto } from "./dto/update-custom-request.dto";

@Injectable()
export class CustomServiceRequestService {
    constructor(private prisma: PrismaService) {}

    // CREATE
    async create(createDto: CreateCustomRequestDto): Promise<CustomServiceRequest> {
        const data = {
            ...createDto,
            preferredDeliveryDate: createDto.preferredDeliveryDate
                ? new Date(createDto.preferredDeliveryDate)
                : null,
        };

        return this.prisma.customServiceRequest.create({ data });
    }

    // FIND ALL
    async findAll(): Promise<CustomServiceRequest[]> {
        return this.prisma.customServiceRequest.findMany({
            include: {
                buyer: true,
                targetCreator: true,
            },
        });
    }

    // FIND ONE
    async findOne(id: string): Promise<CustomServiceRequest> {
        const request = await this.prisma.customServiceRequest.findUnique({
            where: { id },
            include: { buyer: true, targetCreator: true },
        });

        if (!request) {
            throw new NotFoundException(`Custom request with ID "${id}" not found.`);
        }

        return request;
    }

    // UPDATE
    async update(id: string, updateDto: UpdateCustomRequestDto): Promise<CustomServiceRequest> {
        await this.findOne(id);
        const updateData = {
            ...updateDto,
            preferredDeliveryDate: updateDto.preferredDeliveryDate
                ? new Date(updateDto.preferredDeliveryDate)
                : undefined,
        };

        return this.prisma.customServiceRequest.update({
            where: { id },
            data: updateData,
        });
    }

    // DELETE
    async remove(id: string): Promise<CustomServiceRequest> {
        await this.findOne(id);
        return this.prisma.customServiceRequest.delete({ where: { id } });
    }
}
