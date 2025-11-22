import { IsArray, IsOptional, IsString } from "class-validator";

export class SendPrivateMessageDto {
    @IsString()
    recipientId: string;

    @IsString()
    content: string;

    @IsOptional()
    @IsArray({ each: true })
    files: string[];

    @IsOptional()
    @IsString()
    replyToMessageId?: string;
}
