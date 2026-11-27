// Step 2 of the image flow (PUT /products/:id/image) and how images appear in GET.
// Uses the fake storage: a test "uploads" by adding the key to storage.uploaded.
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryProductRepository } from "../src/modules/products/inMemory.product.repository.js";
import { FakeFileStorage } from "./fakeFileStorage.js";
import { makeApp } from "./testApp.js";

const KEY_1 = "products/1/0f8fad5b-d9cb-469f-a165-70867728950e.png";
const KEY_2 = "products/2/7c9e6679-7425-40de-944b-e07fc1f90ae7.png";

let storage: FakeFileStorage;
let app: Express;
let admin: string;

async function tokenFor(email: string, password: string): Promise<string> {
  const res = await request(app).post("/auth/login").send({ email, password });
  return res.body.accessToken;
}

beforeEach(async () => {
  storage = new FakeFileStorage();
  app = makeApp({ fileStorage: storage });
  admin = await tokenFor("admin@example.com", "admin-pass");
});

// token: null = send no Authorization header. (Not undefined: passing undefined
// to a parameter with a default value gives you the DEFAULT, i.e. the admin token.)
function setImage(productId: string, body: object, token: string | null = admin) {
  const req = request(app).put(`/products/${productId}/image`);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send(body);
}

describe("PUT /products/:id/image", () => {
  it("uploaded key for this product → 200, product with imageUrl and no imageKey", async () => {
    storage.uploaded.add(KEY_1);
    const res = await setImage("1", { key: KEY_1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "1",
      name: "Keyboard",
      price: 1290,
      imageUrl: `https://fake-storage.test/${KEY_1}?download=fake`,
    });
    expect(storage.existsCalls).toEqual([KEY_1]);
  });

  it("full flow: upload-url → (browser PUT) → set image → GET shows imageUrl", async () => {
    const upload = await request(app)
      .post("/products/1/image-upload-url")
      .set("Authorization", `Bearer ${admin}`)
      .send({ contentType: "image/webp" });
    storage.uploaded.add(upload.body.key); // what the browser's PUT to S3 would do

    expect((await setImage("1", { key: upload.body.key })).status).toBe(200);
    const get = await request(app).get("/products/1");
    expect(get.body.imageUrl).toBe(`https://fake-storage.test/${upload.body.key}?download=fake`);
  });

  it("key made for ANOTHER product → 400, and S3 is not even asked", async () => {
    storage.uploaded.add(KEY_2); // it really exists, but belongs to product 2
    const res = await setImage("1", { key: KEY_2 });
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/application\/problem\+json/);
    expect(storage.existsCalls).toHaveLength(0);
    expect((await request(app).get("/products/1")).body).not.toHaveProperty("imageUrl");
  });

  it.each([
    ["path traversal", "products/1/../2/0f8fad5b.png"],
    ["wrong extension", "products/1/0f8fad5b-d9cb.html"],
    ["no extension", "products/1/0f8fad5b-d9cb"],
    ["not a uuid-style name", "products/1/My Photo.png"],
    ["sub-folder", "products/1/x/0f8fad5b.png"],
    ["prefix of a longer id", "products/10/0f8fad5b.png"],
    ["outside products/", "secrets/0f8fad5b.png"],
    ["empty", ""],
  ])("bad key (%s) → 400", async (_label, key) => {
    storage.uploaded.add(key);
    const res = await setImage("1", { key });
    expect(res.status).toBe(400);
    expect(storage.existsCalls).toHaveLength(0);
  });

  it.each([
    ["missing key", {}],
    ["key not a string", { key: 123 }],
  ])("bad body (%s) → 400", async (_label, body) => {
    expect((await setImage("1", body)).status).toBe(400);
  });

  it("unknown product → 404", async () => {
    const key = "products/999/0f8fad5b-d9cb-469f-a165-70867728950e.png";
    storage.uploaded.add(key);
    const res = await setImage("999", { key });
    expect(res.status).toBe(404);
    expect(storage.existsCalls).toHaveLength(0);
  });

  it("right pattern but not uploaded yet → 400 'Image not uploaded yet', nothing saved", async () => {
    const res = await setImage("1", { key: KEY_1 });
    expect(res.status).toBe(400);
    expect(res.body.detail).toBe("Image not uploaded yet");
    expect((await request(app).get("/products/1")).body).not.toHaveProperty("imageUrl");
  });

  it("no token → 401, user → 403 (nothing checked in S3)", async () => {
    storage.uploaded.add(KEY_1);
    expect((await setImage("1", { key: KEY_1 }, null)).status).toBe(401);
    const user = await tokenFor("user@example.com", "user-pass");
    expect((await setImage("1", { key: KEY_1 }, user)).status).toBe(403);
    expect(storage.existsCalls).toHaveLength(0);
  });

  it("no fileStorage configured → 503", async () => {
    app = makeApp();
    admin = await tokenFor("admin@example.com", "admin-pass");
    const res = await setImage("1", { key: KEY_1 });
    expect(res.status).toBe(503);
    expect(res.body.detail).toBe("File uploads are not configured");
  });
});

describe("images in GET responses", () => {
  // Product 1 already has an image in the repository; product 2 does not.
  function seededRepo() {
    return new InMemoryProductRepository([
      { id: "1", name: "Keyboard", price: 1290, imageKey: KEY_1 },
      { id: "2", name: "Mouse", price: 590 },
    ]);
  }

  beforeEach(() => {
    app = makeApp({ productRepo: seededRepo(), fileStorage: storage });
  });

  it("GET /products/:id with an image → imageUrl (900 s), never imageKey", async () => {
    const res = await request(app).get("/products/1");
    expect(res.body).toEqual({
      id: "1",
      name: "Keyboard",
      price: 1290,
      imageUrl: `https://fake-storage.test/${KEY_1}?download=fake`,
    });
    expect(storage.downloadCalls).toEqual([{ key: KEY_1, expiresInSeconds: 900 }]);
  });

  it("GET /products/:id without an image → no imageUrl and no imageKey", async () => {
    const res = await request(app).get("/products/2");
    expect(res.body).toEqual({ id: "2", name: "Mouse", price: 590 });
  });

  it("GET /products → imageUrl only on the product that has an image", async () => {
    const res = await request(app).get("/products");
    expect(res.body).toEqual([
      { id: "1", name: "Keyboard", price: 1290, imageUrl: `https://fake-storage.test/${KEY_1}?download=fake` },
      { id: "2", name: "Mouse", price: 590 },
    ]);
    expect(JSON.stringify(res.body)).not.toContain("imageKey");
  });

  it("no fileStorage → no imageUrl, and still no raw imageKey", async () => {
    app = makeApp({ productRepo: seededRepo() });
    const one = await request(app).get("/products/1");
    expect(one.body).toEqual({ id: "1", name: "Keyboard", price: 1290 });
    const all = await request(app).get("/products");
    expect(JSON.stringify(all.body)).not.toContain("imageKey");
  });
});
