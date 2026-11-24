// A finished timer only puts its callback in the queue.
// The callback waits until the stack is empty (after the loop and log 3).
// Expect: 1, 3, then 2 after a few hundred ms.
console.log(1);
const t = Date.now();
setTimeout(() => console.log(2, "after", Date.now() - t, "ms"), 0);
for (let i = 0; i < 1e9; i++) {}
console.log(3);
