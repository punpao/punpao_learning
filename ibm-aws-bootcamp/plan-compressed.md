# Compressed plan: 3.5 days left (decided 2026-11-26, 10:30 PM Bangkok)

Reason: the user has 3.5 days left. Focus on the hands-on project and essentials only.
Rules: theory only *inside* the build (just enough to do the next step, explained before any question);
one short system design per day (45 min) because the exam has an open system design question;
review = 10-minute quiz at the start of the next day. Day 1 is closed (build 6/6, code review done;
URL shortener practice stopped after the code-generation deep dive).

## Day A (Fri 27 Nov): architecture in code + containers
- Warm-up quiz (10 min): event loop, middleware/next, 4xx vs 5xx.
- Fix the 2 🔴 items from reviews/day-1.md (30 min).
- Essentials inside the build: SOLID + dependency injection, repository/adapter pattern, layered vs hexagonal, monolith vs microservices (when not to), API design (pagination, idempotency key).
- Build: catalog repository + DynamoDB Local; `orders-service` (POST /orders with idempotency key); Dockerfile (multi-stage, non-root) + docker compose.
- System design (45 min): SQL vs NoSQL, data model for orders.

## Day B (Sat 28 Nov): run it on AWS
- Essentials: regions/AZs, IAM roles + least privilege, VPC basics (and the NAT gateway cost trap), ECR, ECS + Fargate, ALB, CloudWatch Logs, 12-factor, CDK.
- Build: CDK stacks; deploy catalog + orders to ECS Fargate behind an ALB with real DynamoDB; find your own pino logs in CloudWatch by request id; destroy the compute stack at night.
- Microservices resilience (inside the build): timeouts, retries + backoff, circuit breaker; Netflix OSS / Spring Cloud as a 15-minute cheat sheet (Eureka, Gateway, Resilience4j → AWS/Node equivalents).
- System design (45 min): scaling + caching (flash sale).

## Day C (Sun 29 Nov): serverless, messaging, mapping, a little Angular
- Build: `order-placed` → SQS → Lambda (with DLQ); Lambda vs containers trade-offs.
- AWS mapping: the 7 Rs + mapping table; case: bank customer portal migration (= system design practice).
- Angular essentials (2 h): one page listing products from the API (components, services, HttpClient, signals); CSS cheat sheet (box model, flexbox, grid).
- Auth in 30 min: session vs token, JWT, Cognito (concepts only).

## Day D (Mon 30 Nov, half day): interview ready
- IBM Garage Method (45 min).
- STAR stories (incl. the skill-validation story) + 3-minute project demo script.
- Mock system design exam (1 h, timed) + short mock interview.
- Full AWS teardown.

## Cut (explain only if asked)
Cognito login in the app, full CI/CD pipeline, S3 + CloudFront deploy, full Angular app, gateway/BFF service, GraphQL/gRPC depth, Step Functions, Kinesis, EKS, long daily reviews.
