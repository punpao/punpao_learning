# Day 7: Final assessment

Order of the day: Garage Method → consulting skills and STAR stories → final exam → system
design mock exam → mock interview → wrap-up. If time is short, keep the system design mock exam
and the mock interview. Those are the closest to the real interview.

## 1. IBM Garage Method (teach as a Learn block, with a check)

IBM may have renamed or updated the method since your training data. Tell the user to read
IBM's current official page for the latest names (and do it yourself if you have web access).
Teach the stable core ideas:

- **What it is:** IBM's way of running client projects. It combines Enterprise Design Thinking,
  Lean startup (build an MVP, learn, repeat), Agile, DevOps and SRE, with co-located or virtual
  **squads** made of IBM and client people working together.
- **Three phases:** **Co-create** (understand the business problem with the client; design
  thinking workshops; define the MVP), **Co-execute** (build the MVP in short iterations with
  the client, test with real users), **Co-operate** (scale it to production, run and improve
  it with DevOps/SRE practices).
- **Enterprise Design Thinking:** the Loop (Observe → Reflect → Make); the Keys: **Hills**
  (user-focused goals: who + what + wow), **Playbacks** (regular demos to stay aligned),
  **Sponsor Users** (real users who join the team).
- **Practices you can talk about:** MVP definition, user stories, pair programming, TDD, CI/CD,
  infrastructure as code, monitoring, blameless post-mortems, hypothesis-driven development.
- **Interview angle:** connect it to the project. "I built OmniShop as an MVP: one channel
  first, then the mobile BFF, the same as co-execute in small iterations."

## 2. Consulting skills and STAR stories

- **Discovery questions** for a new client system: users and channels, business goal, current
  pain, traffic and growth, data sensitivity and compliance, existing systems that can't change,
  budget and timeline, team skills, success metrics.
- **Explaining trade-offs to non-technical people:** start with the business effect (cost, risk,
  speed), then the option you recommend, then 1 line on the alternative.
- **STAR stories:** help the user write 4–5 in `interview/star-stories.md` from their real
  projects (`interview/about-me.md`): a technical challenge, a team conflict or disagreement,
  learning something fast, a mistake and what they learned, leading or helping others. Each one:
  Situation (1–2 lines), Task, Action (most detail, with "I", not "we"), Result (a number if possible).
  Give direct feedback on each.
- Prepare answers to: "Why IBM Consulting?", "Why this role?", "Tell me about yourself"
  (60–90 seconds), "How do you handle a client who changes requirements?".

## 3. Final written exam (`exam/exam.md`)

100 points, 120 minutes, closed book. About 14–18 questions:

| Section | Share | Examples of what to ask |
|---|---|---|
| A. Concepts | ~20% | Event loop output order; middleware order bugs; when *not* to use microservices; SOLID violation in a snippet; containers vs VMs; Lambda vs Fargate |
| B. Scenario / debugging | ~30% | "API latency jumps to 30 s when the catalog is slow": cascading failure, missing timeout, breaker; Lambda throttling; DynamoDB hot partition; ECS task keeps restarting (failed health check); CORS error in Angular; duplicate orders after retries |
| C. AWS mapping | ~25% | Map 5–6 legacy components to AWS with pros/cons; pick between SQS/SNS/EventBridge/Kinesis for 3 cases; estimate a rough monthly cost driver |
| D. Design / trade-offs | ~25% | Short design questions: BFF vs one API for all channels; sync vs async order placement; RDS vs DynamoDB for orders; how the Garage Method shapes the first 6 weeks of a project |

Rules: show the points per question; no answer key in the repo before grading. Also write an
`exam/my-answers.md` skeleton with only the question headings. When the user says "grade my exam":
build the rubric then, grade with partial credit, and write `exam/results.md` (score, per-question
feedback, model answers, and what to review with links to `notes/day-N-*.md`). Update
`progress.md` and the README row.

## 4. System design mock exam

Run it exactly like an exam: one open question from the Day 7 row of the problem bank that
the user hasn't seen, 60–90 minutes, no hints. They write in
`system-design/mock-exam.md`. Grade with the full rubric (system-design.md), then ask 3
interviewer follow-ups. Compare the score with the daily scores (show the trend).

## 5. Mock interview (role-play)

You play an IBM Consulting interviewer. Ask **one question at a time** and wait for each answer.
Don't give feedback until the end of each round.

1. **Intro + behavioral (15 min):** tell me about yourself; 2 STAR questions; why IBM.
2. **Technical (25 min):** 5–6 questions across Node.js/Express, architecture and patterns,
   microservices and resilience, containers/serverless, AWS services, Angular/CSS; at least
   one "explain your OmniShop project" question with follow-ups on their decisions.
3. **Client case (20 min):** "A retailer wants to move its on-prem order system to AWS and add a
   mobile app in 3 months. Walk me through how you'd approach it." Look for discovery questions,
   MVP thinking (Garage Method), architecture, risks and communication.

After each round: a score out of 10, what was strong, what to fix, and a better version of 1
weak answer. Save everything to `interview/mock-interview.md`.

## 6. Wrap-up

1. Project README + architecture diagram + `interview/demo.md` (a 3-minute demo script).
2. Full AWS teardown (aws-cost-safety.md). Record the credits used.
3. `key-learnings.md` (template in templates.md).
4. `progress.md` → done; root `README.md` row → ✅ Done with the exam score and the system
   design mock score.
5. Offer the final commit.
