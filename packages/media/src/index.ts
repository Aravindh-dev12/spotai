import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const region = process.env.S3_REGION ?? 'us-east-1';
const bucket = process.env.MEDIA_BUCKET ?? 'form-local';

export const s3 = new S3Client({
  endpoint,
  region,
  forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'form',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'form-local-secret'
  }
});

export async function createSignedUpload(input: { objectKey: string; contentType: string }) {
  const command = new PutObjectCommand({ Bucket: bucket, Key: input.objectKey, ContentType: input.contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 10 * 60 });
  return { uploadUrl, expiresInSeconds: 600, requiredHeaders: { 'content-type': input.contentType } };
}

export async function createSignedDownload(objectKey: string) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
  return getSignedUrl(s3, command, { expiresIn: 15 * 60 });
}
