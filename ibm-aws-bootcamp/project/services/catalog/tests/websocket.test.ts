// End-to-end WebSocket tests: a REAL HTTP server on a random free port (0),
// real ws clients, and supertest calling the same server.
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { attachWebSocket, type RealtimeOptions } from "../src/realtime/websocket.js";
import { InMemoryEventBus } from "../src/shared/events/event.bus.js";
import { logger } from "../src/shared/logger.js";
import { makeApp } from "./testApp.js";

let server: Server;
let realtime: { close(): void };
let port: number;
const clients: WebSocket[] = [];

async function start(options?: RealtimeOptions) {
  const eventBus = new InMemoryEventBus();
  server = makeApp({ eventBus }).listen(0); // 0 = the OS picks a free port
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
  realtime = attachWebSocket(server, eventBus, logger, options);
}

afterEach(async () => {
  for (const c of clients.splice(0)) c.terminate();
  realtime.close();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// A client that queues every message, so none is lost while the test is busy.
// next(ms) = the next message, or reject if none arrives in time.
function connect(path = "/ws", opts: WebSocket.ClientOptions = {}) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`, opts);
  clients.push(socket);
  const queue: unknown[] = [];
  const waiters: ((m: unknown) => void)[] = [];
  socket.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    const waiter = waiters.shift();
    if (waiter) waiter(msg);
    else queue.push(msg);
  });
  socket.on("error", () => {}); // tests check close/err explicitly where needed
  return {
    socket,
    next(timeoutMs = 1000): Promise<unknown> {
      if (queue.length > 0) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no message within ${timeoutMs} ms`)), timeoutMs);
        waiters.push((m) => {
          clearTimeout(timer);
          resolve(m);
        });
      });
    },
    // Resolves true if NO message arrives in this time.
    async silentFor(ms: number): Promise<boolean> {
      await new Promise((r) => setTimeout(r, ms));
      return queue.length === 0;
    },
  };
}

// once() with a deadline: a broken build fails in 2 s with a clear error
// instead of hanging until vitest's 5 s test timeout.
const within2s = () => ({ signal: AbortSignal.timeout(2000) });

async function tokenFor(email: string, password: string): Promise<string> {
  const res = await request(server).post("/auth/login").send({ email, password });
  return res.body.accessToken;
}

describe("WebSocket /ws", () => {
  it('sends {"type":"hello"} on connect', async () => {
    await start();
    const client = connect();
    expect(await client.next()).toEqual({ type: "hello" });
  });

  it("POST /products as admin → every client gets product.created with that product within 1 s", async () => {
    await start();
    const a = connect();
    const b = connect();
    await a.next(); // hello
    await b.next();

    const admin = await tokenFor("admin@example.com", "admin-pass");
    const res = await request(server)
      .post("/products")
      .set("Authorization", `Bearer ${admin}`)
      .send({ name: "Monitor", price: 5990 });
    expect(res.status).toBe(201);

    const expected = { type: "product.created", product: res.body };
    expect(await a.next(1000)).toEqual(expected);
    expect(await b.next(1000)).toEqual(expected);

    // A second create reaches the same clients too (the subscription stays).
    const second = await request(server)
      .post("/products")
      .set("Authorization", `Bearer ${admin}`)
      .send({ name: "Webcam", price: 1490 });
    expect(await a.next(1000)).toEqual({ type: "product.created", product: second.body });
  });

  it("failed POSTs (400 bad body, 403 user, 401 no token) publish nothing", async () => {
    await start();
    const client = connect();
    await client.next(); // hello

    const admin = await tokenFor("admin@example.com", "admin-pass");
    const user = await tokenFor("user@example.com", "user-pass");
    const product = { name: "Monitor", price: 5990 };
    expect((await request(server).post("/products").set("Authorization", `Bearer ${admin}`).send({ name: "x" })).status).toBe(400);
    expect((await request(server).post("/products").set("Authorization", `Bearer ${user}`).send(product)).status).toBe(403);
    expect((await request(server).post("/products").send(product)).status).toBe(401);

    expect(await client.silentFor(200)).toBe(true);
  });

  it("other paths are not WebSocket endpoints", async () => {
    await start();
    const { socket } = connect("/not-ws");
    const [, res] = await once(socket, "unexpected-response", within2s());
    expect(res.statusCode).toBe(400);
  });

  it("heartbeat: a client that never answers pings is terminated; a healthy one stays", async () => {
    await start({ heartbeatMs: 50 });
    const healthy = connect();
    const dead = connect("/ws", { autoPong: false }); // acts like a phone that lost signal
    await healthy.next();
    await dead.next();

    // Round 1 pings both; round 2 finds "dead" never ponged → terminate (code 1006).
    const [code] = await once(dead.socket, "close", within2s());
    expect(code).toBe(1006); // 1006 = closed without a close frame (terminated)
    await new Promise((r) => setTimeout(r, 150)); // 3 more rounds
    expect(healthy.socket.readyState).toBe(WebSocket.OPEN);
  });

  it("close() says goodbye to clients with 1001 Going Away", async () => {
    await start();
    const client = connect();
    await client.next();

    realtime.close();
    const [code, reason] = await once(client.socket, "close", within2s());
    expect(code).toBe(1001);
    expect(reason.toString()).toBe("server shutting down");
  });

  it("a message bigger than maxPayload (1 KiB) closes that client with 1009", async () => {
    await start();
    const client = connect();
    await client.next();
    client.socket.send("x".repeat(2048));
    const [code] = await once(client.socket, "close", within2s());
    expect(code).toBe(1009); // 1009 = message too big
  });
});
