import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LibModule } from "./lib/lib.module";
import { MainModule } from "./main/main.module";

@Module({
    imports: [MainModule, LibModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
