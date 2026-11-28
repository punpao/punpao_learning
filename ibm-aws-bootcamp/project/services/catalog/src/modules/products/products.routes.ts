// Product routes. Routes only handle HTTP: read req, call the repository, send res.
// The repository is passed in ("dependency injection"), so this file does not know
// or care whether products live in memory or in DynamoDB.
import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Product, ProductRepository } from "./product.repository.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import type { AuthService } from "../auth/auth.service.js";
import type { EventBus } from "../../shared/events/event.bus.js";
import { sendProblem } from "../../shared/http/problem.js";
import type { FileStorage } from "../../shared/storage/file.storage.js";
import {
  createProductSchema,
  IMAGE_EXTENSIONS,
  imageUploadSchema,
  isImageKeyFor,
  setImageSchema,
} from "./products.schema.js";

// How long an upload URL works. Short: if it leaks, it is useless soon.
export const UPLOAD_URL_TTL_SECONDS = 300;
// How long an image download URL in GET responses works.
export const DOWNLOAD_URL_TTL_SECONDS = 900;

// What clients see: never the raw S3 key, only a short-lived download URL.
export type ProductResponse = Omit<Product, "imageKey"> & { imageUrl?: string };

export function createProductsRouter(
  repo: ProductRepository,
  auth: AuthService,
  eventBus: EventBus,
  fileStorage?: FileStorage, // optional: missing = uploads not configured → 503
): Router {
  const router = Router();

  // Every product leaves this router through here. imageKey is always removed;
  // imageUrl is added only when the product has an image AND storage is configured.
  // Presigning is local crypto (no call to S3), so doing it per product is cheap.
  async function toResponse(product: Product): Promise<ProductResponse> {
    const { imageKey, ...rest } = product;
    if (!imageKey || !fileStorage) return rest;
    return { ...rest, imageUrl: await fileStorage.createDownloadUrl(imageKey, DOWNLOAD_URL_TTL_SECONDS) };
  }

  // GET /products: list all products.
  router.get("/", async (_req, res) => {
    const products = await repo.findAll();
    res.json(await Promise.all(products.map(toResponse)));
  });

  // GET /products/:id: one product, or 404 if it does not exist.
  router.get("/:id", async (req, res) => {
    const product = await repo.findById(req.params.id);
    if (!product) {
      sendProblem(req, res, 404, `Product ${req.params.id} does not exist`);
      return; // one request gets one response
    }
    res.json(await toResponse(product));
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
    const created = await repo.create(result.data);
    // Announce it only AFTER the save worked. Build the event field by field,
    // so a new internal field on Product (like imageKey) can never leak to browsers.
    eventBus.publish({
      type: "product.created",
      product: { id: created.id, name: created.name, price: created.price },
    });
    res.status(201).json(await toResponse(created));
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

  // PUT /products/:id/image: step 2 of the upload. After the browser PUT the file
  // to S3, it tells us the key, and we attach it to the product.
  // Order: 401 → 403 → 503 → 400 (body / key pattern) → 404 → 400 (not uploaded) → 200.
  router.put("/:id/image", requireAuth(auth), requireRole("admin"), async (req, res) => {
    if (!fileStorage) {
      sendProblem(req, res, 503, "File uploads are not configured");
      return;
    }

    const id = req.params.id as string; // see the note in image-upload-url above
    const result = setImageSchema.safeParse(req.body);
    // Pattern check BEFORE anything touches S3: an admin of product 1 must not be
    // able to attach product 2's image, or any other object in the bucket.
    if (!result.success || !isImageKeyFor(id, result.data.key)) {
      sendProblem(req, res, 400, `key must be an image key made for product ${id}`);
      return;
    }
    const { key } = result.data;

    if (!(await repo.findById(id))) {
      sendProblem(req, res, 404, `Product ${id} does not exist`);
      return;
    }

    // The upload-url route only PROMISED a file; check the browser really uploaded it.
    if (!(await fileStorage.exists(key))) {
      sendProblem(req, res, 400, "Image not uploaded yet");
      return;
    }

    // undefined = the product was deleted between findById and now.
    const updated = await repo.setImageKey(id, key);
    if (!updated) {
      sendProblem(req, res, 404, `Product ${id} does not exist`);
      return;
    }
    res.json(await toResponse(updated));
  });

  // If repo.* rejects (e.g. DynamoDB is down), Express 5 catches the rejected
  // promise of these async handlers and sends it to errorHandler → 500.
  return router;
}
