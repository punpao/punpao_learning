// Adapter: FileStorage on Amazon S3 using presigned PUT URLs.
//
// A presigned URL = a normal S3 URL plus a signature in the query string.
// It is made LOCALLY with our AWS credentials (no network call to S3), and it lets
// whoever holds it do exactly ONE thing: PUT this key, with this Content-Type,
// until it expires. The client needs no AWS credentials of its own.
//
import {
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
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

  // HeadObject = "give me the metadata, not the bytes". Cheap and fast.
  // A missing key → S3 answers 404, which the SDK throws as NotFound → false.
  // Any OTHER error (no permission, network, wrong bucket) is rethrown → 500:
  // hiding it as "not uploaded" would make a broken setup look like user error.
  //
  // IAM note: HeadObject needs s3:GetObject. WITHOUT s3:ListBucket on the bucket,
  // S3 answers 403 (not 404) for a missing key, to hide whether it exists.
  // So the task role needs s3:ListBucket too, or every "not uploaded" becomes a 500.
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      if (err instanceof NotFound) return false;
      throw err;
    }
  }

  async createDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}
