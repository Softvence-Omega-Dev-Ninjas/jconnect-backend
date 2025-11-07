import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Service } from "@prisma/client";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ServiceService } from "./service.service";

@Controller("services") // The route path will be /services
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) {}

    @Post() // POST /services
    create(@Body() createServiceDto: CreateServiceDto): Promise<Service> {
        return this.serviceService.create(createServiceDto);
    }

    @Get() // GET /services
    findAll(): Promise<Service[]> {
        return this.serviceService.findAll();
    }

    @Get(":id") // GET /services/:id
    findOne(@Param("id") id: string): Promise<Service> {
        return this.serviceService.findOne(id);
    }

    @Patch(":id") // PATCH /services/:id
    update(@Param("id") id: string, @Body() updateServiceDto: UpdateServiceDto): Promise<Service> {
        return this.serviceService.update(id, updateServiceDto);
    }

    @Delete(":id") // DELETE /services/:id
    remove(@Param("id") id: string): Promise<Service> {
        return this.serviceService.remove(id);
    }
}
