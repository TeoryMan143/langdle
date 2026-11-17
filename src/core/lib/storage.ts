import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

let client: S3Client | undefined;

/** The Cloudflare R2 bucket, through its S3 compatible API. */
function getClient() {
  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  return client;
}

/*
 * Like `sendEmail`, these swallow and report: a provider failure is logged and
 * answered with `false`, so the caller decides which API error to send.
 */

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
) {
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=86400',
      }),
    );
    return true;
  } catch (e) {
    console.error('Storage put failed:', key, e);
    return false;
  }
}

export async function copyObject(from: string, to: string) {
  try {
    await getClient().send(
      new CopyObjectCommand({
        Bucket: process.env.R2_BUCKET,
        CopySource: `${process.env.R2_BUCKET}/${from}`,
        Key: to,
      }),
    );
    return true;
  } catch (e) {
    console.error('Storage copy failed:', from, to, e);
    return false;
  }
}

export async function deleteObject(key: string) {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
    );
    return true;
  } catch (e) {
    console.error('Storage delete failed:', key, e);
    return false;
  }
}

/** Where anyone can read `key`: the bucket's public domain. */
export function publicUrl(key: string) {
  return `${process.env.NEXT_PUBLIC_FLAGS_URL}/${key}`;
}
