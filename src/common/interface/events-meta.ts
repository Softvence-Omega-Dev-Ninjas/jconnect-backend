// User registration event meta
export interface UserRegistrationMeta {
    userId: string;
    userName?: string;
    registeredAt: Date;
}

// Post event meta
export interface PostMeta {
    postId: string;
    performedBy: string;
    publishedAt: Date;
}

// Message event meta
export interface MessageMeta {
    messageId: string;
    fromUserId: string;
    toUserId: string;
    sentAt: Date;
}
export interface serviceCreateMeta {
    creatorId: string;
    serviceId: string;
    performedBy: string;
    publishedAt: Date;
}

export interface reviewMeta {
    reviewId: string;
    reviewContent: string;
    performedBy: string;
    publishedAt: Date;
}
