// Unit tests for the DynamoDB repository's setImageKey with a STUB client:
// we check the UpdateItem we send, and how we react to DynamoDB's answers.
// No request leaves the machine.
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, vi } from "vitest";
import { DynamoProductRepository } from "../src/modules/products/dynamo.product.repository.js";

function repoWhereSend(answer: () => Promise<unknown>) {
  const send = vi.fn<(command: unknown) => Promise<unknown>>(answer);
  const docClient = { send } as unknown as DynamoDBDocumentClient;
  return { repo: new DynamoProductRepository(docClient, "test-table"), send };
}

describe("DynamoProductRepository.setImageKey", () => {
  it("sends a conditional UpdateItem and maps the returned item", async () => {
    const { repo, send } = repoWhereSend(async () => ({
      Attributes: { id: "1", name: "Keyboard", price: 1290, imageKey: "products/1/a.png", internal: "x" },
    }));

    const product = await repo.setImageKey("1", "products/1/a.png");

    // Only known fields come back (the extra "internal" attribute is dropped).
    expect(product).toEqual({ id: "1", name: "Keyboard", price: 1290, imageKey: "products/1/a.png" });
    const command = send.mock.calls[0]![0] as UpdateCommand;
    expect(command).toBeInstanceOf(UpdateCommand);
    expect(command.input).toMatchObject({
      TableName: "test-table",
      Key: { id: "1" },
      UpdateExpression: "SET imageKey = :key",
      ConditionExpression: "attribute_exists(id)", // without it, UpdateItem would CREATE the item
      ExpressionAttributeValues: { ":key": "products/1/a.png" },
      ReturnValues: "ALL_NEW",
    });
  });

  it("ConditionalCheckFailed (no such id) → undefined", async () => {
    const { repo } = repoWhereSend(async () => {
      throw new ConditionalCheckFailedException({ message: "The conditional request failed", $metadata: {} });
    });
    expect(await repo.setImageKey("999", "products/999/a.png")).toBeUndefined();
  });

  it("any other DynamoDB error is rethrown (→ 500), not hidden as 'not found'", async () => {
    const boom = new Error("ProvisionedThroughputExceeded");
    const { repo } = repoWhereSend(async () => {
      throw boom;
    });
    await expect(repo.setImageKey("1", "products/1/a.png")).rejects.toBe(boom);
  });
});
