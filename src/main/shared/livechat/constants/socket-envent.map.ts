import { SOCKET_EVENTS } from "./socket.constant";

interface SocketUser {
    id: string;
    socketId: string;
    email?: string;
    role: string;
    avatar?: string;
    status: string;
    joinedAt: Date;
}

interface UserStatusEvent {
    userId: string;
    status: string;
    timestamp: Date;
}

interface ChatMessage {
    id: string;
    content: string;
    senderId: string;
    roomId: string;
    timestamp: Date;
}

interface ChatTyping {
    userId: string;
    roomId: string;
    isTyping: boolean;
}

interface PostEvent {
    id: string;
    content: string;
    authorId: string;
    timestamp: Date;
}

interface PostReaction {
    postId: string;
    userId: string;
    type: string;
}

interface PostComment {
    id: string;
    postId: string;
    content: string;
    authorId: string;
    timestamp: Date;
}

interface CallEvent {
    callId: string;
    participants: string[];
    type: string;
    data?: any;
}

interface RoomEvent {
    roomId: string;
    userId: string;
    timestamp: Date;
}

interface NotificationEventMap {
    id: string;
    type: string;
    message: string;
    userId: string;
    timestamp: Date;
}

export type SocketEventMap = {
    // Connection Events
    [SOCKET_EVENTS.CONNECTION.USER_JOINED]: SocketUser;
    [SOCKET_EVENTS.CONNECTION.USER_LEFT]: { userId: string; reason?: string };
    [SOCKET_EVENTS.CONNECTION.USER_STATUS]: UserStatusEvent;

    // Chat Events
    [SOCKET_EVENTS.CHAT.MESSAGE_SEND]: ChatMessage;
    [SOCKET_EVENTS.CHAT.MESSAGE_RECEIVE]: ChatMessage;
    [SOCKET_EVENTS.CHAT.MESSAGE_TYPING]: ChatTyping;

    // Post Events
    [SOCKET_EVENTS.POST.CREATE]: PostEvent;
    [SOCKET_EVENTS.POST.LIKE]: PostReaction;
    [SOCKET_EVENTS.POST.COMMENT_ADD]: PostComment;

    // Call Events
    [SOCKET_EVENTS.CALL.INITIATE]: CallEvent;
    [SOCKET_EVENTS.CALL.ACCEPT]: CallEvent;
    [SOCKET_EVENTS.CALL.ICE_CANDIDATE]: CallEvent;
    [SOCKET_EVENTS.CALL.OFFER]: CallEvent;

    // Room Events
    [SOCKET_EVENTS.ROOM.JOIN]: RoomEvent;
    [SOCKET_EVENTS.ROOM.LEAVE]: RoomEvent;

    // Notification Events
    [SOCKET_EVENTS.NOTIFICATION.SEND]: NotificationEventMap;
};

export type EventData<T extends keyof SocketEventMap> = SocketEventMap[T];