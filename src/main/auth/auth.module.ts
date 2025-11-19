import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { JwtModule } from "@nestjs/jwt";
import { LibModule } from "src/lib/lib.module";
import { AuthController } from "./controllers/auth.controller";
import { AuthGoogleService } from "./services/auh-google.service";
import { AuthService } from "./services/auth.service";

@Module({
    imports: [
        ConfigModule,
        LibModule,
        EventEmitterModule.forRoot(),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                secret: config.getOrThrow("JWT_SECRET"),
                signOptions: {
                    expiresIn: config.getOrThrow("JWT_EXPIRES_IN"),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, AuthGoogleService],
    exports: [AuthService, JwtModule],
})
export class AuthModule {}
