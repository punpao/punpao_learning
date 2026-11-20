# How a Computer Works: Progress

## Profile
- **Level:** Between None and Some
- **Goal:** SWE interviews, Data engineering work
- **Depth:** Essentials only
- **Lab language:** set in Phase 3
- **Commit preference:** per-part (commit + push after each part)

## Status
- **Phase:** 2-teaching
- **Current part:** 01: Bits, bytes, hex and integers
- **Current step:** menu
- **Last updated:** 2026-11-20

## Parts
| # | Part | Status | Check | Quiz | Notes |
|---|---|---|---|---|---|
| 01 | Bits, bytes, hex and integers | ✅ Done | 1.5/2 | 1/4 | [notes](notes/01-bits-bytes-integers.md) |
| 02 | Floating point and text encoding | ⬜ Not started | — | — | — |
| 03 | The CPU: instructions, registers and the fetch–decode–execute loop | ⬜ Not started | — | — | — |
| 04 | The memory hierarchy and caching | ⬜ Not started | — | — | — |
| 05 | How code runs: compilers, interpreters and VMs | ⬜ Not started | — | — | — |
| 06 | Stack vs heap | ⬜ Not started | — | — | — |
| 07 | Linux command line 1: files, permissions and environment | ⬜ Not started | — | — | — |
| 08 | Linux command line 2: processes, pipes and remote machines | ⬜ Not started | — | — | — |

## Pending check questions

## Weak spots
| Concept | Evidence | Source | Status |
|---|---|---|---|
| Quick estimates with time units | Used 60×60×60×24 for seconds per day (should be 86,400) and did not finish the estimate; again left 2³¹ ms unconverted (≈ 25 days) | Part 1 check Q2, Part 1 quiz Q4 | 🔴 Open (repeated) |
| Choosing integer column types / fixing ID overflow | Suggested a string id or unsigned int (Postgres has no unsigned); missed BIGINT and the knock-on changes (FKs, app types, pipeline schemas) | Part 1 check Q2 | 🔴 Open |
| Size of int32 range: checking whether a result fits | Believed int32 can hold 50,000 × 99,000 (4.95 billion > 2.1 billion max) | Part 1 quiz Q3 | 🔴 Open |
| Expression type vs assigned type (Java `int + int` overflows before widening to `long`) | Predicted `long total = a + b` prints 4,000,000,000 | Part 1 quiz Q2 | 🔴 Open |
| Overflow can wrap to a positive value | Did not expect a wrapped product to stay positive | Part 1 quiz Q3 | 🔴 Open |
| Careful binary arithmetic | Wrote 128 + 1 = 120 (method right, arithmetic slip) | Part 1 check Q1 | 🔴 Open |

## Quiz log
- 2026-11-20 Part 1 quick quiz: 1/4. Missed: 0x80 as int8, Java int+int overflow before widening, int32 range for a product, ms-timestamp estimate.

## Lab
- **Status:** not started

## Exam
- **Attempts:** —

## Session log
- 2026-11-20: Topic created ("Phase 0 — How a computer works", week 1 of the roadmap). Intake done; syllabus drafted (8 parts), waiting for approval.
- 2026-11-20: Syllabus approved as drafted. Started Part 1.
- 2026-11-20: Part 1 done (check 1.5/2). Weak spots: time-unit estimates, integer column types.
- 2026-11-20: Part 1 quick quiz 1/4. New weak spots: int32 range, expression type vs assigned type, positive wrap.
