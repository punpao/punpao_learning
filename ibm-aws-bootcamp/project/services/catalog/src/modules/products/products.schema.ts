// Zod rules for product input. Routes use these to check what the client sent.
import { z } from "zod";

// The shape a client must send to create a product.
// The client does NOT send id: the server makes it.
export const createProductSchema = z.object({
  name: z.string().min(4),
  price: z.number().min(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// Image upload: only these types. The server picks the file extension from this,
// so a client cannot choose ".html" or a path like "../../x".
export const IMAGE_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export const imageUploadSchema = z.object({
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

// PUT /products/:id/image body: the key that the upload-url route gave the client.
export const setImageSchema = z.object({ key: z.string() });

// Only keys the upload-url route could have made FOR THIS PRODUCT are accepted:
// "products/<id>/<uuid>.<png|jpg|webp>". The id is compared as plain text with
// startsWith (never put into a RegExp), so special characters in it can't change the rule.
const IMAGE_FILE_NAME = /^[0-9a-f-]+\.(png|jpg|webp)$/;
export function isImageKeyFor(productId: string, key: string): boolean {
  const prefix = `products/${productId}/`;
  return key.startsWith(prefix) && IMAGE_FILE_NAME.test(key.slice(prefix.length));
}
