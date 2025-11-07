import { AllExceptionsFilter } from "@common/filter/all-exceptions.filter";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Swagger config
    const config = new DocumentBuilder()
        .setTitle("Jconnect Backend API")
        .setDescription("API documentation for Jconnect backend")
        .setVersion("1.0")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api-docs", app, document);

    const PORT = process.env.PORT ?? 8080;
    await app.listen(PORT);

    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📘 Swagger docs: http://localhost:${PORT}/api-docs`);
}

bootstrap();
