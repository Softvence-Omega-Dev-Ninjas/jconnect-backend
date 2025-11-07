// src/profile/profile.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ProfileService } from "./profile.service";
import { CreateProfileDto, UpdateProfileDto } from "./dto/profile.dto";

@ApiTags("Profile")
@Controller("profiles")
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Post()
    @ApiOperation({ summary: "Create a user profile" })
    @ApiResponse({ status: 201, description: "Profile created successfully" })
    create(@Body() createProfileDto: CreateProfileDto) {
        return this.profileService.create(createProfileDto);
    }

    @Get()
    @ApiOperation({ summary: "Get all profiles" })
    @ApiResponse({ status: 200, description: "List of profiles" })
    findAll() {
        return this.profileService.findAll();
    }

    @Get(":user_id")
    @ApiOperation({ summary: "Get profile by user_id" })
    @ApiResponse({ status: 200, description: "Profile found" })
    @ApiResponse({ status: 404, description: "Profile not found" })
    findOne(@Param("user_id") user_id: string) {
        return this.profileService.findOne(user_id);
    }

    @Put(":user_id")
    @ApiOperation({ summary: "Update profile by user_id" })
    @ApiResponse({ status: 200, description: "Profile updated successfully" })
    update(@Param("user_id") user_id: string, @Body() updateProfileDto: UpdateProfileDto) {
        return this.profileService.update(user_id, updateProfileDto);
    }

    @Delete(":user_id")
    @ApiOperation({ summary: "Delete profile by user_id" })
    @ApiResponse({ status: 200, description: "Profile deleted successfully" })
    remove(@Param("user_id") user_id: string) {
        return this.profileService.remove(user_id);
    }
}
