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

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    async update(id: string, data: UpdateUserDto) {
        const exists = await this.prisma.user.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException("User not found");
        // if (data.password) {
        //     const matchPassword = await agoron2.verify(exists.password, data?.password);
        //     if (matchPassword) throw new HttpException("Password is same as before", 400);
        // }
        if (data.password) {
            const hash = await agoron2.hash(data.password);
            data.password = hash;
        }
        return await this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        const exists = await this.prisma.user.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException("User not found");
        return await this.prisma.user.delete({ where: { id } });
    }
}
