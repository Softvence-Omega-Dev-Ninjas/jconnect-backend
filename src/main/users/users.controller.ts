import { GetUser, ValidateAdmin, ValidateUser } from "@common/jwt/jwt.decorator";
import { AwsService } from "@main/aws/aws.service";
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Post,
    Put,
    Query,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { FindArtistDto } from "./dto/findArtist.dto";
import { reset_password, UpdateUserDto } from "./dto/user.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private awsservice: AwsService,
    ) {}

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
    @Post("ProfilePhotoUpload")
    @ApiOperation({ summary: "profile photo upload" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        description: "Upload a file",
        schema: {
            type: "object",
            properties: {
                image: {
                    type: "string",
                    format: "binary",
                    description: "File to upload",
                },
            },
            required: ["image"],
        },
    })
    @UseInterceptors(
        FileInterceptor("image", {
            limits: { fileSize: 1 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith("image/")) {
                    return cb(new BadRequestException("Only image files are allowed!"), false);
                }
                cb(null, true);
            },
        }),
    )
    async UploadImage(
        @UploadedFile() file: Express.Multer.File,
        @GetUser("userId") userId: string,
    ) {
        const ProfileUrl = await this.awsservice.upload(file);
        const reuslt = await this.usersService.update(userId, { profilePhoto: ProfileUrl.url });

        return reuslt;
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get("artist")
    @ApiOperation({ summary: "Get all artists (filterable, searchable, paginated)" })
    @ApiQuery({ name: "page", required: false, example: 1 })
    @ApiQuery({ name: "limit", required: false, example: 10 })
    @ApiQuery({ name: "filter", required: false, example: "top-rated" })
    @ApiQuery({ name: "search", required: false, example: "mixing" })
    findAllArtist(@Query() query: FindArtistDto) {
        return this.usersService.findAllArtist(query);
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
