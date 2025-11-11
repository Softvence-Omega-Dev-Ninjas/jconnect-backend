import { GetUser, ValidateAuth } from "@common/jwt/jwt.decorator";
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Service } from "@prisma/client";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ServiceService } from "./service.service";

@ApiTags("Services")
@Controller("services")
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) { }
    @Post()
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: 'Create a new service listing' })
    create(
        @Body() payload: CreateServiceDto,
        @GetUser('userId') userId: string,
    ) {
        console.log('Creator ID:', userId);
        return this.serviceService.create(payload, userId);
    }


    @Get()
    @ApiOperation({ summary: "Get all available services" })
    @ApiResponse({ status: 200, description: "List of all services" })
    findAll(): Promise<Service[]> {
        return this.serviceService.findAll();
    }

    @Get(":id")
    @ApiOperation({ summary: "Get service details by ID" })
    @ApiResponse({ status: 200, description: "Service details found" })
    @ApiResponse({ status: 404, description: "Service not found" })
    findOne(@Param("id") id: string): Promise<Service> {
        return this.serviceService.findOne(id);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update service details by ID" })
    @ApiResponse({ status: 200, description: "Service updated successfully" })
    @ApiResponse({ status: 404, description: "Service not found" })
    update(@Param("id") id: string, @Body() updateServiceDto: UpdateServiceDto): Promise<Service> {
        return this.serviceService.update(id, updateServiceDto);
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete a service listing by ID" })
    @ApiResponse({ status: 200, description: "Service deleted successfully" })
    @ApiResponse({ status: 404, description: "Service not found" })
    remove(@Param("id") id: string): Promise<Service> {
        return this.serviceService.remove(id);
    }
}
