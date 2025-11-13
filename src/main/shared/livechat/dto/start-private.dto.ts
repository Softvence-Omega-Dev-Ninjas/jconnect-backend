// src/chat/dto/start-private.dto.ts
import { IsUUID } from "class-validator";

export class StartPrivateChatDto {
    @IsUUID()
    otherUserId: string;
}