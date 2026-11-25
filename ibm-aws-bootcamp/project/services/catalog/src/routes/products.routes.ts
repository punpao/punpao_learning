// Product routes. Routes only handle HTTP: read req, call the store, send res.
import { Router } from "express";
import { createProductSchema } from "../schemas/product.schema.js";
import { createProduct, findAllProducts, findProductById } from "../data/products.store.js";

export const productsRouter = Router();

// GET /products: list all products.
productsRouter.get("/", (_req, res) => {
  res.json(findAllProducts());
});

// GET /products/:id: one product, or 404 if it does not exist.
productsRouter.get("/:id", (req, res) => {
  const product = findProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return; // one request gets one response
  }
  res.json(product);
});

// POST /products: create a product.
productsRouter.post("/", (req, res) => {
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
  res.status(201).json(createProduct(result.data));
});
