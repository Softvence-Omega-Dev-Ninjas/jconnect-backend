import { Injectable } from "@nestjs/common";
import * as aws from "aws-sdk";
import * as crypto from "crypto";
import { ENVEnum } from "src/common/enum/env.enum";

@Injectable()
export class awsService {
    private s3: aws.S3;
    private bucketName: string;

    constructor() {
        const region = "us-east-1";
        this.bucketName = "direct-upload-s3-bucket-thing";

        this.s3 = new aws.S3({
            region,
            accessKeyId: ENVEnum.ACCESS_KEY,
            secretAccessKey: ENVEnum.ACCESS_SECRET,
            signatureVersion: "v4",
        });
    }

    /**
     * Generate a pre-signed upload URL for S3
     * @param fileType MIME type of file (e.g. image/png, video/mp4, audio/mpeg)
     */

    async generateUploadURL(fileType: string): Promise<{ uploadURL: string; key: string }> {
        try {
            const rawBytes = crypto.randomBytes(16);
            const ext = fileType.split("/")[1] || "bin";
            const key = `${rawBytes.toString("hex")}.${ext}`;

            const params = {
                Bucket: this.bucketName,
                Key: key,
                Expires: 300,
                ContentType: fileType,
            };

            const uploadURL = await this.s3.getSignedUrlPromise("putObject", params);
            return { uploadURL, key };
        } catch (err) {
            console.error("❌ S3 Signed URL Error:", err);
            throw err;
        }
    }

    async uploadFileToS3(file: Express.Multer.File) {
        const crypto = await import("crypto");
        const randomName = crypto.randomBytes(16).toString("hex");
        const ext = file.originalname.split(".").pop();
        const fileKey = `uploads/${randomName}.${ext}`;

        const params: aws.S3.PutObjectRequest = {
            Bucket: this.bucketName,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: "public-read",
        };

        const uploadResult = await this.s3.upload(params).promise();
        return uploadResult;
    }
}
