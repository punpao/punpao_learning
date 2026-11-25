// app.ts: create and export the Express app and wire the parts together.
// Do NOT call listen() in this file, so tests can import the app
// and send requests to it with supertest without starting a real server.
//
// Done: routes, validation with zod.
// Still to write: request logging with pino-http, a 404 handler and the central error handler.
import express from "express";
import { healthRouter } from "./routes/health.routes.js";
import { productsRouter } from "./routes/products.routes.js";

export const app = express();

// Middleware: parse a JSON request body into req.body.
app.use(express.json());

// Routers: each one handles one group of URLs.
app.use("/health", healthRouter);
app.use("/products", productsRouter);

// Task 3 goes here, AFTER the routers:
// - 404 handler (runs when no route matched)
// - central error handler (4 parameters: err, req, res, next)
