// app.ts: create and export the Express app and wire the parts together.
// Do NOT call listen() in this file, so tests can import the app
// and send requests to it with supertest without starting a real server.
//
// Done: routes, validation with zod, 404 handler, central error handler.
// Still to write: request logging with pino-http.
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { healthRouter } from "./routes/health.routes.js";
import { productsRouter } from "./routes/products.routes.js";

export const app = express();

// Middleware: parse a JSON request body into req.body.
app.use(express.json());

// Routers: each one handles one group of URLs.
app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next(); // pass control to the next middleware or router
});

app.use("/health", healthRouter);
app.use("/products", productsRouter);

// Test route: throws on purpose so we can see the error handler work.
app.get("/boom", () => {
  throw new Error("boom");
});

// ---- These two must stay AFTER all routers, in this order. ----
app.use(notFound); // no route matched → 404
app.use(errorHandler); // something threw → 500 (or the error's own 4xx)
