# Interview story: "How do you know your bootcamp skill is good? How did you validate it?"

Saved 2026-11-26. Only say what is true; fill in the real numbers at the end of Day 7.

## Structure (4 parts + a limit)
1. **Define "good" first.** The learner can build the real thing and explain why it works, not just finish reading.
2. **Measurable evidence.**
   - Real code on GitHub. Every build task passed automated checks before it was committed (Day 1 Tasks 1–4: commits 06cd873, 62b7e34, 83c602a, 13766c1, c561320).
   - A weak-spots table in progress.md tracks each topic from 🔴 to 🟢.
   - Daily quiz scores and a final mock exam score (fill in on Day 7).
3. **It checks itself.** The skill makes the coach run code before trusting an answer. Real example: the coach said removing `return` after a 404 would log ERR_HTTP_HEADERS_SENT; running it on Express 5.3 showed it was silent, so the answer was corrected.
4. **Iterates on user feedback.** Feedback like "theory too long", "too many steps at once", "skip library internals" changed it to one small step per message and hands-on first. This matches the IBM Garage Method's loop of learning from users.
5. **Honest limit.** So far there is one user (me). Next: test with 3–5 peers and compare before/after scores.

## Sample answer (English)
"I defined success as: the learner can build it and explain why. I measured it three ways: every build task had automated checks before commit, I tracked weak spots from red to green, and I scored daily quizzes and a final mock exam. It also caught its own mistakes, because it runs code before trusting an answer. The limit is that I'm the only user so far; next I'd test it with a few peers and compare before-and-after scores."

## Numbers to fill in (Day 7)
- Weak spots: __ opened, __ closed
- Quiz average: __ / mock exam: __
- Build tasks shipped with passing checks: __
