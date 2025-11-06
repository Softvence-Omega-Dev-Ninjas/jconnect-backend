import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Swagger configuration
    const config = new DocumentBuilder()
        .setTitle("Jconnect backend API")
        .setDescription("API documentation for jconnect backend")
        .setVersion("1.0")
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api-docs", app, documentFactory);

    await app.listen(process.env.PORT ?? 8080);
    console.log(`project start at http://localhost:8080/api-docs`);
}
bootstrap();
