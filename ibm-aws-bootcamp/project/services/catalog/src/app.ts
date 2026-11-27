// app.ts: build the Express app and wire the parts together.
// Do NOT call listen() in this file, so tests can create an app
// and send requests to it with supertest without starting a real server.
//
// createApp() takes its dependencies as a parameter ("dependency injection"):
// server.ts passes the real ones, tests pass fresh ones for every test.
import { randomUUID } from "node:crypto";
import express, { type Express } from "express";
import { pinoHttp } from "pino-http";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import type { AuthService } from "./modules/auth/auth.service.js";
import type { ProductRepository } from "./modules/products/product.repository.js";
import { logger } from "./shared/logger.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { notFound } from "./shared/middleware/notFound.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { createProductsRouter } from "./modules/products/products.routes.js";

export type AppDeps = {
  productRepo: ProductRepository;
  authService: AuthService;
};

export function createApp(deps: AppDeps): Express {
  const app = express();

  // Request logging FIRST, so every request gets a request id and a log line,
  // even one that fails in express.json() below.
  app.use(
    pinoHttp({
      logger,
      // Never write secrets to logs: these header values show as "[Redacted]".
      redact: ["req.headers.authorization", "req.headers.cookie"],
      // Use the caller's x-request-id if it sent one (so one id follows the request
      // across services), otherwise make a new one. Send it back to the client too.
      genReqId: (req, res) => {
        const fromClient = req.headers["x-request-id"];
        const id =
          typeof fromClient === "string" && fromClient.length > 0 && fromClient.length <= 128
            ? fromClient
            : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
    }),
  );

  // Middleware: parse a JSON request body into req.body.
  app.use(express.json());

  // Routers: each one handles one group of URLs.
  app.use("/health", healthRouter);
  app.use("/auth", createAuthRouter(deps.authService));
  app.use("/products", createProductsRouter(deps.productRepo, deps.authService));

  // Test-only routes. Never in production: /slow would let anyone hold
  // connections open for 5 s each, and /boom fills the error logs on purpose.
  // NODE_ENV is read each time createApp() runs.
  if (process.env.NODE_ENV !== "production") {
    // Throws on purpose so we can see the error handler work.
    app.get("/boom", () => {
      throw new Error("boom");
    });

    // Answers after 5 s, so we can send SIGTERM while it is in flight
    // and see graceful shutdown wait for it. It does NOT block the event loop:
    // the await gives the thread back, so other requests still run meanwhile.
    app.get("/slow", async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      res.json({ done: true });
    });
  }

  // ---- These two must stay AFTER all routers, in this order. ----
  app.use(notFound); // no route matched → 404
  app.use(errorHandler); // something threw → 500 (or the error's own 4xx)

  return app;
}
