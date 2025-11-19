import { Global, Module } from "@nestjs/common";
import { AdditionalS3Controller } from "./additional/additional.controller";
import { AdditionalS3Service } from "./additional/additional.service";
import { awsController } from "./aws.controller";
import { awsService } from "./aws.service";

@Global()
@Module({
    providers: [awsService, AdditionalS3Service],
    exports: [awsService, AdditionalS3Service],
    controllers: [awsController, AdditionalS3Controller],
})
export class awsModule {}
