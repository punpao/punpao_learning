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

## A3: Docker (2026-11-27)
- Image = app + Node + libraries packed into one file system; container = a running image. Containers share the host OS kernel (lighter and faster to start than a VM).
- `npm ci` installs exactly what package-lock.json says (reproducible); `npm run build` runs `tsc`: type-check, then write `src/**/*.ts` → `dist/**/*.js` with types removed. `dist/` is generated: never edit it, never commit it.
- Multi-stage: stage 1 has dev tools and runs `tsc`; stage 2 starts clean, installs only runtime deps (`--omit=dev`), copies only `dist/`. Smaller image, fewer dependencies (fewer vulnerabilities), no source in the image.
- `USER node` (not root); `ENV NODE_ENV=production` (hides /boom and /slow); `CMD ["node","dist/server.js"]` exec form so SIGTERM reaches our code (no npm or shell in between).
- `.dockerignore` keeps node_modules, dist and .env (secrets) out of the image.
- `docker stop` sends SIGTERM, then SIGKILL after 10 s: the same thing ECS does on a deploy. Our graceful shutdown handled it.
- Result: disk 270 MB / content 61.4 MB; runs as `node`; /app has only dist, node_modules (88 runtime packages), package.json, package-lock.json (no src, no tests, no .ts); `/boom` → 404 in the container; `docker stop` took 0.17 s, exit code 0, logs: "shutting down … (SIGTERM)" then "all requests finished, bye".
- A simpler Dockerfile (`FROM node:22`, `npm install`, one stage, root, `CMD ["npm","start"]`) also works, but a review would flag: big image, non-reproducible installs, dev tools and source in the image, root user, signals may not reach the app.
