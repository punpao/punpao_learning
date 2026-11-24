# IBM AWS Bootcamp: Progress

## Setup
- **Region:** ap-southeast-2 (Sydney)
- **AWS account:** 875706244209 (member of an AWS Organization; management account 097083345455)
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
- **Current day:** 1 (planned 2026-11-24; started early 2026-11-23 23:22 Bangkok)
- **Current block:** 1.1 JS runtime (in progress: covered event loop order, microtasks vs macrotasks, promises, async/await + try/catch)
- **Current step:** teaching (Day 0 leftover: about-me still empty)
- **Pace:** on track

## Days
| Day | Theme | Planned | Status | Quiz | Teach-back | SD score | Notes |
|---|---|---|---|---|---|---|---|
| 0 | Setup | 2026-11-23 | ✅ (about-me pending) | — | — | — | — |
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
| IAM user vs role vs group | Said "IAM user is a credential" and "a role is a set of roles assigned to each user" | Day 0 chat | 🟡 Corrected; revisit in Day 4.3 |

## System design scores
| Day | Problem | Score | Main gap |
|---|---|---|---|

## AWS resources
| Resource | Stack | Created | ~Cost/day | Status |
|---|---|---|---|---|
| Budget `bootcamp-monthly` | (console) | 2026-11-23 | free | ✅ active |
| CDKToolkit (S3 staging bucket, ECR repo, 5 IAM roles, SSM param) | CDKToolkit | 2026-11-23 | ~$0 (cents/month) | ✅ keep until Day 7 |

## Session log
- 2026-11-23: Day 0. Checked AWS identity, sign-in method and IAM (0 users, admin role via `aws login`). Found budget and free plan already set up. All tools installed. Created folder and progress file.
- 2026-11-23: CDK bootstrap run after owner's yes; CDKToolkit CREATE_COMPLETE.
- 2026-11-23: Plan approved by user. Dates confirmed: Day 1 2026-11-24 … Day 7 2026-11-30. User chose to start Day 1 early at 2026-11-23 23:22 Bangkok.
- 2026-11-24: Block 1.1 in progress with the coach in the project thread. First commit + push of the bootcamp folder.
