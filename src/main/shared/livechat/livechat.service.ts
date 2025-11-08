import { Injectable } from '@nestjs/common';
import { CreateLivechatDto } from './dto/create-livechat.dto';
import { UpdateLivechatDto } from './dto/update-livechat.dto';

@Injectable()
export class LivechatService {
  create(createLivechatDto: CreateLivechatDto) {
    return 'This action adds a new livechat';
  }

  findAll() {
    return `This action returns all livechat`;
  }

  findOne(id: number) {
    return `This action returns a #${id} livechat`;
  }

  update(id: number, updateLivechatDto: UpdateLivechatDto) {
    return `This action updates a #${id} livechat`;
  }

  remove(id: number) {
    return `This action removes a #${id} livechat`;
  }
}
