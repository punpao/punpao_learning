// ProductRepository backed by a plain array. Used for local dev and tests.
// Data lives only as long as this object: a new instance starts fresh.
import { randomUUID } from "node:crypto";
import type { CreateProductInput } from "./products.schema.js";
import type { Product, ProductRepository } from "./product.repository.js";

export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Product[];

  // Copy the seed, so the caller's array and objects are never changed by us.
  constructor(seed: Product[] = []) {
    this.products = seed.map((p) => ({ ...p }));
  }

  // Return copies, never our own array or objects. Otherwise a caller could do
  // `(await repo.findAll()).push(...)` or `product.price = -1` and change the
  // stored data without going through create(). DynamoDB also always gives you
  // new objects, so this keeps both versions behaving the same.
  async findAll(): Promise<Product[]> {
    return this.products.map((p) => ({ ...p }));
  }

  async findById(id: string): Promise<Product | undefined> {
    const product = this.products.find((p) => p.id === id);
    return product ? { ...product } : undefined;
  }

  // Builds the product only from validated input. The server makes the id.
  async create(input: CreateProductInput): Promise<Product> {
    const product: Product = { id: randomUUID(), ...input };
    this.products.push(product);
    return { ...product };
  }

  async setImageKey(id: string, key: string): Promise<Product | undefined> {
    const product = this.products.find((p) => p.id === id);
    if (!product) return undefined;
    product.imageKey = key;
    return { ...product };
  }
}
