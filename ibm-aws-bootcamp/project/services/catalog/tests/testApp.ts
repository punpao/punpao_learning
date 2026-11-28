// Shared test setup (not a test file: vitest only runs *.test.ts).
// One place builds the app with test dependencies, so adding a new dependency
// to createApp() means changing this file, not every test file.
import { createApp, type AppDeps } from "../src/app.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { InMemoryUserRepository } from "../src/modules/auth/inMemory.user.repository.js";
import { InMemoryEventBus } from "../src/shared/events/event.bus.js";
import { InMemoryProductRepository } from "../src/modules/products/inMemory.product.repository.js";

export const TEST_JWT_SECRET = "test-secret-1234567890";
export const ALLOWED_ORIGIN = "http://localhost:4200";

export function makeApp(overrides: Partial<AppDeps> = {}) {
  return createApp({
    productRepo: new InMemoryProductRepository([
      { id: "1", name: "Keyboard", price: 1290 },
      { id: "2", name: "Mouse", price: 590 },
    ]),
    authService: new AuthService(new InMemoryUserRepository(), TEST_JWT_SECRET),
    corsOrigins: [ALLOWED_ORIGIN],
    // High limit so normal tests never hit 429. The 429 test passes its own.
    loginRateLimit: { windowMs: 60_000, limit: 1000 },
    eventBus: new InMemoryEventBus(),
    ...overrides,
  });
}
