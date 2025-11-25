// Event payload interfaces (aligned with NotificationToggle schema)
export interface UserRegistrationMeta {
    userId: string;
    userName?: string;
    registeredAt: Date;
}

export interface PostMeta {
    postId: string;
    performedBy: string;
    publishedAt: Date;
}

export interface MessageMeta {
    messageId: string;
    fromUserId: string;
    toUserId: string;
    sentAt: Date;
}



export interface ReviewMeta {
    reviewId: string;
    reviewContent: string;
    performedBy: string;
    publishedAt: Date;
}

export interface ServiceMeta {
    serviceName: string;
    description: string;
    authorId: string;
    publishedAt: Date;
}

// EVENT TYPE CONSTANTS
export const EVENT_TYPES = {
    USERREGISTRATION_CREATE: "user.create",
    USERREGISTRATION_UPDATE: "user.update",
    USERREGISTRATION_DELETE: "user.delete",

    POST_CREATE: "post.create",
    POST_UPDATE: "post.update",
    POST_DELETE: "post.delete",

    MESSAGE_CREATE: "message.create",
    SERVICE_CREATE: "service.create",
    REVIEW_CREATE: "review.create",
} as const;

// Type-safe keys
export type EventType = keyof typeof EVENT_TYPES;

// Event payload mapping
export type EventPayloadMap = {
    [EVENT_TYPES.USERREGISTRATION_CREATE]: UserRegistrationMeta;
    [EVENT_TYPES.USERREGISTRATION_UPDATE]: UserRegistrationMeta;
    [EVENT_TYPES.USERREGISTRATION_DELETE]: UserRegistrationMeta;

    [EVENT_TYPES.POST_CREATE]: PostMeta;
    [EVENT_TYPES.POST_UPDATE]: PostMeta;
    [EVENT_TYPES.POST_DELETE]: PostMeta;

    [EVENT_TYPES.MESSAGE_CREATE]: MessageMeta;

    [EVENT_TYPES.SERVICE_CREATE]: ServiceMeta;
    [EVENT_TYPES.REVIEW_CREATE]: ReviewMeta;
};
