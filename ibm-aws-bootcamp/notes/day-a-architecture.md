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

## A2b: real DynamoDB on AWS (2026-11-26)
- Created table `catalog-products-dev` myself in the Console: ap-southeast-2, partition key `id` (String), on-demand billing. DynamoDB stores typed values (`{"N": "1290"}`); the DocumentClient converts to plain JS objects.
- `DynamoProductRepository` implements the same `ProductRepository` interface: findAll → Scan (reads every item: fine for a few items, too slow at large scale), findById → GetItem by key (fast), create → PutItem with `attribute_not_exists(id)` so it never overwrites.
- `server.ts` picks the repository with `STORAGE=dynamo`; routes and tests did not change. That is the payoff of the repository pattern + dependency injection.
- Credentials: DynamoDB has no connection string; every request is signed with IAM credentials. On my Mac the SDK uses my `aws login` session (expires about every 12 h on purpose). On AWS (ECS/Lambda) the service gets an IAM role (task role) and temporary credentials automatically. Never put access keys in code or a committed .env (the repo is public; bots scan GitHub for keys).
