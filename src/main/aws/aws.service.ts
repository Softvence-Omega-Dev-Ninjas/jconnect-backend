import { Injectable } from "@nestjs/common";
import { S3 } from "aws-sdk";

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

        // Extract filename and extension
        const originalName = file.originalname;
        const lastDotIndex = originalName.lastIndexOf(".");
        const filename =
            lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
        const extension = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : "";

        // Create fileKey with timestamp before extension
        const fileKey = `${filename}-${Date.now()}${extension}`;

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
