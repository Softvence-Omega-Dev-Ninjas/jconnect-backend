import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { awsService } from "./aws.service";

@Controller("s3")
export class awsController {
    constructor(private readonly s3Service: awsService) {}

    @Get("aws-upload-url")
    async getUploadURL(@Query("fileType") fileType: string) {
        if (!fileType) {
            throw new BadRequestException("fileType query param is required");
        }

        const { uploadURL, key } = await this.s3Service.generateUploadURL(fileType);
        return { uploadURL, key };
    }

    // @ApiOperation({ summary: 'Upload any file directly to S3' })
    // @Post('s3-upload-url')
    // @ApiConsumes('multipart/form-data')

    // async uploadAnyToS3(@UploadedFiles() files: Express.Multer.File[]) {
    //   if (!files || files.length === 0) {
    //     throw new BadRequestException('No files uploaded');
    //   }

    //   const uploaded: { field: string; url: string; key: string; }[] = [];
    //   for (const file of files) {
    //     const s3Result = await this.s3Service.uploadFileToS3(file);
    //     uploaded.push({
    //       field: file.fieldname,
    //       url: s3Result.Location,
    //       key: s3Result.Key,
    //     });
    //   }

    //   return {
    //     message: 'Files uploaded successfully',
    //     files: uploaded,
    //   };
    // }
}
