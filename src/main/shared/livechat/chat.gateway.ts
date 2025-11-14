import { GetSocketUser } from "@common/decorators/socket-user.decorator";

import { UseGuards } from "@nestjs/common";
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
} from "@nestjs/websockets";
import { Socket } from "socket.io";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { BaseSocketGateway } from "./base/abstract-socket.gateway";
import { CreateMessageDto } from "./dto/create-livechat.dto";
import { SocketAuthGuard } from "./guards/socket-auth.guard";
import { SocketMiddleware } from "./middleware/socket.middleware";
import { ChatService } from "./service/livechat.service";
import { RedisService } from "./service/redis.service";

interface SocketUser {
    id: string;
}

@WebSocketGateway({ cors: { origin: "*" }, namespace: "/chat" })
@UseGuards(SocketAuthGuard)
export class ChatGateway extends BaseSocketGateway {
    constructor(
        private chatService: ChatService,
        private prisma: PrismaService,
        redisService: RedisService,
        socketMiddleware: SocketMiddleware,
    ) {
        super(redisService, socketMiddleware);
    }

    // ------------------------ Handle chat message sending -----------------------//
    @SubscribeMessage("chat:message_send")
    async handleMessage(
        @GetSocketUser() user: SocketUser,
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { receiverId: string } & CreateMessageDto,
    ) {
        const { receiverId } = data;

        // Step 1: Find or create a chat between sender and receiver
        let chat = await this.prisma.liveChat.findFirst({
            where: {
                participants: {
                    every: {
                        userId: { in: [user.id, receiverId] },
                    },
                },
            },
            include: { participants: true },
        });

        this.logger.log(
            `handleMessage: chat between ${user.id} and ${receiverId}:chat id now:- ${chat?.id}`,
            "",
        );

        if (!chat) {
            chat = await this.prisma.liveChat.create({
                data: {
                    participants: {
                        create: [{ userId: user.id }, { userId: receiverId }],
                    },
                },
                include: { participants: true },
            });
        }

        // Step 2: Verify sender is indeed part of this chat
        const isParticipant = chat.participants.some((p) => p.userId === user.id);
        if (!isParticipant) {
            return client.emit("error", { message: "You are not in this chat" });
        }

        // Step 3: Create the message
        const message = await this.chatService.createMessage(user.id, chat.id, data);

        // Step 4: Build payload
        const payload = {
            id: message.id,
            chatId: chat.id,
            content: message.content,
            mediaUrl: message.mediaUrl,
            mediaType: message.mediaType,
            sender: {
                id: message.sender.id,
                name: message.sender.profile?.user?.full_name || "",
                avatar: message.sender.profile?.user?.profilePhoto,
            },
            createdAt: message.createdAt,
        };

        // Step 5: Emit message to receiver and sender (ONCE each)
        this.emitToUserViaClientsMap(receiverId, "chat:message_receive", payload);

        this.emitToUserViaClientsMap(user.id, "chat:message_sent", payload);
    }
    // ------------------------ Handle chat message read -----------------------//
    @SubscribeMessage("chat:message_read")
    async handleRead(
        @GetSocketUser() user: SocketUser,
        @MessageBody() { messageId }: { messageId: string },
    ) {
        await this.chatService.markRead(messageId, user.id);

        const msg = await this.prisma.liveMessage.findUnique({
            where: { id: messageId },
            select: { chatId: true, senderId: true },
        });
        this.logger.log(`handleRead: message ${messageId} read by user ${user.id}`, "");
        if (msg && msg.senderId !== user.id) {
            this.server
                .to(msg.chatId)
                .except(user.id)
                .emit("chat:message_read", { messageId, readBy: user.id });
        }
    }
}
