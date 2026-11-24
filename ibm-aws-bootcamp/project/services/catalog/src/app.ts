// app.ts: create and export the Express app here.
// Do NOT call listen() in this file, so tests can import the app
// and send requests to it with supertest without starting a real server.
//
// Still to write: request logging with pino-http, validation with zod,
// a 404 handler and the central error handler.
import express from "express";

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

// POST /products: create a product.
// TODO: validate req.body with zod (return 400 if it is wrong).
app.post("/products", (req, res) => {
  const product: Product = {
    id: String(products.length + 1),
    name: req.body.name,
    price: req.body.price,
  };
  products.push(product);
  res.status(201).json(product);
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});