// Adapter: FileStorage on Amazon S3 using presigned PUT URLs.
//
// A presigned URL = a normal S3 URL plus a signature in the query string.
// It is made LOCALLY with our AWS credentials (no network call to S3), and it lets
// whoever holds it do exactly ONE thing: PUT this key, with this Content-Type,
// until it expires. The client needs no AWS credentials of its own.
//
import { PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { FileStorage } from "./file.storage.js";

// Build the S3Client for presigning. requestChecksumCalculation "WHEN_REQUIRED":
// by default the SDK puts a CRC32 checksum of an EMPTY body into a presigned PUT URL
// (x-amz-checksum-crc32=AAAAAA==), and every real upload then fails.
// No credentials here: the default chain finds them (aws login / ECS task role).
export function createUploadS3Client(config: S3ClientConfig): S3Client {
  return new S3Client({ ...config, requestChecksumCalculation: "WHEN_REQUIRED" });
}

export class S3FileStorage implements FileStorage {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
  ) {}

  async createUploadUrl(key: string, contentType: string, expiresInSeconds: number): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.s3, command, {
      expiresIn: expiresInSeconds,
      // By default only "host" is signed, so the uploader could send ANY Content-Type
      // (e.g. text/html instead of image/png). Signing content-type makes S3 reject
      // (403 SignatureDoesNotMatch) an upload whose Content-Type header differs.
      signableHeaders: new Set(["content-type"]),
    });
  }
}
