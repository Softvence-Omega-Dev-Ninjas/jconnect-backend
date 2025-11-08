import { PartialType } from "@nestjs/swagger";
import { CreateLivechatDto } from "./create-livechat.dto";

export class UpdateLivechatDto extends PartialType(CreateLivechatDto) {}
