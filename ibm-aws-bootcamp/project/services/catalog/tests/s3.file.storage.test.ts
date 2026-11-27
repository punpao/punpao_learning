// Unit test for the S3 adapter. Presigning is pure local crypto (no network call),
// so fake credentials are enough: this test never talks to AWS.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUploadS3Client, S3FileStorage } from "../src/shared/storage/s3.file.storage.js";

const FAKE_CREDENTIALS = { accessKeyId: "test", secretAccessKey: "test" };

async function presign(contentType = "image/png") {
  const s3 = createUploadS3Client({ region: "ap-southeast-2", credentials: FAKE_CREDENTIALS });
  const storage = new S3FileStorage(s3, "test-bucket");
  return new URL(await storage.createUploadUrl("products/1/abc.png", contentType, 300));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("S3FileStorage.createUploadUrl", () => {
  it("signs a PUT for exactly this bucket and key, valid for 300 s", async () => {
    const url = await presign();
    expect(url.host).toBe("test-bucket.s3.ap-southeast-2.amazonaws.com");
    expect(url.pathname).toBe("/products/1/abc.png");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("signs Content-Type, so the uploader cannot switch image/png to text/html", async () => {
    const url = await presign();
    const signed = url.searchParams.get("X-Amz-SignedHeaders")?.split(";");
    expect(signed).toContain("content-type");
  });

  it("binds the signature to the content-type VALUE, not just the header name", async () => {
    // Freeze the clock: the signature includes X-Amz-Date, so only the
    // content type may differ between these URLs.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const sig = async (type: string) => (await presign(type)).searchParams.get("X-Amz-Signature");

    expect(await sig("image/png")).toBe(await sig("image/png")); // control: same input → same signature
    expect(await sig("image/png")).not.toBe(await sig("image/jpeg"));
  });

  it("does not put an empty-body checksum in the URL (it would break every upload)", async () => {
    const url = await presign();
    const names = [...url.searchParams.keys()].map((k) => k.toLowerCase());
    expect(names.some((k) => k.startsWith("x-amz-checksum-"))).toBe(false);
  });
});
