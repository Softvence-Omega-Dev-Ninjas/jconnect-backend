import { AwsService } from "@main/aws/aws.service";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { MultipartParserMiddleware } from "@common/middleware/multipart-parser.middleware";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
    controllers: [UsersController],
    providers: [UsersService, AwsService],
})
export class UsersModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MultipartParserMiddleware).forRoutes("users/me");
    }
}
