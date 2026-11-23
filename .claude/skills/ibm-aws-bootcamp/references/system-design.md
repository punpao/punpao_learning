# System design track

The interview includes an **open-question system design exam**. The user practices every day
and gets better at the same answer structure each time. Grade every attempt with the same
rubric, so progress is visible.

## The framework (teach on Day 1, use every day)

For a 45–60 minute open question:

| Step | ⏱ (of 60 min) | What to write |
|---|---|---|
| 1. Clarify requirements | 5–8 | Functional requirements (the 3–5 core features); non-functional (scale, latency, availability, consistency, security, cost, compliance); what is **out of scope**; written assumptions |
| 2. Estimate | 3–5 | Users, requests per second (average and peak), storage per year, bandwidth. Round numbers; show the math |
| 3. API | 5 | Main endpoints or events: method, path, request, response, idempotency, auth |
| 4. Data model | 5 | Entities, keys, access patterns, SQL vs NoSQL choice and why, partition key |
| 5. High-level design | 10–15 | A box-and-arrow diagram (ASCII is fine): clients, CDN, gateway, services, data stores, queues, caches. Walk through 1–2 main flows step by step |
| 6. Deep dives | 10–15 | The 2–3 hardest parts: scaling the hot path, consistency, failure handling, caching, security |
| 7. Trade-offs and wrap-up | 5 | What you chose, what you gave up, bottlenecks, what you'd do with more time; map to AWS services |

For an IBM consulting role, **also** show: client thinking (who are the users and stakeholders,
what is the business goal), a migration or rollout plan if relevant (phases, MVP first, the
Garage Method), cost awareness, and how you'd explain the design to a non-technical client.

## Numbers to know (approximate)

- Seconds per day ≈ 86,400 ≈ 10⁵. 1M requests/day ≈ 12 RPS on average; peak ≈ 2–10× average.
- Memory read ~100 ns; SSD random read ~100 µs; same-AZ network round trip ~0.5 ms;
  cross-region round trip ~50–150 ms.
- A single well-tuned app server handles hundreds to a few thousand simple RPS; a single
  Postgres primary handles thousands of simple queries/s; Redis ~100k ops/s.
- DynamoDB partition limits (per partition): about 3,000 read units and 1,000 write units per second.
- Lambda: max 15 min per invocation; default account concurrency limit often 1,000 (can be
  lower on new accounts). Check the current quotas.
Say these are rough and that a real design would measure.

## Building blocks checklist

Load balancer (L4/L7), API gateway, BFF, CDN, cache (Redis/ElastiCache, in-process), SQL DB,
NoSQL DB, object storage, queue, pub/sub, stream (Kinesis/Kafka), search (OpenSearch),
workflow (Step Functions), auth (Cognito/OIDC), observability (CloudWatch, X-Ray, OpenTelemetry),
rate limiter, circuit breaker, idempotency keys, outbox, saga, read replicas, sharding,
multi-AZ, multi-region, backups/DR.

## Rubric (100 points, use for every attempt)

| Area | Points | Full marks when… |
|---|---|---|
| Requirements and scope | 10 | Clear functional + non-functional requirements, smart assumptions, scope stated |
| Estimates | 8 | Reasonable numbers with math, and they are *used* to drive decisions |
| API design | 8 | Clean resources/events, idempotency, pagination, auth, errors |
| Data model and storage choice | 12 | Fits the access patterns; justified SQL/NoSQL; keys/partitioning |
| High-level architecture | 15 | All main components, clear flows, no missing piece on the main path |
| Scalability | 10 | Bottlenecks found; caching, partitioning, async, autoscaling used where they fit |
| Reliability and consistency | 10 | Failure modes, retries/timeouts/idempotency, multi-AZ, DR, consistency choices |
| Security | 7 | AuthN/AuthZ, least privilege, encryption, secrets, input validation |
| AWS mapping and cost | 10 | Right AWS services with reasons; cost aware; alternatives named |
| Trade-offs and communication | 10 | Says what was given up and why; clear structure; a client could follow it |

Bands: 85+ strong hire · 70–84 hire · 55–69 borderline · below 55 not yet.

## How to run a daily practice session

1. Teach the day's concept block (with a check, like any Learn block).
2. Give the problem with clear constraints and a time limit (30–40 min on Days 1–3,
   45 min on Days 4–6, 60–90 min on Day 7). The user writes their answer in
   `system-design/day-N-<problem>.md` (ASCII diagrams in code blocks).
   **Don't give hints during the timed attempt** unless they ask. Then note that a hint was used.
3. After they submit: score with the rubric (a table), then 3 strengths, the 3 most important
   gaps, and **one** thing to do differently next time. Then write a model design **below**
   their answer, under `## Coach's model design`. Add a "how to say it in an interview" summary
   (5 lines).
4. Ask 2 follow-up questions an interviewer would ask ("what if traffic is 10× tomorrow?",
   "the client's budget is cut in half: what changes?"). Grade the answers briefly.
5. Log the score and the main gap in `progress.md` → "System design scores". Tomorrow's
   warm-up includes the main gap.

## Problem bank (constraints only, never write solutions before an attempt)

| Day | Concept focus | Practice problem |
|---|---|---|
| 1 | Framework, estimates | **URL shortener**: 100M new URLs/month, read:write 100:1, custom aliases, links expire, analytics count per link |
| 2 | Data modeling, SQL vs NoSQL, sharding, consistency | **Data model for OmniShop orders**: 5M customers, 200k orders/day, peak 10× on sale days; access patterns: order by id, a customer's orders (newest first), orders by status for staff, product stock check |
| 3 | Caching, queues, rate limiting | **Notification system**: email + SMS + push for 20M users; order updates must arrive within 1 min; marketing campaigns up to 5M messages; user preferences and opt-out; retries and no duplicates |
| 4 | Scaling, load balancing, CDN | **Product catalog for a flash sale**: 1M users arrive in 5 minutes at 12:00; 50k products, 100 items on sale with limited stock; pages must load < 1 s; never oversell |
| 5 | Reliability, DR, migration | **Bank customer portal migration to AWS**: today a Java monolith on-prem + Oracle + IBM MQ + nightly batch jobs + LDAP login; 2M customers; RPO 5 min, RTO 1 h; regulators require data to stay in-country; migrate with no big-bang cutover. *Also write the `aws-mapping/legacy-to-aws.md` table for it.* |
| 6 | Security, omnichannel, BFF | **Omnichannel system of engagement for a retailer**: web, mobile app, in-store kiosk and call-center app; same cart across channels; loyalty points; 3 existing back-end systems (ERP, CRM, inventory) that can't change quickly |
| 7 (mock exam) | Everything | Pick one the user hasn't seen, e.g. **food delivery platform for a city** (customers, restaurants, riders; live order tracking; payments), **ride-hailing dispatch**, **ticket booking for concerts** (no double booking), or **real-time chat for customer support agents**. 60–90 min, full rubric, followed by 3 interviewer follow-up questions |

Extra problems if time allows: rate limiter as a service, file upload and image resizing
service, news feed, distributed job scheduler, payment processing with idempotency, search
autocomplete.

## `aws-mapping/legacy-to-aws.md` format (Day 5)

| Legacy component | What it does | AWS target | Migration strategy (7 Rs) | Pros | Cons / risks | Alternative |
|---|---|---|---|---|---|---|
| Java monolith on VMs | Web + business logic | ECS Fargate (step 1), split later | Replatform → refactor | … | … | EC2 (rehost), EKS |

Then: target architecture diagram, migration phases (strangler fig pattern), cut-over and
rollback plan, cost estimate (rough), risks, and questions to ask the client.
