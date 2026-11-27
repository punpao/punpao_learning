# IBM AWS Bootcamp: Progress

## Setup
- **Region:** ap-southeast-2 (Sydney)
- **AWS account:** 8757XXXXXXXX (member of an AWS Organization; management account 0970XXXXXXXX)
- **Sign-in:** `aws login` (console sign-in → short-lived credentials) as role `AccountFullAccessRole` (AdministratorAccess). No IAM users, no access keys, no IAM Identity Center.
- **AWS credits:** start $120 · now $120 (checked 2026-11-23)
- **Free plan:** ACTIVE, expires 2027-05-23
- **Budget:** `bootcamp-monthly`, $30/month, tracks usage *before* credits; email alerts at $5, $15, $30 ✅
- **CDK bootstrap:** ✅ CDKToolkit stack CREATE_COMPLETE in ap-southeast-2 (2026-11-23)
- **Root user MFA:** N/A for this account (root is held by the user's own org management account; daily identity is role `AccountFullAccessRole`)
- **Tools (2026-11-23):** node v24.13.0, npm 11.6.2, git 2.39.5, Docker 29.2.0 (running), aws-cli 2.38.1, cdk 2.1149.0, Homebrew 7.0.9, VS Code 1.144.0 ✅
- **Interview date:** unknown
- **Hours per day:** 10–12

## Status
- **Current day:** A (compressed plan)
- **Current block:** Build A3 done
- **Current step:** Day A: A3 done (Docker image 61 MB content, graceful stop works). Next: Day A system design (SQL vs NoSQL, orders data model), then Day B: deploy to AWS.
- **Pace:** on track
- Plan: compressed to 3.5 days on 2026-11-26 (see plan-compressed.md).

## Days
| Day | Theme | Planned | Status | Quiz | Teach-back | SD score | Notes |
|---|---|---|---|---|---|---|---|
| 0 | Setup | 2026-11-23 | ✅ done (CDK bootstrapped, budget, plan approved, root MFA N/A) | — | — | — | — |
| 1 | JS, Node.js, HTTP | 2026-11-24 (started 2026-11-23) | 📖 | | | | [notes](notes/day-1-node-http.md) |
| 2 | Architecture and API design | 2026-11-25 | ⏳ | | | | |
| 3 | Microservices + Netflix OSS ideas | 2026-11-26 | ⏳ | | | | |
| 4 | Containers + cloud-native on AWS | 2026-11-27 | ⏳ | | | | |
| 5 | Serverless + mapping to AWS | 2026-11-28 | ⏳ | | | | |
| 6 | Angular, CSS, delivery | 2026-11-29 | ⏳ | | | | |
| 7 | Garage Method + final assessment | 2026-11-30 | ⏳ | | | | |

## Pending check questions
<!-- warm-up question is held by the coach in the project thread -->

## Weak spots
| Concept | Evidence | Source | Status |
|---|---|---|---|
| async function body runs sync until first await | Predicted C,A,B then bye,hi | Day 1 1.1 part 3 | 🔴 Open after 2 rounds, revisit in warm-up |
| resolve() moves .then callbacks from the promise's list to the microtask queue | Couldn't answer t=0 vs t=1000; mixed up what resolve does | Day 1 1.1 part 2 | 🟡 Partly, revisit in warm-up |
| Microtasks before tasks; sync before both | A C D B at 1 AM, then S P1 P2 T1 T2 right | Day 1 1.1 part 2 | 🟢 Resolved (re-check) |
| setTimeout(0) waits until stack empty; busy loop = hang, not error | 1,2,3 for busy loop, then correct rule | Day 1 1.1 part 1 | 🟢 Resolved (re-check) |
| IAM role = identity you *become*, not a label on a user (execution role) | 'role assigned to each user'; 'role to assume to user to control access to Lambda' | Day 0 check | 🔴 Open after 2 rounds, revisit Day 2 warm-up |

## System design scores
| Day | Problem | Score | Main gap |
|---|---|---|---|

## AWS resources
| Resource | Stack | Created | ~Cost/day | Status |
|---|---|---|---|---|
| Budget `bootcamp-monthly` | (console) | 2026-11-23 | free | ✅ active |
| CDKToolkit (S3 staging bucket, ECR repo, 5 IAM roles, SSM param) | CDKToolkit | 2026-11-23 | ~$0 (cents/month) | ✅ keep until Day 7 |
| DynamoDB table catalog-products-dev (on-demand, key id; created by owner in Console) | (no stack) | 2026-11-26 | ~$0 | ✅ delete at Day D teardown |
| S3 bucket catalog-images-dev-punpao (private, Block Public Access on; created by owner) + 1 test image (70 B) | (no stack) | 2026-11-27 | ~$0 | ✅ empty + delete at Day D teardown |

## Session log
- 2026-11-23: Day 0. Checked AWS identity, sign-in method and IAM (0 users, admin role via `aws login`). Found budget and free plan already set up. All tools installed. Created folder and progress file.
- 2026-11-23: CDK bootstrap run after owner's yes; CDKToolkit CREATE_COMPLETE.
- 2026-11-23: Plan approved by user. Dates confirmed: Day 1 2026-11-24 … Day 7 2026-11-30. User chose to start Day 1 early at 2026-11-23 23:22 Bangkok.
- 2026-11-24: Block 1.1 in progress with the coach in the project thread. First commit + push of the bootcamp folder.
- 2026-11-24: Block 1.1 done (event loop, micro/macro tasks, promises, async/await, unhandled rejections).
- 2026-11-24: Block 1.2 done (V8 + libuv, OS vs thread pool, blocking demo).
- 2026-11-24: Build started. Coach wrote minimal app.ts (GET /products, GET /products/:id, POST /products) + server.ts (listen 3000) on user request; all 3 routes checked with curl.
- 2026-11-26: Task 2 done: zod schema (name min 4, price >= 0), safeParse → 400 with field issues, server-made id (randomUUID) → 201. Checked 5 cases with curl.
- 2026-11-26: Task 3 done: sendProblem helper (RFC 9457), 404 catch-all, 4-param error handler (keeps 4xx like bad JSON, else 500 + console.error, no stack to client), GET /boom. Checked 6 cases with curl.
- 2026-11-26: Task 3 redone after user split code into routes/ data/ schemas/: notFound + errorHandler middleware files, shared sendProblem (RFC 9457), /boom. Checked with curl; stack only in server log.
- 2026-11-26: products.routes 404 + zod 400 switched to sendProblem (issues kept as extension field). All errors now problem+json.
- 2026-11-26: Task 4 done: pino logger (LOG_LEVEL, default info), pino-http first middleware with genReqId (client x-request-id ≤128 chars or randomUUID, echoed in response), errorHandler uses req.log.error({ err }). Checked headers + JSON log lines.
- 2026-11-26: Task 4b done: pinoHttp redact for req.headers.authorization + req.headers.cookie → "[Redacted]". Checked: 0 secrets in log, all 3 line types redacted.
- 2026-11-26: Task 5 done: vitest + supertest, 9 tests (health, product 200/404, POST 201/400 issues, /nope 404, /boom 500 no stack, x-request-id echo + generated). npm test green, no log noise.
- 2026-11-26: server.ts done. Tested: in-flight POST finished with 201 after SIGTERM, new connection ECONNREFUSED, exit 0; PORT=abc → fatal + exit 1; port in use → fatal EADDRINUSE. 9 tests still green.
- 2026-11-26: User ran a mutation test (min(0) → min(-100)): all tests stayed green, so the price rule was unguarded. Added boundary tests (-1 → 400, 0 → 201); they catch min(-100) and .positive(). Schema restored to min(0). Lesson: green tests ≠ correct code.
- 2026-11-26: server.ts: PORT from env (validated, default 3000, exit 1 if bad), listen errors (EADDRINUSE) → fatal + exit 1, SIGTERM/SIGINT → server.close(), in-flight finish, 10s forced-exit timer. Verified: in-flight POST got 201 after SIGTERM, new connection refused, exit 0.
- 2026-11-26: Added GET /slow (5 s, async, non-blocking). Found keep-alive gap: exit 3 s after last response; fixed with closeIdleConnections() every 250 ms during shutdown → exit right after response (5.2 s).
- 2026-11-26: User saw 'Empty reply' on /slow + Ctrl+C under npm run dev. Cause: tsx watch force-kills the child on Ctrl+C ('Previous process hasn't exited yet. Force killing...'). Code is fine: npm start, node dist/server.js, tsx (no watch) all return 200 then exit 0. Test shutdown with build + start.
- 2026-11-26: /boom + /slow only when NODE_ENV !== production (tests/production.test.ts guards it; mutant 'prod' caught; built app with NODE_ENV=production → 404). server.ts: unhandledRejection + uncaughtException → logger.fatal({ err }) + exit(1), both verified (level 60, stack, exit 1). 13 tests pass.
- 2026-11-26: Repository refactor: ProductRepository interface (async), InMemoryProductRepository (copies in/out), createApp({ productRepo }), createProductsRouter(repo) with await, server.ts = composition root with Keyboard/Mouse seed, tests beforeEach fresh repo+app, repo unit tests, products.store.ts deleted. 18 tests pass; mutant 'findAll returns real array' caught.
- 2026-11-26: DynamoProductRepository (Scan with LastEvaluatedKey loop, Get ConsistentRead, Put with attribute_not_exists(id)). server.ts: STORAGE=dynamo → DynamoDB (AWS_REGION default ap-southeast-2, TABLE_NAME default catalog-products-dev), else in-memory. No keys in code; aws login creds worked. Verified READ-ONLY on real table (GET list 200 with Keyboard+Mouse, GET unknown 404). POST to real table not run yet (waiting for user's yes). 18 tests (in-memory) pass.
- 2026-11-27: .dockerignore + multi-stage Dockerfile (node:24.13.0-alpine, npm ci --omit=dev, NODE_ENV=production, USER node, exec-form CMD). Image: 200 MB uncompressed (base 161), 61 MB compressed. Verified: uid node, PID 1 = node, no devDeps/tests/.env, /boom+/slow 404, docker stop → SIGTERM graceful exit 0 in 0.2 s.
- 2026-11-27: Login wired: src/auth/auth.routes.ts (moved from routes/auth.route.ts), AppDeps.authService, /auth before /products, server.ts JWT_SECRET check (missing/<16 → fatal exit 1), tests pass authService. build OK, 18/18. Smoke: 200 token (sub u1, role admin, exp 900s), 401 same body for wrong pw/unknown email, 400 bad body, no password/token in logs. FOUND (not fixed, out of scope): timing leak (known email ~49 ms vs unknown ~0 ms → user enumeration); InMemoryUserRepository with public demo passwords is used in production too; npm run dev now needs JWT_SECRET (not in .env). Not committed.
- 2026-11-27: Refactor to feature layout: src/modules/{auth,products,health}, src/shared/{http,middleware,logger}. git mv for tracked files (auth was untracked → mv). loginSchema → auth.schema.ts; InMemoryUserRepository → inMemory.user.repository.ts. build OK, 18/18, no .ts imports, Docker build + run OK (health 200, login 200/401/400). Not committed.
- 2026-11-27: AuthService.verify (HS256 pinned, shape check), requireAuth middleware (Bearer, 401 + WWW-Authenticate, res.locals.user), POST /products protected, GET public. POST tests log in as admin; +3 tests (no token, forged token, auth before validation). 21/21, build OK. Mutant 'remove requireAuth' caught (3 fail). Mutant 'drop algorithms pin' survives (no HS512/alg test). Not committed.
- 2026-11-27: requireRole(...roles) (no res.locals.user → 401 fail-closed, wrong role → 403). POST /products = requireAuth + requireRole('admin'). +1 test (user token → 403). 22/22, build OK. Mutants caught: remove requireRole, allow 'user', wrong order (fail-closed → 5 fail). Not committed.
- 2026-11-27: Auth finish: tests/auth.test.ts (login 200/401/401 identical/400; garbage, expired, tampered token → 401; rate limit 429 + RateLimit headers), tests/cors.test.ts, tests/testApp.ts helper (makeApp). CORS (deps.corsOrigins, CORS_ORIGINS env, default localhost:4200), express-rate-limit on /auth/login (5/15 min default, draft-8 headers, 429 via sendProblem, deps.loginRateLimit), trust proxy 1. 34/34, build OK. Mutants caught: no limiter, origin *, verify→decode, unknown email token. FOUND: without ALB in front, spoofed X-Forwarded-For bypasses the login limit → task security group must allow only the ALB. Not committed.
- 2026-11-27: S3 presigned PUT image upload: FileStorage port + S3FileStorage adapter, POST /products/:id/image-upload-url (admin, zod enum, server-made key, 503 when UPLOAD_BUCKET unset). Found + fixed 2 SDK traps offline: empty-body CRC32 checksum in URL (requestChecksumCalculation WHEN_REQUIRED) and Content-Type not signed (signableHeaders). 48/48 tests, 10/10 mutants caught. No bucket created yet. Not committed.
