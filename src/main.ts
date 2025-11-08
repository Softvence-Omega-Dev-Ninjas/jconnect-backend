import { AllExceptionsFilter } from "@common/filter/all-exceptions.filter";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as bodyParser from 'body-parser';
import { AppModule } from "./app.module";
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    // --------------Swagger config with Bearer Auth------------------
    const config = new DocumentBuilder()
        .setTitle('J-connect Backend API')
        .setDescription('Team j-connect API description')
        .setVersion('1.0')
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
    // Swagger config
    // const config = new DocumentBuilder()
    //     .setTitle("J-connect Backend API")
    //     .setDescription("API documentation for J-connect backend")
    //     .setVersion("1.0")
    //     .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api-docs", app, document);
    // ---------------webhook raw body parser----------------
    // Stripe requires the raw body to construct the event.
    app.use('/stripe/webhook', bodyParser.raw({ type: 'application/json' }));
    const configService = app.get(ConfigService);
    const PORT = process.env.PORT ?? 8080;
    await app.listen(PORT);

    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📘 Swagger docs: http://localhost:${PORT}/api-docs`);
}

bootstrap();
