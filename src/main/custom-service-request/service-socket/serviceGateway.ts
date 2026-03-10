

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";

import * as jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { ENVEnum } from "src/common/enum/env.enum";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CustomServiceRequestService } from "../custom-service-request.service";

enum ServiceEvents {
    ERROR = "service:error",
    SUCCESS = "service:success",
    GET_SERVICE_REQUESTS = "service:get_service_requests",

    // REST API Real-time Events
    SERVICE_CREATED = "service:created",
    SERVICE_UPDATED = "service:updated",
    SERVICE_DELETED = "service:deleted",
    SERVICE_FETCHED = "service:fetched",
    SERVICE_LIST_UPDATED="service:list_updated"
}

@WebSocketGateway({
    cors: { origin: "*" },
    namespace: "/service",
})
export class serviceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(serviceGateway.name);

    constructor(
        private readonly customServiceRequestService: CustomServiceRequestService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        this.logger.log("server initialized FOR serviceGateway", server.adapter.name);
    }

    /** Handle socket connection and authentication */
    async handleConnection(client: Socket) {
        const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token;
        if (!authHeader) {
            client.emit(ServiceEvents.ERROR, {
                message: "Missing authorization header",
            });
            client.disconnect(true);
            this.logger.warn("Missing auth header");
            return;
        }

        const token = authHeader.split(" ")[1];
        console.log("the connected token is", token);
        if (!token) {
            client.emit(ServiceEvents.ERROR, { message: "Missing token" });
            client.disconnect(true);
            this.logger.warn("Missing token");
            return;
        }

        try {
            const jwtSecret = this.configService.get<string>(ENVEnum.JWT_SECRET);
            const payload: any = jwt.verify(token, jwtSecret as string);
            const userId = payload.sub;

            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true },
            });
            if (!user) {
                client.emit(ServiceEvents.ERROR, {
                    message: "User not found in database",
                });
                client.disconnect(true);
                this.logger.warn(`User not found: ${userId}`);
                return;
            }

            client.data.userId = userId;
            client.join(userId);
            client.emit(ServiceEvents.SUCCESS, userId);
            this.logger.log(` serviceGateway: User ${userId} connected, socket ${client.id}`);
        } catch (err) {
            client.emit(ServiceEvents.ERROR, { message: err.message });
            client.disconnect(true);
            this.logger.warn(`Authentication failed: ${err.message}`);
        }
    }

    handleDisconnect(client: Socket) {
        client.leave(client.data.userId);
        client.emit(ServiceEvents.ERROR, { message: "Disconnected" });
        this.logger.log(`Private chat disconnected: ${client.id}`);
    }

    // WebSocket Event Handlers - Service Operations

    /**
     * Handle creating a new custom service request via WebSocket
  
     */
    @SubscribeMessage('service:create')
    async handleCreateService(client: Socket, payload: any) {
        try {
            const userId = client.data.userId;
            if (!userId) {
                client.emit(ServiceEvents.ERROR, { message: "Unauthorized" });
                return;
            }

            // Create service request
            const newRequest = await this.customServiceRequestService.create(payload);

            // Emit success to the creator
            client.emit(ServiceEvents.SERVICE_CREATED, {
                event: "created",
                data: newRequest,
                timestamp: new Date().toISOString()
            });

            // Broadcast to all relevant parties
            this.emitServiceCreated(newRequest);

            this.logger.log(`Service request created via socket: ${newRequest.id}`);
            return { success: true, data: newRequest };
        } catch (error) {
            this.logger.error(`Error creating service via socket: ${error.message}`);
            client.emit(ServiceEvents.ERROR, {
                message: error.message || "Failed to create service request",
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle fetching all custom service requests via WebSocket
 
     */
    @SubscribeMessage('service:get_all')
    async handleGetAllServices(client: Socket) {
        try {
            const userId = client.data.userId;
            if (!userId) {
                client.emit(ServiceEvents.ERROR, { message: "Unauthorized" });
                return;
            }

            // Fetch all service requests
            const requests = await this.customServiceRequestService.findAll();

            // Emit to the requesting user
            this.emitServiceListFetched(userId, requests);

            this.logger.log(`Service requests fetched via socket for user: ${userId}`);
            return { success: true, data: requests, count: requests.length };
        } catch (error) {
            this.logger.error(`Error fetching services via socket: ${error.message}`);
            client.emit(ServiceEvents.ERROR, {
                message: error.message || "Failed to fetch service requests",
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle fetching a single custom service request via WebSocket
    
     */
    @SubscribeMessage('service:get_one')
    async handleGetOneService(client: Socket, payload: { id: string }) {
        try {
            const userId = client.data.userId;
            if (!userId) {
                client.emit(ServiceEvents.ERROR, { message: "Unauthorized" });
                return;
            }

            if (!payload?.id) {
                client.emit(ServiceEvents.ERROR, { message: "Service request ID is required" });
                return;
            }

            // Fetch single service request
            const request = await this.customServiceRequestService.findOne(payload.id);

            // Emit to the requesting user
            this.emitServiceFetched(userId, request);

            this.logger.log(`Service request fetched via socket: ${payload.id}`);
            return { success: true, data: request };
        } catch (error) {
            this.logger.error(`Error fetching service via socket: ${error.message}`);
            client.emit(ServiceEvents.ERROR, {
                message: error.message || "Failed to fetch service request",
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle updating a custom service request via WebSocket
   
     */
    @SubscribeMessage('service:update')
    async handleUpdateService(client: Socket, payload: { id: string; data: any }) {
        try {
            const userId = client.data.userId;
            if (!userId) {
                client.emit(ServiceEvents.ERROR, { message: "Unauthorized" });
                return;
            }

            if (!payload?.id) {
                client.emit(ServiceEvents.ERROR, { message: "Service request ID is required" });
                return;
            }

            // Update service request
            const updated = await this.customServiceRequestService.update(payload.id, payload.data);

            // Emit success to the updater
            client.emit(ServiceEvents.SERVICE_UPDATED, {
                event: "updated",
                data: updated,
                timestamp: new Date().toISOString()
            });

            // Broadcast to all relevant parties
            this.emitServiceUpdated(updated);

            this.logger.log(`Service request updated via socket: ${payload.id}`);
            return { success: true, data: updated };
        } catch (error) {
            this.logger.error(`Error updating service via socket: ${error.message}`);
            client.emit(ServiceEvents.ERROR, {
                message: error.message || "Failed to update service request",
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle deleting a custom service request via WebSocket
  
     */
    @SubscribeMessage('service:delete')
    async handleDeleteService(client: Socket, payload: { id: string }) {
        try {
            const userId = client.data.userId;
            if (!userId) {
                client.emit(ServiceEvents.ERROR, { message: "Unauthorized" });
                return;
            }

            if (!payload?.id) {
                client.emit(ServiceEvents.ERROR, { message: "Service request ID is required" });
                return;
            }

            // Delete service request
            const deleted = await this.customServiceRequestService.remove(payload.id);

            // Emit success to the deleter
            client.emit(ServiceEvents.SERVICE_DELETED, {
                event: "deleted",
                data: deleted,
                timestamp: new Date().toISOString()
            });

            // Broadcast to all relevant parties
            this.emitServiceDeleted(deleted);

            this.logger.log(`Service request deleted via socket: ${payload.id}`);
            return { success: true, data: deleted };
        } catch (error) {
            this.logger.error(`Error deleting service via socket: ${error.message}`);
            client.emit(ServiceEvents.ERROR, {
                message: error.message || "Failed to delete service request",
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle accepting a service request via WebSocket
     
     */
    @SubscribeMessage('service:accept')
    async handleAcceptService(client: Socket, payload: { id: string }) {
        try {
            const userId = client.data.userId;
            if (!userId) {
                client.emit(ServiceEvents.ERROR, { message: "Unauthorized" });
                return;
            }

            if (!payload?.id) {
                client.emit(ServiceEvents.ERROR, { message: "Service request ID is required" });
                return;
            }

            // Update service request status to accepted
            const accepted = await this.customServiceRequestService.update(payload.id, {} as any);

            // Emit acceptance events
            this.emitServiceAccepted(accepted);
            this.emitServiceStatusChanged(accepted, 'ACCEPTED');

            this.logger.log(`Service request accepted via socket: ${payload.id}`);
            return { success: true, data: accepted };
        } catch (error) {
            this.logger.error(`Error accepting service via socket: ${error.message}`);
            client.emit(ServiceEvents.ERROR, {
                message: error.message || "Failed to accept service request",
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle declining a service request via WebSocket
    
     */
    @SubscribeMessage('service:decline')
    async handleDeclineService(client: Socket, payload: { id: string; reason?: string }) {
        try {
            const userId = client.data.userId;
            if (!userId) {
                client.emit(ServiceEvents.ERROR, { message: "Unauthorized" });
                return;
            }

            if (!payload?.id) {
                client.emit(ServiceEvents.ERROR, { message: "Service request ID is required" });
                return;
            }

            // Update service request status to declined
            const declined = await this.customServiceRequestService.update(payload.id, {} as any);

            // Emit decline events
            this.emitServiceDeclined(declined, payload.reason);
            this.emitServiceStatusChanged(declined, 'DECLINED');

            this.logger.log(`Service request declined via socket: ${payload.id}`);
            return { success: true, data: declined };
        } catch (error) {
            this.logger.error(`Error declining service via socket: ${error.message}`);
            client.emit(ServiceEvents.ERROR, {
                message: error.message || "Failed to decline service request",
                timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
        }
    }

    // Real-time event emitters for REST API operations

    /**
     * Emit event when a new custom service request is created
     * Called by REST API controller after creating a request
     */
    emitServiceCreated(serviceRequest: any) {
        try {
            // Emit to the buyer who created the request
            if (serviceRequest.buyerId) {
                this.server.to(serviceRequest.buyerId).emit(ServiceEvents.SERVICE_CREATED, {
                    event: "created",
                    data: serviceRequest,
                    timestamp: new Date().toISOString(),
                });
            }

            // Emit to the target creator if specified
            if (serviceRequest.targetCreatorId) {
                this.server.to(serviceRequest.targetCreatorId).emit(ServiceEvents.SERVICE_CREATED, {
                    event: "created",
                    data: serviceRequest,
                    timestamp: new Date().toISOString(),
                });
            }

            // Broadcast to all connected clients for list updates
            this.server.emit(ServiceEvents.SERVICE_LIST_UPDATED, {
                action: "created",
                data: serviceRequest,
                timestamp: new Date().toISOString(),
            });

            this.logger.log(`Service request created event emitted: ${serviceRequest.id}`);
        } catch (error) {
            this.logger.error(`Error emitting service created event: ${error.message}`);
        }
    }

    /**
     * Emit event when a custom service request is updated
   
     */
    emitServiceUpdated(serviceRequest: any) {
        try {
            // Emit to the buyer
            if (serviceRequest.buyerId) {
                this.server.to(serviceRequest.buyerId).emit(ServiceEvents.SERVICE_UPDATED, {
                    event: "updated",
                    data: serviceRequest,
                    timestamp: new Date().toISOString(),
                });
            }

            // Emit to the target creator if specified
            if (serviceRequest.targetCreatorId) {
                this.server.to(serviceRequest.targetCreatorId).emit(ServiceEvents.SERVICE_UPDATED, {
                    event: "updated",
                    data: serviceRequest,
                    timestamp: new Date().toISOString(),
                });
            }

            // Broadcast to all connected clients for list updates
            this.server.emit(ServiceEvents.SERVICE_LIST_UPDATED, {
                action: "updated",
                data: serviceRequest,
                timestamp: new Date().toISOString(),
            });

            this.logger.log(`Service request updated event emitted: ${serviceRequest.id}`);
        } catch (error) {
            this.logger.error(`Error emitting service updated event: ${error.message}`);
        }
    }

    /**
     * Emit event when a custom service request is deleted
   
     */
    emitServiceDeleted(serviceRequest: any) {
        try {
            // Emit to the buyer
            if (serviceRequest.buyerId) {
                this.server.to(serviceRequest.buyerId).emit(ServiceEvents.SERVICE_DELETED, {
                    event: "deleted",
                    data: serviceRequest,
                    timestamp: new Date().toISOString(),
                });
            }

            // Emit to the target creator if specified
            if (serviceRequest.targetCreatorId) {
                this.server.to(serviceRequest.targetCreatorId).emit(ServiceEvents.SERVICE_DELETED, {
                    event: "deleted",
                    data: serviceRequest,
                    timestamp: new Date().toISOString(),
                });
            }

            // Broadcast to all connected clients for list updates
            this.server.emit(ServiceEvents.SERVICE_LIST_UPDATED, {
                action: "deleted",
                data: { id: serviceRequest.id },
                timestamp: new Date().toISOString(),
            });

            this.logger.log(`Service request deleted event emitted: ${serviceRequest.id}`);
        } catch (error) {
            this.logger.error(`Error emitting service deleted event: ${error.message}`);
        }
    }

    /**
     * Emit event when a single service request is fetched
 
     */
    emitServiceFetched(userId: string, serviceRequest: any) {
        try {
            this.server.to(userId).emit(ServiceEvents.SERVICE_FETCHED, {
                event: "fetched",
                data: serviceRequest,
                timestamp: new Date().toISOString()
            });

            this.logger.log(`Service request fetched event emitted to user ${userId}`);
        } catch (error) {
            this.logger.error(`Error emitting service fetched event: ${error.message}`);
        }
    }

    /**
     * Emit event when service requests list is fetched
     * Called by REST API controller after fetching all requests
     */
    emitServiceListFetched(userId: string | null, serviceRequests: any[]) {
        try {
            const payload = {
                event: "list_fetched",
                data: serviceRequests,
                count: serviceRequests.length,
                timestamp: new Date().toISOString(),
            };

            if (userId) {
                this.server.to(userId).emit(ServiceEvents.GET_SERVICE_REQUESTS, payload);
                this.logger.log(`Service requests list fetched event emitted to user ${userId}`);
            } else {
                this.server.emit(ServiceEvents.GET_SERVICE_REQUESTS, payload);
                this.logger.log(`Service requests list fetched event broadcasted to all clients`);
            }
        } catch (error) {
            this.logger.error(`Error emitting service list fetched event: ${error.message}`);
        }
    }

    /**
     * Emit event when service request status changes
  
     */
    emitServiceStatusChanged(serviceRequest: any, status: string) {
        try {
            const payload = {
                event: "status_changed",
                data: serviceRequest,
                status: status,
                timestamp: new Date().toISOString()
            };

            // Emit to the buyer
            if (serviceRequest.buyerId) {
                this.server.to(serviceRequest.buyerId).emit(ServiceEvents.SERVICE_REQUEST_STATUS, payload);
            }

            // Emit to the target creator if specified
            if (serviceRequest.targetCreatorId) {
                this.server.to(serviceRequest.targetCreatorId).emit(ServiceEvents.SERVICE_REQUEST_STATUS, payload);
            }

            this.logger.log(`Service request status changed event emitted: ${serviceRequest.id} - ${status}`);
        } catch (error) {
            this.logger.error(`Error emitting service status changed event: ${error.message}`);
        }
    }

    /**
     * Emit event when service request is accepted
    
     */
    emitServiceAccepted(serviceRequest: any) {
        try {
            const payload = {
                event: "accepted",
                data: serviceRequest,
                timestamp: new Date().toISOString()
            };

            // Emit to the buyer
            if (serviceRequest.buyerId) {
                this.server.to(serviceRequest.buyerId).emit(ServiceEvents.SERVICE_REQUEST_ACCEPT, payload);
            }

            // Emit to the target creator if specified
            if (serviceRequest.targetCreatorId) {
                this.server.to(serviceRequest.targetCreatorId).emit(ServiceEvents.SERVICE_REQUEST_ACCEPT, payload);
            }

            this.logger.log(`Service request accepted event emitted: ${serviceRequest.id}`);
        } catch (error) {
            this.logger.error(`Error emitting service accepted event: ${error.message}`);
        }
    }

    /**
     * Emit event when service request is declined
   
     */
    emitServiceDeclined(serviceRequest: any, reason?: string) {
        try {
            const payload = {
                event: "declined",
                data: serviceRequest,
                reason: reason,
                timestamp: new Date().toISOString()
            };

            // Emit to the buyer
            if (serviceRequest.buyerId) {
                this.server.to(serviceRequest.buyerId).emit(ServiceEvents.SERVICE_REQUEST_DECLINE, payload);
            }

            // Emit to the target creator if specified
            if (serviceRequest.targetCreatorId) {
                this.server.to(serviceRequest.targetCreatorId).emit(ServiceEvents.SERVICE_REQUEST_DECLINE, payload);
            }

            this.logger.log(`Service request declined event emitted: ${serviceRequest.id}`);
        } catch (error) {
            this.logger.error(`Error emitting service declined event: ${error.message}`);
        }
    }

    /**
     * Broadcast error event to specific user or all users
     */
    emitError(error: any, userId?: string) {
        try {
            const payload = {
                event: "error",
                error: typeof error === "string" ? error : error.message,
                timestamp: new Date().toISOString(),
            };

            if (userId) {
                this.server.to(userId).emit(ServiceEvents.ERROR, payload);
            } else {
                this.server.emit(ServiceEvents.ERROR, payload);
            }

            this.logger.error(`Error event emitted: ${JSON.stringify(payload)}`);
        } catch (err) {
            this.logger.error(`Error emitting error event: ${err.message}`);
        }
    }
}
