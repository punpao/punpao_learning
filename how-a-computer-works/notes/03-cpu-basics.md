# Part 3: The CPU: instructions, registers and the fetch–decode–execute loop

> **Objective:** You can trace a few simple machine instructions step by step through
> fetch–decode–execute, and explain what clock speed and multiple cores do (and don't) give you.
> **Date:** 2026-11-20 · **Prev:** [02](02-floats-and-text.md) · **Next:** [04](04-memory-hierarchy.md)

## TL;DR
- A CPU runs **machine code**: tiny instructions (move data, do math, jump). The set it understands is its **ISA**: x86-64 (Intel/AMD) or ARM64 (Apple M-series, Graviton). Machine code for one ISA does not run on the other.
- **Registers** = a few tiny, fastest storage slots inside the CPU. Math happens only on registers, so data must be loaded from memory first.
- The **PC (program counter)** holds the address of the next instruction. The loop: **fetch** (read the instruction at PC, PC += size) → **decode** → **execute**. A **jump = writing a new value into the PC**; that is how `if`, loops and function calls work.
- Clock speed (GHz) ≠ speed: modern cores do several instructions per cycle, and they also wait on memory.
- One thread = one core. More cores help only if the work is split. **Amdahl's law:** the serial part sets the limit.

## Intuition
A very fast but very simple cook follows a recipe one tiny line at a time. The recipe book is
memory (program + data), the cook's hands are registers, the bookmark is the program counter,
and a metronome ticking billions of times per second is the clock.

## Mechanics

### Instructions and ISA
| Kind | Example | Meaning |
|---|---|---|
| Move data | `LOAD R1, [500]` / `STORE R1, [500]` | copy between memory and a register |
| Arithmetic / logic | `ADD R3, R1, R2`, `SUB`, `AND`, `CMP` | calculate with values in registers |
| Control flow | `JMP 108`, `JNZ R2, 108` | change which instruction runs next |

Instructions are stored as bytes (machine code). ISA: **x86-64** (Intel/AMD, most servers)
vs **ARM64 / aarch64** (Apple M-series, AWS Graviton, phones).

### Inside one core
```text
                    ┌────────────────────── CPU core ───────────────────────┐
   ┌──────────┐     │   ┌─────────────┐      ┌─────────────────────────┐   │
   │  Memory  │◀───▶│   │ Control unit│─────▶│ ALU (adds, compares...) │   │
   │  (RAM)   │     │   │ (decodes)   │      └───────────┬─────────────┘   │
   │ program  │     │   └──────▲──────┘      ┌───────────▼─────────────┐   │
   │   +      │     │   ┌──────┴──────┐      │ Registers: R1 R2 R3 ... │   │
   │  data    │     │   │ PC = 108    │      │ + flags                 │   │
   └──────────┘     │   └─────────────┘      └─────────────────────────┘   │
                    └───────────────────────────────────────────────────────┘
```
- **Registers:** x86-64 has 16 general-purpose 64-bit registers (`rax` … `r15`); ARM64 has 31. "64-bit CPU" = 64-bit registers, so `int64` is the natural integer.
- **ALU:** arithmetic and logic on registers.
- **Program counter** (`rip` on x86-64): address of the next instruction.
- **Instruction register:** where a fetched instruction is held for decoding (not R1/R2, which hold data).
- **Flags:** tiny 1-bit registers set by compares and arithmetic (zero, negative/less, carry, overflow).

### The fetch–decode–execute loop
```text
        ┌──────────────────────────────────────────────┐
        ▼                                              │
  1. FETCH    read the instruction at address PC       │
              into the instruction register;           │
              PC = PC + (its size)                     │
        │                                              │
  2. DECODE   control unit works out: which operation, │
              which registers, which address           │
        │                                              │
  3. EXECUTE  ALU math / compare (sets flags), or      │
              memory load/store, or a jump             │
              (writes a new value into PC)             │
        └──────────────────────────────────────────────┘
```

### Clock speed
3 GHz = 3 billion cycles/s, so 1 cycle ≈ 0.33 ns. **Pipelining** (overlapping the steps) and
**superscalar** execution (several instructions per cycle) mean instructions/second ≠ GHz, and
cores also spend cycles waiting for memory (Part 4).

### Multiple cores
- Each core is a full copy of the loop, with its own registers and PC. **One thread uses one core.**
- **Logical CPUs / hyper-threading (SMT):** 2 hardware threads share one core's ALUs. This helps when one thread waits, but it is not 2×.
- **Amdahl's law:** with parallel fraction p on n cores, speed-up = 1 / ((1 − p) + p/n).
  p = 0.9, n = 8 → about 4.7×; n = ∞ → 10× at most.

## Worked example: `c = a + b`
memory[500] = 7, memory[504] = 5; each instruction is 4 bytes.
```text
addr  instruction            meaning
100   LOAD  R1, [500]        R1 = memory[500]
104   LOAD  R2, [504]        R2 = memory[504]
108   ADD   R3, R1, R2       R3 = R1 + R2
112   STORE R3, [508]        memory[508] = R3
```
| Step | Fetch from | PC after fetch | Execute | R1 | R2 | R3 | mem[508] |
|---|---|---|---|---|---|---|---|
| start | | 100 | | ? | ? | ? | ? |
| 1 | 100 | 104 | load mem[500] → R1 | 7 | ? | ? | ? |
| 2 | 104 | 108 | load mem[504] → R2 | 7 | 5 | ? | ? |
| 3 | 108 | 112 | ALU: 7 + 5 → R3 | 7 | 5 | 12 | ? |
| 4 | 112 | 116 | store R3 → mem[508] | 7 | 5 | 12 | 12 |

The CPU can't add values that are still in memory: load → compute → store.

## Try it yourself
```bash
# Linux
uname -m; nproc
lscpu | grep -E "Model name|^CPU\(s\)|Thread|Core"
# macOS
uname -m
sysctl -n machdep.cpu.brand_string hw.physicalcpu hw.logicalcpu
```

Real machine instructions. Save as `add.c`:
```c
long add(long a, long b) {
    return a + b;
}
```
```bash
gcc -O1 -fcf-protection=none -S -o - add.c | grep -A3 '^add:'   # Linux x86-64
clang -O1 -S -o - add.c | grep -A3 '_add:'                      # macOS
```
**Expected (x86-64):**
```text
add:
	leaq	(%rdi,%rsi), %rax
	ret
```
Arguments arrive in registers (`rdi`, `rsi`); the result goes back in `rax`. `leaq` is an
address-calculation instruction used as a fast add. Apple Silicon: `add x0, x0, x1` / `ret`.
Raw bytes: `objdump -d add.o` → `48 8d 04 37` (lea), `c3` (ret).

One core vs many. Save as `burn.py`:
```python
import time
from multiprocessing import Pool

def work(n):
    total = 0
    for i in range(n):
        total += i
    return total

if __name__ == "__main__":
    N = 20_000_000
    t = time.time()
    for _ in range(4):
        work(N)
    print(f"1 process, 4 jobs one after another: {time.time() - t:.1f} s")

    t = time.time()
    with Pool(4) as p:
        p.map(work, [N] * 4)
    print(f"4 processes in parallel:            {time.time() - t:.1f} s")
```
On a 2-core test machine: 2.3 s vs 1.5 s. With 4+ cores, expect about a quarter. In `top`,
100% = one full core.

## Why it matters in practice
- **`exec format error` in Docker:** an ARM64 image (built on an Apple Silicon Mac) run on an x86-64 server, or the reverse. Fix with `docker build --platform linux/amd64` or `docker buildx` multi-arch builds.
- **A big machine that doesn't help:** a plain pandas script is one thread, so one core. Use multiprocessing, a multi-threaded engine (Polars, DuckDB) or Spark.
- **Spark parallelism = cores × partitions:** one task per core per partition; 200 cores with 10 partitions leaves 190 idle. `spark.executor.cores` = tasks per executor at the same time.
- **Reading `top`:** 790% on 8 cores = nearly all cores; stuck at 100% on 64 cores = single-threaded.

## Misconceptions & interview traps
- ❌ "Higher GHz always means faster" → ✅ speed = cycles/s × instructions per cycle, minus memory waits; a newer core at lower GHz often wins.
- ❌ "8 cores = 8× faster" → ✅ only the parallel part speeds up (Amdahl), and only if the program uses several threads/processes; splitting has a cost.
- ❌ "Python threads use all cores" → ✅ standard CPython's **GIL** lets one thread run Python bytecode at a time. Threads help for waiting (I/O); use processes for CPU work. (An optional free-threaded build exists in newer versions but is not the default.)

## Check for understanding
*(The first two questions were calculation questions; at the user's request they were replaced
with open/theory questions before answering.)*

**Q1.** A program reaches an `if` whose condition is false. What happens in the
fetch–decode–execute loop? What does the PC do, and how does the CPU "skip" the body?
- **My answer (summary):** Fetch the instruction from the PC address into a register and the PC points to a new address; decode plans what to do; the ALU executes the plan. Asked for a step-by-step visual.
- **Feedback:** General loop about right. Corrections: (1) the instruction goes into the
  **instruction register**, not a data register like R1; (2) execute is not always the ALU:
  loads/stores use memory, and a **jump writes a new address into the PC**; (3) the skip was not
  explained. The compiler emits `CMP` (sets **flags**) + a **conditional jump with the condition
  flipped** ("if x <= 10, jump past the body"). When the jump is taken, the PC is overwritten,
  so the body's instructions are **never fetched**.

  ```text
  C:    if (x > 10) { y = 1; }   z = 2;

  addr  instruction    meaning
  100   MOV R1, x      x
  104   CMP R1, 10     compare x with 10 → flags
  108   JLE 116        if x <= 10: PC = 116  (skip the body)
  112   MOV R2, 1      y = 1   ← body
  116   MOV R3, 2      z = 2

  x = 5  (condition false):  fetch 100 → 104 → 108 (jump taken, PC = 116) → 116
                             address 112 is never fetched
  x = 15 (condition true):   fetch 100 → 104 → 108 (not taken, PC stays 112) → 112 → 116
  ```
  An interactive stepper of this program was shown in the chat (2026-11-20).

**Q2.** A teammate says: "Move our slow pandas job to a 64-core server and it'll be much
faster." Why might it not help, what must change, and why never 64×?
- **My answer (summary):** The job must be separable into multiple threads; if it isn't, adding
  cores won't help; we need to change the code logic so different parts run at the same time.
- **Feedback:** Main idea ✅: plain pandas = one thread = one core (about 100% in `top`), and the code
  must change. Precision: in Python use **processes** (or Polars/DuckDB/Spark) for CPU work, not
  threads, because of the GIL. ❌ Missing the "never 64×" part: (1) the serial part (read
  input, combine results, dependent steps) sets the limit (Amdahl's law); (2) splitting has a cost
  (start processes, copy data, collect results); (3) cores share memory bandwidth, cache and disk.

## References
- CS:APP ch. 3 (machine-level representation), ch. 4.1 (ISA), ch. 1.9 (Amdahl's law, concurrency)
- Patterson & Hennessy, *Computer Organization and Design*, ch. 1 and 4
- `man lscpu`, `man objdump`
- Python docs: `multiprocessing`; PEP 703 (free-threaded CPython)
