import { Controller, Get, Post, Body, Patch, Param, Delete } from "@nestjs/common";
import { SocialServiceRequestService } from "./social-service-request.service";
import {
    CreateSocialServiceRequestDto,
    UpdateSocialServiceRequestDto,
} from "./dto/create-social-service-request.dto";

@Controller("social-service-request")
export class SocialServiceRequestController {
    constructor(private readonly service: SocialServiceRequestService) {}

    @Post()
    create(@Body() dto: CreateSocialServiceRequestDto) {
        return this.service.create(dto);
    }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.service.findOne(id);
    }

    @Patch(":id")
    update(@Param("id") id: string, @Body() dto: UpdateSocialServiceRequestDto) {
        return this.service.update(id, dto);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.service.remove(id);
    }
}
