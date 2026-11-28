// Real-time updates over WebSocket at ws://<host>/ws.
//
// HTTP is "client asks, server answers". A WebSocket starts as an HTTP request with
// "Upgrade: websocket"; after that, the SAME TCP connection stays open and BOTH sides
// can send messages at any time. So the server can PUSH "product.created" to browsers
// the moment it happens, instead of browsers asking GET /products every few seconds.
//
// It shares the HTTP server (and port) with Express: the ws library only takes
// upgrade requests for path /ws; everything else stays with Express.
//
// Read-only and public on purpose: it only sends what GET /products already shows,
// so there is no login. Messages FROM clients are ignored.
import type { Server } from "node:http";
import type { Logger } from "pino";
import { WebSocket, WebSocketServer } from "ws";
import type { EventBus } from "../shared/events/event.bus.js";

export type RealtimeOptions = {
  // How often to ping. A client that has not answered the previous ping is dropped.
  heartbeatMs?: number;
};

export function attachWebSocket(
  httpServer: Server,
  eventBus: EventBus,
  logger: Logger,
  { heartbeatMs = 30_000 }: RealtimeOptions = {},
): { close(): void } {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    // Limit what a client may send us (we ignore it anyway). Default is 100 MiB.
    maxPayload: 1024,
  });

  // Clients that answered the last ping. Kept outside the socket objects
  // (no monkey-patching ws.isAlive), and a WeakSet forgets closed sockets by itself.
  const alive = new WeakSet<WebSocket>();

  wss.on("connection", (socket) => {
    alive.add(socket);
    socket.on("pong", () => alive.add(socket));
    // A socket error (e.g. client sent a broken frame) must not crash the process:
    // without an "error" listener, Node throws it as an uncaught exception.
    socket.on("error", (err) => logger.warn({ err }, "websocket client error"));
    socket.on("close", () => {
      logger.info({ clients: wss.clients.size }, "websocket client disconnected");
    });

    logger.info({ clients: wss.clients.size }, "websocket client connected");
    socket.send(JSON.stringify({ type: "hello" }));
  });

  // Bus → every connected browser. Serialize ONCE, send the same string to all.
  const unsubscribe = eventBus.subscribe((event) => {
    const message = JSON.stringify(event);
    for (const client of wss.clients) {
      // Only OPEN sockets: CONNECTING ones are not ready, CLOSING/CLOSED would throw.
      if (client.readyState === WebSocket.OPEN) client.send(message);
    }
  });

  // Heartbeat. A phone that loses signal or a laptop that sleeps never sends a
  // "close": the server would keep that dead socket (and its memory) forever.
  // Also, the AWS ALB closes connections idle for 60 s by default; a ping every
  // 30 s keeps healthy ones from looking idle.
  // Each round: anyone who did not pong since the LAST round is terminated
  // (killed at once, no close handshake: the other side is gone anyway).
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (!alive.has(client)) {
        logger.info("websocket client missed a heartbeat, terminating");
        client.terminate();
        continue;
      }
      alive.delete(client);
      client.ping();
    }
  }, heartbeatMs);

  return {
    // For graceful shutdown: stop sending, say goodbye, stop accepting.
    close() {
      clearInterval(heartbeat);
      unsubscribe();
      for (const client of wss.clients) {
        // 1001 "Going Away": the server is shutting down. Browsers can reconnect
        // (and the ALB will send them to a task that is still running).
        client.close(1001, "server shutting down");
      }
      // Since ws v8, wss.close() does NOT close existing clients when we share an
      // HTTP server; that is why we closed them above. It stops new upgrades.
      wss.close();
    },
  };
}
