// Base interfaces for all socket events
export type BaseSocketEvent = {
    eventId: string;
    timestamp: Date;
    userId: string;
    roomId?: string;
};

export type SocketResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
};