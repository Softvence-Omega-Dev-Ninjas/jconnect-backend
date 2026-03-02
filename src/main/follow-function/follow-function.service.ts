import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { follow_create_dto } from "./dto/follow_create.dto";

@Injectable()
export class FollowFunctionService {
    constructor(private readonly prisma: PrismaService) {}

    async follow(folowingdata: follow_create_dto, user: any) {
        if (user.userId === folowingdata.followingID) {
            return { message: "you can't follow yourself" };
        }

        const userexist = await this.prisma.user.findUnique({
            where: {
                id: folowingdata.followingID,
            },
        });

        if (!userexist) {
            return { message: "user to follow not found" };
        }
        const existfollowed = await this.prisma.follow.findFirst({
            where: {
                followerId: user.userId,
                followingId: folowingdata.followingID,
            },
        });

        if (existfollowed) {
            await this.prisma.follow.delete({
                where: {
                    id: existfollowed.id,
                },
            });
            return { message: "unfollowed successfully" };
        }

        const following = await this.prisma.follow.create({
            data: {
                followerId: user.userId,
                followingId: folowingdata.followingID,
            },
        });

        return { message: "followed successfully", data: following };
    }

    //follow status a user check i following another user or not
    async followStatus(user: any, userIdToCheck: string) {
        const isFollowing = await this.prisma.follow.findFirst({
            where: {
                followerId: user.userId,
                followingId: userIdToCheck,
            },
        });

        return { data: { isFollowing: !!isFollowing } };
    }

    async getFollowers(user: any) {
        const followers = await this.prisma.follow.findMany({
            where: {
                followingId: user.userId,
            },
            include: {
                followers: {
                    select: {
                        id: true,
                        email: true,
                        full_name: true,
                        username: true,
                        profilePhoto: true,
                    },
                },
            },
        });

        return { data: { followers, count: followers.length } };
    }

    async getFollowing(user: any) {
        const following = await this.prisma.follow.findMany({
            where: {
                followerId: user.userId,
            },
            include: {
                following: {
                    select: {
                        id: true,
                        email: true,
                        full_name: true,
                        username: true,
                        profilePhoto: true,
                    },
                },
            },
        });
        return { data: { following, count: following.length } };
    }
}
