import { GetUser, ValidateAdmin, ValidateUser } from "@common/jwt/jwt.decorator";
import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Put,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { reset_password, UpdateUserDto } from "./dto/user.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @ApiBearerAuth()
    @ValidateUser()
    @Get("me")
    @ApiOperation({ summary: "if login then get the logged in user data" })
    GetOwnUserData(@GetUser() user: any) {
        return this.usersService.findMe(user.userId);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Put("reset_Password")
    @ApiOperation({ summary: "reset password by logged in user" })
    @ApiResponse({ status: 200, description: "user password reset successfully" })
    reset_password(@GetUser() user: any, @Body() Body: reset_password) {
        return this.usersService.reset_password(user.userId, Body.old, Body.newPass);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get("aritist")
    @ApiOperation({ summary: "Get all Artist access all login user" })
    findAllArtist() {
        return this.usersService.findAllArtist();
    }

    @ApiBearerAuth()
    @ValidateAdmin()
    @Get("getalluser")
    @ApiOperation({ summary: "Get all users (Admin only) with pagination & filtering" })
    @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
    @ApiQuery({ name: "isActive", required: false, type: Boolean, example: true })
    async findAll(
        @Query("page") page = 1,
        @Query("limit") limit = 10,
        @Query("isActive") isActive?: boolean,
    ) {
        return this.usersService.findAll({
            page: Number(page),
            limit: Number(limit),
            isActive: isActive !== undefined ? isActive : undefined,
        });
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get(":id")
    @ApiOperation({ summary: "Get user by ID access all user" })
    @ApiResponse({ status: 200, description: "User found" })
    @ApiResponse({ status: 404, description: "User not found" })
    findOne(@Param("id") id: string, @GetUser("userId") userId: string) {
        console.log(userId);
        return this.usersService.findOne(id);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Put(":id")
    @ApiOperation({ summary: "Update user by ID (own user, admin, or super admin)" })
    async update(
        @Param("id") id: string,
        @Body() updateUserDto: UpdateUserDto,
        @GetUser() user: any,
    ) {
        console.log("Decoded user from token:", user);
        const isOwner = user.id === id;
        const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.roles);
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("You are not authorized to update this user");
        }
        return this.usersService.update(id, updateUserDto);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Delete(":id")
    @ApiOperation({ summary: "Delete user by ID" })
    @ApiResponse({ status: 200, description: "User deleted successfully" })
    remove(@Param("id") id: string, @GetUser() user: any) {
        const isOwner = user.id === id;
        const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.roles);
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("You are not authorized to update this user");
        }
        return this.usersService.remove(id);
    }
}
