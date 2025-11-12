import { Global, Module } from '@nestjs/common';

import { FileService } from './service/file.service';
import { SuperAdminService } from './service/super-admin.service';

@Global()
@Module({
    imports: [],
    providers: [SuperAdminService, FileService],
})
export class SeedModule { }