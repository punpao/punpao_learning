# Lab design guide (Phase 3)

The lab is where the knowledge has to work for real. Design it so that finishing it proves
the user can apply the topic, not just recall it.

## 1. Choose the format

Pick **one** coherent project (with 4–7 graded tasks) that touches the most important parts
of the syllabus. Bias toward the user's goal (SWE vs. DE). Examples:

| Topic | Lab ideas |
|---|---|
| Operating systems | Mini shell (fork/exec/wait, pipes, redirection, signals, job control); producer-consumer with pthreads + condition variables; page-replacement simulator (FIFO/LRU/Clock/OPT) comparing fault rates; CPU-scheduler simulator (FCFS/SJF/RR/MLFQ) producing Gantt charts |
| Computer networking | TCP chat server (multi-client, `select`/`poll`/`epoll`); HTTP/1.1 server from raw sockets (keep-alive, chunked encoding, 4xx/5xx handling); analyze a `.pcap` with `tcpdump`/Wireshark (handshake, retransmits, RTT, window scaling); DNS resolver from scratch |
| Databases | B+tree index (insert/search/range scan/split); reproduce isolation anomalies (dirty read, non-repeatable read, phantom, write skew, lost update) in Postgres with two `psql` sessions; mini LSM-tree KV store with WAL + compaction; query planner investigation with `EXPLAIN ANALYZE` |
| Distributed systems | Leader election (bully / Raft election) simulator with partitions; consistent hashing ring with virtual nodes and rebalance stats; vector clocks / Lamport clocks; replicated KV with quorum reads/writes |
| Concurrency | Bounded blocking queue; reproduce and fix a data race and a deadlock; thread pool with futures; read-write lock; lock-free counter/stack with CAS and a benchmark |
| Compilers | Tokenizer → recursive-descent parser → AST → tree-walking interpreter for a tiny language; then a bytecode compiler + stack VM; constant folding pass |
| Data engineering topics | External merge sort over a file larger than a memory budget; mini columnar file format with run-length/dictionary encoding; hash vs. sort-merge join implementation and benchmark; exactly-once-ish consumer with idempotent writes |

If the topic isn't listed, apply the same principle: build the core mechanism, then break it
and observe.

## 2. Choose the language

If the topic forces one (syscalls → C; Postgres anomalies → SQL + shell), just say so.
Otherwise ask with AskUserQuestion (header `Lab lang`), offering 2–3 fitting options with the
recommended one first, e.g. `C (Recommended)`, `Go`, `Python`. Record it in `progress.md`.

## 3. Files to write

```
lab/
├── README.md
├── HINTS.md
├── starter/          # the user edits these files in place
└── tests/ and/or check.sh
```

### `lab/README.md`
```markdown
# Lab: <Title>

## Goal
<What they will build and which parts of the syllabus it exercises.>

## Setup
<Exact commands for Linux and macOS: compilers, packages, Docker for Postgres, etc.
State minimum versions.>

## Tasks (easy → hard)
### Task 1 (🟢 easy): <title>
<what to implement; input/output contract; files to edit>
**Acceptance:** `./check.sh task1` passes; <any extra observable criteria>

### Task 2 (🟢 easy) … Task 4 (🟡 medium) … Task 6 (🔴 hard) … Stretch (⭐ optional)

## Acceptance criteria (whole lab)
- [ ] All tasks pass `./check.sh`
- [ ] No warnings with `<-Wall -Wextra>` / no race detector reports (where applicable)
- [ ] <behavioral criteria, e.g. no zombie processes left after the shell exits>
- [ ] A short `NOTES.md` in `starter/` explaining two design decisions (this gets reviewed)

## How to submit
Commit your work, then tell Claude "review my lab".
```

### `starter/`
- Stubs must **compile/run** and **fail the tests cleanly** (e.g. `TODO` functions return an
  error or `NotImplemented`), not crash the harness.
- Provide the boring scaffolding (argument parsing, I/O plumbing, Makefile) so the effort goes
  into the concept being learned.
- Mark every place to implement with `TODO(task N): …`.

### Tests / `check.sh`
- `./check.sh` runs all tasks; `./check.sh task3` runs one task. Print `PASS`/`FAIL` per test
  with a short reason and a final summary like `4/6 tasks passing`. Exit non-zero on any failure.
- **Portable across Linux and macOS:** `#!/usr/bin/env bash`, `set -euo pipefail`. Stay
  compatible with **bash 3.2** (macOS default): no associative arrays, no `mapfile`, no `${var,,}`.
  Avoid GNU-only flags (`sed -i` differs; `timeout` is missing on macOS, so use a
  portable fallback such as a background process + `kill`, or `perl -e 'alarm …; exec …'`).
- Check prerequisites first and print a helpful message if a tool is missing
  (`command -v gcc >/dev/null || { echo "gcc not found: install with …"; exit 2; }`).
- Use timeouts so a hung solution fails instead of hanging the script.
- Prefer behavior tests (run the program, check its output, exit codes, files, process table)
  over tests that dictate internal structure. Include edge cases and, for concurrency, stress
  runs repeated N times.
- Where a language has a native test framework (pytest, `go test`, cargo test), use it and
  have `check.sh` call it.

### `HINTS.md`
Tiered hints per task, each collapsed so they aren't read by accident:

```markdown
## Task 3: <title>

<details><summary>Hint 1: nudge</summary>

Which syscall lets the parent wait for a *specific* child?
</details>

<details><summary>Hint 2: approach</summary>

…
</details>

<details><summary>Hint 3: nearly there</summary>

Pseudocode-level guidance, still not the full code.
</details>
```

## 4. Verify before handing it over

1. Write a reference solution in a temp directory **outside the repo** (`mktemp -d`), copy the
   starter and tests there, implement it, and run `check.sh` until everything passes.
2. Run `check.sh` against the untouched starter and confirm every task fails cleanly
   (no harness crash, clear messages).
3. Delete the temp directory. The solution must not end up in the repo or in chat.
4. If the environment can't run something (e.g. no Docker for Postgres), say so explicitly
   in your message and in the README setup notes.

## 5. Reviewing a submission ("review my lab")

1. Run `./check.sh` and report the results.
2. Read every file they changed (`git diff` against the commit that added the starter code).
3. Review like a senior engineer on a real PR. Group the findings by severity:
   - 🔴 **Bugs / correctness**: wrong behavior, race conditions, leaks (fds, memory, zombies),
     unhandled errors (`EINTR`, partial `read`/`write`, short writes), edge cases.
   - 🟡 **Design / robustness**: abstractions, error handling strategy, testability, perf
     (complexity, syscalls per operation, allocation patterns).
   - 🟢 **Style / nits**: naming, comments, structure.
   - ✅ **What's good**: be specific about what they did well.
   Each finding: file:line, what's wrong, why it matters in production, and a suggested fix
   (describe the fix; don't paste a full solution unless they've asked for one).
4. Connect each finding to the concept and the syllabus part it relates to.
5. Write it all to `lab/REVIEW.md` (date, check results, findings, overall verdict, and
   "concepts to revisit"). Add the weak spots to `progress.md`.
6. Offer: fix the issues and resubmit / see the reference solution / move on to the exam.

## 6. Reference solution (only on request or after an attempt)

Write it to `lab/solution/`, mirroring the starter layout. Comment the non-obvious decisions,
and add `lab/solution/NOTES.md` comparing it with the user's approach.
