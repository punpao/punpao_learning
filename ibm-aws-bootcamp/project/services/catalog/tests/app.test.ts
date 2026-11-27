// We create the app, NOT the server: no listen(), no port.
// supertest gives the app a fake request and reads the response in memory.
// This is why app.ts and server.ts are separate files.
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { InMemoryUserRepository } from "../src/modules/auth/inMemory.user.repository.js";
import { makeApp } from "./testApp.js";

const PROBLEM_JSON = /application\/problem\+json/;

// A brand-new repository and app for EVERY test. A product created in one test
// can never leak into another, so tests pass in any order.
let app: Express;
beforeEach(() => {
  app = makeApp();
});

describe("GET /products", () => {
  it("lists the seed products", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(200);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual(["Keyboard", "Mouse"]);
  });
});

describe("GET /health", () => {
  it("returns 200 ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /products/:id", () => {
  it("returns a product that exists", async () => {
    const res = await request(app).get("/products/1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "1", name: "Keyboard" });
  });

  it("returns 404 problem+json for an unknown id", async () => {
    const res = await request(app).get("/products/999");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      instance: "/products/999",
    });
  });
});

describe("POST /products", () => {
  // POST needs a token: log in as the demo admin before each test.
  let adminToken: string;
  beforeEach(async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "admin-pass" });
    expect(login.status).toBe(200);
    adminToken = login.body.accessToken;
  });

  // Without these, deleting requireAuth from the route would leave every test green.
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/products")
      .send({ name: "Monitor", price: 5990 });
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toMatch(PROBLEM_JSON);
    expect(res.headers["www-authenticate"]).toBe("Bearer");
    expect((await request(app).get("/products")).body).toHaveLength(2); // nothing created
  });

  it("returns 401 for a token signed with a different secret (forged)", async () => {
    const forged = await new AuthService(new InMemoryUserRepository(), "attacker-secret-123456")
      .login("admin@example.com", "admin-pass");
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${forged!.accessToken}`)
      .send({ name: "Monitor", price: 5990 });
    expect(res.status).toBe(401);
  });

  it("returns 401 (not 400) for a bad body without a token: auth is checked first", async () => {
    const res = await request(app).post("/products").send({ name: "Pen", price: "free" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a logged-in user who is not admin", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "user@example.com", password: "user-pass" });
    expect(login.status).toBe(200);

    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ name: "Monitor", price: 5990 });
    expect(res.status).toBe(403);
    expect(res.headers["content-type"]).toMatch(PROBLEM_JSON);
    expect(res.body.detail).toBe("You do not have permission to perform this action");
    expect((await request(app).get("/products")).body).toHaveLength(2); // nothing created
  });

  it("creates a product with a server-made id (201)", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Monitor", price: 5990 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Monitor", price: 5990 });
    expect(typeof res.body.id).toBe("string");
    expect(res.body.id.length).toBeGreaterThan(0);

    // Round trip: the new product can be read back by its id.
    const read = await request(app).get(`/products/${res.body.id}`);
    expect(read.status).toBe(200);
    expect(read.body).toEqual(res.body);
  });

  it("returns 400 problem+json with issues for a bad body", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Pen", price: "free" });
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(PROBLEM_JSON);
    expect(res.body.status).toBe(400);
    const fields = res.body.issues.map((i: { field: string }) => i.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "price"]));
  });

  // Boundary tests for price >= 0. Test BOTH sides of the line:
  // -1 must fail (catches min(-100), or no min at all),
  // 0 must pass (catches min(1) or .positive(), which wrongly block free items).
  it("rejects a negative price (400, issue on price)", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Broken", price: -1 });
    expect(res.status).toBe(400);
    expect(res.body.issues).toEqual([
      expect.objectContaining({ field: "price" }),
    ]);
  });

  it("accepts price 0 (the lowest allowed value)", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Free sticker", price: 0 });
    expect(res.status).toBe(201);
    expect(res.body.price).toBe(0);
  });
});

describe("unknown route", () => {
  it("returns 404 problem+json", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(PROBLEM_JSON);
    expect(res.body.instance).toBe("/nope");
  });
});

describe("errors thrown in a route", () => {
  it("returns 500 problem+json without a stack trace", async () => {
    const res = await request(app).get("/boom");
    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(PROBLEM_JSON);
    expect(JSON.stringify(res.body)).not.toContain("at "); // no stack lines
  });
});

describe("x-request-id", () => {
  it("echoes the id the client sent", async () => {
    const res = await request(app).get("/health").set("x-request-id", "test-123");
    expect(res.headers["x-request-id"]).toBe("test-123");
  });

  it("makes a new id when the client sends none", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
