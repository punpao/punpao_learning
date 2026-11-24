# Day 1: JavaScript, Node.js and HTTP, done properly

> **Date:** 2026-11-23 · **Goal:** understand *why* Express code works, not just that it works.

## TL;DR
- (filled in at the end of the day)

## Block 1.1: JS runtime
### Intuition
JavaScript runs your code on **one thread** (one worker doing one thing at a time).
It still handles thousands of requests because it never *waits*: slow work (timers, network,
disk) is handed off, and the result comes back later as a small job in a queue.

### How it works (part 1: call stack + event loop)
```text
 ┌─────────────┐   hands off slow work    ┌──────────────────────┐
 │ Call stack  │ ───────────────────────▶ │ Timers / network /   │
 │ (runs now)  │                          │ disk (outside JS)    │
 └─────▲───────┘                          └──────────┬───────────┘
       │ event loop: when the stack is EMPTY,        │ "done!" → job queued
       │ take the next job                           ▼
 ┌─────┴──────────────────────────────────────────────────────────┐
 │ Microtask queue (promise .then, await)  ← emptied FIRST, fully │
 │ Macrotask queue (setTimeout, I/O callbacks) ← one at a time    │
 └────────────────────────────────────────────────────────────────┘
```

### Check
**Q:** Predict the output order and explain why.
```js
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');
```
**My answer:** … · **Feedback:** …
