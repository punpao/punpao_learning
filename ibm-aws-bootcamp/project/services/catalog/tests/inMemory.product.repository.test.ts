// Unit tests for the repository alone: no Express, no HTTP.
// They guard the "return copies, not our own data" rule.
import { describe, expect, it } from "vitest";
import { InMemoryProductRepository } from "../src/data/inMemory.product.repository.js";

const seed = () => [{ id: "1", name: "Keyboard", price: 1290 }];

describe("InMemoryProductRepository", () => {
  it("findAll returns a copy: changing it does not change the stored data", async () => {
    const repo = new InMemoryProductRepository(seed());
    const list = await repo.findAll();
    list.push({ id: "x", name: "Injected", price: 1 });
    list[0]!.price = -1;
    expect(await repo.findAll()).toEqual(seed());
  });

  it("findById returns a copy", async () => {
    const repo = new InMemoryProductRepository(seed());
    const p = await repo.findById("1");
    p!.price = -1;
    expect((await repo.findById("1"))!.price).toBe(1290);
  });

  it("does not change the seed array passed to the constructor", async () => {
    const input = seed();
    const repo = new InMemoryProductRepository(input);
    await repo.create({ name: "Monitor", price: 5990 });
    expect(input).toEqual(seed());
  });

  it("create makes a new id each time", async () => {
    const repo = new InMemoryProductRepository();
    const a = await repo.create({ name: "Monitor", price: 1 });
    const b = await repo.create({ name: "Monitor", price: 1 });
    expect(a.id).not.toBe(b.id);
    expect(await repo.findAll()).toHaveLength(2);
  });
});
