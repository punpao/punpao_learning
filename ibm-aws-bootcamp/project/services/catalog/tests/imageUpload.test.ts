// POST /products/:id/image-upload-url with a FAKE FileStorage: no AWS in tests.
// The fake records every call, so we can check what the route asked S3 to sign.
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { FileStorage } from "../src/shared/storage/file.storage.js";
import { makeApp } from "./testApp.js";

type Call = { key: string; contentType: string; expiresInSeconds: number };

class FakeFileStorage implements FileStorage {
  calls: Call[] = [];
  async createUploadUrl(key: string, contentType: string, expiresInSeconds: number) {
    this.calls.push({ key, contentType, expiresInSeconds });
    return `https://fake-storage.test/${key}?signature=fake`;
  }
}

let storage: FakeFileStorage;
let app: Express;
beforeEach(() => {
  storage = new FakeFileStorage();
  app = makeApp({ fileStorage: storage });
});

async function tokenFor(email: string, password: string): Promise<string> {
  const res = await request(app).post("/auth/login").send({ email, password });
  return res.body.accessToken;
}

function askUploadUrl(productId: string, body: object, token?: string) {
  const req = request(app).post(`/products/${productId}/image-upload-url`);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send(body);
}

describe("POST /products/:id/image-upload-url", () => {
  it("admin → 200 with uploadUrl, a server-made key and expiresIn 300", async () => {
    const admin = await tokenFor("admin@example.com", "admin-pass");
    const res = await askUploadUrl("1", { contentType: "image/png" }, admin);

    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(/^products\/1\/[0-9a-f-]+\.png$/);
    expect(res.body.expiresIn).toBe(300);
    expect(res.body.uploadUrl).toBe(`https://fake-storage.test/${res.body.key}?signature=fake`);
    // The storage was asked to sign exactly this key, type and lifetime.
    expect(storage.calls).toEqual([
      { key: res.body.key, contentType: "image/png", expiresInSeconds: 300 },
    ]);
  });

  it("each request gets a new key, and the extension follows contentType", async () => {
    const admin = await tokenFor("admin@example.com", "admin-pass");
    const a = await askUploadUrl("1", { contentType: "image/jpeg" }, admin);
    const b = await askUploadUrl("1", { contentType: "image/webp" }, admin);
    expect(a.body.key).toMatch(/^products\/1\/[0-9a-f-]+\.jpg$/);
    expect(b.body.key).toMatch(/^products\/1\/[0-9a-f-]+\.webp$/);
  });

  it("ignores a client filename: the key is still server-made", async () => {
    const admin = await tokenFor("admin@example.com", "admin-pass");
    const res = await askUploadUrl(
      "1",
      { contentType: "image/png", filename: "../../2/evil.html", key: "products/2/x.png" },
      admin,
    );
    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(/^products\/1\/[0-9a-f-]+\.png$/);
  });

  it("user (not admin) → 403, and nothing is signed", async () => {
    const user = await tokenFor("user@example.com", "user-pass");
    const res = await askUploadUrl("1", { contentType: "image/png" }, user);
    expect(res.status).toBe(403);
    expect(storage.calls).toHaveLength(0);
  });

  it("no token → 401", async () => {
    const res = await askUploadUrl("1", { contentType: "image/png" });
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toBe("Bearer");
    expect(storage.calls).toHaveLength(0);
  });

  it.each([
    ["application/pdf", { contentType: "application/pdf" }],
    ["text/html", { contentType: "text/html" }],
    ["missing contentType", {}],
  ])("%s → 400 problem+json", async (_label, body) => {
    const admin = await tokenFor("admin@example.com", "admin-pass");
    const res = await askUploadUrl("1", body, admin);
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/application\/problem\+json/);
    expect(storage.calls).toHaveLength(0);
  });

  it("unknown product → 404, and nothing is signed", async () => {
    const admin = await tokenFor("admin@example.com", "admin-pass");
    const res = await askUploadUrl("999", { contentType: "image/png" }, admin);
    expect(res.status).toBe(404);
    expect(storage.calls).toHaveLength(0);
  });

  it("no fileStorage configured → 503 problem+json", async () => {
    app = makeApp(); // no fileStorage
    const admin = await tokenFor("admin@example.com", "admin-pass");
    const res = await askUploadUrl("1", { contentType: "image/png" }, admin);
    expect(res.status).toBe(503);
    expect(res.headers["content-type"]).toMatch(/application\/problem\+json/);
    expect(res.body.detail).toBe("File uploads are not configured");
  });
});
