// app.ts: create and export the Express app here.
// Do NOT call listen() in this file, so tests can import the app
// and send requests to it with supertest without starting a real server.
//
// Still to write: request logging with pino-http, validation with zod,
// a 404 handler and the central error handler.
import { randomUUID } from "node:crypto";
import express from "express";
import { z } from "zod";

type Product = { id: string; name: string; price: number };

// In-memory "database" for now. It resets every time the server restarts.
const products: Product[] = [
  { id: "1", name: "Keyboard", price: 1290 },
  { id: "2", name: "Mouse", price: 590 },
];

export const app = express();

// Middleware: parse a JSON request body into req.body.
app.use(express.json());

// GET /products: list all products.
app.get("/products", (_req, res) => {
  res.json(products);
});

// GET /products/:id: one product, or 404 if it does not exist.
app.get("/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
  });

// The shape a client must send to create a product.
// The client does NOT send id: the server makes it.
const createProductSchema = z.object({
  name: z.string().min(4),
  price: z.number().min(0),
});

// POST /products: create a product.
app.post("/products", (req, res) => {
  const result = createProductSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Invalid request body",
      issues: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const product: Product = {
    id: randomUUID(),
    ...result.data, // only the checked fields, never raw req.body
  };
  products.push(product);
  res.status(201).json(product);
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});