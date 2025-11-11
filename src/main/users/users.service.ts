import { HttpException, Injectable, NotFoundException } from "@nestjs/common";

import agoron2 from "argon2";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

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

    async findAll() {
        return await this.prisma.user.findMany();
    }
    async findMe(Id: string) {
        // ---------------------------
        const user = await this.prisma.user.findUnique({
            where: { id: Id },
            omit: { password: true },
            include: {
                profile: true,
                devices: true,

                //  Service relations
                services: true,
                serviceRequests: {
                    include: {
                        buyer: true,
                        service: true,
                    },
                },

                //  LiveChat relations
                LiveChatsCreated: true,
                chatParticipations: {
                    include: {
                        chat: true,
                    },
                },
                liveMessages: true,
                liveMessageReads: {
                    include: {
                        message: true,
                    },
                },

                //  Custom service requests
                customRequestsMade: {
                    include: {
                        buyer: true,
                        targetCreator: true,
                    },
                },
                customRequestsReceived: {
                    include: {
                        buyer: true,
                        targetCreator: true,
                    },
                },

                //  Social services
                socialServices: {
                    include: {},
                },
            },
        });

        // ---------------------------

        // return await this.prisma.user.findUnique({ where: { id: Id }, omit: { password: true }, });

        return user;
    }

    async findAllArtist() {
        return await this.prisma.user.findMany({
            where: {
                role: "ARTIST",
                isDeleted: false,
                isActive: true,
            },
            omit: {
                password: true,
            },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
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

    async remove(id: string) {
        const exists = await this.prisma.user.findUnique({ where: { id } });
        console.log(exists);

        if (!exists) throw new NotFoundException("User not found");
        if (exists?.isDeleted) throw new NotFoundException("User Already deleted");

        return await this.prisma.user.update({
            where: { id },
            data: { isDeleted: true },
            omit: { password: true },
        });
    }
}
