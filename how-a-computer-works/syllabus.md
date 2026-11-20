# How a Computer Works: Syllabus

**Profile:** level between None and Some · goal SWE interviews + Data engineering work · depth Essentials
**Parts:** 8 · **Estimated total:** ~3.5 h of study + ~2 h lab + ~75 min exam
**Prerequisites:** You can write and run small Python programs. Everything else is taught here.

**Goal of this topic:** have a clear mental picture of what physically happens when your
code runs. Later topics (operating systems, networking, databases, distributed systems)
build on this picture.

## Parts

### Part 1: Bits, bytes, hex and integers  (`01-bits-bytes-integers`, ~25 min)
- **Objective:** You can convert between binary, decimal and hex, explain how a signed
  integer is stored (two's complement), and predict when an integer overflows.
- **Key concepts:** bit, byte, hex, unsigned vs signed, two's complement, integer overflow,
  fixed-width types (`int32`, `int64`), byte order (endianness, short intro)
- **Hands-on:** Python `bin()`/`hex()`/`int.to_bytes()`, `xxd` on a small file, a tiny C
  program that overflows an `int32`
- **Why it matters (SWE/DE):** IDs that pass 2,147,483,647, wrong `INT` vs `BIGINT` column
  types, reading hex in logs, hashes and binary file formats.

### Part 2: Floating point and text encoding  (`02-floats-and-text`, ~25 min)
- **Objective:** You can explain why `0.1 + 0.2 != 0.3`, choose between `float` and
  `decimal` for a column, and explain how ASCII and UTF-8 store text as bytes.
- **Key concepts:** IEEE 754 (sign, exponent, fraction), rounding error, `float32` vs
  `float64`, `DECIMAL`, ASCII, Unicode code points, UTF-8 (1–4 bytes per character),
  mojibake (garbled text from the wrong encoding)
- **Hands-on:** Python `0.1 + 0.2`, `decimal.Decimal`, `"ไทย".encode("utf-8")`, `file` and
  `xxd` on a UTF-8 text file
- **Why it matters (SWE/DE):** money stored as `FLOAT`, sums that don't match between
  systems, broken Thai text in a CSV loaded with the wrong encoding.

### Part 3: The CPU: instructions, registers and the fetch–decode–execute loop  (`03-cpu-basics`, ~25 min)
- **Objective:** You can trace a few simple machine instructions step by step through
  fetch–decode–execute, and explain what clock speed and multiple cores do (and don't) give you.
- **Key concepts:** instruction, instruction set (x86-64, ARM), register, program counter,
  ALU, clock cycle, fetch–decode–execute loop, cores, why more cores ≠ faster single task
- **Hands-on:** `lscpu` / `sysctl -n machdep.cpu.brand_string`, count cores, compile a tiny C
  function and read its assembly with `gcc -S` / `objdump -d`
- **Why it matters (SWE/DE):** sizing Spark executors and cores, why a single-threaded
  Python job uses only one core, reading `top` CPU percentages above 100%.

### Part 4: The memory hierarchy and caching  (`04-memory-hierarchy`, ~30 min)
- **Objective:** You can order registers → L1/L2/L3 → RAM → SSD → network by speed, give
  rough latency numbers for each, and predict which of two loops is faster because of locality.
- **Key concepts:** latency vs bandwidth, cache, cache line (64 bytes), cache hit/miss,
  temporal and spatial locality, "latency numbers every programmer should know"
- **Hands-on:** a benchmark that walks a big array row-by-row vs column-by-column (NumPy or C)
- **Why it matters (SWE/DE):** why columnar formats (Parquet) are fast for analytics, why
  caching (Redis, Spark `cache()`) helps, why a network call inside a loop is slow.

### Part 5: How code runs: compilers, interpreters and VMs  (`05-how-code-runs`, ~25 min)
- **Objective:** You can explain the path from source code to running instructions for C,
  Java and Python, and say what a binary, a library and a runtime are.
- **Key concepts:** compiler, machine code, executable binary, interpreter, bytecode,
  virtual machine (JVM, CPython VM), JIT compilation, static vs dynamic libraries, runtime
- **Hands-on:** `gcc` a C file and run `file`/`ldd` (or `otool -L`); `python -m dis`;
  `javap -c` on a class file (optional)
- **Why it matters (SWE/DE):** "works on my machine" errors, missing `.so` files in Docker
  images, PySpark = Python driver talking to a JVM, why pandas/NumPy are fast (C inside).

### Part 6: Stack vs heap  (`06-stack-and-heap`, ~25 min)
- **Objective:** You can draw the call stack for a small program, say where each variable
  and object lives, and explain stack overflow and garbage collection.
- **Key concepts:** process memory layout (code, data, heap, stack), stack frame, local
  variable, return address, heap allocation, pointer/reference, stack overflow, memory leak,
  garbage collection (reference counting, tracing GC)
- **Hands-on:** deep recursion in Python (`RecursionError`) and C (segfault), `sys.getrefcount`,
  watch memory grow with `top`
- **Why it matters (SWE/DE):** Spark executor `OutOfMemoryError` and GC pauses, JVM `-Xmx`,
  recursive code that crashes on big input.

### Part 7: Linux command line 1: files, permissions and environment  (`07-linux-files-permissions`, ~25 min)
- **Objective:** You can move around the file system, read and change permissions with
  `chmod`, and explain how environment variables reach a program.
- **Key concepts:** absolute vs relative paths, `~`, `.`, `..`, the directory tree (`/`,
  `/home`, `/etc`, `/tmp`, `/usr/bin`), users and groups, `rwx` bits, octal modes (`755`, `644`),
  `chmod`, `chown`, environment variables, `export`, `PATH`, `which`
- **Hands-on:** `ls -la`, `chmod +x` a script, `echo $PATH`, `env`, run a script with and
  without `export`
- **Why it matters (SWE/DE):** "Permission denied" on a deploy, `command not found`,
  secrets and config passed by environment variables in Airflow/Docker.

### Part 8: Linux command line 2: processes, pipes and remote machines  (`08-linux-processes-pipes`, ~30 min)
- **Objective:** You can find and stop a process, build a pipeline that filters a log file,
  and connect to a remote machine with `ssh`.
- **Key concepts:** process, PID, `ps`, `top`/`htop`, signals (`SIGTERM` vs `SIGKILL`), `kill`,
  stdin/stdout/stderr, pipes `|`, redirection `>`, `>>`, `2>&1`, `grep`, `sort`, `uniq`, `wc`,
  `head`/`tail -f`, `ssh`, SSH keys
- **Hands-on:** count the top error messages in a log file with one pipeline; start and kill a
  `sleep` process; (optional) `ssh` into a machine you have access to
- **Why it matters (SWE/DE):** debugging a stuck job on a server, reading logs fast during
  an incident, why `kill -9` can leave a mess.

## Coverage map

How this syllabus covers what standard courses and books treat as essential.

| Essential area (canonical source) | Covered in | Notes |
|---|---|---|
| Information storage, integer representation (CS:APP ch. 2.1–2.3) | Part 1 | |
| Floating point (CS:APP ch. 2.4) | Part 2 | |
| Text encoding (Unicode/UTF-8, *Joel on Software* "The Absolute Minimum…") | Part 2 | |
| Machine-level code, registers, instructions (CS:APP ch. 3) | Part 3 | Reading assembly only, not writing it |
| Processor basics (CS:APP ch. 4, Patterson & Hennessy ch. 1, 4) | Part 3 | Pipelining only mentioned |
| Memory hierarchy and locality (CS:APP ch. 6) | Part 4 | |
| Latency numbers (Jeff Dean / Peter Norvig) | Part 4 | |
| Compilation, linking, libraries (CS:APP ch. 1, 7) | Part 5 | Linking at overview level |
| Interpreters and VMs (*Crafting Interpreters* ch. 1–2, 14) | Part 5 | |
| Process memory layout, stack, heap, GC (CS:APP ch. 3.7, 9.9–9.10) | Part 6 | |
| Shell, files, permissions, env vars (MIT *Missing Semester* lec. 1–2, 5) | Part 7 | |
| Processes, pipes, data wrangling, remote machines (MIT *Missing Semester* lec. 4–5) | Part 8 | |

## Deliberately out of scope
- **Virtual memory and paging, system calls, scheduling:** these belong to the Operating
  Systems topic. Part 6 gives only the picture you need first.
- **Logic gates and digital circuits** (*Nand2Tetris*): interesting, but not needed for SWE/DE work.
- **Pipelining, branch prediction, out-of-order execution:** mentioned in Part 3; available
  in "Go deeper".
- **Threads, locks and race conditions:** a later Concurrency topic.
- **Networking (TCP/IP, HTTP, DNS):** a later Computer Networking topic. Part 4 only gives
  the network latency number.
- **Shell scripting beyond one-line pipelines:** learn later as needed.

## After the parts
- **Lab:** a small "bits to bash" lab: Python tasks on integers, floats and UTF-8 bytes, a
  cache-locality benchmark, and a shell pipeline over a log file (finalized in Phase 3).
- **Exam:** mixed concept / scenario / trace / design, ~75 min
