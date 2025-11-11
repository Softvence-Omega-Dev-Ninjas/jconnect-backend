import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { CreateLivechatDto } from "./dto/create-livechat.dto";
import { UpdateLivechatDto } from "./dto/update-livechat.dto";
import { LivechatService } from "./service/livechat.service";

@Controller("livechat")
export class LivechatController {
    constructor(private readonly livechatService: LivechatService) { }

    @Post()
    create(@Body() createLivechatDto: CreateLivechatDto) {
        return this.livechatService.create(createLivechatDto);
    }

    @Get()
    findAll() {
        return this.livechatService.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.livechatService.findOne(+id);
    }

    @Patch(":id")
    update(@Param("id") id: string, @Body() updateLivechatDto: UpdateLivechatDto) {
        return this.livechatService.update(+id, updateLivechatDto);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.livechatService.remove(+id);
    }
}
