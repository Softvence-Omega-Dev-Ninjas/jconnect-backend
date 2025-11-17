import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";

import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import { AwsService } from "@main/aws/aws.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";
import { CreateOrderDto } from "./dto/order.dto";
import { OrdersService } from "./order.service";

@Controller("orders")
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private awsservice: AwsService,
    ) {}

    // Create new order (Buyer)
    @UseGuards(ValidateUser)
    @Post()
    createOrder(@GetUser() user: any, @Body() dto: CreateOrderDto) {
        return this.ordersService.createOrder(user.userId, dto);
    }

    // Get buyer all orders
    @UseGuards(ValidateUser)
    @Get("my-orders")
    getMyOrders(@GetUser() user: any) {
        return this.ordersService.getOrdersByBuyer(user.userId);
    }

    // Get single order
    @ApiBearerAuth()
    @ValidateUser()
    @Get(":id")
    getOne(@Param("id") id: string) {
        return this.ordersService.getOrder(id);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Post("ProofUpload")
    @ApiOperation({ summary: "Proof upload" })
    @ApiConsumes("multipart/form-data")
    @ApiQuery({
        name: "orderId",
        required: true,
        type: String,
    })
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                file: {
                    type: "string",
                    format: "binary",
                },
            },
            required: ["file"],
        },
    })
    @UseInterceptors(
        FileInterceptor("file", {
            // fileFilter: (req, file, cb) => {
            //     if (!file.mimetype.startsWith("image/")) {
            //         return cb(new BadRequestException("Only image files are allowed!"), false);
            //     }
            //     cb(null, true);
            // },
        }),
    )
    async UploadProofFile(
        @Query("orderId") orderId: string,
        @UploadedFile() file: Express.Multer.File,
        @GetUser() user: any,
    ) {
        if (!orderId) throw new BadRequestException("orderId is required");

        if (!file) throw new BadRequestException("File is required");

        const uploaded = await this.awsservice.upload(file);

        return await this.ordersService.submitProof(orderId, user, [uploaded.url]);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Patch(":id/status")
    @ApiOperation({ summary: "Update order status (seller/admin logic applied)" })
    @ApiQuery({
        name: "status",
        enum: OrderStatus,
        required: true,
        description: "Filter orders by status",
    })
    updateStatus(
        @Param("id") id: string,
        @Query("status") status: OrderStatus,
        @GetUser() user: any,
    ) {
        return this.ordersService.updateStatus(id, status, user);
    }

    // Delete order (admin OR buyer before payment)

    @Delete(":id")
    deleteOrder(@Param("id") id: string) {
        return this.ordersService.deleteOrder(id);
    }
}
