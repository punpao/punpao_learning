# File templates

Use these structures for every file the tutor writes. Replace `<…>` placeholders.
Dates are ISO (`YYYY-MM-DD`). Get today's date with `date +%F`.

---

## Root `README.md`

Create it if it is missing. Otherwise update only the topic row (keep everything else as is).
Remove the `_No topics yet…_` placeholder row when adding the first topic. Keep rows sorted by
"Started" date.

```markdown
# punpao_learning

My personal repository for learning computer science fundamentals properly, with
[Claude Code](https://claude.com/claude-code) as a tutor (`.claude/skills/cs-tutor`).

**How to use:** open Claude Code in this repo and say `teach me <topic>` or
`continue <topic>`.

## Topics

| Topic | Status | Progress | Exam score | Started | Completed |
|---|---|---|---|---|---|
| [Operating Systems](operating-systems/) | 📖 Learning | Part 3/9 | — | 2026-11-20 | — |

**Status legend:** 📝 Syllabus · 📖 Learning · 🧪 Lab · 🎯 Exam · ✅ Done

Each topic folder contains `syllabus.md`, `progress.md`, `notes/`, `lab/`, `exam/` and,
once finished, `key-learnings.md`.
```

Progress column values: `Syllabus review`, `Part N/M`, `Lab`, `Exam`, `Done`.
Exam score: `82/100` once graded (keep the best attempt and note retakes, e.g. `88/100 (retake)`).

---

## `<slug>/syllabus.md`

```markdown
# <Topic>: Syllabus

**Profile:** level <None|Some|Rusty> · goal <…> · depth <Essentials|Standard|Deep dive>
**Parts:** <M> · **Estimated total:** ~<H> h of study + lab + exam
**Prerequisites:** <what they should already know; link to other topic folders if they exist>

## Parts

### Part 1: <Title>  (`01-<part-slug>`, ~20 min)
- **Objective:** You can <explain / trace / predict / debug / design> <…>.
- **Key concepts:** <a>, <b>, <c>
- **Hands-on:** <the command/program they will run>
- **Why it matters (SWE/DE):** <one line>

### Part 2: …

## Coverage map

How this syllabus covers what canonical courses/books treat as essential.

| Essential area (canonical source) | Covered in | Notes |
|---|---|---|
| <e.g. Virtual memory & paging (OSTEP ch. 18–23)> | Part 4 | |
| <e.g. File system journaling (OSTEP ch. 42)> | Part 8 (brief) | Deep dive optional |

## Deliberately out of scope
- <topic>: <why; where to learn it later>

## After the parts
- **Lab:** <one-line idea, finalized in Phase 3>
- **Exam:** mixed concept / scenario / trace / design, ~<90–120> min
```

---

## `<slug>/progress.md`

`progress.md` is the single source of truth for resuming in a new conversation. Keep every
section current.

```markdown
# <Topic>: Progress

## Profile
- **Level:** <None|Some|Rusty>
- **Goal:** <SWE interviews, Data engineering work, General depth>
- **Depth:** <Essentials only|Standard|Deep dive>
- **Lab language:** <set in Phase 3>
- **Commit preference:** <per-part | per-phase | not asked yet>

## Status
- **Phase:** <1-syllabus-review | 2-teaching | 3-lab | 4-exam | 5-wrap-up | done>
- **Current part:** <NN: Title | —>
- **Current step:** <syllabus-review | teaching | awaiting-prediction | awaiting-check-answers | menu | lab-in-progress | lab-submitted | exam-in-progress | exam-graded | —>
- **Last updated:** <YYYY-MM-DD>

## Parts
| # | Part | Status | Check | Quiz | Notes |
|---|---|---|---|---|---|
| 01 | <Title> | ✅ Done | 2/2 | 4/5 | [notes](notes/01-<slug>.md) |
| 02 | <Title> | 🟡 In progress | — | — | — |
| 03 | <Title> | ⬜ Not started | — | — | — |

## Pending check questions
<!-- Filled while waiting for answers so a new session can re-ask them. Empty otherwise. -->
1. <question>

## Weak spots
| Concept | Evidence | Source | Status |
|---|---|---|---|
| <e.g. Page fault vs. segfault> | <said every page fault kills the process> | Part 4 check | 🔴 Open |
| | | | 🟢 Resolved (Part 6 quiz) |

## Quiz log
- <YYYY-MM-DD> Part <N> quick quiz: <score>/<max>. Missed: <concepts>

## Lab
- **Status:** <not started | in progress | submitted | reviewed>
- **check.sh result:** <e.g. 5/6 tasks passing>
- **Review:** [REVIEW.md](lab/REVIEW.md)

## Exam
- **Attempts:** <YYYY-MM-DD: 78/100>
- **Results:** [results.md](exam/results.md)

## Session log
- <YYYY-MM-DD>: <what happened, e.g. Syllabus approved; Parts 1–2 done>
```

---

## `<slug>/notes/<NN>-<part-slug>.md`

````markdown
# Part <N>: <Title>

> **Objective:** <from syllabus>
> **Date:** <YYYY-MM-DD> · **Prev:** [<NN-1>](<file>) · **Next:** [<NN+1>](<file>)

## TL;DR
- <3–5 bullets a person could revise from in 60 seconds>

## Intuition
<analogy / motivating problem>

## Mechanics
<precise explanation>

```text
<ASCII diagram>
```

## Worked example
<step by step>

## Try it yourself
```bash
# Linux
<command>
# macOS
<command>
```
**Expected output / what to notice:** <…>

## Why it matters in practice
<real SWE/DE scenario: symptoms → cause → fix>

## Misconceptions & interview traps
- ❌ <wrong belief> → ✅ <correct statement>, because <why>

## Check for understanding
**Q1.** <question>
- **My answer (summary):** <…>
- **Feedback:** <right / wrong / partially + correction>

## Follow-up questions
<!-- appended as they happen -->
### Q: <user's question>
<answer>

## Another angle
<!-- appended when the user asks for a clarification -->

## Deeper dive
<!-- appended when the user chooses Go deeper -->

## Quick quiz (<YYYY-MM-DD>): <score>/<max>
<!-- appended when the user takes a quiz -->

## References
- <book chapter / man page / RFC / source file>
````

Leave out the sections that end up empty ("Follow-up questions", "Another angle", "Deeper dive",
"Quick quiz") rather than leaving empty headings.

---

## `<slug>/key-learnings.md`

````markdown
# <Topic>: Key Learnings

**Completed:** <YYYY-MM-DD> · **Exam:** <score>/100 · **Lab:** <status>

## Cheat sheet (one page)
<Dense, scannable: tables, formulas, numbers worth memorizing (e.g. latency numbers),
commands, state machines. Fits on one printed page.>

## Mental model: how it all fits together
```text
<one diagram connecting the parts>
```
<A short narrative: the core abstractions, the trade-offs that recur, and how the parts connect.>

## Top interview questions
1. **<question>**
   <concise, precise answer: 2–5 sentences>
<!-- 10–15 questions, highest-frequency first -->

## My weak spots
| Concept | Where it showed up | Re-read |
|---|---|---|
| <…> | <Part 4 check, exam Q7> | [notes/04-…](notes/04-….md) |

## What to learn next
- **Next topics:** <e.g. after OS → concurrency, then distributed systems>
- **Resources:** <books / courses / papers, with the specific chapters that matter>
````
