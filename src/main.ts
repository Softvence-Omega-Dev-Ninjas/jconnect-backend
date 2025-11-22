import { AllExceptionsFilter } from "@common/filter/all-exceptions.filter";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import { AppModule } from "./app.module";
async function bootstrap() {
    const app = await NestFactory.create(AppModule, { cors: true });
    // --------------Swagger config with Bearer Auth------------------
    const config = new DocumentBuilder()
        .setTitle("J-connect Backend API")
        .setDescription("Team j-connect API description")
        .setVersion("1.0")
        .addBearerAuth()
        .build();

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api-docs", app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    const configService = app.get(ConfigService);
    const PORT = process.env.PORT ?? 8080;

    app.use("/payments/webhook", express.raw({ type: "application/json" }));

    // Other routes normal JSON
    app.use(express.json());

    await app.listen(PORT);

    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📘 Swagger docs: http://localhost:${PORT}/api-docs`);
}

bootstrap();
