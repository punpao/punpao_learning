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
