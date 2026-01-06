import { GetUser, ValidateUser } from "@common/jwt/jwt.decorator";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { follow_create_dto } from "./dto/follow_create.dto";
import { FollowFunctionService } from "./follow-function.service";

@Controller("follow-function")
export class FollowFunctionController {
    constructor(private readonly followFunctionService: FollowFunctionService) {}

    @ApiBearerAuth()
    @ValidateUser()
    @ApiOperation({ summary: "Follow or Unfollow a user" })
    @Post("follow")
    async follow(@Body() folowingdata: follow_create_dto, @GetUser() user: any) {
        return this.followFunctionService.follow(folowingdata, user);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @ApiOperation({ summary: "Get followers of a user" })
    @Get("followers")
    async getFollowers(@GetUser() user: any) {
        return this.followFunctionService.getFollowers(user);
    }

    @ApiBearerAuth()
    @ValidateUser()
    @ApiOperation({ summary: "Get followings of a user" })
    @Get("followings")
    async getFollowings(@GetUser() user: any) {
        return this.followFunctionService.getFollowing(user);
    }
}
