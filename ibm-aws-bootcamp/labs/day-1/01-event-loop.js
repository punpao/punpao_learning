// Sync code first, then ALL microtasks (.then), then ONE macrotask (setTimeout).
// Expect: A D C B
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");
