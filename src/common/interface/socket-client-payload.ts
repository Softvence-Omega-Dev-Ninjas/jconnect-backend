export type PayloadForSocketClient = {
    sub: string;
    email: string;
    userUpdates: boolean;
    serviceCreate: boolean;
    review: boolean;
    post: boolean;
    message: boolean;
    userRegistration: boolean;
};
