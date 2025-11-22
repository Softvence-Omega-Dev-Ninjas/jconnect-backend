import { Injectable } from "@nestjs/common";
import { S3 } from "aws-sdk";
import { PrismaService } from "src/lib/prisma/prisma.service";

@Injectable()
export class AwsService {
    private readonly s3 = new S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_BUCKET_REGION,
    });
    private readonly bucketName = process.env.AWS_BUCKET_NAME!;
    async upload(file: Express.Multer.File): Promise<any> {
        if (!file) {
            throw new Error("File not provided");
        }

        const fileKey = `${file.originalname}-${Date.now()}`;

        const uploadResult = await this.s3
            .upload({
                Bucket: this.bucketName,
                Key: fileKey,
                Body: file.buffer,
                ContentDisposition: "inline",
                ContentType: file.mimetype,
            })
            .promise();

        return {
            status: "success",
            message: "File uploaded successfully",
            url: uploadResult.Location,
        };
    }
}
