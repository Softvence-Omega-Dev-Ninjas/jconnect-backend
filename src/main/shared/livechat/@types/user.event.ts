import { BaseSocketEvent } from "./base.type";

export type UserStatus = "online" | "away" | "busy" | "offline";

// User Events
export interface UserStatusEvent extends BaseSocketEvent {
    status: UserStatus;
    lastSeen?: Date;
}
