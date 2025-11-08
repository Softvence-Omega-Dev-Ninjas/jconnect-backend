import { Test, TestingModule } from '@nestjs/testing';
import { LivechatController } from './livechat.controller';
import { LivechatService } from './livechat.service';

describe('LivechatController', () => {
  let controller: LivechatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivechatController],
      providers: [LivechatService],
    }).compile();

    controller = module.get<LivechatController>(LivechatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
