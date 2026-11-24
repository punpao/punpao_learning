# Templates

Dates are ISO (`YYYY-MM-DD`). Get today's date with `date +%F`.

## Root `README.md` row

Add or update one row in the topics table (create the README if it is missing; remove any
"No topics yet" placeholder row):

```markdown
| [IBM AWS Bootcamp](ibm-aws-bootcamp/) | 📖 Learning | Day 3/7 | Exam —, SD mock — | 2026-11-24 | — |
```
When it's finished: `✅ Done | Day 7/7 | Exam 81/100, SD mock 76/100 | <start> | <end>`.

## `ibm-aws-bootcamp/progress.md`

```markdown
# IBM AWS Bootcamp: Progress

## Setup
- **Region:** <e.g. ap-southeast-2>
- **AWS credits:** start $<…> · now $<…> (checked <date>)
- **Free plan days left:** <…>
- **Interview date:** <… or unknown>
- **Hours per day:** 10–12

## Status
- **Current day:** <N> (planned date <YYYY-MM-DD>)
- **Current block:** <e.g. 3.2 Resilience>
- **Current step:** <teaching | awaiting-prediction | awaiting-check-answers | menu | build | sd-attempt | sd-review | review | done>
- **Schedule:** <on track | behind by ~N h: cutting X>

## Days
| Day | Theme | Planned | Status | Quiz | SD score | Notes |
|---|---|---|---|---|---|---|
| 1 | JS, Node.js, HTTP | 2026-11-24 | ✅ | 8/10 | 58 | [notes](notes/day-1-node-http.md) |

## Pending check questions
1. <question>  <!-- empty when nothing is waiting -->

## Weak spots
| Concept | Evidence | Source | Status |
|---|---|---|---|
| <microtasks vs macrotasks order> | <predicted setTimeout first> | Day 1 check | 🔴 Open / 🟢 Resolved (Day 2 warm-up) |

## System design scores
| Day | Problem | Score | Main gap |
|---|---|---|---|

## AWS resources
| Resource | Stack | Created | ~Cost/day | Status |
|---|---|---|---|---|
| ALB omnishop-alb | ComputeStack | 2026-11-27 | ~$0.6 | 🗑️ destroyed 2026-11-27 |

## Session log
- <YYYY-MM-DD>: <what was done>
```

## `notes/day-N-<slug>.md`

````markdown
# Day N: <Theme>

> **Date:** <YYYY-MM-DD> · **Goal:** <from syllabus>

## TL;DR
- <5–8 bullets to revise from in 2 minutes>

## Block N.1: <title>
### Intuition
### How it works
```text
<ASCII diagram>
```
### Example / try it
```bash
<commands or code + expected output>
```
### Why it matters for this role
### Traps
- ❌ … → ✅ …
### Check
**Q:** … · **My answer:** … · **Feedback:** …

<!-- Follow-ups, "Another angle", "Deeper dive" and quiz results are appended under the block they belong to -->

## Build log
- What was built, problems hit, how they were fixed (link `project/reviews/day-N.md`)

## System design
- Concept summary + link to `system-design/day-N-<problem>.md` + score

## Daily quiz: <score>/10
- Missed: …
````

## `key-learnings.md` (Day 7)

````markdown
# IBM AWS Bootcamp: Key Learnings

**Finished:** <date> · **Exam:** <x>/100 · **SD mock:** <x>/100 · **AWS credits used:** ~$<x>

## One-page cheat sheet
<Node.js event loop order; Express middleware rules; SOLID + patterns, one line each;
microservice patterns table (problem → pattern → AWS/Node tool); Netflix OSS → modern/AWS
equivalents; AWS service picker (compute / data / messaging / edge / identity) with when to
use each; system design framework + numbers; Garage Method in 5 lines>

## Mental model
```text
<one diagram: channels → edge → gateway/BFF → services → data/events → ops>
```
<a short paragraph on how it all fits together>

## Top 15 interview questions with short answers

## My OmniShop story (60 seconds)

## My weak spots → what to re-read
| Concept | Where it showed up | Re-read |

## Next steps
<what to study next (e.g. AWS Certified Developer / Solutions Architect Associate),
resources with specific chapters>
````
