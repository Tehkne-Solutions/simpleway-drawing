import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { CreateBucketCommand, DeleteBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { S3FileStorage } from "./index";

const endpoint = process.env.STORAGE_ENDPOINT;
const bucket = process.env.STORAGE_BUCKET;
const region = process.env.STORAGE_REGION ?? "us-east-1";
const accessKeyId = process.env.STORAGE_ACCESS_KEY;
const secretAccessKey = process.env.STORAGE_SECRET_KEY;
const keepBucket = process.env.STORAGE_KEEP_BUCKET === "1";

assert.ok(endpoint, "STORAGE_ENDPOINT is required");
assert.ok(bucket, "STORAGE_BUCKET is required");
assert.ok(accessKeyId, "STORAGE_ACCESS_KEY is required");
assert.ok(secretAccessKey, "STORAGE_SECRET_KEY is required");

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

await client.send(new CreateBucketCommand({ Bucket: bucket }));

const storage = new S3FileStorage({
  endpoint,
  region,
  bucket,
  accessKeyId,
  secretAccessKey,
  forcePathStyle: true,
  uploadTtlSeconds: 120,
});

const body = Buffer.from("simpleway-drawing-storage-e2e");
const intent = await storage.createPrivateUpload({
  ownerUserId: randomUUID(),
  purpose: "ARTWORK",
  fileAssetId: randomUUID(),
  mimeType: "image/png",
  byteSize: body.byteLength,
});

assert.match(intent.storageKey, /^private\//);
assert.ok(intent.uploadUrl.startsWith(endpoint));

const upload = await fetch(intent.uploadUrl, {
  method: "PUT",
  headers: {
    "content-type": "image/png",
    "content-length": String(body.byteLength),
  },
  body,
});
assert.equal(upload.status, 200, `presigned upload failed: ${upload.status} ${await upload.text()}`);

const metadata = await storage.verifyPrivateFile(intent.storageKey);
assert.equal(metadata.byteSize, body.byteLength);
assert.equal(metadata.mimeType, "image/png");

const readUrl = await storage.createPrivateReadUrl(intent.storageKey, 120);
const read = await fetch(readUrl);
assert.equal(read.status, 200);
assert.equal(Buffer.from(await read.arrayBuffer()).toString("utf8"), body.toString("utf8"));

await storage.deletePrivateFile(intent.storageKey);
if (!keepBucket) await client.send(new DeleteBucketCommand({ Bucket: bucket }));

console.log(`STORAGE_VERIFY=PASS create_bucket presigned_put head presigned_get delete_object ${keepBucket ? "keep_bucket" : "delete_bucket"}`);
