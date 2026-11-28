// server.ts: the entry point that starts the real server.
// app.ts builds the app; this file opens the port and handles shutdown.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createApp } from "./app.js";
import { attachWebSocket } from "./realtime/websocket.js"; // ".js" even though the file is app.ts (NodeNext rule)
import { AuthService } from "./modules/auth/auth.service.js";
import { InMemoryUserRepository } from "./modules/auth/inMemory.user.repository.js";
import { DynamoProductRepository } from "./modules/products/dynamo.product.repository.js";
import { InMemoryProductRepository } from "./modules/products/inMemory.product.repository.js";
import type { ProductRepository } from "./modules/products/product.repository.js";
import { InMemoryEventBus } from "./shared/events/event.bus.js";
import { logger } from "./shared/logger.js";
import type { FileStorage } from "./shared/storage/file.storage.js";
import { createUploadS3Client, S3FileStorage } from "./shared/storage/s3.file.storage.js";

// Last line of defense: an error that NO code caught.
// - unhandledRejection: a promise rejected and nobody had .catch() or try/await.
// - uncaughtException: a throw outside any try/catch, e.g. inside a setTimeout callback.
// Express 5 already catches errors in route handlers, so these mean a bug elsewhere.
// After such an error the process may be in a broken state, so we do NOT keep going:
// log it (fatal = highest level, so alarms can match it) and exit(1).
// ECS sees the non-zero exit and starts a fresh task.
// Registered before listen(). (The imports above still run first: imports always do.)
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled promise rejection, exiting");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception, exiting");
  process.exit(1);
});

// PORT comes from the environment (ECS, Docker, etc. set it). Default 3000 for local dev.
// Fail fast on a bad value instead of quietly using a different port.
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  logger.fatal({ PORT: process.env.PORT }, "PORT must be a whole number from 0 to 65535");
  process.exit(1);
}

// This is the ONE place that picks the real dependencies ("composition root").
// STORAGE=dynamo → DynamoDB table; anything else → in-memory (local dev, no AWS needed).
function createProductRepo(): ProductRepository {
  if (process.env.STORAGE === "dynamo") {
    const region = process.env.AWS_REGION ?? "ap-southeast-2";
    const tableName = process.env.TABLE_NAME ?? "catalog-products-dev";
    // No credentials passed: the SDK's default chain finds them
    // (aws login locally, the ECS task role in the cloud).
    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
    logger.info({ storage: "dynamo", region, tableName }, "using DynamoDB repository");
    return new DynamoProductRepository(docClient, tableName);
  }
  logger.info({ storage: "memory" }, "using in-memory repository");
  return new InMemoryProductRepository([
    { id: "1", name: "Keyboard", price: 1290 },
    { id: "2", name: "Mouse", price: 590 },
  ]);
}

// UPLOAD_BUCKET set → product image uploads go to that S3 bucket (presigned PUT URLs).
// Not set → no file storage; the upload route answers 503. The bucket name comes
// only from the environment, like everything account-specific.
function createFileStorage(): FileStorage | undefined {
  const bucket = process.env.UPLOAD_BUCKET;
  if (!bucket) {
    logger.info("UPLOAD_BUCKET not set: image uploads disabled");
    return undefined;
  }
  const region = process.env.AWS_REGION ?? "ap-southeast-2";
  // No credentials passed (default chain, like DynamoDB above).
  const s3 = createUploadS3Client({ region });
  logger.info({ region, bucket }, "image uploads go to S3");
  return new S3FileStorage(s3, bucket);
}

// JWT_SECRET signs the login tokens. It comes ONLY from the environment
// (locally: .env / your shell; on AWS: Secrets Manager). Never hardcode it here:
// the repo is public, and anyone with the secret can make valid admin tokens.
// HS256 needs a long random secret; 16 chars is our minimum, 32+ random bytes is better.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
  logger.fatal("JWT_SECRET is missing or shorter than 16 characters");
  process.exit(1);
}

// CORS_ORIGINS: comma-separated list, e.g. "https://shop.example.com,http://localhost:4200".
// Must match exactly what the browser sends: scheme + host + port, no trailing slash.
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:4200")
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o.length > 0);
logger.info({ corsOrigins }, "CORS allowed origins");

// One bus for the whole process: routes publish to it, the WebSocket server listens.
const eventBus = new InMemoryEventBus();

const app = createApp({
  productRepo: createProductRepo(),
  authService: new AuthService(new InMemoryUserRepository(), jwtSecret),
  corsOrigins,
  fileStorage: createFileStorage(),
  eventBus,
});

// Express 5 passes listen errors (e.g. EADDRINUSE: port already in use) to this callback.
const server = app.listen(port, (err?: Error) => {
  if (err) {
    logger.fatal({ err }, "could not start server");
    process.exit(1);
  }
  logger.info({ port }, "catalog-service listening");
});

// WebSocket on the SAME server and port, path /ws (see src/realtime/websocket.ts).
const realtime = attachWebSocket(server, eventBus, logger);

// Graceful shutdown. ECS (and docker stop) sends SIGTERM, waits, then sends SIGKILL.
// 1. server.close(): stop accepting NEW connections. Idle keep-alive connections
//    are closed too (Node 19+). Requests already in flight are allowed to finish.
// 2. When the last one finishes, the close callback runs → exit 0.
// 3. Safety timer: if a request hangs, exit anyway before SIGKILL arrives.
const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return; // a second signal must not start a second shutdown
  shuttingDown = true;
  logger.info({ signal }, "shutting down: no new connections, finishing in-flight requests");

  // WebSockets first: an open WebSocket is a connection that never "finishes",
  // so server.close() below would wait for it until the 10 s timer kills us.
  realtime.close();

  server.close((err) => {
    if (err) {
      logger.error({ err }, "error while closing server");
      process.exit(1);
    }
    logger.info("all requests finished, bye");
    process.exit(0);
  });

  // server.close() closes idle keep-alive connections only at the moment it is called.
  // A connection whose request finishes LATER (e.g. /slow) stays open but idle until
  // its keep-alive timeout, and that delays the exit by seconds. Close those as soon
  // as they become idle.
  setInterval(() => server.closeIdleConnections(), 250).unref();

  // .unref(): this timer alone must not keep the process alive.
  setTimeout(() => {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, "shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on("SIGTERM", shutdown); // ECS / docker stop / kill
process.on("SIGINT", shutdown); // Ctrl+C in the terminal
