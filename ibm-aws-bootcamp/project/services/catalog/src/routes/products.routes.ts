// Product routes. Routes only handle HTTP: read req, call the store, send res.
import { Router } from "express";
import { createProductSchema } from "../schemas/product.schema.js";
import { createProduct, findAllProducts, findProductById } from "../data/products.store.js";
import { sendProblem } from "../http/problem.js";

export const productsRouter = Router();

// GET /products: list all products.
productsRouter.get("/", (_req, res) => {
  res.json(findAllProducts());
});

// GET /products/:id: one product, or 404 if it does not exist.
productsRouter.get("/:id", (req, res) => {
  const product = findProductById(req.params.id);
  if (!product) {
    sendProblem(req, res, 404, `Product ${req.params.id} does not exist`);
    return; // one request gets one response
  }
  res.json(product);
});

// POST /products: create a product.
productsRouter.post("/", (req, res) => {
  const result = createProductSchema.safeParse(req.body);
  if (!result.success) {
    sendProblem(req, res, 400, "The request body is not valid", {
      // Extra field ("extension member"): which fields are wrong and why.
      issues: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  res.status(201).json(createProduct(result.data));
});
