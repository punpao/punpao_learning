// app.ts: build the Express app and wire the parts together.
// Do NOT call listen() in this file, so tests can create an app
// and send requests to it with supertest without starting a real server.
//
// createApp() takes its dependencies as a parameter ("dependency injection"):
// server.ts passes the real ones, tests pass fresh ones for every test.
import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type Express } from "express";
import { pinoHttp } from "pino-http";
import { createAuthRouter, type LoginRateLimit } from "./modules/auth/auth.routes.js";
import type { AuthService } from "./modules/auth/auth.service.js";
import type { ProductRepository } from "./modules/products/product.repository.js";
import type { EventBus } from "./shared/events/event.bus.js";
import { logger } from "./shared/logger.js";
import type { FileStorage } from "./shared/storage/file.storage.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { notFound } from "./shared/middleware/notFound.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { createProductsRouter } from "./modules/products/products.routes.js";

export type AppDeps = {
  productRepo: ProductRepository;
  authService: AuthService;
  // Browser origins allowed to call this API (e.g. the Angular app on :4200).
  corsOrigins: string[];
  // Optional: tests pass a high limit (or a tiny one to test 429). Default 5 / 15 min.
  loginRateLimit?: LoginRateLimit;
  // Optional: S3 in production (server.ts, when UPLOAD_BUCKET is set), a fake in tests.
  // Missing → POST /products/:id/image-upload-url answers 503.
  fileStorage?: FileStorage;
  // Where modules announce domain events (e.g. product.created). server.ts passes
  // the same bus to the WebSocket server, which forwards events to browsers.
  eventBus: EventBus;
};

export function createApp(deps: AppDeps): Express {
  const app = express();

  // Behind the AWS ALB, the TCP connection comes from the ALB, and the real client
  // IP is in X-Forwarded-For. "1" = trust exactly ONE proxy hop (the ALB), so
  // req.ip is the client, and the login rate limit counts per client, not per ALB.
  // Without a proxy in front (e.g. local dev), a client could fake X-Forwarded-For.
  app.set("trust proxy", 1);

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

  // CORS: tells BROWSERS which other websites (origins) may call this API from
  // their JavaScript. Only listed origins get Access-Control-Allow-Origin back;
  // others get no CORS headers, so the browser blocks their page from reading the
  // response. (CORS does not stop curl or servers: it is not authentication.)
  // It also answers the browser's OPTIONS "preflight" before e.g. a POST with JSON.
  app.use(
    cors({
      origin: deps.corsOrigins,
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["x-request-id"], // let browser JS read our request id
    }),
  );

  // Middleware: parse a JSON request body into req.body.
  app.use(express.json());

  // Routers: each one handles one group of URLs.
  app.use("/health", healthRouter);
  app.use("/auth", createAuthRouter(deps.authService, deps.loginRateLimit));
  app.use("/products", createProductsRouter(deps.productRepo, deps.authService, deps.eventBus, deps.fileStorage));

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
