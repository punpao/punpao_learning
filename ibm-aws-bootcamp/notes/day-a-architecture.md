# Day A: architecture in code

## A1: production safety (2026-11-26)
- `NODE_ENV` tells the app where it runs (development / test / production). Test-only routes (/boom, /slow) are registered only when it is not "production".
- `process.on(event, fn)` = "when this happens to the whole program, call fn". Used for SIGTERM/SIGINT (shutdown) and for `unhandledRejection` / `uncaughtException` (crashes outside a request).
- Crash net: `logger.fatal({ err })` (level 60, the program is about to die; uses the main logger because no request owns the crash), then `process.exit(1)`; ECS starts a clean container.

## A2: repository pattern + dependency injection (2026-11-26)
- Before: routes imported the data file directly, so changing storage meant editing routes, and tests shared one array.
- Interface `ProductRepository` = the order list (findAll, findById, create; all return Promises because DynamoDB is a network call).
- `InMemoryProductRepository` = one supplier that follows the list (returns copies). Tomorrow: `DynamoProductRepository`.
- Dependency injection = hand the repository in (`createApp({ productRepo })`, `createProductsRouter(repo)`) instead of letting routes fetch it themselves.
- `server.ts` is the one place that picks the real parts ("composition root"); tests pass a fresh in-memory repository for every test, so tests no longer share state.
- Analogy: the route is a chef; the repository is the supplier; the chef only needs ingredients that match the order list.
