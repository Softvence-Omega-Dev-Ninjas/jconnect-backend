import { ValidateUser } from "@common/jwt/jwt.decorator";
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiExcludeController,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { CustomServiceRequest } from "@prisma/client";
import { CustomServiceRequestService } from "./custom-service-request.service";
import { CreateCustomRequestDto } from "./dto/create-custom-request.dto";
import { UpdateCustomRequestDto } from "./dto/update-custom-request.dto";

@ApiExcludeController()
@ApiTags("Custom Service Requests")
@Controller("custom-requests")
export class CustomServiceRequestController {
    constructor(private readonly customRequestService: CustomServiceRequestService) {}

    @ApiBearerAuth()
    @ValidateUser()
    @Post()
    @ApiOperation({ summary: "Send a new custom service request to a creator/platform." })
    @ApiResponse({ status: 201, description: "Custom request created successfully." })
    async create(@Body() createDto: CreateCustomRequestDto): Promise<CustomServiceRequest> {
        return this.customRequestService.create(createDto);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get()
    @ApiOperation({ summary: "Get all custom requests (admin/creator view)." })
    @ApiResponse({ status: 200, description: "List of all custom requests." })
    async findAll(): Promise<CustomServiceRequest[]> {
        return this.customRequestService.findAll();
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get(":id")
    @ApiOperation({ summary: "Get a specific custom request by ID." })
    @ApiResponse({ status: 200, description: "Request found." })
    @ApiResponse({ status: 404, description: "Request not found." })
    async findOne(@Param("id") id: string): Promise<CustomServiceRequest> {
        return this.customRequestService.findOne(id);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Patch(":id")
    @ApiOperation({ summary: "Update custom request (e.g., add quote, change status)." })
    @ApiResponse({ status: 200, description: "Request updated successfully." })
    @ApiResponse({ status: 404, description: "Request not found." })
    async update(
        @Param("id") id: string,
        @Body() updateDto: UpdateCustomRequestDto,
    ): Promise<CustomServiceRequest> {
        return this.customRequestService.update(id, updateDto);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Delete(":id")
    @ApiOperation({ summary: "Cancel or delete a custom service request." })
    @ApiResponse({ status: 200, description: "Request deleted successfully." })
    @ApiResponse({ status: 404, description: "Request not found." })
    async remove(@Param("id") id: string): Promise<CustomServiceRequest> {
        return this.customRequestService.remove(id);
    }
}
