// Auth module: login, token checks on a protected route, and the login rate limit.
import type { Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { makeApp, TEST_JWT_SECRET } from "./testApp.js";

const PROBLEM_JSON = /application\/problem\+json/;
const NEW_PRODUCT = { name: "Monitor", price: 5990 };

let app: Express;
beforeEach(() => {
  app = makeApp();
});

function login(email: string, password: string) {
  return request(app).post("/auth/login").send({ email, password });
}

describe("POST /auth/login", () => {
  it("admin with the right password → 200 with a Bearer access token", async () => {
    const res = await login("admin@example.com", "admin-pass");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tokenType: "Bearer", expiresIn: 900 });
    expect(res.body.accessToken.split(".")).toHaveLength(3); // header.payload.signature
  });

  it("wrong password → 401 problem+json", async () => {
    const res = await login("admin@example.com", "wrong-pass");
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toMatch(PROBLEM_JSON);
    expect(res.body.detail).toBe("Invalid email or password");
  });

  it("unknown email → 401 with a body IDENTICAL to wrong password (no user enumeration)", async () => {
    const wrongPassword = await login("admin@example.com", "wrong-pass");
    const unknownEmail = await login("ghost@example.com", "wrong-pass");
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it("empty body {} → 400", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.detail).toBe("email and password are required");
  });
});

describe("POST /products with a bad token", () => {
  function postWithToken(token: string) {
    return request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send(NEW_PRODUCT);
  }

  it("'Bearer garbage' → 401", async () => {
    const res = await postWithToken("garbage");
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toBe("Bearer");
  });

  it("expired token (right secret, exp in the past) → 401", async () => {
    const expired = jwt.sign({ role: "admin" }, TEST_JWT_SECRET, {
      subject: "u1",
      expiresIn: -10, // expired 10 seconds ago
    });
    expect((await postWithToken(expired)).status).toBe(401);
  });

  it("tampered token (user → admin in the payload, old signature) → 401", async () => {
    const userLogin = await login("user@example.com", "user-pass");
    const [header, payload, signature] = userLogin.body.accessToken.split(".");

    // The payload is only base64url-encoded, NOT encrypted: anyone can read and edit it.
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    expect(claims.role).toBe("user");
    claims.role = "admin";
    const tamperedPayload = Buffer.from(JSON.stringify(claims)).toString("base64url");

    // The signature was made over the ORIGINAL header.payload, so it no longer matches.
    const tampered = `${header}.${tamperedPayload}.${signature}`;
    expect((await postWithToken(tampered)).status).toBe(401);
  });
});

describe("login rate limit", () => {
  it("3rd attempt with limit 2 → 429 problem+json with RateLimit headers", async () => {
    app = makeApp({ loginRateLimit: { windowMs: 60_000, limit: 2 } });

    const first = await login("admin@example.com", "wrong-pass");
    const second = await login("admin@example.com", "wrong-pass");
    const third = await login("admin@example.com", "admin-pass"); // even the RIGHT password

    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(third.status).toBe(429);
    expect(third.headers["content-type"]).toMatch(PROBLEM_JSON);
    expect(third.body).toMatchObject({
      status: 429,
      title: "Too Many Requests",
      detail: "Too many login attempts, try again later",
    });
    expect(third.headers["ratelimit-policy"]).toBeDefined();
    expect(third.headers["ratelimit"]).toBeDefined();
    expect(third.headers["retry-after"]).toBeDefined();
  });

  it("only limits login: other routes still work after the limit is hit", async () => {
    app = makeApp({ loginRateLimit: { windowMs: 60_000, limit: 1 } });
    await login("admin@example.com", "wrong-pass");
    expect((await login("admin@example.com", "wrong-pass")).status).toBe(429);
    expect((await request(app).get("/products")).status).toBe(200);
  });
});
