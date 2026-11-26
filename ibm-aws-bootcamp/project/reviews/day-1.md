# Code review: catalog-service, Day 1

Reviewer: coach (senior-engineer view) · Date: 2026-11-26 · Commit reviewed: 4a59659
Scope: `project/services/catalog/` (src/, tests/, vitest.config.ts, package.json)

## Verdict
**Approve with changes.** The structure is what a team would want on Day 1: one job per file, one error format, validated input, request ids, safe logs, real tests and graceful shutdown. Fix the 🔴 items before this code reaches AWS on Day 2–3.

## What is good (keep doing this)
- **Separation of concerns.** `app.ts` wires, `routes/` do HTTP only, `data/` is the only place that knows where data lives. Day 2's DynamoDB change should touch one file.
- **One error shape.** Every error is RFC 9457 `application/problem+json` via `sendProblem`. Clients parse errors one way.
- **No mass assignment.** Products are built from `result.data`, and the server makes the id with `randomUUID()`.
- **Observability.** pino-http first, `x-request-id` reused or created and sent back, `req.log` in the error handler, secrets redacted.
- **Tests that test the edges.** Boundary cases `-1 → 400` and `0 → 201`, proven by breaking the code on purpose.
- **Graceful shutdown.** `server.close()`, a guard against a second signal, an unref'd safety timer, and `closeIdleConnections()` for late keep-alive sockets.
- **Comments explain *why*, not *what*.**

## Findings

### 🔴 Fix before deploying
1. **Test routes ship to production** (`app.ts:47` `/boom`, `app.ts:54` `/slow`).
   Anyone could call `/boom` to fill the error log and trip 5xx alarms, or open many `/slow` requests to hold connections open.
   *Fix:* register them only when `process.env.NODE_ENV !== "production"`, or only inside tests.
2. **No handlers for crashes outside a request** (`server.ts`).
   An unhandled promise rejection or uncaught exception kills the process with no structured log line (Day 1 lesson 1.1).
   *Fix:* `process.on("unhandledRejection", …)` and `process.on("uncaughtException", …)`: log with `logger.fatal({ err })`, then exit with code 1, so ECS restarts a clean task.

### 🟡 Should fix soon
3. **Input rules are too loose** (`product.schema.ts:7-8`).
   - `"    "` (4 spaces) passes as a name. Use `.trim().min(4)`.
   - No upper limits: a 90 KB name or a price of 1e15 is accepted. Add `.max(100)` and a sensible `price.max(…)`.
   - Money as a float: `0.1 + 0.2 !== 0.3`. Store the price as a whole number in the smallest unit (satang) with `.int()`, or at least `.multipleOf(0.01)`. Interviewers like this one.
4. **The store hands out its internal array** (`products.store.ts:15`).
   `findAllProducts()` returns the real array, so any caller could change stored data by accident. Return a copy: `return [...products];`.
5. **Tests share state** (`tests/app.test.ts`).
   POST tests add products to the same in-memory array that the other tests read, so test order can change the results. On Day 2, give the app a repository you can swap in tests (dependency injection), or reset the store before each test.
6. **4xx errors are not logged and their detail is vague** (`errorHandler.ts:23-25`).
   Broken JSON returns "The request could not be processed" and writes no log line. Log 4xx at `warn` level, and give a clearer detail for known cases (e.g. `entity.parse.failed` → "Request body is not valid JSON"; `entity.too.large` → 413).

### 🟢 Nice to have
7. **Tests are not type-checked by `tsc`.** `tsconfig.json` includes only `src`, and vitest does not type-check. Add a `typecheck` script whose tsconfig also includes `tests`, and run it in CI (Day 6).
8. **Health check is liveness only.** On Day 2, add a readiness check (can we reach DynamoDB?). During shutdown, a readiness check can return 503 so the load balancer stops sending new traffic first.
9. **Redact more.** Also redact `res.headers["set-cookie"]` and any API key header you add later.
10. **`GET /products` has no paging.** Fine with 2 items; with DynamoDB on Day 2, add `limit` and a cursor.

## Explain-back (answer these in your own words)
1. Why is `/boom` in production a risk even though it only returns a 500?
2. Why should money not be stored as a float? What would you store instead?
3. If test A creates a product and test B checks the product count, what goes wrong when the order changes, and how does Day 2's repository help?

## Score
| Area | Score |
|---|---|
| Structure and readability | 9/10 |
| Correctness | 8/10 |
| Security | 6/10 (test routes, loose input limits) |
| Observability | 9/10 |
| Tests | 7/10 (good edges; shared state, not type-checked) |
| Operability (shutdown, config) | 8/10 (no crash handlers) |
