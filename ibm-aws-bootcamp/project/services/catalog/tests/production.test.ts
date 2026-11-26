// Guards the rule "test-only routes do not exist in production".
// createApp() reads NODE_ENV each time it runs, so we only need to set
// NODE_ENV and build a new app. (No module-cache tricks needed any more.)
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { InMemoryProductRepository } from "../src/data/inMemory.product.repository.js";

function appFor(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  return createApp({ productRepo: new InMemoryProductRepository() });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("test-only routes", () => {
  it("do not exist in production (404 from notFound)", async () => {
    const app = appFor("production");
    expect((await request(app).get("/boom")).status).toBe(404);
    expect((await request(app).get("/slow")).status).toBe(404);
  });

  it("exist outside production", async () => {
    const app = appFor("development");
    expect((await request(app).get("/boom")).status).toBe(500);
  });
});
