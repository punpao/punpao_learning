// One slow handler blocks EVERY request, because JS runs on one thread.
// Run:  node 06-blocking-server.js
// Then, in two other terminals, quickly one after the other:
//   curl localhost:3000/slow
//   curl localhost:3000/fast      <- watch how long this one takes
const http = require("http");
http
  .createServer((req, res) => {
    if (req.url === "/slow") {
      const end = Date.now() + 3000;
      while (Date.now() < end) {} // 3 s of busy CPU work on the main JS thread
      res.end("slow done\n");
    } else if (req.url === "/fast") {
      res.end("fast done\n");
    } else {
      res.statusCode = 404;
      res.end("try /slow or /fast\n");
    }
  })
  .listen(3000, () => console.log("listening on http://localhost:3000"));
