// Zod rules for product input. Routes use these to check what the client sent.
import { z } from "zod";

// The shape a client must send to create a product.
// The client does NOT send id: the server makes it.
export const createProductSchema = z.object({
  name: z.string().min(4),
  price: z.number().min(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
