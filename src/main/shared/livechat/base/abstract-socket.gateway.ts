import { Logger, UseGuards } from "@nestjs/common";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketResponse } from "../@types/base.type";
import { SocketRoom, SocketUser } from "../@types/socket.type";
import { SOCKET_EVENTS } from "../constants/socket.constant";
import { SocketAuthGuard } from "../guards/socket-auth.guard";
import { SocketMiddleware } from "../middleware/socket.middleware";
import { RedisService } from "../service/redis.service";
// import { RedisService } from "../services/redis.service";

@WebSocketGateway({
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
        credentials: true,
    },
    wsEngine: "",
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
})
@UseGuards(SocketAuthGuard)
export abstract class BaseSocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer() protected server: Server;
    protected readonly logger = new Logger(this.constructor.name);
    private readonly clients = new Map<string, Set<Socket>>();

    constructor(
        protected readonly redisService: RedisService,
        private readonly socketMiddleware: SocketMiddleware,
    ) {}

    async afterInit() {
        this.logger.verbose(`(${this.constructor.name}) Gateway initialized`);
        this.server.use(this.socketMiddleware.authenticate());
        this.server.use(this.socketMiddleware.logging());
    }

    async handleConnection(client: Socket) {
        const user = client.data.user;
        if (!user?.id) return client.disconnect(true);

        const socketUser: SocketUser = {
            id: user.id,
            socketId: client.id,
            email: user.email || "",
            status: "online",
            role: user.role,
            joinedAt: new Date(),
        };

        await this.redisService.setConnectedUser(client.id, socketUser);
        await client.join(`user:${socketUser.id}`);

        // Add to clients map
        if (!this.clients.has(user.id)) {
            this.clients.set(user.id, new Set());
        }
        this.clients.get(user.id)!.add(client);

        this.logger.log(
            `✅ User ${socketUser.email} connected (Socket: ${client.id}, User: ${socketUser.id})`,
        );
        this.logger.log(`📊 Total connected users: ${this.clients.size}`);
        this.logger.log(`👥 Connected user IDs: [${Array.from(this.clients.keys()).join(", ")}]`);

        // Broadcast join event
        this.server.emit(SOCKET_EVENTS.CONNECTION.USER_JOINED, user);
    }

    async handleDisconnect(client: Socket) {
        const user = await this.redisService.getConnectedUser(client.id);
        if (!user) return;

        // Remove socket from clients map
        const userSockets = this.clients.get(user.id);
        if (userSockets) {
            userSockets.delete(client);

            // If no more sockets for this user, remove from map
            if (userSockets.size === 0) {
                this.clients.delete(user.id);
            }
        }

        await this.redisService.removeConnectedUser(client.id);

        this.server.emit(SOCKET_EVENTS.CONNECTION.USER_LEFT, {
            userId: user.id,
            reason: "disconnect",
        });

        this.logger.log(`❌ User ${user.email} disconnected (Socket: ${client.id})`);
        this.logger.log(`📊 Total connected users: ${this.clients.size}`);
    }

    protected createResponse<T>(success: boolean, data?: T, error?: string): SocketResponse<T> {
        return { success, data, error, timestamp: new Date() };
    }

    protected async handleUserLeaveRoom(roomId: string, userId: string) {
        const room = await this.redisService.getRoomData(roomId);
        if (room && room.users) {
            room.users = room.users.filter((u) => u.id !== userId);

            // Remove empty rooms (except permanent ones)
            if (room.users.length === 0) {
                await this.redisService.deleteRoom(roomId);
            }
        }
    }

    // Get connected users in a room
    protected async getRoomUsers(roomId: string): Promise<SocketUser[]> {
        const room = await this.redisService.getRoomData(roomId);
        return room?.users
            ? room.users.map((user) => ({
                  ...user,
                  email: user.email || "",
                  role: user.role as any,
              }))
            : [];
    }

    protected async joinRoom(
        client: Socket,
        roomId: string,
        roomData?: Partial<SocketRoom>,
    ): Promise<boolean> {
        try {
            const user = client.user;
            if (!user || !user?.id) return false;

            await client.join(roomId);

            // Update or create room
            let room = await this.redisService.getRoomData(roomId);
            if (!room) {
                room = {
                    id: roomId,
                    name: roomData?.name || roomId,
                    type: roomData?.type || "chat",
                    users: [],
                    createdAt: new Date(),
                    metadata: roomData?.metadata || {},
                };
                await this.redisService.addUserToRoom(roomId, user.id);
            }

            // Add user to room if not already present
            const userInRoom = room.users?.find((u) => u.id === user.id);
            if (!userInRoom) {
                const user = await this.redisService.getConnectedUser(client.id);
                if (user) {
                    await this.redisService.addUserToRoom(roomId, user.id);
                }
            }

            return true;
        } catch (error) {
            this.logger.error(`Error joining room ${roomId}: ${error.message}`);
            return false;
        }
    }

    protected async leaveRoom(client: Socket, roomId: string): Promise<boolean> {
        try {
            if (!client.user || !client.user.id) return false;

            await client.leave(roomId);
            this.handleUserLeaveRoom(roomId, client.user.id);
            return true;
        } catch (error) {
            this.logger.error(`Error leaving room ${roomId}: ${error.message}`);
            return false;
        }
    }

    protected async emitToUser(userId: string, event: string, data: any): Promise<boolean> {
        const socketId = await this.redisService.getUserSocketId(userId);
        if (!socketId) return false;

        const socket = this.server.sockets.sockets.get(socketId);
        if (!socket) return false;

        socket.emit(event, data);
        return true;
    }

    protected async emitToUserViaClientsMap(
        userId: string,
        event: string,
        data: any,
    ): Promise<boolean> {
        const userSockets = this.clients.get(userId);

        this.logger.log(`🔔 Attempting to emit "${event}" to user ${userId}`);
        this.logger.log(`📱 Found ${userSockets?.size || 0} active socket(s) for user ${userId}`);

        if (userSockets && userSockets.size > 0) {
            let emittedCount = 0;
            userSockets.forEach((socket) => {
                socket.emit(event, data);
                emittedCount++;
                this.logger.log(`  ↳ Emitted to socket ${socket.id}`);
            });
            this.logger.log(`✅ Successfully emitted to ${emittedCount} socket(s)`);
            return true;
        } else {
            this.logger.warn(`⚠️  User ${userId} has NO active sockets! Message NOT delivered.`);
            this.logger.warn(
                `👥 Currently connected users: [${Array.from(this.clients.keys()).join(", ")}]`,
            );
            return false;
        }
    }

    protected emitToRoom(roomId: string, event: string, data: any, excludeSocketId?: string): void {
        if (excludeSocketId) {
            this.server.to(roomId).except(excludeSocketId).emit(event, data);
        } else {
            this.server.to(roomId).emit(event, data);
        }
    }

    protected broadcastToAll<D = any>(event: string, data: D, excludeSocketId?: string): void {
        if (excludeSocketId) {
            this.server.except(excludeSocketId).emit(event, data);
        } else {
            this.server.emit(event, data);
        }
    }

    // Get user by socket ID
    protected async getUser(socketId: string): Promise<SocketUser | null> {
        const user = await this.redisService.getConnectedUser(socketId);
        if (!user) return null;
        return {
            ...user,
            email: user.email || "",
            role: user.role as any,
        };
    }

    // Get user ID by socket ID
    protected async getUserId(socketId: string) {
        return await this.redisService.getUserIdFromSocket(socketId);
    }

    // Get socket ID by user ID
    protected async getSocketIdByUserId(userId: string) {
        return await this.redisService.getUserSocketId(userId);
    }

    // Public getters
    get socketServer(): Server {
        return this.server;
    }

    get connectedUserCount() {
        return this.redisService.getOnlineUsersCount();
    }

    get activeRooms() {
        return this.redisService.getRooms();
    }
}
