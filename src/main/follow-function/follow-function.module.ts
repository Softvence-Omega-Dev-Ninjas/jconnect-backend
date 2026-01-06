import { Module } from '@nestjs/common';
import { FollowFunctionService } from './follow-function.service';
import { FollowFunctionController } from './follow-function.controller';

@Module({
  providers: [FollowFunctionService],
  controllers: [FollowFunctionController]
})
export class FollowFunctionModule {}
