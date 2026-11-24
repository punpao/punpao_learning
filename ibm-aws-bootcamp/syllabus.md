# IBM AWS Bootcamp: 7-Day Syllabus

**Role:** Associate Application Consultant – AWS Cloud (IBM Consulting)
**Pace:** 10–12 hours per day · **Stack:** Node.js + TypeScript, Express, Angular, AWS (CDK)
**Legend:** 🔴 must-have · 🟡 nice-to-have (cut first if behind) · ⏱ rough time

Every day = Learn blocks → Build block → System design block → Review block (with a teach-back).
**Understanding first:** times are guides. A block is finished when you understand it, not
when the clock says so. Unfinished 🔴 blocks move to the next day, 🟡 items are cut first, and
if the plan slips by more than half a day you choose: add a day, cut more, or keep the pace.
One project grows every day (see `project.md`). One system design practice every day
(see `system-design.md`).

## How this maps to the job description

| JD requirement | Where |
|---|---|
| Software architecture fundamentals, design patterns and principles | Day 2 (+ every system design block) |
| IBM Garage Method | Day 7 |
| API and microservices architecture; Node.js; Spring Boot / Spring Cloud / Netflix OSS | Days 1–3 (Netflix OSS as ideas mapped to Node.js and AWS) |
| Cloud-native principles, containers, serverless | Days 4–5 |
| Map existing components to AWS services; pros and cons of AWS services | Day 5 (+ the aws-mapping case study) |
| Angular(.js), JavaScript, CSS | Day 1 (JS), Day 6 (Angular, CSS) |
| Client communication and leadership | Day 7 (consulting skills, mock interview); explaining designs every day |
| System design exam (open questions) | Every day + Day 7 mock exam |

---

## Day 1: JavaScript, Node.js and HTTP, done properly

**Goal:** understand *why* Express code works, not just that it works. Set up AWS safely.

| Block | ⏱ | Topics |
|---|---|---|
| 1.1 JS runtime 🔴 | 2 h | Call stack, event loop, microtasks vs macrotasks (`Promise.then` vs `setTimeout`), promises and `async/await`, error handling with `async` (unhandled rejections), closures and `this` (only what's needed), ESM vs CommonJS |
| 1.2 Node.js 🔴 | 1.5 h | Node = V8 + libuv; non-blocking I/O; the thread pool (fs, crypto, dns); why CPU-heavy work blocks every request (demo); streams and backpressure (basic idea); `process` signals |
| 1.3 HTTP + Express 🔴 | 2 h | HTTP request/response, methods (safe vs idempotent), status codes, headers (`Content-Type`, `Cache-Control`, `Authorization`), keep-alive; Express = a chain of middleware: `req`, `res`, `next()`, the order of middleware, error middleware (4 args), `Router`; REST resource design |
| 1.4 TypeScript basics 🟡 | 0.5 h | Types, interfaces, unions, generics (basic), `tsconfig`, `zod` for runtime validation |
| Build | 3 h | `catalog-service`: Express + TS, validation, central error handler, structured logs, tests. AWS safe setup (Day 0 leftovers) |
| System design | 1.5 h | The system design framework; back-of-the-envelope numbers; latency numbers. Practice: **URL shortener** (warm-up) |
| Review | 0.75 h | Daily quiz, code review, weak spots |

## Day 2: Software architecture and API design

**Goal:** structure code so it's easy to change and test, and design APIs that clients love.

| Block | ⏱ | Topics |
|---|---|---|
| 2.1 Principles 🔴 | 1.5 h | Coupling and cohesion, SOLID (with Node/TS examples), composition over inheritance, dependency injection (manual DI in Node) |
| 2.2 Design patterns 🔴 | 1.5 h | Only those that show up in cloud apps: adapter, facade, strategy, repository, factory, observer / pub-sub, decorator (middleware is one), singleton (and why it's risky) |
| 2.3 Architecture styles 🔴 | 1.5 h | Layered vs hexagonal (ports and adapters); monolith vs modular monolith vs microservices (when *not* to use microservices); bounded contexts and aggregates (DDD-lite); "systems of engagement" vs "systems of record"; omnichannel |
| 2.4 API design 🔴 | 1 h | OpenAPI, versioning, pagination (offset vs cursor), filtering, error format (RFC 9457 problem details), idempotency keys; REST vs GraphQL vs gRPC (when each wins) |
| Build | 3 h | `orders-service` with hexagonal layers, OpenAPI spec, DynamoDB Local; architecture diagram v1 |
| System design | 1.5 h | Data: SQL vs NoSQL, indexes, replication, partitioning/sharding, consistency (strong vs eventual), CAP/PACELC basics. Practice: **data model for the ordering system** |
| Review | 0.75 h | Daily quiz, code review, weak spots |

## Day 3: Microservices patterns and Netflix OSS ideas

**Goal:** make services work together and survive failures.

| Block | ⏱ | Topics |
|---|---|---|
| 3.1 Communication 🔴 | 1.5 h | Sync (HTTP) vs async (messages); commands vs events; API gateway; BFF (backend for frontend) per channel; service discovery (client-side vs server-side) |
| 3.2 Resilience 🔴 | 1.5 h | Timeouts, retries with exponential backoff + jitter, circuit breaker (closed/open/half-open), bulkhead, fallbacks, cascading failure |
| 3.3 Data across services 🔴 | 1.5 h | Database per service, saga (choreography vs orchestration), transactional outbox, idempotent consumers, at-least-once delivery, dead-letter queues |
| 3.4 Netflix OSS and Spring Cloud as ideas 🔴 | 0.75 h | Eureka (discovery), Zuul → Spring Cloud Gateway (gateway), Hystrix → Resilience4j (circuit breaker), Ribbon → Spring Cloud LoadBalancer, Config Server; what is in maintenance mode now; the Node.js and AWS equivalents (Cloud Map, API Gateway / ALB, `opossum`, SSM Parameter Store); read a 30-line Spring Boot + Eureka example so it looks familiar |
| Build | 3 h | `gateway` (BFF) in Express, timeouts + `opossum` circuit breaker, `order-placed` event → `notifications-service` through SQS (LocalStack); chaos test: stop catalog and watch the breaker open |
| System design | 1.5 h | Caching (cache-aside, write-through, TTL, invalidation, stampede), rate limiting (token bucket), queues (ordering, DLQ). Practice: **notification system** |
| Review | 0.75 h | Daily quiz, code review, weak spots |

## Day 4: Containers and cloud-native on AWS

**Goal:** package services the right way and run them on AWS.

| Block | ⏱ | Topics |
|---|---|---|
| 4.1 Containers 🔴 | 1.5 h | Containers vs VMs (namespaces, cgroups: the idea), images and layers, Dockerfile best practices (multi-stage, non-root, `.dockerignore`, small base image), Compose networking |
| 4.2 Cloud-native 🔴 | 1 h | 12-factor app, health vs readiness checks, graceful shutdown (`SIGTERM`), config and secrets (SSM Parameter Store vs Secrets Manager), structured logs |
| 4.3 AWS foundations 🔴 | 2 h | Regions and AZs, IAM (users, roles, policies, least privilege), VPC (public/private subnets, route tables, security groups, the NAT gateway cost trap), ECR, ECS (cluster, task definition, service), Fargate, ALB, CloudWatch Logs; ECS vs EKS (when Kubernetes is worth it); infrastructure as code with CDK |
| Build | 3.5 h | Dockerize all services, `docker compose up` the whole system; CDK: base stack + compute stack; deploy gateway + catalog to ECS Fargate behind an ALB; read the logs; **destroy the compute stack** |
| System design | 1.5 h | Scaling: vertical vs horizontal, stateless services, L4 vs L7 load balancers, autoscaling, sessions, CDN. Practice: **product catalog for a flash sale** |
| Review | 0.75 h | Daily quiz, code review, weak spots, teardown |

## Day 5: Serverless and mapping systems to AWS

**Goal:** know when to use which AWS service, and explain the trade-offs to a client.

| Block | ⏱ | Topics |
|---|---|---|
| 5.1 Serverless 🔴 | 1.5 h | Lambda (execution model, cold starts, concurrency, timeouts, pricing), API Gateway (REST vs HTTP API), event sources (SQS, S3, EventBridge); containers vs serverless trade-offs |
| 5.2 Data and messaging services 🔴 | 1.5 h | DynamoDB (partition key design, GSIs, on-demand vs provisioned, single-table idea), RDS/Aurora, S3 (storage classes, presigned URLs), SQS vs SNS vs EventBridge vs Kinesis, Step Functions 🟡 |
| 5.3 Mapping to AWS 🔴 | 1.5 h | The 7 Rs of migration (rehost, replatform, refactor, …); a mapping table: on-prem component → AWS service → pros/cons; AWS Well-Architected (6 pillars); cost basics; Cognito for identity |
| Build | 3 h | `notifications-service` → Lambda triggered by SQS (with DLQ); orders → real DynamoDB; deploy with CDK. Case study in `aws-mapping/`: map a legacy system to AWS |
| System design | 1.5 h | Reliability: multi-AZ vs multi-region, backups, DR strategies (backup/restore, pilot light, warm standby, active-active), RTO/RPO; observability (logs, metrics, traces, alarms). Practice: **bank customer portal migration to AWS** |
| Review | 0.75 h | Daily quiz, code review, weak spots, teardown |

## Day 6: Angular, CSS and delivery (the web channel)

**Goal:** build the web channel properly and ship it automatically.

| Block | ⏱ | Topics |
|---|---|---|
| 6.1 Angular 🔴 | 2 h | Components, templates, standalone components, signals, services and DI, routing, `HttpClient`, interceptors, forms (reactive, basic); RxJS essentials (`Observable`, `pipe`, `map`, `switchMap`, unsubscribing); AngularJS (1.x, end of life) vs modern Angular; Angular vs React (relate to what you know) |
| 6.2 CSS 🔴 | 1 h | Box model, specificity, flexbox, grid, responsive design (media queries, mobile first), CSS variables |
| 6.3 Auth and security 🔴 | 1.5 h | OAuth 2.0 and OIDC (authorization code + PKCE), JWT (what's inside, how it's checked), Cognito user pools, tokens in a SPA, CORS; API Gateway / ALB auth; least privilege; WAF basics 🟡 |
| 6.4 Delivery 🔴 | 1 h | S3 + CloudFront for a SPA, cache headers; CI/CD with GitHub Actions (lint → test → build → deploy), OIDC role for AWS (no static keys) |
| Build | 3 h | Angular app (catalog list, cart, place order, order status) → gateway; Cognito login; deploy to S3 + CloudFront with CDK; GitHub Actions pipeline |
| System design | 1.5 h | Security and API design at scale; omnichannel (web + mobile + kiosk) with BFFs. Practice: **omnichannel system of engagement for a retailer** |
| Review | 0.75 h | Daily quiz, code review, weak spots, teardown |

## Day 7: IBM Garage Method, consulting and final assessment

**Goal:** show it all under exam and interview conditions.

| Block | ⏱ | Topics |
|---|---|---|
| 7.1 IBM Garage Method 🔴 | 1.5 h | Co-create / co-execute / co-operate; Enterprise Design Thinking (Hills, Playbacks, Sponsor Users); MVP; squads; DevOps and SRE practices in the method; how it shows up on a client project |
| 7.2 Consulting skills 🔴 | 1 h | Discovery questions, explaining trade-offs to non-technical people, handling changing requirements; 4–5 STAR stories from your own projects |
| Final exam | 2 h | Written: concept, scenario/debugging, AWS mapping, design trade-offs |
| System design mock exam | 1.5 h | One open question, timed, graded with the rubric |
| Mock interview | 1.5 h | Technical + behavioral + client case, with feedback |
| Wrap-up | 2 h | Project README + architecture diagram + 3-minute demo script; full AWS teardown; `key-learnings.md` |
