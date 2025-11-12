import { Controller, Global, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiExcludeController, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AwsService } from "./aws.service";

@Global()
// @ApiExcludeController()
@ApiTags("s3 file uploaing test")
@Controller("s3")
export class AwsController {
    constructor(private awsservice: AwsService) {}

    @Post("upload")
    @ApiOperation({ summary: "Upload image file to AWS S3" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        description: "Upload a file",
        schema: {
            type: "object",
            properties: {
                image: {
                    type: "string",
                    format: "binary",
                    description: "File to upload",
                },
            },
            required: ["image"],
        },
    })
    @UseInterceptors(FileInterceptor("image"))
    UploadImage(@UploadedFile() file: Express.Multer.File) {
        return this.awsservice.upload(file);
        // return {
        //     message: "File uploaded successfully",
        //     filename: file?.originalname,
        //     size: file?.size,
        //     mimetype: file?.mimetype
        // }
    }
}
