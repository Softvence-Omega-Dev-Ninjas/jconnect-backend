import { BaseSocketEvent } from "./base.type";

type MessageType = "text" | "image" | "file" | "voice" | "video";
// Chat Events
export interface ChatMessage extends BaseSocketEvent {
    message: string;
    messageType: MessageType;
    replyTo?: string;
    metadata?: Record<string, any>;
}

export interface ChatTyping extends BaseSocketEvent {
    isTyping: boolean;
}
