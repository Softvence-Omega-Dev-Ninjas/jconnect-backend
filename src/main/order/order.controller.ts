import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from "@nestjs/common";

import { CreateOrderDto } from "./dto/order.dto";
import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import { OrdersService } from "./order.service";

@Controller("orders")
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

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
    @UseGuards(ValidateUser)
    @Get(":id")
    getOne(@Param("id") id: string) {
        return this.ordersService.getOrder(id);
    }

    // Update order status (ONLY seller/admin depending logic)
    @UseGuards(ValidateUser)
    @Patch(":id/status")
    updateStatus(@Param("id") id: string, @Body() body: any, @GetUser() user: any) {
        return this.ordersService.updateStatus(id, body.status, user.userId);
    }

    // Delete order (admin OR buyer before payment)
    @UseGuards(ValidateUser)
    @Delete(":id")
    deleteOrder(@Param("id") id: string) {
        return this.ordersService.deleteOrder(id);
    }
}
