import { MessageMeta, PostMeta, UserRegistrationMeta, serviceCreateMeta } from "./events-meta";
import { ReviewMeta } from "./events-name";

// Generic Base Event
export interface BaseEvent<TMeta> {
    action: "CREATE" | "UPDATE" | "DELETE";
    meta: TMeta;
}

// Notification Base
export interface Notification {
    type: string;
    title: string;
    message: string;
    createdAt: Date;
    meta: Record<string, any>;
}

// User Registration Event
export interface UserRegistration extends BaseEvent<UserRegistrationMeta> {
    info: {
        email: string;
        id: string;
        name: string;
        role: string;
    };
}

// Post Event
export interface PostEvent extends BaseEvent<PostMeta> {
    info: {
        title: string;
        message: string;
        authorId: string;
        recipients: { id: string; email: string }[];
    };
}

// Message Event
export interface Message extends BaseEvent<MessageMeta> {
    info: {
        fromUserId: string;
        toUserId: string;
        content: string;
        sendEmail: boolean;
    };
}

// Service Create Event
export interface ServiceCreateEvent extends BaseEvent<serviceCreateMeta> {
    info: {
        serviceName: string;
        creatorId: string;
        recipients: { id: string; email: string }[];
    };
}

// Review Event
export interface ReviewEvent extends BaseEvent<ReviewMeta> {
    info: {
        reviewId: string;
        reviewContent: string;
        performedBy: string;
        recipients: { id: string; email: string }[];
    };
}
