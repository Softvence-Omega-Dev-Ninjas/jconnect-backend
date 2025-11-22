import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from "@nestjs/common";

import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileType, MulterService } from "src/lib/multer/multer.service";

import { Additionaldto, AdditionalMultipleDto } from "@main/shared/aws/dto/uploadadditional.dto";

import uploadFileToS3 from "@common/aws/uploadImageAws";
import { AdditionalS3Service } from "./additional.service";
@ApiTags("AWS - File- upload")
@Controller("aws-additional")
export class AdditionalS3Controller {
    constructor(private readonly AdditionalS3Service: AdditionalS3Service) {}

    @Post("upload-s3-additional")
    @ApiConsumes("multipart/form-data")
    @UseInterceptors(
        FileInterceptor(
            "file",
            new MulterService().createMulterOptions("./uploads", "content", FileType.ANY),
        ),
    )
    async create(
        @Body() createTestawDto: Additionaldto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            return { message: "No file uploaded" };
        }

        //------------------ Upload to AWS S3 -----------------------------
        const s3Result = await uploadFileToS3(file?.path);
        console.log(" Uploaded to S3:", s3Result.url);

        return {
            message: "File uploaded successfully to S3",
            s3Url: s3Result.url,
            key: s3Result.key,
        };
    }

    @Post("upload-s3-additional-multiple")
    @ApiConsumes("multipart/form-data")
    @UseInterceptors(
        FilesInterceptor(
            "files",
            10,
            new MulterService().createMulterOptions("./uploads", "content", FileType.ANY),
        ),
    )
    async createMultiple(
        @Body() createTestawDto: AdditionalMultipleDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            return { message: "No files uploaded" };
        }

        const s3Results = await Promise.all(files.map((file) => uploadFileToS3(file?.path)));

        return {
            message: "Files uploaded successfully to S3",
            s3Urls: s3Results.map((result) => result.url),
            keys: s3Results.map((result) => result.key),
        };
    }

    // @Post('upload-s3-additional-multiple')
    // @UseInterceptors(FilesInterceptor('files', 10)) // max 10 files
    // async uploadMultiple(
    //   @UploadedFiles() files: Express.Multer.File[],
    //   @Body() dto: AdditionalMultipleDto,
    // ) {
    //   const uploads = await Promise.all(
    //     files.map((file) =>
    //       this.additionalS3Service.uploadFileToS3(file.path, 'additional'),
    //     ),
    //   );

    //   return {
    //     success: true,
    //     files: uploads,
    //   };
    // }
    @Get()
    findAll() {
        return this.AdditionalS3Service.findAll();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.AdditionalS3Service.findOne(+id);
    }
}
