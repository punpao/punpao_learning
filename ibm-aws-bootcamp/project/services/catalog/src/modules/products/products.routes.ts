// Product routes. Routes only handle HTTP: read req, call the repository, send res.
// The repository is passed in ("dependency injection"), so this file does not know
// or care whether products live in memory or in DynamoDB.
import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { ProductRepository } from "./product.repository.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import type { AuthService } from "../auth/auth.service.js";
import { sendProblem } from "../../shared/http/problem.js";
import type { FileStorage } from "../../shared/storage/file.storage.js";
import { createProductSchema, IMAGE_EXTENSIONS, imageUploadSchema } from "./products.schema.js";

// How long an upload URL works. Short: if it leaks, it is useless soon.
export const UPLOAD_URL_TTL_SECONDS = 300;

export function createProductsRouter(
  repo: ProductRepository,
  auth: AuthService,
  fileStorage?: FileStorage, // optional: missing = uploads not configured → 503
): Router {
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

  // POST /products: create a product. Admins only (GETs above stay public).
  // Order matters: requireAuth (no/invalid token → 401) sets res.locals.user,
  // then requireRole (not admin → 403), and only then do we look at the body.
  router.post("/", requireAuth(auth), requireRole("admin"), async (req, res) => {
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

  // POST /products/:id/image-upload-url: give an admin a presigned S3 URL to upload
  // one product image. The browser PUTs the file straight to S3 (bytes never pass
  // through this server). Order: 401 → 403 → 503 → 400 → 404 → 200.
  router.post("/:id/image-upload-url", requireAuth(auth), requireRole("admin"), async (req, res) => {
    if (!fileStorage) {
      sendProblem(req, res, 503, "File uploads are not configured");
      return;
    }

    const result = imageUploadSchema.safeParse(req.body);
    if (!result.success) {
      sendProblem(req, res, 400, "contentType must be image/png, image/jpeg or image/webp");
      return;
    }

    // With middleware before the handler, Express types widen params to
    // string | string[]. A ":id" segment is always one string at runtime.
    const id = req.params.id as string;
    const product = await repo.findById(id);
    if (!product) {
      sendProblem(req, res, 404, `Product ${id} does not exist`);
      return;
    }

    // The SERVER builds the key. Never use a client filename: it could contain
    // "../", overwrite another product's image, or end in ".html".
    // product.id comes from our database, not from the URL text.
    const { contentType } = result.data;
    const key = `products/${product.id}/${randomUUID()}.${IMAGE_EXTENSIONS[contentType]}`;
    const uploadUrl = await fileStorage.createUploadUrl(key, contentType, UPLOAD_URL_TTL_SECONDS);

    res.json({ uploadUrl, key, expiresIn: UPLOAD_URL_TTL_SECONDS });
  });

  // If repo.* rejects (e.g. DynamoDB is down), Express 5 catches the rejected
  // promise of these async handlers and sends it to errorHandler → 500.
  return router;
}
