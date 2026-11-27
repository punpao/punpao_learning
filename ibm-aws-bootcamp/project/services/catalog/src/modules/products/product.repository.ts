// The "port": what the app needs from product storage, with no word about HOW it is stored.
// Routes depend on this interface only. Today an in-memory class implements it;
// later a DynamoDB class will, and the routes won't change.
//
// Every method returns a Promise, even though the in-memory version could answer
// at once: DynamoDB is a network call, so it is async, and the interface must fit both.
import type { CreateProductInput } from "./products.schema.js";

export type Product = {
  id: string;
  name: string;
  price: number;
  // S3 key of the product image, e.g. "products/1/<uuid>.png". Internal only:
  // routes never send it to clients; they send a short-lived imageUrl instead.
  imageKey?: string;
};

export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | undefined>;
  create(input: CreateProductInput): Promise<Product>;
  // Saves the image key on an EXISTING product. Returns the updated product,
  // or undefined if there is no product with this id (it never creates one).
  setImageKey(id: string, key: string): Promise<Product | undefined>;
}
