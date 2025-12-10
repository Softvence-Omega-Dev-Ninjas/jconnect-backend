import { HttpException, Injectable, NotFoundException } from "@nestjs/common";

import { Role } from "@prisma/client";
import agoron2 from "argon2";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { UtilsService } from "src/lib/utils/utils.service";
import { FindArtistDto } from "./dto/findArtist.dto";
import { CreateUserDto, UpdateMeDto, UpdateUserDto } from "./dto/user.dto";
@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private utils: UtilsService,
    ) {}

    async create(Userdata: CreateUserDto) {
        const { password, ...users } = Userdata;
        try {
            const exists = await this.prisma.user.findUnique({
                where: { email: users.email },
            });
            if (exists)
                throw new HttpException(
                    "User already exists with this email choice another email",
                    400,
                );

            const hash = await agoron2.hash(password);
            const data = { ...users, password: hash };
            const user = await this.prisma.user.create({ data });
            const returnUser = { ...user, password: undefined };
            return returnUser;
        } catch (error) {
            throw new HttpException(error.message, 500);
        }
    }

    async findAll(params: { page: number; limit: number; isActive?: boolean }) {
        const { page, limit, isActive } = params;

        const whereCondition = {
            isDeleted: false,
            ...(isActive !== undefined ? { isActive } : {}),
        };

        const skip = (page - 1) * limit;

        const [data, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: { created_at: "desc" },
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    phone: true,
                    isActive: true,
                    isVerified: true,
                    created_at: true,
                    role: true,
                },
            }),
            this.prisma.user.count({ where: whereCondition }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            page,
            limit,
            total,
            totalPages,
            data,
        };
    }

    // async findMe(Id: string) {
    //     // ---------------------------
    //     const user = await this.prisma.user.findUnique({
    //         where: { id: Id },
    //         omit: { password: true },
    //         include: {
    //             profile: true,
    //             devices: true,

    //             //  Service relations
    //             services: true,
    //             serviceRequests: {
    //                 include: {
    //                     buyer: true,
    //                     service: true,
    //                 },
    //             },

    //             //  LiveChat relations
    //             LiveChatsCreated: true,
    //             chatParticipations: {
    //                 include: {
    //                     chat: true,
    //                 },
    //             },
    //             liveMessages: true,
    //             liveMessageReads: {
    //                 include: {
    //                     message: true,
    //                 },
    //             },

    //             //  Custom service requests
    //             customRequestsMade: {
    //                 include: {
    //                     buyer: true,
    //                     targetCreator: true,
    //                 },
    //             },
    //             customRequestsReceived: {
    //                 include: {
    //                     buyer: true,
    //                     targetCreator: true,
    //                 },
    //             },

    //             //  Social services
    //             socialServices: {
    //                 include: {},
    //             },
    //         },
    //     });

    //     // ---------------------------

    //     // return await this.prisma.user.findUnique({ where: { id: Id }, omit: { password: true }, });

    //     return user;
    // }

    async findMe(id: string) {
        // 🔹 Step 1: User full data আগের মতো
        const user = await this.prisma.user.findUnique({
            where: { id },
            omit: { password: true },
            include: {
                profile: true,
                // devices: true,
                services: true,
                // serviceRequests: {
                //     include: {
                //         buyer: true,
                //         service: true,
                //     },
                // },
                // LiveChatsCreated: true,
                // chatParticipations: {
                //     include: { chat: true },
                // },
                // liveMessages: true,
                // liveMessageReads: {
                //     include: { message: true },
                // },
                // customRequestsMade: {
                //     include: {
                //         buyer: true,
                //         targetCreator: true,
                //     },
                // },
                // customRequestsReceived: {
                //     include: {
                //         buyer: true,
                //         targetCreator: true,
                //     },
                // },
                // socialServices: true,
                // orders_buyer: true,
                // orders_seller: true,
                // paymentMethod: true,
            },
        });

        if (!user) throw new Error("User not found");

        // 🔹 Step 2: এই মাসের শুরু আর শেষ (pure JS)
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // এই মাসের ১ তারিখ
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // এই মাসের শেষ দিন

        // 🔹 Step 3: Total completed deals (এই মাসে)
        const totalDeals = await this.prisma.payment.count({
            where: {
                userId: id,
                status: "COMPLETED",
                createdAt: { gte: startDate, lte: endDate },
            },
        });

        // 🔹 Step 4: Total earnings (sum of completed payments এই মাসে)
        const totalEarningsResult = await this.prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                userId: id,
                status: "COMPLETED",
                createdAt: { gte: startDate, lte: endDate },
            },
        });
        const totalEarnings = totalEarningsResult._sum.amount ?? 0;

        // 🔹 Step 5: Average rating (এই মাসে পাওয়া reviews)
        const avgRatingResult = await this.prisma.review.aggregate({
            _avg: { rating: true },
            where: {
                artistId: id,
            },
        });
        const avgRating = avgRatingResult._avg.rating ?? 0;

        // 🔹 Step 6: সব একসাথে রিটার্ন (আগের ডেটা + stats)
        return {
            ...user,
            stats: {
                totalDeals,
                totalEarnings,
                avgRating: parseFloat(avgRating.toFixed(2)),
                monthRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                },
            },
        };
    }

    async updateMe(userId: string, dto: UpdateMeDto) {
        const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) throw new NotFoundException("User not found");

        const normalizeUrl = (input: string | null | undefined, base?: string) => {
            if (input === undefined) return undefined;
            const trimmed = input?.trim();
            if (!trimmed) return null; // allow clearing value
            if (trimmed.startsWith("http")) return trimmed;
            if (!base) return trimmed;
            return `${base}${trimmed}`;
        };

        const userPayload: UpdateUserDto = {};
        if (dto.full_name !== undefined) userPayload.full_name = dto.full_name;
        if (dto.phone !== undefined) userPayload.phone = dto.phone;
        if (dto.profilePhoto !== undefined) userPayload.profilePhoto = dto.profilePhoto;

        const profilePayload = {
            profile_image_url: dto.profile_image_url ?? undefined,
            short_bio: dto.short_bio ?? undefined,
            instagram: normalizeUrl(dto.instagram, "https://instagram.com/"),
            facebook: normalizeUrl(dto.facebook, "https://facebook.com/"),
            tiktok: normalizeUrl(dto.tiktok, "https://tiktok.com/@"),
            youtube: normalizeUrl(dto.youtube, "https://youtube.com/"),
        };

        const hasProfileChanges = Object.values(profilePayload).some(
            (value) => value !== undefined,
        );

        await this.prisma.$transaction(async (tx) => {
            if (Object.keys(userPayload).length) {
                await tx.user.update({
                    where: { id: userId },
                    data: userPayload,
                    omit: { password: true },
                });
            }

            if (hasProfileChanges) {
                const profileExists = await tx.profile.findUnique({ where: { user_id: userId } });

                if (profileExists) {
                    await tx.profile.update({ where: { user_id: userId }, data: profilePayload });
                } else {
                    await tx.profile.create({
                        data: {
                            user_id: userId,
                            ...profilePayload,
                        },
                    });
                }
            }
        });

        return this.findMe(userId);
    }

    async findAllArtist({ page = 1, limit = 10, filter, search }: FindArtistDto) {
        const skip = (page - 1) * limit;

        const baseWhere: any = {
            isDeleted: false,
            isActive: true,
            role: Role.ARTIST,
        };

        // 🔹 Add search system (artist_name OR service_name)
        if (search) {
            baseWhere.OR = [
                {
                    full_name: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    services: {
                        some: {
                            serviceName: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            ];
        }

        // 🔹 Default pagination (with included services)
        const [artists, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where: baseWhere,
                include: {
                    services: {
                        orderBy: { updatedAt: "desc" },
                    },
                    ReviewsGiven: true,
                    ReviewsReceived: true,
                },
                skip,
                take: limit,
                omit: { password: true },
                orderBy: { created_at: "desc" },
            }),
            this.prisma.user.count({ where: baseWhere }),
        ]);

        let sortedArtists = artists;

        if (filter === "top-rated") {
            artists.sort((a, b) => {
                const avgA =
                    a.ReviewsReceived.length > 0
                        ? a.ReviewsReceived.reduce((sum, r) => sum + r.rating, 0) /
                          a.ReviewsReceived.length
                        : 0;
                const avgB =
                    b.ReviewsReceived.length > 0
                        ? b.ReviewsReceived.reduce((sum, r) => sum + r.rating, 0) /
                          b.ReviewsReceived.length
                        : 0;
                return avgB - avgA;
            });
        }

        // 🔹 Filter for recently updated artists
        if (filter === "recently-updated") {
            sortedArtists = artists
                .map((artist) => ({
                    ...artist,
                    latestServiceUpdate: artist.services?.[0]?.updatedAt ?? artist.updated_at,
                }))
                .sort(
                    (a, b) =>
                        new Date(b.latestServiceUpdate).getTime() -
                        new Date(a.latestServiceUpdate).getTime(),
                );
        }

        // 🔹 Suggested artists (example: most services)
        if (filter === "suggested") {
            sortedArtists = artists.sort(
                (a, b) => (b.services?.length ?? 0) - (a.services?.length ?? 0),
            );
        }

        // 🔹 Apply pagination after sort
        const paginated = sortedArtists.slice(skip, skip + limit);

        return {
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            data: paginated,
        };
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id,
            },
            include: {
                services: true,
                ReviewsReceived: true,
                profile: true,
            },
        });
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    async update(id: string, data: UpdateUserDto) {
        const exists = await this.prisma.user.findUnique({
            where: { id },
            omit: { password: true },
        });
        if (!exists) throw new NotFoundException("User not found");
        if (data.password) {
            const hash = await agoron2.hash(data.password);
            data.password = hash;
        }
        return await this.prisma.user.update({
            where: { id },
            omit: { password: true },
            data,
        });
    }

    async reset_password(id: string, old: string, newPass: string) {
        const exists = await this.prisma.user.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException("User not found");
        if (exists?.isDeleted) throw new NotFoundException("User Already deleted");
        const ValidPass = await this.utils.compare(old, exists.password);
        if (!ValidPass) throw new NotFoundException("Old Password is not correct");

        const hash = await this.utils.hash(newPass);

        return await this.prisma.user.update({
            where: { id },
            data: { password: hash },
            omit: { password: true },
        });
    }

    async updateRole(id: string, role: Role) {
        // 🔹 Check if user exists
        const user = await this.prisma.user.findUnique({ where: { id } });

        if (!user) throw new NotFoundException("User not found");
        if (user.isDeleted) throw new NotFoundException("User already deleted");

        // 🔹 Update role
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { role },
            omit: { password: true },
        });

        return {
            id: updatedUser.id,
            full_name: updatedUser.full_name,
            email: updatedUser.email,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            isVerified: updatedUser.isVerified,
        };
    }

    async remove(id: string) {
        const exists = await this.prisma.user.findUnique({ where: { id } });
        console.log(exists);

        if (!exists) throw new NotFoundException("User not found");
        if (exists?.isDeleted) throw new NotFoundException("User Already deleted");

        await this.prisma.user.update({
            where: { id },
            data: { isDeleted: true },
            omit: { password: true },
        });

        return {
            status: 200,
            message: "User deleted successfully",
        };
    }
}
