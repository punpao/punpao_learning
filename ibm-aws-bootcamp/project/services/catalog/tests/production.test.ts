// Guards the rule "test-only routes do not exist in production".
// app.ts reads NODE_ENV once, when it is first imported. So we set NODE_ENV,
// clear the module cache, and import a FRESH copy of the app.
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadApp(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules(); // forget the app imported before, so app.ts runs again
  const { app } = await import("../src/app.js");
  return app;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("test-only routes", () => {
  it("do not exist in production (404 from notFound)", async () => {
    const app = await loadApp("production");
    expect((await request(app).get("/boom")).status).toBe(404);
    expect((await request(app).get("/slow")).status).toBe(404);
  });

  it("exist outside production", async () => {
    const app = await loadApp("development");
    expect((await request(app).get("/boom")).status).toBe(500);
  });
});
