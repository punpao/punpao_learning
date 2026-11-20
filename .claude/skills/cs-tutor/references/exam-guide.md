# Exam guide (Phase 4)

The exam must test **understanding and transfer**: whether the user can reason about
situations they haven't seen, not whether they memorized the notes.

## 1. Composition (100 points total)

| Section | Share | What it looks like |
|---|---|---|
| A. Concepts | 20–30% | Short-answer "explain why", "compare X vs Y and when each wins", "what invariant does Z maintain". No pure-recall questions and at most one multiple-choice question, which must ask "justify your choice". |
| B. Scenario / debugging | ~30% | "Given these symptoms, logs or metrics, what's happening and why? How would you confirm it? How would you fix it?" Use realistic artifacts: `top`/`vmstat` output, a `tcpdump` excerpt, `EXPLAIN ANALYZE`, a stack trace, a Spark UI description, a dmesg OOM line. |
| C. Trace / calculate | ~20% | Scheduling timelines and average wait time, page-table/TLB address translation, subnetting/CIDR, TCP state transitions and sequence numbers, B-tree splits, lock interleavings, vector clock values, parse trees. |
| D. Design / trade-offs | ~20% | Interview-style: "design X under constraints Y; justify your choices; what breaks at 10× scale?" Graded on reasoning and trade-off awareness, not one "right" answer. |

- Typically 10–14 questions. Cover **every part** of the syllabus at least once. Weight
  toward the core parts and the user's recorded weak spots, without saying which questions
  target weak spots.
- Every question shows its **point value**. Multi-part questions show points per sub-part.
- Make questions **specific and unambiguous**: give all numbers and assumptions needed.
- Suggested time: usually 90–120 minutes. Per-section time guidance helps.
- Difficulty: a few warm-ups, mostly medium, 1–2 hard questions that separate deep understanding.

## 2. `exam/exam.md` format

```markdown
# <Topic>: Exam

**Total:** 100 points · **Suggested time:** <N> minutes · **Rules:** closed book, no running
code (unless a question says otherwise). Show your reasoning: partial credit is given for
correct reasoning even with a wrong final answer.

**How to submit:** write your answers in `exam/my-answers.md` under the matching headings,
commit, then tell Claude "grade my exam".

---

## Section A: Concepts (<P> pts, ~<T> min)

### Q1 (<p> pts)
<question>

### Q2 (<p> pts)
(a) (<p> pts) …
(b) (<p> pts) …

## Section B: Scenarios & debugging (<P> pts, ~<T> min)
### Q5 (<p> pts)
<context paragraph>
```text
<realistic logs / output>
```
(a) What is happening? (<p> pts)
(b) How would you confirm it? (<p> pts)
(c) How would you fix it, and what is the trade-off? (<p> pts)

## Section C: Trace & calculate (<P> pts, ~<T> min)
…

## Section D: Design & trade-offs (<P> pts, ~<T> min)
…
```

**Never** put answers, rubrics, "expected points to mention" or hints in `exam.md` or anywhere
else in the repo before grading. Don't reveal them in chat either.

## 3. `exam/my-answers.md` skeleton

Only the headings, no content:

```markdown
# <Topic>: My Answers

## Q1

## Q2
### (a)
### (b)
…
```

If the user pastes their answers into chat instead, save them to `my-answers.md` first, then grade.

## 4. Grading

1. Read `exam.md`, `my-answers.md`, `syllabus.md`, and the notes.
2. **Build the rubric now** (at grading time): for each question, list the points that earn
   credit and how many points each one is worth. Grade strictly but fairly:
   - Full credit needs a correct **and** justified answer.
   - Partial credit for correct reasoning with arithmetic slips, or for incomplete coverage.
   - Zero credit for answers that are confidently wrong on the core idea, even if they're long.
   - Design questions: score the requirements clarification, the core design, the trade-offs
     named, failure modes, and scaling. There is no single right answer.
3. Write `exam/results.md`:

```markdown
# <Topic>: Exam Results

**Date:** <YYYY-MM-DD> · **Score:** <S>/100 (<grade band>) · **Time taken:** <if they said>

| Section | Score |
|---|---|
| A. Concepts | x/<P> |
| B. Scenarios | x/<P> |
| C. Trace/calc | x/<P> |
| D. Design | x/<P> |

Grade bands: 90+ Excellent · 80–89 Strong · 70–79 Solid · 60–69 Shaky, review needed · <60 Re-study

## Per-question feedback
### Q1: <s>/<p>
- **Rubric:** <the points that earned credit, with their values>
- **Your answer:** <1–2 line summary>
- **Feedback:** <what was right, what was wrong or missing, stated precisely>
- **Model answer:** <concise but complete>

…

## What to review
| Concept | Questions | Re-read |
|---|---|---|
| <…> | Q3, Q8 | [notes/04-…](../notes/04-….md) |

## Strengths
- <specific>
```

4. Update `progress.md` (exam attempts, weak spots: add new ones and mark resolved ones) and
   the exam score in the root `README.md`.
5. If the score is below 70: recommend re-studying the specific parts (offer to re-teach a
   weak part, or quiz on it), then offer a retake with a **fresh** exam `exam/exam-v2.md`
   (new questions on the same concepts), graded into `exam/results-v2.md`.
6. Offer a commit, then move on to Phase 5.
