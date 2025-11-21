import { Global, Module } from "@nestjs/common";

import { FileService } from "./service/file.service";
import { SuperAdminService } from "./service/super-admin.service";
import { seedSettingSrvice } from "./service/setting.service";

@Global()
@Module({
    imports: [],
    providers: [SuperAdminService, FileService, seedSettingSrvice],
})
export class SeedModule {}
