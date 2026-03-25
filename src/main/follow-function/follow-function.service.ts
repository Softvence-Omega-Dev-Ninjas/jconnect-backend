import { HandleError } from "@common/error/handle-error.decorator";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { follow_create_dto } from "./dto/follow_create.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { FirebaseNotificationService } from "@main/shared/notification/firebase-notification.service";
import { NotificationType } from "src/lib/firebase/dto/notification.dto";

@Injectable()
export class FollowFunctionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        private readonly firebaseNotificationService: FirebaseNotificationService,
    ) {}

    //------------------- Follow or Unfollow a user-------------------//
    @HandleError("Error in follow function")
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

        //------------------ Send follow notification ------------------//
        await this.firebaseNotificationService.sendToUser(
            folowingdata.followingID,
            {
                title: "👤 New Follower",
                body: `${user.username} started following you`,
                type: NotificationType.NEW_FOLLOWER,
                data: {
                    followerId: user.userId,
                    timestamp: new Date().toISOString(),
                },
            },
            true,
        );
        console.log(` Follow notification sent to user ${folowingdata.followingID}`);

        return { message: "followed successfully", data: following };
    }

    //--------------- follow status a user check i following another user or not -------------------//
    @HandleError("Error in follow status function")
    async followStatus(user: any, userIdToCheck: string) {
        const isFollowing = await this.prisma.follow.findFirst({
            where: {
                followerId: user.userId,
                followingId: userIdToCheck,
            },
        });

        return { data: { isFollowing: !!isFollowing } };
    }

    //------------------- Get followers of a user-------------------//

    @HandleError("Error in get followers function")
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

    //------------------- Get followings of a user-------------------//
    @HandleError("Error in get following function")
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
