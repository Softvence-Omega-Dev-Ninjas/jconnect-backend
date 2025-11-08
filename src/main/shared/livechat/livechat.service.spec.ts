import { Test, TestingModule } from "@nestjs/testing";
import { LivechatService } from "./livechat.service";

describe("LivechatService", () => {
    let service: LivechatService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LivechatService],
        }).compile();

        service = module.get<LivechatService>(LivechatService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
