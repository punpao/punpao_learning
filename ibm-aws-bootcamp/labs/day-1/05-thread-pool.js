// crypto.pbkdf2 (async) runs on libuv's thread pool (4 threads by default).
// 8 hashes -> expect two groups of finish times (4 + 4).
// Try:  UV_THREADPOOL_SIZE=8 node 05-thread-pool.js   (more threads can't beat your CPU cores)
const crypto = require("crypto");
const start = Date.now();
for (let i = 1; i <= 8; i++) {
  crypto.pbkdf2("password", "salt", 300000, 64, "sha512", () => {
    console.log(`hash ${i} done at ${Date.now() - start} ms`);
  });
}
