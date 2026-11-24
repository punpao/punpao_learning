# Day 1 labs

Run from the `ibm-aws-bootcamp/` folder. Predict the output first, then run.

| Command | What it shows |
|---|---|
| `node labs/day-1/01-event-loop.js` | Sync code, then microtasks (`.then`), then macrotasks (`setTimeout`): A D C B |
| `node labs/day-1/02-busy-loop.js` | A finished timer still waits for the stack to be empty |
| `node labs/day-1/03-promise-life.js` | The 7 steps of a promise's life, from creation to `.then` |
| `node labs/day-1/04-async-errors.js` (add `crash` for version A) | `throw` in async = rejected promise; only `await` inside `try` catches it |
| `node labs/day-1/05-thread-pool.js` | libuv thread pool: 8 hashes finish in groups of 4 (try `UV_THREADPOOL_SIZE=8`) |
| `node labs/day-1/06-blocking-server.js` | One slow handler blocks every request (use `curl` on `/slow` then `/fast`) |
