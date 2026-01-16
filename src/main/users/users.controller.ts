import {
    GetUser,
    ValidateAdmin,
    ValidateSuperAdmin,
    ValidateUser,
} from "@common/jwt/jwt.decorator";

import { AwsService } from "@main/aws/aws.service";
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Patch,
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
import { Role } from "@prisma/client";
import { FindArtistDto } from "./dto/findArtist.dto";
import { reset_password, UpdateMeDto, UpdateUserDto } from "./dto/user.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private awsservice: AwsService,
    ) {}

    @Get("check-username/:username")
    @ApiOperation({ summary: "Check if username is available" })
    @ApiResponse({
        status: 200,
        description: "Returns username availability status",
        schema: {
            type: "object",
            properties: {
                available: { type: "boolean" },
                message: { type: "string" },
            },
        },
    })
    checkUsername(@Param("username") username: string) {
        return this.usersService.checkUsernameAvailability(username);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get("me")
    @ApiOperation({ summary: "if login then get the logged in user data" })
    GetOwnUserData(@GetUser() user: any) {
        return this.usersService.findMe(user.userId);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Patch("me")
    @ApiOperation({ summary: "Update my account and profile" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        description: "Update profile fields and optionally upload a profile image",
        schema: {
            type: "object",
            properties: {
                image: { type: "string", format: "binary", description: "Profile image" },
                full_name: { type: "string" },
                phone: { type: "string" },
                short_bio: { type: "string" },
                socialProfiles: {
                    type: "string",
                    description: "JSON string of social profiles array",
                    example:
                        '[{"orderId":1,"platformName":"Instagram","platformLink":"https://instagram.com/example"}]',
                },
                location: { type: "string", example: "new-yourk usa" },
                hashTags: {
                    type: "string",
                    description: "JSON string of hash tags array",
                    example: '["facebook", "art"]',
                },
                username: { type: "string", example: "john_doe" },
            },
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
    async updateMe(
        @GetUser() user: any,
        @Body() body: any,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        console.log("Raw body received:", body);

        // Parse hashTags properly
        let parsedHashTags: string[] | undefined;
        if (body.hashTags) {
            if (Array.isArray(body.hashTags)) {
                parsedHashTags = body.hashTags;
            } else if (typeof body.hashTags === "string") {
                try {
                    parsedHashTags = JSON.parse(body.hashTags);
                } catch {
                    parsedHashTags = body.hashTags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter((tag) => tag.length > 0);
                }
            }
        }

        // Create proper DTO
        const updateMeDto: UpdateMeDto = {
            full_name: body.full_name,
            phone: body.phone,
            username: body.username && body.username.trim() !== "" ? body.username : undefined,
            short_bio: body.short_bio,
            profile_image_url: body.profile_image_url,
            location: body.location,
            hashTags: parsedHashTags,
        };

        // Handle socialProfiles
        if (body.socialProfiles) {
            try {
                let socialProfiles;

                // Parse if string
                if (typeof body.socialProfiles === "string") {
                    socialProfiles = JSON.parse(body.socialProfiles);
                } else {
                    socialProfiles = body.socialProfiles;
                }

                // Validate and filter
                if (Array.isArray(socialProfiles)) {
                    const validProfiles = socialProfiles.filter(
                        (sp) =>
                            sp &&
                            sp.platformName &&
                            sp.platformLink &&
                            sp.platformName.trim() !== "" &&
                            sp.platformLink.trim() !== "",
                    );

                    updateMeDto.socialProfiles =
                        validProfiles.length > 0 ? validProfiles : undefined;
                }
            } catch (error) {
                console.error("Error parsing socialProfiles:", error);
                updateMeDto.socialProfiles = undefined;
            }
        }

        console.log("Processed DTO:", updateMeDto);

        if (file) {
            const uploaded = await this.awsservice.upload(file);
            updateMeDto.profilePhoto = uploaded.url;
        }

        // console.log("************************",updateMeDto);

        return this.usersService.updateMe(user.userId, updateMeDto);
    }

    // @ApiBearerAuth()
    // @ValidateUser()
    // @Patch("me/json")
    // @ApiOperation({ summary: "Update my account and profile (JSON only, no file upload)" })
    // @ApiBody({ type: UpdateMeDto })
    // async updateMeJson(@GetUser() user: any, @Body() updateMeDto: UpdateMeDto) {
    //     console.log("JSON body received:", updateMeDto);
    //     return this.usersService.updateMe(user.userId, updateMeDto);
    // }

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
                    description: "File to upload give me less than 1MB",
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
    @ApiQuery({ name: "search", required: false, example: "" })
    @ApiQuery({ name: "username", required: false, example: "john_doe" })
    findAllArtist(@Query() query: FindArtistDto, @GetUser() user: any) {
        return this.usersService.findAllArtist(query, user);
    }

    @ApiBearerAuth()
    @ValidateAdmin()
    @Get("getalluser")
    @ApiOperation({ summary: "Get all users (Admin only) with pagination & filtering" })
    @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
    @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
    @ApiQuery({ name: "isActive", required: false, type: Boolean, example: true })
    @ApiQuery({
        name: "search",
        required: false,
        type: String,
        description: "Search by username/email",
    })
    async findAll(
        @Query("page") page = 1,
        @Query("limit") limit = 10,
        @Query("isActive") isActive?: boolean,
        @Query("search") search?: string,
    ) {
        return this.usersService.findAll({
            page: Number(page),
            limit: Number(limit),
            isActive: isActive !== undefined ? isActive : undefined,
            search,
        });
    }

    @ApiBearerAuth()
    @ValidateUser()
    @Get(":id")
    @ApiOperation({ summary: "Get user by ID access all user" })
    @ApiResponse({ status: 200, description: "User found" })
    @ApiResponse({ status: 404, description: "User not found" })
    findOne(@Param("id") id: string, @GetUser("userId") currentUserId: string) {
        return this.usersService.findOne(id, currentUserId);
    }

    // ----------inquery with id----------------

    @ApiBearerAuth()
    @ValidateUser()
    @Get(":id/inquiry")
    @ApiOperation({
        summary: "Get user by ID access all user and notify the inquiry specific user",
    })
    @ApiResponse({ status: 200, description: "User found" })
    @ApiResponse({ status: 404, description: "User not found" })
    findOneUserIdInquiry(@Param("id") id: string, @GetUser("userId") currentUserId: string) {
        return this.usersService.findOneUserIdInquiry(id, currentUserId);
    }
    // ---------------------------------------
    @ApiBearerAuth()
    @ValidateUser()
    @Patch(":id")
    @ApiOperation({ summary: "Update user by ID (own user, admin, or super admin)" })
    async update(
        @Param("id") id: string,
        @Body() updateUserDto: UpdateUserDto,
        @GetUser() user: any,
    ) {
        console.log("Decoded user from token:", user);
        const isOwner = user.userId === id;
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
        const isOwner = user.userId === id;
        const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.roles);
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("You are not authorized to update this user");
        }
        return this.usersService.remove(id);
    }

    // @ApiBearerAuth()
    // @ValidateUser()
    // @Delete("deleteMyaccount:id")
    // @ApiOperation({ summary: "Delete my account by ID" })
    // @ApiResponse({ status: 200, description: "User deleted successfully" })
    // DeleteMy(@Param("id") id: string, @GetUser() user: any) {
    //     const isOwner = user.id === id;
    //     const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.roles);
    //     if (!isOwner && !isAdmin) {
    //         throw new ForbiddenException("You are not authorized to update this user");
    //     }
    //     return this.usersService.remove(id);
    // }

    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Patch(":id/role")
    @ApiOperation({ summary: "Update user role" })
    @ApiQuery({
        name: "role",
        required: true,
        enum: Role,
        description: "New role for the user",
        example: Role.ADMIN,
    })
    @ApiResponse({ status: 200, description: "User role updated successfully" })
    @ApiResponse({ status: 404, description: "User not found" })
    async updateRole(@Param("id") id: string, @Query("role") role: string) {
        // // 🔹 Enum validation
        // if (!Object.values(Role).includes(role as Role)) {
        //     throw new BadRequestException(
        //         `Invalid role. Valid roles: ${Object.values(Role).join(", ")}`
        //     );
        // }

        const updatedUser = await this.usersService.updateRole(id, role as Role);

        return {
            success: true,
            message: "User role updated successfully",
            data: updatedUser,
        };
    }
}
