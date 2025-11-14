import { ReqUser } from "@common/decorators/req-user.decorator";
import { JwtAuthGuard } from "@common/jwt/jwt.gurd";
import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StartPrivateChatDto } from "../dto/start-private.dto";
import { ChatService } from "../service/livechat.service";

// interface AuthRequest extends Request {
//     user: { id: string };
// }
// console.log(A)
@ApiTags("Chat API")
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private chatService: ChatService) {}

    @Post("private")
    async startPrivateChat(@ReqUser() me: { id: string }, @Body() dto: StartPrivateChatDto) {
        return this.chatService.getOrCreatePrivateChat(me.id, dto.otherUserId);
    }

    @Get("my")
    async getMyChats(@ReqUser() me: { id: string }) {
        return this.chatService.getMyChats(me.id);
    }

    @Get(":chatId/messages")
    async getMessages(@Param("chatId") chatId: string, @Query("cursor") cursor?: string) {
        return this.chatService.getMessages(chatId, cursor);
    }
}
