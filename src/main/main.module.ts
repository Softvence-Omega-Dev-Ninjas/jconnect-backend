import { Module } from "@nestjs/common";
import { LibModule } from "src/lib/lib.module";
import { AdminDashboardStatsModule } from "./admin-dashboard-stats/admin-dashboard-stats.module";
import { AuthModule } from "./auth/auth.module";
import { CustomServiceRequestModule } from "./custom-service-request/custom-service-request.module";
import { ProfileModule } from "./profile/profile.module";
import { ReviewModule } from "./review/review.module";
import { ServiceRequestModule } from "./service-request/service-request.module";
import { ServiceModule } from "./service/service.module";
import { SharedModule } from "./shared/shared.module";
import { SocialServiceRequestModule } from "./social-service-request/social-service-request.module";
import { SocialServiceModule } from "./social-service/social-service.module";
import { UsersModule } from "./users/users.module";
import { AwsModule } from "./aws/aws.module";
import { StripepaymentModule } from "./stripepayment/stripepayment.module";

@Module({
    imports: [
        LibModule,
        AuthModule,
        UsersModule,
        ServiceModule,
        ServiceRequestModule,
        CustomServiceRequestModule,
        ProfileModule,
        SocialServiceModule,
        SocialServiceRequestModule,
        AdminDashboardStatsModule,
        ReviewModule,
        SharedModule,
        AwsModule,
        StripepaymentModule,
    ],
})
export class MainModule {}
