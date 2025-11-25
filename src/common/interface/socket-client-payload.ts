export type PayloadForSocketClient = {
    sub: string;
    email: string;
    userUpdates: boolean;
    review: boolean;
    post: boolean;
    message: boolean;
    userRegistration: boolean;
    Service: boolean;
}