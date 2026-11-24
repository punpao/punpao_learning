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

Each day: give the user the tasks and acceptance checks below. They write the code; you guide.

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

### Day 2: orders-service (hexagonal)
- Layers: `domain/` (Order entity, rules, no Express or AWS imports), `application/`
  (use cases: placeOrder, getOrder), `adapters/` (http, dynamodb repository, in-memory repository).
- Repository port with 2 adapters: in-memory (tests) and DynamoDB (DynamoDB Local).
- `POST /orders` with an `Idempotency-Key` header: the same key twice must not create 2 orders.
- OpenAPI spec in `services/orders/openapi.yaml`.
- `docs/adr/001-hexagonal-orders.md`.
- **Acceptance:** domain tests run without Docker; the idempotency test passes; the
  architecture diagram v1 is in the README.

### Day 3: gateway + events
- `gateway`: `/web/products`, `/web/orders` (full shape) and `/mobile/products` (small shape:
  this is the BFF idea).
- Calls to services use timeouts (`AbortSignal.timeout`) + `opossum` circuit breaker + a fallback
  (e.g. cached product list).
- orders publishes `order-placed` to SQS (LocalStack); the `notifications` handler consumes it,
  is idempotent (it ignores duplicates), and failed messages go to a DLQ after N tries.
- **Acceptance:** `docker compose up` runs everything; stop catalog → the breaker opens and the
  fallback is served → start catalog → it recovers (half-open → closed), shown in the logs.

### Day 4: containers + first AWS deploy
- Multi-stage Dockerfiles, non-root user, `.dockerignore`, `HEALTHCHECK`/health endpoints.
- CDK `BaseStack` (cheap to keep: ECR repos, DynamoDB table, SQS + DLQ) and `ComputeStack`
  (VPC with **public subnets only, no NAT gateway**, ECS cluster, Fargate services for gateway +
  catalog + orders, ALB).
- Deploy, call the ALB URL, read logs in CloudWatch, then **`cdk destroy ComputeStack`**.
- **Acceptance:** images are under ~200 MB; the ALB URL returns products; the compute stack is
  destroyed at the end of the day (checked in the console).

### Day 5: serverless + real AWS data
- `notifications` as a Lambda with an SQS event source (batch size, partial batch failure
  response), DLQ, CloudWatch alarm on DLQ depth 🟡.
- orders uses the real DynamoDB table (IAM role on the task, least privilege: only this table).
- `aws-mapping/legacy-to-aws.md`: the case study (see system-design.md, Day 5).
- **Acceptance:** placing an order on AWS produces a Lambda log line; a poison message ends
  up in the DLQ; the task role policy only allows the needed DynamoDB actions on one table.

### Day 6: web channel + CI/CD
- Angular app: product list, product detail, cart (signals), place order, order status;
  an HTTP interceptor adds the JWT; responsive layout with CSS grid/flexbox.
- Cognito user pool + hosted UI (authorization code + PKCE); gateway checks the JWT.
- `WebStack`: S3 (private) + CloudFront (Origin Access Control).
- GitHub Actions: lint + test on every push; deploy job uses an **OIDC role** (no AWS keys in
  GitHub secrets) and runs only on manual trigger (`workflow_dispatch`) to protect credits.
- **Acceptance:** log in on the CloudFront URL, place an order, see the notification log; the
  pipeline is green.

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
