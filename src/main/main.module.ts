import { Module } from "@nestjs/common";
import { LibModule } from "src/lib/lib.module";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { ServiceRequestModule } from "./service-request/service-request.module";
import { ServiceModule } from "./service/service.module";
import { SharedModule } from "./shared/shared.module";
import { UsersModule } from "./users/users.module";
import { ReviewModule } from "./review/review.module";

@Module({
    imports: [
        LibModule,
        AuthModule,
        UsersModule,
        ServiceModule,
        ProfileModule,
        ServiceRequestModule,
        SharedModule,
        ReviewModule,
    ],
})
export class MainModule {}
