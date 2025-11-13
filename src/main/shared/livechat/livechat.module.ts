import { AuthValidatorService } from '@global/auth-validator/auth-validator.service';
import { Module } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './controller/livechat.controller';
import { SocketMiddleware } from './middleware/socket.middleware';
import { ChatService } from './service/livechat.service';
import { RedisService } from './service/redis.service';
import { JwtServices } from '@global/auth-validator/jwt.service';

@Module({
    imports: [],
    providers: [
        ChatService,
        ChatGateway,
        PrismaService,
        RedisService,
        SocketMiddleware,
        AuthValidatorService,
        JwtServices
    ],
    controllers: [ChatController],
    exports: [ChatService],
})
export class ChatModule { }