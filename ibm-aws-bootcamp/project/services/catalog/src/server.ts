// server.ts: the entry point that starts the real server.
//
// Still to write: listen on process.env.PORT (with a default),
// and handle SIGTERM for graceful shutdown (stop accepting new connections,
// let in-flight requests finish, then exit).
import { app } from "./app.js"; // ".js" even though the file is app.ts (NodeNext rule)

app.listen(3000, () => {
  console.log("catalog-service listening on http://localhost:3000");
});
