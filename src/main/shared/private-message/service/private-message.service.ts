import { Injectable, NotFoundException } from "@nestjs/common";
import { AppError } from "src/common/error/handle-error.app";
import { HandleError } from "src/common/error/handle-error.decorator";
import { successResponse } from "src/common/utilsResponse/response.util";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { SendPrivateMessageDto } from "../dto/privateChatGateway.dto";

@Injectable()
export class PrivateChatService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Send a private message and update lastMessage in conversation
     */
    @HandleError("Failed to send private message", "PRIVATE_CHAT")
    async sendPrivateMessage(conversationId: string, senderId: string, dto: SendPrivateMessageDto) {
        console.log("🔍 Received DTO:", JSON.stringify(dto, null, 2));
        const serviceId = dto.serviceId || null;
        const serviceRequestId = dto.serviceRequestId || null;
        console.log("🔍 serviceRequestId value:", serviceRequestId);

        if (serviceId) {
            await this.prisma.service.findUniqueOrThrow({
                where: {
                    id: serviceId,
                },
            });
        }

        if (serviceRequestId) {
            const serviceRequestExists = await this.prisma.serviceRequest.findUnique({
                where: {
                    id: serviceRequestId,
                },
            });
            if (!serviceRequestExists) {
                console.log(`⚠️ ServiceRequest ${serviceRequestId} not found in database`);
                throw new NotFoundException(`ServiceRequest with ID ${serviceRequestId} not found`);
            }
        }

        const message = await this.prisma.privateMessage.create({
            data: {
                content: dto.content,
                conversationId,
                senderId,
                ...(serviceId && { serviceId }),
                ...(serviceRequestId && { serviceRequestId }),
                ...(dto.files &&
                    dto.files.length > 0 && {
                        files: dto.files,
                    }),
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
                service: true,
                serviceRequest: true,
            },
        });

        console.log("✅ Message created with serviceRequestId:", message.serviceRequestId);

        // Update last message reference in conversation
        await this.prisma.privateConversation.update({
            where: { id: conversationId },
            data: {
                lastMessageId: message.id,
                updatedAt: new Date(),
            },
        });

        // Fetch conversation to set delivery status
        const conversation = await this.prisma.privateConversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundException(`Conversation ${conversationId} not found`);
        }

        await this.prisma.privateMessageStatus.createMany({
            data: [
                {
                    messageId: message.id,
                    userId: conversation.user1Id,
                    status: "DELIVERED",
                },
                {
                    messageId: message.id,
                    userId: conversation.user2Id,
                    status: "DELIVERED",
                },
            ],
            skipDuplicates: true,
        });

        return message;
    }

    /**
     *-------------------- Load all chats ----------------------
     */
    @HandleError("Failed to get all chats with last message")
    async getAllChatsWithLastMessage(userId: string) {
        // ---------- Private chats -----------------
        const privateChats = await this.prisma.privateConversation.findMany({
            where: {
                OR: [{ user1Id: userId }, { user2Id: userId }],
            },
            include: {
                lastMessage: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                profilePhoto: true,
                                full_name: true,
                            },
                        },
                    },
                },
                user1: {
                    select: {
                        id: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
                user2: {
                    select: {
                        id: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        const formattedPrivateChats = privateChats.map((chat: any) => {
            const otherUser = chat.user1Id === userId ? chat.user2 : chat.user1;
            return {
                type: "private",
                chatId: chat.id,
                participant: otherUser,
                lastMessage: chat.lastMessage
                    ? {
                          id: chat.lastMessage.id,
                          content: chat.lastMessage.content,
                          createdAt: chat.lastMessage.createdAt,
                          sender: chat.lastMessage.sender,
                          file: chat.lastMessage.file,
                      }
                    : null,
                updatedAt: chat.updatedAt,
            };
        });

        // ------------ Merge & sort-------------------
        const allChats = [...formattedPrivateChats].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        );

        return successResponse(allChats, "Chats fetched successfully");
    }

    /**
     * Find existing conversation between two users or create one
     */
    @HandleError("Failed to find conversation", "PRIVATE_CHAT")
    async findConversation(userA: string, userB: string) {
        const [user1Id, user2Id] = [userA, userB].sort();
        return this.prisma.privateConversation.findUnique({
            where: {
                user1Id_user2Id: {
                    user1Id,
                    user2Id,
                },
            },
        });
    }

    /**
     * Create new conversation between two users
     */
    @HandleError("Failed to create conversation", "PRIVATE_CHAT")
    async createConversation(userA: string, userB: string) {
        const [user1Id, user2Id] = [userA, userB].sort();
        return this.prisma.privateConversation.create({
            data: { user1Id, user2Id },
        });
    }

    /**
     * Find existing conversation between two users or create one
     */
    @HandleError("Failed to find or create conversation", "PRIVATE_CHAT")
    async findOrCreateConversation(userA: string, userB: string) {
        let conversation = await this.findConversation(userA, userB);
        if (!conversation) {
            conversation = await this.createConversation(userA, userB);
        }
        return conversation;
    }

    /**
     * Get all conversations for a user
     */
    @HandleError("Error getting user's conversations", "PRIVATE_CHAT")
    async getUserConversations(userId: string) {
        const conversations = await this.prisma.privateConversation.findMany({
            where: {
                OR: [{ user1Id: userId }, { user2Id: userId }],
            },
            include: {
                lastMessage: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                profilePhoto: true,
                                full_name: true,
                            },
                        },
                        service: true,
                    },
                },
                user1: {
                    select: {
                        id: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
                user2: {
                    select: {
                        id: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return conversations.map((chat: any) => {
            const otherUser = chat.user1Id === userId ? chat.user2 : chat.user1;
            return {
                type: "private",
                chatId: chat.id,
                participant: otherUser,
                lastMessage: chat.lastMessage || null,
                updatedAt: chat.updatedAt,
                isRead: chat.lastMessage?.isRead || false,
            };
        });
    }

    /**
     * Get all messages for a conversation
     */
    @HandleError("Conversation doesn't exist", "PRIVATE_CHAT")
    async getConversationMessages(conversationId: string) {
        return this.prisma.privateMessage.findMany({
            where: { conversationId },
            include: {
                sender: true,
                // file: true,
            },
            orderBy: { createdAt: "asc" },
        });
    }

    /**
     * Get a conversation with messages (validate access)
     */
    @HandleError("Conversation doesn't exist", "PRIVATE_CHAT")
    async getPrivateConversationWithMessages(
        conversationId: string,
        userId: string,
        serviceRequestsId?: string,
    ) {
        const conversation = await this.prisma.privateConversation.findFirst({
            where: {
                id: conversationId,
                OR: [{ user1Id: userId }, { user2Id: userId }],
            },
            include: {
                user1: {
                    select: {
                        id: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
                user2: {
                    select: {
                        id: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
                messages: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                profilePhoto: true,
                                full_name: true,
                            },
                        },
                        service: { include: { serviceRequests: true } },
                        serviceRequest: true,
                        // file: true,
                    },
                },
            },
        });

        if (!conversation) {
            throw new AppError(404, `Conversation not found or access denied`);
        }

        const messagesWithFilteredServiceRequests = conversation.messages.map((msg) => {
            if (msg.service) {
                const filteredRequests = msg.service.serviceRequests.filter(
                    (sr) => sr.messageID === msg.id,
                );
                return {
                    ...msg,
                    service: {
                        ...msg.service,
                        serviceRequests: filteredRequests,
                    },
                };
            }
            return msg;
        });

        return {
            conversationId: conversation.id,
            participants: [conversation.user1, conversation.user2],
            messages: messagesWithFilteredServiceRequests,
        };
    }

    /**
     * Mark a message as read
     */
    @HandleError("Failed to mark message as read", "PRIVATE_CHAT")
    async makePrivateMassageReadTrue(id: string) {
        return this.prisma.privateMessage.updateMany({
            where: { id },
            data: { isRead: true },
        });
    }

    /**
     * Delete a conversation
     */
    @HandleError("Failed to delete conversation", "PRIVATE_CHAT")
    async deleteConversation(conversationId: string) {
        return this.prisma.privateConversation.deleteMany({
            where: { id: conversationId },
        });
    }

    /**
     * Get all users who have chatted with current user
     * Includes unread message count and last message info
     */
    @HandleError("Failed to get users who chatted with me", "PRIVATE_CHAT")
    async getAllUsersChatWithMe(userId: string) {
        const conversations = await this.prisma.privateConversation.findMany({
            where: {
                OR: [{ user1Id: userId }, { user2Id: userId }],
            },
            include: {
                lastMessage: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                profilePhoto: true,
                                full_name: true,
                            },
                        },
                        service: true,
                        statuses: {
                            where: {
                                userId: userId,
                            },
                            select: {
                                status: true,
                            },
                        },
                    },
                },
                user1: {
                    select: {
                        id: true,
                        email: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
                user2: {
                    select: {
                        id: true,
                        email: true,
                        profilePhoto: true,
                        full_name: true,
                    },
                },
                messages: {
                    where: {
                        senderId: {
                            not: userId, // Messages sent TO me
                        },
                        statuses: {
                            some: {
                                userId: userId,
                                status: {
                                    not: "READ",
                                },
                            },
                        },
                    },
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        const formattedUsers = conversations.map((conversation) => {
            const otherUser =
                conversation.user1Id === userId ? conversation.user2 : conversation.user1;

            const unreadCount = conversation.messages.length;

            const lastMessageStatus = conversation.lastMessage?.statuses?.[0]?.status || null;
            const isLastMessageRead = lastMessageStatus === "READ";

            return {
                userId: otherUser.id,
                email: otherUser.email,
                fullName: otherUser.full_name,
                profilePhoto: otherUser.profilePhoto,
                conversationId: conversation.id,
                unreadCount,
                lastMessage: conversation.lastMessage
                    ? {
                          id: conversation.lastMessage.id,
                          content: conversation.lastMessage.content,
                          createdAt: conversation.lastMessage.createdAt,
                          senderId: conversation.lastMessage.senderId,
                          sender: conversation.lastMessage.sender,
                          service: conversation.lastMessage.service,
                          isRead: isLastMessageRead,
                      }
                    : null,
                updatedAt: conversation.updatedAt,
            };
        });

        return successResponse(formattedUsers, "Users who chatted with you fetched successfully");
    }
}
