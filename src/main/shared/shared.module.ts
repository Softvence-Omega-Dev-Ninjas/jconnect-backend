import { Module } from "@nestjs/common";



import { UploadAwsModule } from "./aws-upload/aws-upload.module";
import { PrivateMessageModule } from "./private-message/private-message.module";

@Module({
    imports: [PrivateMessageModule, UploadAwsModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class SharedModule { }
