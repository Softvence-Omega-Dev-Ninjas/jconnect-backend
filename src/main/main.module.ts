import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { ServiceModule } from "./service/service.module";
import { UsersModule } from "./users/users.module";

@Module({
    imports: [AuthModule, UsersModule, ServiceModule, ProfileModule],
})
export class MainModule {}
