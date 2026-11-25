# Day 1: JavaScript, Node.js and HTTP, done properly

> **Date:** 2026-11-23 (started late) → 2026-11-24 · **Goal:** understand *why* Express code works, not just that it works

## TL;DR (block 1.1)
- One thread. Call stack = what runs now.
- Order: current code → ALL microtasks (.then, after-await) → ONE task (setTimeout, I/O) → microtasks again …
- Promise = placeholder for a later value; .then callbacks wait on the promise's own list; resolve moves them to the microtask queue.
- async body runs sync until first await; await = split point.
- throw in async = rejected promise; unhandled rejection crashes Node; use await inside try, or .catch.

## Block 1.1: JS runtime

### Part 1: one thread, call stack, task queue
- JS runs your code on **one thread**: one thing at a time.
- **Call stack** = what JS is doing right now. Function call → pushed; returns → popped.
- `setTimeout(fn, 0)` does NOT put `fn` on the stack. Node's timer (libuv) holds it; when the time is up, `fn` waits in the **task queue** (macrotask queue). The **event loop** moves it to the stack only when the stack is **empty**.

```text
 Call stack (JS, one thread)     Node (outside JS)        Task queue
 ┌──────────────┐                ┌──────────┐             ┌────────┐
 │ log("A")     │ setTimeout ──▶ │ timer 0ms│ ── done ──▶ │ ()=>B  │
 │ log("C")     │                └──────────┘             └───┬────┘
 └──────────────┘ ◀──── event loop: "stack empty? take next" ──┘
```

**Prediction:** `log A; setTimeout(log B, 0); log C`
**My answer:** A, C, B. log A runs; setTimeout is async, goes to the stack and is sent to libuv; log C runs; when the timer is done and the stack is empty its callback goes to the stack and runs.
**Feedback:** ✅ A C B. Fixes: the *setTimeout call* runs on the stack (registers a timer in libuv, then pops); the *callback* doesn't touch the stack until later. When the timer finishes, the callback goes into the **task queue**; the event loop is the mover that takes it from the queue when the stack is empty. "0 ms" = as soon as possible after the current code.

**Why it matters:** one Express process serves many requests: while one request waits on the DB, its callback is parked and the thread serves others.

### What is a callback?
A function you give to someone else so *they* call it later ("called back").
- `setTimeout(() => log("B"), 0)` → Node calls it when the timer ends.
- `app.get("/", (req, res) => res.send("hi"))` → Express calls it on each request.

### Check 1 (busy loop)
**Q:** `log(1); setTimeout(log 2, 0); 1e9 for-loop; log(3)`
**My answer:** 1, 2, 3. **Real:** 1, 3, 2 (2 printed ~409 ms later). ❌ A finished timer only moves the callback into the queue. The whole script is ONE job on the stack; the stack isn't empty until log(3) is done. The event loop never interrupts running code. Analogy: one cashier serving one customer's long order; the timer buzzer only adds the next customer to the line.

### Check 2 (while(true))
**My answer:** "It executes ALL synchronous code first, then the queue goes to the stack. Timeout exceeded?"
**Feedback:** ✅ Rule right: current code runs to the end, then queued callbacks run **one at a time**. ❌ No "timeout exceeded" error: `timer` never prints and the program hangs forever at 100% CPU. Express lesson: a long sync loop in one handler freezes the whole server for every user (Block 1.2).

### Part 2: promises and the microtask queue
- **Promise** = "no value yet, you'll get it later" (food-court ticket). `.then(cb)` parks `cb` until the value is ready.
- Two waiting lines:
  - **Microtask queue** (VIP line): `.then`/`.catch` callbacks, code after `await`.
  - **Task (macrotask) queue**: `setTimeout`, `setInterval`, I/O callbacks.
- Rule: current code runs to the end → empty the **whole** microtask queue → take **one** task → microtasks again → …
- FIFO inside each queue, but microtasks always go before the next task.

**Prediction:** `log A; setTimeout B; Promise.resolve().then C; log D`
**My answer:** A C D B. **Real:** A D C B. ❌ D is sync so it runs before any parked callback; C beats B because microtasks are emptied before the task queue.

**Check:** setTimeout T1; then P1; setTimeout T2; then P2; log S → **My answer:** S, P1, P2, T1, T2 ✅

### Life of a promise, in order (ran it)
```js
console.log("1. create promise");
const order = new Promise((resolve) => {
  console.log("2. kitchen starts (this function runs right away)");
  setTimeout(() => {
    console.log("5. timer done -> calling resolve");
    resolve("noodles");
    console.log("6. resolve called: .then callback is now in the VIP queue");
  }, 1000);
});
order.then((food) => console.log("7. .then callback runs:", food));
console.log("3. .then registered (callback waits on the promise's list)");
console.log("4. main code done, stack empty, waiting...");
```
| Step | State | Where the .then callback is |
|---|---|---|
| 1–2 | pending | not created yet |
| 3–5 | pending | promise's own list |
| 6 | fulfilled | microtask queue |
| 7 | fulfilled | stack (running) |
- The executor `(resolve) => {…}` runs immediately. `resolve(value)` marks the promise fulfilled and moves waiting callbacks to the microtask queue; `reject(err)` → `.catch`.
- `Promise.resolve(42).then(x => …)` → x is 42.
- setTimeout callbacks → task queue; `.then` callbacks → microtask queue (two different callbacks, two different lines).

### Explain-back: promises (~6/10)
1. Promise = object to wait for an async result. ✅ Nuance: a placeholder for a later value; it doesn't make work async.
2. cb waits for resolve/reject. ✅ Add *where*: on the promise's own list.
3. resolve: ❌ described .then. resolve marks fulfilled + moves callbacks to the microtask queue.
4. Why .then before setTimeout: microtask queue is emptied first; a promise result belongs to work already in progress, so JS finishes it before new outside events.

### Part 3: async/await
- `await x` = `.then` in nicer clothes: the **rest of the function** waits; the function returns right away; the thread is free.
- An `async` function body runs **synchronously until its first `await`**.
```js
async function greet() { console.log("hi"); }
// ≈
function greet() { console.log("hi"); return Promise.resolve(undefined); }
```
**Prediction:** `cook(){ log A; await …; log B }; cook(); log C` → My answer C, A, B. **Real:** A, C, B ❌
**Check:** `greet(); log bye` → My answer bye, hi. **Real:** hi, bye ❌. Only things attached to the returned promise wait: `greet().then(()=>log("then")); log("bye")` → hi, bye, then. Weak spot.

### Part 4: errors with async
- Inside an `async` function, `throw` **rejects the returned promise**; it doesn't throw to the caller.
- `try { getUser() } catch` → catch never runs. Node sees a rejection nobody handled → **unhandled rejection** → process crashes (exit 1).
- Fix: `await` it inside `try`, or `.catch(...)`. `await` turns a rejection back into a throw on that line.
**Prediction:** catch runs? My answer: yes, and "end" prints. **Real:** after call, end, then crash. ❌ catch, ✅ end.
**Check:** why does await make catch work? ✅ Without await the try block finishes before anyone looks at the rejection. Nuance: the promise is already rejected when getUser() returns; try/catch only catches throws during its own code.
- Express: an unhandled async error in Express 4 → request hangs or server crashes; Express 5 sends rejected promises to error middleware.

### Block 1.1 traps
- ❌ `setTimeout(fn, 0)` runs immediately → ✅ after the current code AND all microtasks.
- ❌ `async` makes the whole function run later → ✅ the body runs now, up to the first `await`.
- ❌ `try/catch` catches errors from any async call inside it → ✅ only if you `await` it (or `.catch`).
- ❌ A heavy loop just makes one request slow → ✅ it freezes the whole process for everyone.

## Block 1.2: Node.js

### Idea 1: Node = V8 + libuv, non-blocking I/O
- **V8** runs JS (call stack, one thread). It can't do I/O by itself.
- **libuv** (C library) runs the event loop and timers and hands waiting to the **OS** ("tell me when this connection has data"). The JS thread is free meanwhile.
- **Non-blocking I/O**: the thread doesn't stand still while waiting for files/network/DB.

**Check:** 100 requests, each a 200 ms DB query. #100 waits how long (1) if the thread stood and waited, (2) with libuv?
**My answer:** (1) queries run in parallel outside JS; #100 only waits for the first 99 callbacks. (2) "huh?"
**Feedback:** My (1) is the correct answer to (2) ✅: ~200 ms + a little for 99 short callbacks. (1) was the imaginary blocking world: 100 × 200 ms = 20 s. Demo with 10 requests (ran it): blocking 2000 ms vs non-blocking 201 ms.

### Idea 2: the thread pool (libuv, 4 threads by default)
- **Waiting for network data** (DB, HTTP): OS "doorbell" (epoll / kqueue) watches thousands of connections; no thread waits.
- **Work someone must do or stand through**: hashing (`crypto.pbkdf2`, bcrypt), compression (`zlib`), `dns.lookup`, and **files** (no doorbell for files on most OSes) → a thread-pool thread.
```text
 Network (DB, HTTP)     → OS doorbell   → no thread waits
 Files                  → no doorbell   → a pool thread stands and waits
 Hashing / compressing  → real CPU work → a pool thread does the work
```
- Analogy: JS thread = waiter; pool = 4 cooks.
- Demo (4 threads): 8 pbkdf2 hashes → 4 done at ~140 ms, 4 at ~285 ms. With UV_THREADPOOL_SIZE=8 on 4 cores: all ~290 ms (more threads don't beat CPU cores).
**Check:** 8 orders × 10 min, 4 cooks → **My answer:** 20 min ✅ (4 at 10, 4 at 20).

### Idea 3: never make the waiter cook (blocking the event loop)
- CPU work in plain JS (loops, `pbkdf2Sync`, huge `JSON.parse`) runs on the main JS thread → every request waits.
- Demo: `/slow` = 3 s busy loop; `/fast` sent 0.2 s later took **2.86 s**.
- Fixes: async API (pool), `worker_threads`, or move work to another service/queue (Lambda); keep handlers short.

**Check:** login with `pbkdf2Sync` (100 ms), 50 logins at once. **My answer:** 1) ~5000 ms, 2) product page hangs, 3) use `crypto.pbkdf2` ✅✅✅
**Feedback:** Word fix: "main JS thread", not "worker thread" (that's `worker_threads`). Deeper: with async pbkdf2 and 4 pool threads, #50 still waits ~13 rounds × 100 ms ≈ 1.3 s, but the product page stays fast.

### Block 1.2 traps
- ❌ Node is single-threaded → ✅ *your JS* runs on one thread; Node uses the thread pool + OS in the background.
- ❌ Async means parallel on the JS thread → ✅ the JS thread hands off the work and stays free.
- ❌ All async work uses the thread pool → ✅ network uses the OS doorbell; files, crypto, zlib, dns.lookup use the pool.
- ❌ `*Sync` functions are fine in a server → ✅ they block every request; only at startup.

## TL;DR (block 1.2)
- Node = V8 (runs JS, one thread) + libuv (event loop, timers, OS I/O, thread pool of 4).
- Network → OS, no thread. Files / crypto / zlib / dns.lookup → pool. Plain-JS CPU work → blocks everyone.
- Fix CPU-heavy work: async API, worker_threads, or another service.
- Streams/backpressure and SIGTERM graceful shutdown: covered during the build.

### Break-it result: removing `return` after the 404 (tested on Express 5.3, 2026-11-24)
- Client still gets the 404. The handler keeps running after the first response.
- Next line `res.json(product)` with `product === undefined`: **silent**, no error (nothing new to send).
- Next line `res.json({ ok: 1 })`: server logs `ERR_HTTP_HEADERS_SENT`.
- Next line `res.json({ name: product.name })`: server logs `TypeError`.
- Lesson: one request gets one response; always `return` after sending, because the bug can be silent.
- Explain-back: express.json parses JSON bodies only for `Content-Type: application/json` (without it req.body is undefined). `req.params.id` is always a string because the URL is text, so number ids make `1 === "1"` false and every product 404s.

### Task 2: validation with zod (2026-11-26)
- A zod schema is a set of rules. `schema.safeParse(data)` never throws; it returns `{ success: true, data }` or `{ success: false, error }` where `error.issues` lists every problem with its `path` (field) and `message`. `schema.parse(data)` throws instead.
- `z.object` drops keys that are not in the schema, so a client-sent `id` is ignored. Build the product from `result.data`, never raw `req.body`.
- The server makes the id (`randomUUID()`); the client must never choose it.
- Check types, not only values: in JS `"100" >= 0` is true, so `z.number()` matters.
- Without `Content-Type: application/json`, `req.body` is undefined, so zod reports "expected object, received undefined" with an empty field name.

### Folder structure (2026-11-26)
- `app.ts` wires things together; `routes/` handle HTTP only; `schemas/` hold zod rules; `data/` is the only place that knows where data lives; `middleware/` holds code that runs for many routes (404, errors, logging).
- Why: each file has one job (separation of concerns), so a change in one place (e.g. swap the in-memory array for DynamoDB) does not touch the others, and each part can be tested alone.
