import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LivechatService } from './livechat.service';
import { CreateLivechatDto } from './dto/create-livechat.dto';
import { UpdateLivechatDto } from './dto/update-livechat.dto';

@Controller('livechat')
export class LivechatController {
  constructor(private readonly livechatService: LivechatService) {}

  @Post()
  create(@Body() createLivechatDto: CreateLivechatDto) {
    return this.livechatService.create(createLivechatDto);
  }

  @Get()
  findAll() {
    return this.livechatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.livechatService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLivechatDto: UpdateLivechatDto) {
    return this.livechatService.update(+id, updateLivechatDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.livechatService.remove(+id);
  }
}
