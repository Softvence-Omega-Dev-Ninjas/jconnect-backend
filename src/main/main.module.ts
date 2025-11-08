import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { ServiceModule } from "./service/service.module";
import { UsersModule } from "./users/users.module";
import { ServiceRequestModule } from "./service-request/service-request.module";
import { SharedModule } from "./shared/shared.module";

@Module({
    imports: [
        AuthModule,
        UsersModule,
        ServiceModule,
        ProfileModule,
        ServiceRequestModule,
        SharedModule,
    ],
})
export class MainModule {}
