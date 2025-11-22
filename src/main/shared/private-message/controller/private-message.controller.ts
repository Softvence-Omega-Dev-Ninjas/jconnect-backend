import {
    Body,
    Controller,
    Delete,
    forwardRef,
    Get,
    Inject,
    OnModuleInit,
    Param,
    Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser, ValidateAuth } from "src/common/jwt/jwt.decorator";
import { SendPrivateMessageDto } from "../dto/privateChatGateway.dto";
import { PrivateChatGateway } from "../privateChatGateway/privateChatGateway";
import { PrivateChatService } from "../service/private-message.service";

@ApiTags("Garage  owner Private Chat => One to One Chat")
@Controller("private-chat")
@ValidateAuth()
@ApiBearerAuth()
export class PrivateChatController implements OnModuleInit {
    private gateway: PrivateChatGateway;

    constructor(
        private readonly privateService: PrivateChatService,
        @Inject(forwardRef(() => PrivateChatGateway))
        private readonly injectedGateway: PrivateChatGateway,
    ) {}

    onModuleInit() {
        this.gateway = this.injectedGateway;
    }

    @Get()
    @ApiOperation({ summary: "Get All Private message" })
    async getAllPrivateMessage(@GetUser("userId") userId: string) {
        return await this.privateService.getAllChatsWithLastMessage(userId);
    }
    // ----------------- get conversation message----------------
    @Get(":conversationId")
    @ApiOperation({ summary: "Get messages for a specific private conversation" })
    async getConversationMessages(
        @Param("conversationId") conversationId: string,
        @GetUser("userId") userId: string,
    ) {
        return await this.privateService.getPrivateConversationWithMessages(conversationId, userId);
    }
    // -----------send message for

    @Post("send-message/:recipientId")
    @ApiOperation({ summary: "Sending Private message" })
    async sendTeamMessage(
        @Param("recipientId") recipientId: string,
        @Body() dto: SendPrivateMessageDto,
        @GetUser("userId") senderId: string,
    ) {
        if (recipientId === senderId) {
            throw new Error("Cannot send message to yourself");
        }

        const conversation = await this.privateService.findOrCreateConversation(
            senderId,
            recipientId,
        );

        const message = await this.privateService.sendPrivateMessage(
            conversation.id,
            senderId,
            dto,
        );

        // Emit to both sender and recipient
        this.gateway.emitNewMessage(senderId, message);
        this.gateway.emitNewMessage(recipientId, message);

        return { success: true, message };
    }

    @Post("make-private-message-read/:messageId")
    async makePrivateMassageReadTrue(@Param("messageId") messageId: string) {
        return await this.privateService.makePrivateMassageReadTrue(messageId);
    }

    @Delete(":conversationId")
    async deleteConversation(@Param("conversationId") conversationId: string) {
        return await this.privateService.deleteConversation(conversationId);
    }
}
