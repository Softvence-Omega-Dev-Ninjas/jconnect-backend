import { Injectable } from "@nestjs/common";
import { S3 } from "aws-sdk";

@Injectable()
export class AwsService {
    private readonly s3 = new S3({
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.ACCESS_SECRET,
        region: process.env.BUCKET_REGION,
    });
    private readonly bucketName = process.env.BUCKET_NAME!;
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
