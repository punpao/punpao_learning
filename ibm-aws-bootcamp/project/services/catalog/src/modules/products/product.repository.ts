// The "port": what the app needs from product storage, with no word about HOW it is stored.
// Routes depend on this interface only. Today an in-memory class implements it;
// later a DynamoDB class will, and the routes won't change.
//
// Every method returns a Promise, even though the in-memory version could answer
// at once: DynamoDB is a network call, so it is async, and the interface must fit both.
import type { CreateProductInput } from "./products.schema.js";

export type Product = { id: string; name: string; price: number };

export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | undefined>;
  create(input: CreateProductInput): Promise<Product>;
}
