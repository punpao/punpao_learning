// ProductRepository backed by a DynamoDB table (partition key: id, type String).
// Uses the DocumentClient from @aws-sdk/lib-dynamodb, so we send and get plain
// JS objects ({ id: "1", price: 590 }) instead of DynamoDB's typed format
// ({ id: { S: "1" }, price: { N: "590" } }).
//
// No credentials here. The SDK finds them by itself (default credential chain):
// locally from `aws login`, on ECS from the task role. Never put keys in code.
import { randomUUID } from "node:crypto";
import {
  GetCommand,
  PutCommand,
  ScanCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import type { CreateProductInput } from "../schemas/product.schema.js";
import type { Product, ProductRepository } from "./product.repository.js";

export class DynamoProductRepository implements ProductRepository {
  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  // Scan reads the WHOLE table. One Scan call returns at most 1 MB; if there is
  // more, the response has LastEvaluatedKey and we must ask again from there.
  // Fine for a small catalog. For a big table you would use Query on an index
  // and return one page at a time to the client instead.
  async findAll(): Promise<Product[]> {
    const products: Product[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const page = await this.docClient.send(
        new ScanCommand({ TableName: this.tableName, ExclusiveStartKey: startKey }),
      );
      for (const item of page.Items ?? []) products.push(toProduct(item));
      startKey = page.LastEvaluatedKey;
    } while (startKey);
    return products;
  }

  async findById(id: string): Promise<Product | undefined> {
    const { Item } = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
        // Reads are "eventually consistent" by default: right after a Put, a Get
        // may not see it yet. Strongly consistent costs 2x read units (still tiny)
        // but makes POST then GET /products/:id always work.
        ConsistentRead: true,
      }),
    );
    return Item ? toProduct(Item) : undefined;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const product: Product = { id: randomUUID(), ...input };
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: product,
        // Put normally REPLACES an item with the same key without a word.
        // This condition makes DynamoDB refuse instead (ConditionalCheckFailedException),
        // so a create can never silently overwrite an existing product.
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
    return product;
  }
}

// Build a Product from a raw item: only the fields we know, with the right types.
// (The table may hold extra attributes; they must not leak into API responses.)
function toProduct(item: Record<string, unknown>): Product {
  return {
    id: String(item.id),
    name: String(item.name),
    price: Number(item.price),
  };
}
