// The life of a promise, step by step. Watch the numbers print in order 1..7.
console.log("1. create promise");
const order = new Promise((resolve) => {
  console.log("2. executor runs right away (kitchen starts)");
  setTimeout(() => {
    console.log("5. timer done -> calling resolve");
    resolve("noodles");
    console.log("6. resolve called: .then callback is now in the microtask queue");
  }, 1000);
});
order.then((food) => console.log("7. .then callback runs:", food));
console.log("3. .then registered (callback waits on the promise's own list)");
console.log("4. main code done, stack empty, waiting...");
