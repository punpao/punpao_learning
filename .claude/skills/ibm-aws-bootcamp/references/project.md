# Project: "OmniShop", an omnichannel ordering system

One project, built one layer per day. At the end of every day it must **run locally**
(`docker compose up` or `npm run dev`). By Day 7 it runs on AWS and makes a 3-minute demo
for the interview.

**Omnichannel** means customers use many channels (web, mobile app, kiosk, call center), and
all of them must see the same data and behave the same way. A **system of engagement** is the
customer-facing part (apps, APIs); a **system of record** is the core data system behind it
(orders, inventory).

## Target architecture (end of Day 6)

```text
  Web (Angular) ──► CloudFront ──► S3 (static files)
        │
        │ HTTPS + JWT (Cognito)
        ▼
  ┌──────────────┐     ┌──────────────────┐
  │ ALB          │────►│ gateway / BFF    │  ECS Fargate
  └──────────────┘     │ (Express)        │
                       └──┬───────────┬───┘
               HTTP (timeout,│           │HTTP
             circuit breaker)│           │
                 ┌───────────▼──┐   ┌────▼───────────┐
                 │ catalog-svc  │   │ orders-svc     │  ECS Fargate
                 │ (Express)    │   │ (Express)      │
                 └──────────────┘   └───┬────────┬───┘
                   in-memory/JSON       │        │ "order-placed" event
                   seed data 🟡 RDS      ▼        ▼
                                    DynamoDB    SQS ──► Lambda: notifications
                                                 │        (logs / SES 🟡)
                                                 └─► DLQ
  Mobile channel: a second BFF route (/mobile/...) with a smaller response shape
  CI/CD: GitHub Actions ─(OIDC role)─► CDK deploy
```

## Folder layout

```text
ibm-aws-bootcamp/project/
├── README.md                  # how to run, architecture diagram, decisions (ADRs)
├── docker-compose.yml         # local: all services + DynamoDB Local + LocalStack (SQS)
├── services/
│   ├── catalog/               # Express + TS
│   ├── orders/                # Express + TS, hexagonal layers
│   ├── gateway/               # Express BFF: /web/*, /mobile/*
│   └── notifications/         # Lambda handler (+ local runner)
├── web/                       # Angular app
├── infra/                     # AWS CDK (TypeScript): BaseStack, ComputeStack, WebStack
├── docs/adr/                  # architecture decision records, 1 page each
└── reviews/day-N.md           # senior code reviews written by the coach
```
Workflow file: repo-root `.github/workflows/omnishop.yml` with `paths: ['ibm-aws-bootcamp/project/**']`.

## Tools

Node.js LTS, TypeScript, Express, `zod` (validation), `pino` (logs), Vitest + `supertest`
(tests), `opossum` (circuit breaker), AWS SDK for JavaScript v3, DynamoDB Local, LocalStack
(SQS locally), Docker + Compose, AWS CDK v2, Angular CLI (current stable), GitHub Actions.
Use current stable versions and check them on Day 0. Don't pin to versions from memory.

## Day-by-day build

Each day: give the user the tasks and acceptance checks below, and follow the Build block
steps in SKILL.md: explain before building → write the code → break it → explain the code back → review.
The **Break it** experiments are required, not optional: they are where the understanding comes from.

### Day 1: catalog-service
- Express + TS project with `src/app.ts` (app) and `src/server.ts` (listen), so tests can
  import the app without opening a port.
- `GET /products`, `GET /products/:id`, `POST /products` (validated with zod).
- Central error middleware → RFC 9457 style JSON errors; 404 handler; async errors handled.
- `pino` request logs with a request ID (`x-request-id`).
- `/health` endpoint. Graceful shutdown on `SIGTERM`.
- **Acceptance:** `npm test` passes (happy path, validation error → 400, unknown id → 404,
  thrown async error → 500 without crashing); a CPU-blocking demo route shows another request
  waiting (then remove it).

- **Break it** (predict → run → explain):
  - Remove the `next()` call from a logging middleware. Why does the request hang forever?
  - Move the error middleware *above* the routes. Why are errors no longer caught?
  - Throw inside an `async` route handler. Check which Express major version you use:
    Express 5 sends rejected promises to the error middleware, Express 4 doesn't. Explain why.
  - Hit the CPU-blocking route and `/health` at the same time. Why does `/health` wait?

### Day 2: orders-service (hexagonal)
- Layers: `domain/` (Order entity, rules, no Express or AWS imports), `application/`
  (use cases: placeOrder, getOrder), `adapters/` (http, dynamodb repository, in-memory repository).
- Repository port with 2 adapters: in-memory (tests) and DynamoDB (DynamoDB Local).
- `POST /orders` with an `Idempotency-Key` header: the same key twice must not create 2 orders.
- OpenAPI spec in `services/orders/openapi.yaml`.
- `docs/adr/001-hexagonal-orders.md`.
- **Acceptance:** domain tests run without Docker; the idempotency test passes; the
  architecture diagram v1 is in the README.

- **Break it**:
  - Import Express (or the AWS SDK) inside `domain/`. What does this do to your tests and to
    how easily you could change the database later?
  - Send the same `POST /orders` twice, with and without the `Idempotency-Key`. Explain the difference.
  - Swap the DynamoDB adapter for the in-memory one. How many files change? (It should be only
    the wiring. If it's more, why?)

### Day 3: gateway + events
- `gateway`: `/web/products`, `/web/orders` (full shape) and `/mobile/products` (small shape:
  this is the BFF idea).
- Calls to services use timeouts (`AbortSignal.timeout`) + `opossum` circuit breaker + a fallback
  (e.g. cached product list).
- orders publishes `order-placed` to SQS (LocalStack); the `notifications` handler consumes it,
  is idempotent (it ignores duplicates), and failed messages go to a DLQ after N tries.
- **Acceptance:** `docker compose up` runs everything; stop catalog → the breaker opens and the
  fallback is served → start catalog → it recovers (half-open → closed), shown in the logs.

- **Break it**:
  - Remove the timeout and make catalog sleep 30 s. What happens to the gateway's open
    connections and to users of *other* endpoints? (cascading failure)
  - Retry 5 times with no backoff against a failing service. What does that do to the service?
  - Make the notifications handler throw. Watch the redelivery, then the DLQ. Process the same
    message twice with the idempotency check turned off. What does the customer see?

### Day 4: containers + first AWS deploy
- Multi-stage Dockerfiles, non-root user, `.dockerignore`, `HEALTHCHECK`/health endpoints.
- CDK `BaseStack` (cheap to keep: ECR repos, DynamoDB table, SQS + DLQ) and `ComputeStack`
  (VPC with **public subnets only, no NAT gateway**, ECS cluster, Fargate services for gateway +
  catalog + orders, ALB).
- Deploy, call the ALB URL, read logs in CloudWatch, then **`cdk destroy ComputeStack`**.
- **Acceptance:** images are under ~200 MB; the ALB URL returns products; the compute stack is
  destroyed at the end of the day (checked in the console).

- **Break it**:
  - Put `COPY . .` before `npm ci`, change one source file and rebuild. Why is the build slow
    now? (layer cache)
  - Run `docker stop` with and without the `SIGTERM` handler while a slow request is running.
    What happens to the request?
  - (On AWS) point the ALB health check at a wrong path. Why does ECS keep replacing healthy tasks?

### Day 5: serverless + real AWS data
- `notifications` as a Lambda with an SQS event source (batch size, partial batch failure
  response), DLQ, CloudWatch alarm on DLQ depth 🟡.
- orders uses the real DynamoDB table (IAM role on the task, least privilege: only this table).
- `aws-mapping/legacy-to-aws.md`: the case study (see system-design.md, Day 5).
- **Acceptance:** placing an order on AWS produces a Lambda log line; a poison message ends
  up in the DLQ; the task role policy only allows the needed DynamoDB actions on one table.

- **Break it**:
  - Set the Lambda timeout lower than the work it does. Why do you now get duplicates?
  - Turn off the partial batch failure response and make 1 message out of 10 fail. What
    happens to the other 9?
  - Remove one DynamoDB action from the task role. Read the `AccessDenied` error. Which role,
    which action, which resource?
  - Thought experiment: use `status` as the partition key. Why is that a hot partition at scale?

### Day 6: web channel + CI/CD
- Angular app: product list, product detail, cart (signals), place order, order status;
  an HTTP interceptor adds the JWT; responsive layout with CSS grid/flexbox.
- Cognito user pool + hosted UI (authorization code + PKCE); gateway checks the JWT.
- `WebStack`: S3 (private) + CloudFront (Origin Access Control).
- GitHub Actions: lint + test on every push; deploy job uses an **OIDC role** (no AWS keys in
  GitHub secrets) and runs only on manual trigger (`workflow_dispatch`) to protect credits.
- **Acceptance:** log in on the CloudFront URL, place an order, see the notification log; the
  pipeline is green.

- **Break it**:
  - Remove the CORS config. Why does the browser fail while `curl` works?
  - Remove the HTTP interceptor and get a 401. Decode your JWT payload locally
    (`cut -d. -f2 <<< "$TOKEN" | base64 -d`; never paste real tokens into websites). What is inside?
  - In a search box, use `mergeMap` instead of `switchMap` and type fast. Why do the results
    show up in the wrong order?
  - Give `index.html` a long `Cache-Control` max-age and deploy a change. Why do users still see
    the old app?

### Day 7: polish
- README: problem, architecture diagram, how to run, decisions (link the ADRs), what you would
  do next (multi-region, caching, observability). 3-minute demo script in `interview/demo.md`.
- Full teardown (aws-cost-safety.md).

## Code review format (`reviews/day-N.md`)

1. Acceptance checks: pass/fail.
2. 🔴 Bugs / correctness (unhandled promise rejections, missing timeouts, non-idempotent
   handlers, leaking secrets, wrong status codes, race conditions).
3. 🟡 Design (layering, coupling, testability, config, error handling strategy).
4. 🟢 Style.
5. ✅ What's good, said specifically.
6. "Interview angle": how to talk about this code in the interview.
Each finding: `file:line`, what's wrong, why it matters on a real client project, and how to
fix it (describe the fix; don't rewrite their code unless they ask).
