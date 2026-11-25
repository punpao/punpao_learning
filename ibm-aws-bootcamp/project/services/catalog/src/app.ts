// app.ts: create and export the Express app and wire the parts together.
// Do NOT call listen() in this file, so tests can import the app
// and send requests to it with supertest without starting a real server.
//
// Done: request logging with pino-http + request id, routes, validation with zod,
// 404 handler, central error handler.
import { randomUUID } from "node:crypto";
import express from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { healthRouter } from "./routes/health.routes.js";
import { productsRouter } from "./routes/products.routes.js";

export const app = express();

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
app.use("/products", productsRouter);

// Test route: throws on purpose so we can see the error handler work.
app.get("/boom", () => {
  throw new Error("boom");
});

// ---- These two must stay AFTER all routers, in this order. ----
app.use(notFound); // no route matched → 404
app.use(errorHandler); // something threw → 500 (or the error's own 4xx)
