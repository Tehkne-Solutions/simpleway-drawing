import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { CreatePrivateUploadInput, FileStoragePort, PrivateUploadIntent, StoredFileMetadata } from "@swd/domain";

export interface S3FileStorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  uploadTtlSeconds?: number;
}

export class S3FileStorage implements FileStoragePort {
  private readonly client: S3Client;
  private readonly ttlSeconds: number;

  constructor(private readonly config: S3FileStorageConfig) {
    this.ttlSeconds = config.uploadTtlSeconds ?? 900;
    this.client = new S3Client({
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async checkReadiness(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
  }

  async createPrivateUpload(input: CreatePrivateUploadInput): Promise<PrivateUploadIntent> {
    const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType === "image/png" ? "png" : "webp";
    const storageKey = `private/${input.ownerUserId}/${input.purpose.toLowerCase()}/${input.fileAssetId}.${extension}`;
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.config.bucket, Key: storageKey, ContentType: input.mimeType, ContentLength: input.byteSize }),
      { expiresIn: this.ttlSeconds },
    );
    return { fileAssetId: input.fileAssetId, storageKey, uploadUrl, expiresAt };
  }

  async verifyPrivateFile(storageKey: string): Promise<StoredFileMetadata> {
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: storageKey }));
    return { byteSize: result.ContentLength ?? 0, mimeType: result.ContentType ?? null };
  }

  async createPrivateReadUrl(storageKey: string, ttlSeconds = 600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.config.bucket, Key: storageKey }), { expiresIn: ttlSeconds });
  }

  async readPrivateFile(storageKey: string): Promise<{ body: Uint8Array; mimeType: string; byteSize: number }> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: storageKey }));
    if (!result.Body) throw new Error("PRIVATE_FILE_BODY_MISSING");
    const body = await result.Body.transformToByteArray();
    return { body, mimeType: result.ContentType ?? "application/octet-stream", byteSize: result.ContentLength ?? body.byteLength };
  }

  async deletePrivateFile(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: storageKey }));
  }
}

export class CryptoUuidGenerator {
  next(): string { return crypto.randomUUID(); }
}
