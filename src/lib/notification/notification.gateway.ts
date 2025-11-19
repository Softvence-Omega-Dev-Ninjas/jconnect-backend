import type { UserRegistration } from "@common/interface/events-payload";
import { Notification } from "@common/interface/events-payload";
import { EVENT_TYPES } from "@common/interface/events.name";
import { PayloadForSocketClient } from "@common/interface/socket-client-payload";
import { JWTPayload } from "@common/jwt/jwt.interface";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "src/lib/prisma/prisma.service";

@WebSocketGateway({
    cors: { origin: "*" },
    namespace: "/dj/notification",
})
@Injectable()
export class NotificationGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(NotificationGateway.name);
    private readonly clients = new Map<string, Set<Socket>>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        this.logger.log(
            "Socket.IO server initialized for Notification Gateway",
            server.adapter.name,
        );
    }

    async handleConnection(client: Socket) {
        try {
            const token = this.extractTokenFromSocket(client);
            if (!token) return client.disconnect(true);

            const payload = this.jwtService.verify<JWTPayload>(token, {
                secret: this.configService.getOrThrow("JWT_SECRET"),
            });

            if (!payload.sub) return client.disconnect(true);

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                include: {
                    notificationToggles: true,
                },
            });

            if (!user) return client.disconnect(true);

            // Ensure the user has a NotificationToggle record
            if (!user.notificationToggles?.length) {
                // Create a new toggle record for the user
                await this.prisma.notificationToggle.create({
                    data: { userId: user.id },
                });

                // Reload the toggles
                user.notificationToggles = await this.prisma.notificationToggle.findMany({
                    where: { userId: user.id },
                });
            }

            const toggle = user.notificationToggles[0];

            const payloadForSocketClient: PayloadForSocketClient = {
                sub: user.id,
                email: user.email,
                userUpdates: toggle?.userUpdates || false,
                serviceCreate: toggle?.serviceCreate || false,
                review: toggle?.review || false,
                post: toggle?.post || false,
                message: toggle?.message || false,
                userRegistration: toggle?.userRegistration || false,
            };

            client.data.user = payloadForSocketClient;
            this.subscribeClient(user.id, client);

            this.logger.log(`Client connected: ${user.id}`);
        } catch (err: any) {
            this.logger.warn(`JWT verification failed: ${err.message}`);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.data?.user?.sub;
        if (userId) {
            this.unsubscribeClient(userId, client);
            this.logger.log(`Client disconnected: ${userId}`);
        } else {
            this.logger.log("Client disconnected: unknown user");
        }
    }

    private extractTokenFromSocket(client: Socket): string | null {
        const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token;
        if (!authHeader) return null;
        return authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    }

    private subscribeClient(userId: string, client: Socket) {
        if (!this.clients.has(userId)) this.clients.set(userId, new Set());
        this.clients.get(userId)!.add(client);
        this.logger.debug(`Subscribed client to user ${userId}`);
    }

    private unsubscribeClient(userId: string, client: Socket) {
        const set = this.clients.get(userId);
        if (!set) return;

        set.delete(client);
        this.logger.debug(`Unsubscribed client from user ${userId}`);
        if (set.size === 0) this.clients.delete(userId);
    }

    public getClientsForUser(userId: string): Set<Socket> {
        return this.clients.get(userId) || new Set();
    }

    public async notifySingleUser(userId: string, event: string, data: Notification) {
        const clients = this.getClientsForUser(userId);
        if (clients.size === 0) return;
        clients.forEach((client) => client.emit(event, data));
    }

    public async notifyMultipleUsers(userIds: string[], event: string, data: Notification) {
        userIds.forEach((userId) => this.notifySingleUser(userId, event, data));
    }

    public async notifyAllUsers(event: string, data: Notification) {
        this.clients.forEach((clients) => clients.forEach((client) => client.emit(event, data)));
    }

    @SubscribeMessage("ping")
    handlePing(client: Socket) {
        client.emit("pong");
    }

    @SubscribeMessage(EVENT_TYPES.USERREGISTRATION_CREATE)
    handlePostUpdate(purpose: string, client: Socket) {
        client.broadcast.emit(purpose, {});
    }

    // ------LISTEN TO CREATE REGISTER----------------
    @OnEvent(EVENT_TYPES.USERREGISTRATION_CREATE)
    async handleUserRegistrationCreated(payload: UserRegistration) {
        this.logger.log("User Registration EVENT RECEIVED");
        this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

        if (!payload.info?.recipients?.length) {
            this.logger.warn("No recipients found → skipping");
            return;
        }

        this.logger.log(`Total recipients: ${payload.info.recipients.length}`);

        for (const recipient of payload.info.recipients) {
            this.logger.log(`--- Processing recipient: ${recipient.id} (${recipient.email}) ---`);

            const clients = this.getClientsForUser(recipient.id);
            this.logger.log(`  → Connected sockets: ${clients.size}`);

            if (clients.size === 0) {
                this.logger.warn(
                    `  No active socket for user ${recipient.id} → notification skipped`,
                );
                continue;
            }

            for (const client of clients) {
                this.logger.log(`  Sending notification to socket ${client.id}`);

                client.emit(EVENT_TYPES.USERREGISTRATION_CREATE, {
                    type: EVENT_TYPES.USERREGISTRATION_CREATE,
                    title: "New User Registered",
                    message: `${payload.info.name} has registered as ${payload.info.role}`,
                    createdAt: new Date(),

                    meta: {
                        id: payload.info.id,
                        email: payload.info.email,
                        name: payload.info.name,
                        role: payload.info.role,
                        action: payload.action,
                        ...payload.meta,
                    },
                } satisfies Notification);

                this.logger.log(
                    `  ✔ Notification sent to ${recipient.id} via socket ${client.id}`,
                );
            }
        }

        this.logger.log("USERREGISTRATION_CREATE event processing complete");
    }
}
