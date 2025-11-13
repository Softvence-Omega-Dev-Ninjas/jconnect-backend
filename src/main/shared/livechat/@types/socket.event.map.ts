

import { SOCKET_EVENTS } from "../constants/socket.constant";
import { ChatMessage, ChatTyping } from "./chat.event";
import { NotificationEvent } from "./notificaiton.event";
import { RoomEvent } from "./room.event";
import { SocketUser } from "./socket.type";
import { UserStatusEvent } from "./user.event";


// Type helpers for event handling
export type SocketEventMap = {
    // Connection Events
    [SOCKET_EVENTS.CONNECTION.USER_JOINED]: SocketUser;
    [SOCKET_EVENTS.CONNECTION.USER_LEFT]: { userId: string; reason?: string };
    [SOCKET_EVENTS.CONNECTION.USER_STATUS]: UserStatusEvent;

    // Chat Events
    [SOCKET_EVENTS.CHAT.MESSAGE_SEND]: ChatMessage;
    [SOCKET_EVENTS.CHAT.MESSAGE_RECEIVE]: ChatMessage;
    [SOCKET_EVENTS.CHAT.MESSAGE_TYPING]: ChatTyping;



    // Room Events
    [SOCKET_EVENTS.ROOM.JOIN]: RoomEvent;
    [SOCKET_EVENTS.ROOM.LEAVE]: RoomEvent;

    // Notification Events
    [SOCKET_EVENTS.NOTIFICATION.SEND]: NotificationEvent;
};