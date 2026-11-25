// This file is the only one that knows where product data lives.
// Today it is an in-memory array (it resets every time the server restarts).
// On Day 2 it becomes a repository backed by DynamoDB, and the routes won't change.
import { randomUUID } from "node:crypto";
import type { CreateProductInput } from "../schemas/product.schema.js";

export type Product = { id: string; name: string; price: number };

const products: Product[] = [
  { id: "1", name: "Keyboard", price: 1290 },
  { id: "2", name: "Mouse", price: 590 },
];

export function findAllProducts(): Product[] {
  return products;
}

export function findProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

// Builds the product only from validated input, never from raw req.body.
// The server makes the id; the client never chooses it.
export function createProduct(input: CreateProductInput): Product {
  const product: Product = { id: randomUUID(), ...input };
  products.push(product);
  return product;
}
