// /src/servicerequest/servicerequest.controller.ts
import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ServiceRequest } from "@prisma/client";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { UpdateServiceRequestDto } from "./dto/update-service-request.dto";
import { ServiceRequestService } from "./service-request.service";

@ApiTags("Service Requests (Orders)")
@Controller("requests")
export class ServiceRequestController {
    constructor(private readonly serviceRequestService: ServiceRequestService) {}

    @ApiBearerAuth()
    @ValidateUser()
    @Post()
    @ApiOperation({ summary: "Create a new service request/order" })
    @ApiResponse({
        status: 201,
        description: "Request created successfully (Awaiting payment confirmation)",
    })
    async create(
        @Body() createRequestDto: CreateServiceRequestDto,
        @GetUser() user: any,
    ): Promise<ServiceRequest> {
        return this.serviceRequestService.create(createRequestDto, user);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get()
    @ApiOperation({ summary: "Retrieve all service requests" })
    @ApiResponse({ status: 200, description: "List of all service requests" })
    async findAll(): Promise<ServiceRequest[]> {
        return this.serviceRequestService.findAll();
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get(":id")
    @ApiOperation({ summary: "Get a service request by ID" })
    @ApiResponse({ status: 200, description: "Request found" })
    @ApiResponse({ status: 404, description: "Request not found" })
    async findOne(@Param("id") id: string): Promise<ServiceRequest> {
        return this.serviceRequestService.findOne(id);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Patch(":id")
    @ApiOperation({ summary: "Update status or details of a service request" })
    @ApiResponse({ status: 200, description: "Request updated successfully" })
    @ApiResponse({ status: 404, description: "Request not found" })
    async update(
        @Param("id") id: string,
        @Body() updateRequestDto: UpdateServiceRequestDto,
    ): Promise<ServiceRequest> {
        return this.serviceRequestService.update(id, updateRequestDto);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Delete(":id")
    @ApiOperation({ summary: "Cancel/Delete a service request by ID" })
    @ApiResponse({ status: 200, description: "Request deleted successfully" })
    @ApiResponse({ status: 404, description: "Request not found" })
    async remove(@Param("id") id: string): Promise<ServiceRequest> {
        return this.serviceRequestService.remove(id);
    }
}
