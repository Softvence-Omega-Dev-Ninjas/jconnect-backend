import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import mime from 'mime-types';
import path from 'path';

//--------------------  Create the S3 client-------------
const s3 = new S3({
    region: 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

const uploadFileToS3 = async (
    filePath: string,
): Promise<{ url: string; key: string }> => {
    const fileContent = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath);
    const fileName = `${Date.now()}${ext ? '-' : ''}${baseName}`;
    const contentType = mime.lookup(ext) || 'application/octet-stream';

    const upload = new Upload({
        client: s3,
        params: {
            Bucket: 'milon32',
            Key: fileName,
            Body: fileContent,
            ContentType: contentType,
        },
    });

    try {
        const result = await upload.done();
        fs.unlinkSync(filePath);
        console.log(`🧹 Deleted local file: ${filePath}`);

        return {
            url: result.Location as string,
            key: fileName,
        };
    } catch (err) {
        fs.unlinkSync(filePath);
        console.error('Failed to upload file to S3:', err);
        throw err;
    }
};

export default uploadFileToS3;