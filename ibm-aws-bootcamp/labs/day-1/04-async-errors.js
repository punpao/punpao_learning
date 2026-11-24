// throw inside an async function REJECTS the returned promise.
// Run:  node 04-async-errors.js        -> version B: await inside try, error is caught
//       node 04-async-errors.js crash  -> version A: no await, catch never runs, Node crashes
async function getUser() {
  throw new Error("DB down");
}

if (process.argv[2] === "crash") {
  // Version A: no await
  try {
    getUser();
    console.log("after call");
  } catch (e) {
    console.log("caught:", e.message); // never runs
  }
  console.log("end");
} else {
  // Version B: await inside try
  async function main() {
    try {
      await getUser();
      console.log("after call"); // never runs
    } catch (e) {
      console.log("caught:", e.message);
    }
    console.log("end");
  }
  main();
}
