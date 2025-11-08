// import { Module } from "@nestjs/common";
// import { AppController } from "./app.controller";
// import { AppService } from "./app.service";
// import { LibModule } from "./lib/lib.module";
// import { MainModule } from "./main/main.module";

// @Module({
//     imports: [MainModule, LibModule],
//     controllers: [AppController],
//     providers: [AppService],
// })
// export class AppModule {}
// import { CacheModule } from '@nestjs/common';

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { ENVEnum } from './common/enum/env.enum';
import { JwtStrategy } from './common/jwt/jwt.strategy';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LibModule } from './lib/lib.module';
import { MainModule } from './main/main.module';


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),

        // CacheModule.register({
        //     isGlobal: true,
        // }),

        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/files',
        }),

        PassportModule,

        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                secret: await config.getOrThrow(ENVEnum.JWT_SECRET),
                signOptions: {
                    expiresIn: await config.getOrThrow(ENVEnum.JWT_EXPIRES_IN),
                },
            }),
        }),

        MainModule,
        LibModule,
    ],
    controllers: [AppController],
    providers: [JwtStrategy],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*');
    }
}