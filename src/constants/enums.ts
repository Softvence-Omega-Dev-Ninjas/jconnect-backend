export const role = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN", "ARTIST"] as const;
export type Role = (typeof role)[number];

export const authProvider = ["GOOGLE", "APPLE", "EMAIL", "FACEBOOK"] as const;
export type AuthProvider = (typeof authProvider)[number];
