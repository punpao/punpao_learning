# How a Computer Works: Progress

## Profile
- **Level:** Between None and Some
- **Goal:** SWE interviews, Data engineering work
- **Depth:** Essentials only
- **Lab language:** set in Phase 3
- **Question style:** prefers open / theory questions (explain why, apply to a scenario) over calculation questions
- **Commit preference:** per-part (commit + push after each part)

## Status
- **Phase:** 2-teaching
- **Current part:** 04: The memory hierarchy and caching
- **Current step:** menu
- **Last updated:** 2026-11-21

## Parts
| # | Part | Status | Check | Quiz | Notes |
|---|---|---|---|---|---|
| 01 | Bits, bytes, hex and integers | ✅ Done | 1.5/2 | 1/4 | [notes](notes/01-bits-bytes-integers.md) |
| 02 | Floating point and text encoding | ✅ Done | 1/2 | — | [notes](notes/02-floats-and-text.md) |
| 03 | The CPU: instructions, registers and the fetch–decode–execute loop | ✅ Done | 1/2 | ½ (Q1 only; Parts 1–3 quiz) | [notes](notes/03-cpu-basics.md) |
| 04 | The memory hierarchy and caching | ✅ Done | 1.5/2 | — | [notes](notes/04-memory-hierarchy.md) |
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
| Overflow can wrap to a positive value | Did not expect a wrapped product to stay positive; again did not explain it | Part 1 quiz Q3, Parts 1–3 quiz Q1 | 🔴 Open (repeated) |
| C signed overflow is undefined behaviour (only unsigned wraps) | Said C wraps on signed overflow | Parts 1–3 quiz Q1 | 🔴 Open |
| UTF-8 byte structure (lead vs continuation bytes); bytes vs characters | Said `E0 B8 81 41` "contains 2 bytes" (it is 4 bytes, 2 characters); could not tell character boundaries or the Latin-1 reading | Part 2 check Q2 | 🔴 Open |
| Money column type (DECIMAL / BIGINT minor units) | Did not answer which type for money and why | Part 2 check Q1 | 🔴 Open |
| Answering every part of a question | Skipped second halves: 0x80 (Part 1 quiz Q1), money type (Part 2 Q1), how-to-tell and Latin-1 (Part 2 Q2), the `if` skip (Part 3 Q1), why never 64× (Part 3 Q2), when row storage fits (Part 4 Q2) | Parts 1–4 | 🔴 Open (repeated) |
| How jumps change the PC (if/loops at machine level: CMP + flags + conditional jump) | Described the loop but could not explain how the CPU skips an `if` body; said fetch puts the instruction in a data register; thought execute is always the ALU | Part 3 check Q1 | 🔴 Open |
| Limits of parallelism (Amdahl's law, overhead, shared memory bandwidth); processes vs threads in Python (GIL) | Did not explain why a parallel job never gets 64× faster; suggested "multi thread" for pandas | Part 3 check Q2 | 🔴 Open |
| Row vs columnar storage: main Parquet win is fewer bytes read from disk (pruning, compression, no parsing, stats); row stores fit OLTP point lookups/writes | Explained Parquet speed mainly via CPU cache lines; did not say when row storage is better | Part 4 check Q2 | 🔴 Open |
| Careful binary arithmetic | Wrote 128 + 1 = 120 (method right, arithmetic slip) | Part 1 check Q1 | 🔴 Open |

## Quiz log
- 2026-11-20 Quick quiz on Parts 1–3: answered Q1 only (½); Q2–Q5 skipped (model answers in notes/03). Missed: C signed overflow = UB, positive wrap.
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
- 2026-11-20: Started Part 2.
- 2026-11-20: Part 2 done (check 1/2). Weak spots: UTF-8 byte structure, money column type, answering every part.
- 2026-11-20: Started Part 3. User asked for open/theory check questions instead of calculation ones; Part 3 questions replaced.
- 2026-11-20: Part 3 done (check 1/2). Showed an interactive fetch–decode–execute stepper for an `if`. Weak spots: jumps/PC, limits of parallelism.
- 2026-11-20: Quick quiz on Parts 1–3: Q1 ½, Q2–Q5 skipped. Model answers added to notes/03.
- 2026-11-20: Started Part 4.
- 2026-11-21: Follow-up on byte addressing, address counts, DRAM/SRAM, SSD blocks (in notes/04). Part 4 done (check 1.5/2). Weak spot: row vs columnar storage.
