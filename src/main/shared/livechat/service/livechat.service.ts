
import { Injectable } from "@nestjs/common";

import { LiveChat } from "@prisma/client";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateMessageDto } from "../dto/create-livechat.dto";


@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    /** Find or create 1-to-1 chat */
    async getOrCreatePrivateChat(userA: string, userB: string): Promise<LiveChat> {
        const existing = await this.prisma.liveChat.findFirst({
            where: {
                type: "INDIVIDUAL",
                participants: {
                    every: { userId: { in: [userA, userB] } },
                },
            },
            include: { participants: true },
        });

        if (existing && existing.participants.length === 2) {
            return existing;
        }

        return this.prisma.$transaction(async (tx) => {
            const chat = await tx.liveChat.create({
                data: {
                    type: "INDIVIDUAL",
                    createdById: userA,
                },
            });

            await tx.liveChatParticipant.createMany({
                data: [
                    { chatId: chat.id, userId: userA },
                    { chatId: chat.id, userId: userB },
                ],
            });

            return chat;
        });
    }

    /** Send message */
    async createMessage(senderId: string, chatId: string, dto: CreateMessageDto) {
        return this.prisma.liveMessage.create({
            data: {
                chatId,
                senderId,
                content: dto.content,
                mediaUrl: dto.mediaUrl,
                mediaType: dto.mediaType,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        profile: {
                            select: { user: { select: { full_name: true, profilePhoto: true } } },
                        },
                    },
                },
            },
        });
    }

    /** Mark message as read */
    async markRead(messageId: string, userId: string) {
        return this.prisma.liveMessageRead.upsert({
            where: { messageId_userId: { messageId, userId } },
            create: { messageId, userId },
            update: {},
        });
    }

    /** List my private chats with last message & unread count */
    async getMyChats(userId: string) {
        const chats = await this.prisma.liveChat.findMany({
            where: {
                type: "INDIVIDUAL",
                participants: { some: { userId } },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                profile: {
                                    select: { user: { select: { full_name: true, profilePhoto: true } } },
                                },
                            },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { id: true, content: true, createdAt: true, senderId: true },
                },
            },
        });

        return Promise.all(
            chats.map(async (chat) => {
                const unread = await this.prisma.liveMessage.count({
                    where: {
                        chatId: chat.id,
                        senderId: { not: userId },
                        readBy: { none: { userId } },
                    },
                });
                return { ...chat, unread };
            }),
        );
    }

    /** Get paginated messages */
    async getMessages(chatId: string, cursor?: string, take = 20) {
        return this.prisma.liveMessage.findMany({
            where: { chatId },
            orderBy: { createdAt: "desc" },
            take,
            cursor: cursor ? { id: cursor } : undefined,
            include: {
                sender: {
                    select: { id: true, profile: { select: { user: true, profile_image_url: true } } },
                },
                readBy: { select: { userId: true } },
            },
        });
    }
}