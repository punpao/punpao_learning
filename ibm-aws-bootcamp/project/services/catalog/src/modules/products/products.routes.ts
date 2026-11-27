// Product routes. Routes only handle HTTP: read req, call the repository, send res.
// The repository is passed in ("dependency injection"), so this file does not know
// or care whether products live in memory or in DynamoDB.
import { Router } from "express";
import type { ProductRepository } from "./product.repository.js";
import { sendProblem } from "../../shared/http/problem.js";
import { createProductSchema } from "./products.schema.js";

export function createProductsRouter(repo: ProductRepository): Router {
  const router = Router();

  // GET /products: list all products.
  router.get("/", async (_req, res) => {
    res.json(await repo.findAll());
  });

  // GET /products/:id: one product, or 404 if it does not exist.
  router.get("/:id", async (req, res) => {
    const product = await repo.findById(req.params.id);
    if (!product) {
      sendProblem(req, res, 404, `Product ${req.params.id} does not exist`);
      return; // one request gets one response
    }
    res.json(product);
  });

  // POST /products: create a product.
  router.post("/", async (req, res) => {
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
    res.status(201).json(await repo.create(result.data));
  });

  // If repo.* rejects (e.g. DynamoDB is down), Express 5 catches the rejected
  // promise of these async handlers and sends it to errorHandler → 500.
  return router;
}
