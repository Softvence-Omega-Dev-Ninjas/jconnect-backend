import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ServiceModule } from "./service/service.module";

@Module({
    imports: [AuthModule, UsersModule, ServiceModule],
})
export class MainModule {}
