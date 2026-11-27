// CORS: the browser sends an OPTIONS "preflight" before a cross-origin POST with
// JSON or an Authorization header. Only allowed origins get the "yes" header back.
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ALLOWED_ORIGIN, makeApp } from "./testApp.js";

function preflight(origin: string) {
  return request(makeApp())
    .options("/products")
    .set("Origin", origin)
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "content-type,authorization");
}

describe("CORS", () => {
  it("preflight from the allowed origin gets Access-Control-Allow-Origin", async () => {
    const res = await preflight(ALLOWED_ORIGIN);
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-headers"]).toBe("Content-Type,Authorization");
  });

  it("preflight from another origin gets NO Access-Control-Allow-Origin", async () => {
    const res = await preflight("https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("a normal GET from the allowed origin can read x-request-id", async () => {
    const res = await request(makeApp()).get("/health").set("Origin", ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-expose-headers"]).toBe("x-request-id");
  });
});
