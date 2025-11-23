import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import { Body, Controller, Get, Param, Post, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiProperty, ApiTags } from "@nestjs/swagger";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { ServiceRequestService } from "./service-request.service";

@ApiTags("Service Requests")
@Controller("service-requests")
export class ServiceRequestController {
    constructor(private readonly serviceRequestService: ServiceRequestService) {}

    @ApiBearerAuth()
    @ValidateUser()
    @Post()
    @ApiConsumes("multipart/form-data")
    @UseInterceptors(FileFieldsInterceptor([{ name: "files", maxCount: 5 }]))
    @ApiBody({
        description: "Create Service Request",
        schema: {
            type: "object",
            properties: {
                serviceId: { type: "string" },
                captionOrInstructions: { type: "string" },
                promotionDate: { type: "string", format: "date-time" },
                specialNotes: { type: "string" },
                price: { type: "number" },
                files: {
                    nullable: true,
                    type: "array",
                    items: { type: "string", format: "binary" }, // important for Swagger file
                },
            },
        },
    })
    async create(
        @Body() dto: CreateServiceRequestDto,
        @GetUser() user: any,
        @UploadedFiles() files: { files?: Express.Multer.File[] },
    ) {
        return this.serviceRequestService.create(dto, files.files || [], user);
    }

    @ApiProperty({ description: "Get all service requests" })
    @Get()
    async findAll() {
        return this.serviceRequestService.findAll();
    }

    @ApiProperty({ description: "Get service requests", example: "id" })
    @Get(":id")
    async findOne(@Param("id") id: string) {
        return this.serviceRequestService.findOne(id);
    }
}
