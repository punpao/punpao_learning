# Part 4: The memory hierarchy and caching

> **Objective:** You can order registers → L1/L2/L3 → RAM → SSD → network by speed, give
> rough latency numbers for each, and predict which of two loops is faster because of locality.
> **Date:** 2026-11-20 · **Prev:** [03](03-cpu-basics.md) · **Next:** [05](05-how-code-runs.md)

## TL;DR
- The CPU is much faster than memory. A hierarchy of small, fast caches hides the slow RAM.
- Remember the gaps, not the digits: L1 ~1 ns → RAM ~100 ns (100×) → SSD ~20–100 µs (~1,000×) → same-datacenter network ~0.5 ms → other continent ~150 ms.
- Caches move **64-byte cache lines** (128 on Apple M-series), not single bytes.
- Caching works because of **locality**: temporal (reuse soon) and spatial (nearby next). Sequential access + prefetcher = fast; random jumps = misses.
- Same Big-O can differ several times in speed: row-by-row vs column-by-column traversal.

## Intuition
Hands (registers) → cutting board (L1) → kitchen shelf (L2/L3) → fridge in the back (RAM) →
warehouse across town (SSD) → supplier abroad (network). A good chef keeps what they need
next close by. That is caching.

## Mechanics

### The hierarchy
```text
             size                       latency (rough)   if 1 ns were 1 second...
 registers   ~1 KB                      ~0.3 ns            0.3 s
 L1 cache    32–128 KB / core           ~1 ns              1 s
 L2 cache    0.25–4 MB / core           ~4 ns              4 s
 L3 cache    8–100+ MB, shared          ~15 ns             15 s
 RAM         8–512 GB                   ~100 ns            ~1.5 min
 NVMe SSD    TBs                        ~20–100 µs         ~1 day
 network     same datacenter            ~0.5 ms            ~6 days
             other continent            ~150 ms            ~5 years
 smaller + faster + pricier per byte ▲   bigger + slower + cheaper per byte ▼
```
Orders of magnitude only; exact numbers depend on the machine. Units step up from **ns**
(caches, RAM) to **µs** (SSD) to **ms** (network, spinning disks).

- **Latency** = time until the first byte arrives. **Bandwidth** = bytes per second once data flows.

### Caches
- A **cache** keeps copies of recently used data from a slower level. A load checks L1 → L2 → L3 → RAM.
  **Hit** = found (fast); **miss** = go down a level and wait.
- Data moves in **cache lines** of 64 bytes (Apple M-series: 128). Reading one 8-byte `double`
  brings in its whole 64-byte neighbourhood (8 doubles).
- **Temporal locality:** recently used data is likely used again. **Spatial locality:** nearby
  addresses are likely used next.
- The **prefetcher** spots sequential patterns and loads the next lines before you ask.

## Worked example: row by row vs column by column
C and NumPy arrays are **row-major**: rows are stored one after another in one strip of memory.
```text
  logical view            memory (one long strip of addresses)
  ┌────┬────┬────┬────┐
  │a00 │a01 │a02 │a03 │   a00 a01 a02 a03 a10 a11 a12 a13 a20 a21 a22 a23
  ├────┼────┼────┼────┤   └──── row 0 ────┘└──── row 1 ────┘└──── row 2 ────┘
  │a10 │a11 │a12 │a13 │
  ├────┼────┼────┼────┤
  │a20 │a21 │a22 │a23 │
  └────┴────┴────┴────┘
```
For an 8000 × 8000 array of doubles (512 MB):
- **Row by row:** neighbours in memory. One miss loads 8 doubles, the next 7 reads are hits, and the prefetcher helps.
- **Column by column:** each next number is 8000 × 8 = 64,000 bytes away, so every read is a different
  cache line (64 bytes loaded, 8 used), and lines are **evicted** (pushed out to make room)
  before the neighbour column is read. Mostly misses.

Same number of additions; the difference is how often the CPU waits for RAM.

## Try it yourself
NumPy (needs about 600 MB free RAM; use `n = 5000` if needed). Save as `locality.py`:
```python
import time
import numpy as np

n = 8000
a = np.ones((n, n))          # 8000 x 8000 float64 = 512 MB, stored row by row

t = time.time()
total = 0.0
for i in range(n):
    total += a[i, :].sum()    # one row: 8000 numbers next to each other in memory
print(f"row by row:       {time.time() - t:.2f} s")

t = time.time()
total = 0.0
for j in range(n):
    total += a[:, j].sum()    # one column: 8000 numbers, each 64,000 bytes apart
print(f"column by column: {time.time() - t:.2f} s")
```
**Expected (test server, 260 MB L3):** `row by row: 0.09 s`, `column by column: 0.37 s` (about 4×).
Laptops with a smaller L3 usually show a bigger gap.

C version. Save as `locality.c`:
```c
#include <stdio.h>
#include <time.h>
#define N 8000
static double a[N][N];
int main(void) {
    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) a[i][j] = 1.0;
    clock_t t = clock(); double s = 0;
    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) s += a[i][j];
    printf("row by row:       %.3f s (sum=%.0f)\n", (double)(clock()-t)/CLOCKS_PER_SEC, s);
    t = clock(); s = 0;
    for (int j = 0; j < N; j++) for (int i = 0; i < N; i++) s += a[i][j];
    printf("column by column: %.3f s (sum=%.0f)\n", (double)(clock()-t)/CLOCKS_PER_SEC, s);
    return 0;
}
```
```bash
gcc -O1 -o locality locality.c && ./locality
# row by row:       0.179 s (sum=64000000)
# column by column: 0.617 s (sum=64000000)
```
Your caches:
```bash
lscpu | grep -i cache; getconf LEVEL1_DCACHE_LINESIZE                  # Linux
sysctl hw.l1dcachesize hw.l2cachesize hw.cachelinesize                  # macOS
```

## Why it matters in practice
- **Parquet vs CSV:** columnar storage = spatial locality on disk; an analytics query reads one
  contiguous column and skips the rest; similar values compress well.
- **N+1 queries / network calls in a loop:** 10,000 round trips × 0.5 ms = 5 s of waiting; batch instead.
- **Caches everywhere:** Redis, Spark `.cache()`, the OS page cache, the Postgres buffer pool.
  First run is slow (cold cache), second is fast (warm cache); watch out for this when benchmarking.
- **Vectorized vs row loops in pandas:** `apply(axis=1)`/`iterrows()` jump around scattered Python
  objects; vectorized ops stream contiguous arrays.

## Misconceptions & interview traps
- ❌ "RAM is fast" → ✅ about 100× slower than L1; memory-bound code spends its time waiting.
- ❌ "Same Big-O = same speed" → ✅ Big-O ignores cache misses; arrays often beat linked lists.
- ❌ "SSDs are almost as fast as RAM" → ✅ random reads take tens of µs, hundreds to thousands of times RAM latency.

## Check for understanding
**Q1.** Row-by-row vs column-by-column sum of the same row-major 2D array: same number of
additions, but the column loop is several times slower. Explain with cache lines and locality.
- **My answer (summary):** Values in a row sit at neighbouring addresses. A miss on the first one
  makes RAM send the whole 64-byte neighbourhood into the cache, so the next values are found in cache.
  Column by column, the next value is far away (said 4 × 8000 bytes), so it isn't in the cache.
- **Feedback:** ✅ Correct chain. Fixes: doubles are 8 bytes, so addresses step by 8
  (`0x00, 0x08, 0x10…`) and one line = 8 numbers (1 miss + 7 hits); the column jump is
  8 × 8000 = **64,000 bytes**. Missing link: **eviction**: the other 7 numbers in the line are what
  the next column needs, but the line is pushed out before then. The line goes into L1 (and usually
  L2/L3 on the way, depending on the CPU); the **prefetcher** makes sequential access even faster.

**Q2.** 50-column, 1-billion-row `sales` table: why is `SELECT AVG(price)` much faster on
Parquet than CSV? What kind of query fits row-by-row storage better, and why?
- **My answer (summary):** Parquet stores a column's values together, so they load into
  neighbouring addresses and use cache lines well; CSV is stored by row, so you load a lot of
  unused data and the needed values are far apart. (Second part not answered.)
- **Feedback:** Partly right. ✅ CSV forces reading lots of unused data. But the main win is
  **bytes read from disk**, not CPU cache: **column pruning** (Parquet reads only `price`, about 1/50 of
  the data; in CSV every block holds all 50 columns, so the whole file is read and **parsed**),
  plus **compression** (similar values), **typed binary** (no text parsing) and **min/max
  statistics** (skip chunks). The cache-line effect is real but smaller. ❌ Missing: row storage
  fits **OLTP point lookups / single-row writes** (`SELECT * FROM orders WHERE order_id = 123`,
  inserting one order): the whole row is in one 8 KB page, while columnar splits it across 50
  column chunks, and Parquet files are written once in big batches. Row stores for apps, columnar
  for analytics.

## Another angle
### Parquet, explained by opening the file (asked 2026-11-21)

**Layout:** a hybrid. Rows are cut into **row groups**; inside each row group every column is
stored separately as a **column chunk** made of **pages**. A **footer** at the end holds the
schema (names + types) and, for each row group × column, the byte offset, size, min, max and
null count.
```text
sales.parquet
┌───────────────────────────────────────────────────────────────┐
│ "PAR1"                                                        │
│ ┌── Row group 0 (rows 0 – 249,999) ──────────────────────────┐ │
│ │  column chunk: col0   [page][page]...                      │ │
│ │  ...                                                       │ │
│ │  column chunk: price  [page][page]...        ◀─ read       │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ... row groups 1, 2, 3 ...                                     │
│ FOOTER: schema + per row group × column: offset, size,         │
│         min, max, null count                 ◀─ read first     │
│ footer length + "PAR1"                                         │
└───────────────────────────────────────────────────────────────┘
```

**`SELECT AVG(price)`:** Parquet → read the footer → read only the `price` byte ranges (on
S3/GCS: HTTP range requests) → binary doubles, no parsing. CSV → no index, so read the whole file,
split every line, and parse text to numbers.

**Tricks:** column pruning; **dictionary encoding** (`country` with 4 values → 2-bit codes);
**RLE** (run-length: "TH × 4"); compression (Snappy/Zstd) on similar neighbouring values; **min/max
statistics** let a `WHERE` skip whole row groups (**predicate pushdown**). Skipping only works
when data is sorted/clustered by the filter column (e.g. by date).

**Experiment (1M rows × 50 columns, pyarrow 26):**
```text
CSV size:      196.3 MB
Parquet size:   63.9 MB
CSV     AVG(price) = 500.62  in 0.91 s
Parquet AVG(price) = 500.62  in 0.03 s
bytes Parquet must read for price: 3.8 MB of 63.9 MB
row group 0, price   : 0.96 MB
row group 0, country : 0.06 MB       (250,000 strings ≈ 2 bits each)
min/max of order_day per row group:
  row group 0: min=  1  max= 92
  row group 1: min= 92  max=183
  row group 2: min=183  max=274
  row group 3: min=274  max=365      (WHERE order_day >= 300 reads only this one)
```
`pd.read_csv(usecols=[...])` still scans the whole file; it drops the columns after reading.

| | CSV | Parquet |
|---|---|---|
| Layout | rows, as text | row groups → column chunks → pages, binary |
| Read one column | whole file | only that column's chunks |
| Types | none; guessed (`"00123"` → `123`) | stored in the schema |
| Size | large | usually several times smaller |
| Skipping with `WHERE` | no | yes (min/max) |
| Human-readable | yes | no |
| Append/update one row | easy | no: write-once files (Delta Lake/Iceberg manage changes) |
| Best for | small exchanges, people | analytics scans |

Weak spots: single-row lookups/updates; **tiny files** (each has its own footer and read requests).
Spark usually aims for row groups of about 128 MB.

Script (`pip install pandas pyarrow`), save as `parquet_vs_csv.py`:
```python
import os, time
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

rows, cols = 1_000_000, 50
rng = np.random.default_rng(0)
df = pd.DataFrame({f"col{i}": rng.integers(0, 1000, rows) for i in range(cols - 3)})
df["order_day"] = np.sort(rng.integers(1, 366, rows))         # rows arrive in date order
df["country"] = rng.choice(["TH", "JP", "SG", "VN"], rows)   # only 4 distinct values
df["price"] = rng.integers(100, 100_000, rows) / 100          # e.g. 129.50

df.to_csv("sales.csv", index=False)
df.to_parquet("sales.parquet", row_group_size=250_000)        # 4 row groups

print(f"CSV size:     {os.path.getsize('sales.csv') / 1e6:6.1f} MB")
print(f"Parquet size: {os.path.getsize('sales.parquet') / 1e6:6.1f} MB")

t = time.time(); avg = pd.read_csv("sales.csv", usecols=["price"])["price"].mean()
print(f"CSV     AVG(price) = {avg:.2f}  in {time.time() - t:.2f} s")
t = time.time(); avg = pd.read_parquet("sales.parquet", columns=["price"])["price"].mean()
print(f"Parquet AVG(price) = {avg:.2f}  in {time.time() - t:.2f} s")

meta = pq.ParquetFile("sales.parquet").metadata
names = [meta.schema.column(i).name for i in range(meta.num_columns)]
def chunk(rg, name):
    return meta.row_group(rg).column(names.index(name))

price_bytes = sum(chunk(r, "price").total_compressed_size for r in range(meta.num_row_groups))
print(f"\nrow groups: {meta.num_row_groups}, columns: {meta.num_columns}")
print(f"bytes Parquet must read for price: {price_bytes / 1e6:.1f} MB "
      f"of {os.path.getsize('sales.parquet') / 1e6:.1f} MB")
for name in ["price", "country"]:
    c = chunk(0, name)
    print(f"row group 0, {name:8s}: {c.total_compressed_size / 1e6:.2f} MB  encodings={c.encodings}")
print("\nmin/max of order_day per row group (stored in the footer):")
for r in range(meta.num_row_groups):
    s = chunk(r, "order_day").statistics
    print(f"  row group {r}: min={s.min:3d}  max={s.max:3d}")
```

## Follow-up questions

### Q: Does one address store at most 1 byte? How many addresses do memory and disk have, and how do they store data and behave?

**1. One address = one byte (in RAM).** Modern CPUs are **byte-addressable**: each address
names exactly one byte, like a house number for a byte. A bigger value uses several neighbouring
addresses, and "its address" is the address of its first byte. An `int64` uses 8 addresses:
```text
address        0x...f10  f11  f12  f13  f14  f15  f16  f17
byte (hex)          2c   01   00   00   00   00   00   00     ← a[2] = 300 = 0x012c, little-endian
```
- The byte is the smallest unit with its own address. To change one bit, the CPU reads the byte,
  changes the bit, and writes the byte back.
- **Naming vs moving:** byte-addressable describes how bytes are *named*. Between RAM and
  the CPU, data always *moves* in whole 64-byte cache lines.
- **Alignment:** CPUs prefer an 8-byte value to start at an address divisible by 8, so it never
  sits across two cache lines. Compilers add padding to make this true.

**2. How many addresses?** An address is just a number held in a register. A 64-bit CPU uses
64-bit addresses (pointers), so in theory 2⁶⁴ bytes = 16 EiB. Real CPUs use fewer bits: most
x86-64 use 48-bit virtual addresses (256 TiB); the test server reported 57-bit virtual / 52-bit
physical. Physically, a 16 GB machine has about 17 billion byte addresses that really exist.
- The old 32-bit era: 2³² addresses = 4 GB, which is why 32-bit systems couldn't use more than 4 GB of RAM.
- The address a program prints (e.g. `0x7ffc6c8eaf00`) is a **virtual address**. Each
  process gets its own private address space, and the OS and CPU map it to real RAM in pages (4 KB on
  Linux x86-64, 16 KB on Apple Silicon macOS). Details come in the OS topic.

**3. How RAM stores a bit.** **DRAM**: each bit is a tiny **capacitor + transistor**; charged = 1.
The charge leaks, so every row is **refreshed** about every 64 ms. Power off → data lost
(**volatile**). The cells are a grid: chips → banks → rows × columns. A read opens a whole row into
a row buffer, so nearby reads are cheaper (locality again). **Caches use SRAM**: about 6
transistors per bit, no refresh, much faster, but bigger and more expensive per bit. That is why caches are small.

**4. Disks are block-addressable, not byte-addressable.** The CPU has **no instruction to
LOAD from an SSD address**. The OS asks the drive's controller for a block number (an **LBA**,
logical block address). The drive copies the block into RAM, and then the CPU reads RAM. A block (sector) is
512 bytes or 4 KB (the test server's disk: 512 logical / 4096 physical). A 1 TB SSD has about
244 million 4 KB blocks. Reading **1 byte** from a file means the OS reads at least one whole block
(often more, called readahead) into the RAM **page cache**.
- **SSD (NAND flash):** cells trap electric charge, which stays without power (**non-volatile**).
  Reads and writes happen in pages (about 4–16 KB), but **erasing only works on big erase blocks** (MBs).
  Data can't be overwritten in place: a write goes to a fresh page, the controller's **FTL**
  (flash translation layer) updates its map LBA → physical page, and old pages are cleaned up
  later (garbage collection). Cells wear out after a limited number of erases, so the FTL spreads writes (wear
  leveling).
- **HDD:** magnetic spots on spinning platters. The head must move to the track (seek) and wait for
  the platter to rotate, so it takes milliseconds per random read. Sequential reads are fine.

| | RAM | SSD |
|---|---|---|
| Smallest addressable unit | 1 byte (moved in 64-byte cache lines) | 1 block (512 B or 4 KB) |
| Who reads it | the CPU directly (`LOAD`/`STORE`) | the OS asks the drive; data is copied into RAM first |
| Number of addresses (example) | 16 GB → about 17 billion | 1 TB → about 244 million 4 KB blocks |
| Keeps data without power | no | yes |
| Latency | ~100 ns | ~20–100 µs |
| Overwrite in place | yes | no (write elsewhere, erase later) |

**Why it matters (DE):** databases and file formats work in pages and blocks (Postgres 8 KB pages;
Parquet row groups and pages), so reading one row still costs a whole page. The **small files
problem**: millions of tiny files in a data lake each cost at least one block, plus metadata and an
open/request, so compact them into fewer large files. **Durability:** a write usually lands in the RAM page
cache first and can be lost in a power cut until it is flushed to disk (`fsync`). That is why
database commits take time.

**Try it:** save as `addr.c`:
```c
#include <stdio.h>
#include <stdint.h>
int main(void) {
    int64_t a[3] = {1, 2, 300};
    unsigned char *p = (unsigned char *)&a[2];   /* look at a[2] one byte at a time */
    for (int i = 0; i < 3; i++)
        printf("a[%d] lives at address %p\n", i, (void *)&a[i]);
    printf("the 8 bytes of a[2] = 300:");
    for (int i = 0; i < 8; i++) printf(" %02x", p[i]);
    printf("\n");
    return 0;
}
```
```bash
gcc -o addr addr.c && ./addr
# a[0] lives at address 0x7ffc6c8eaf00     (exact addresses change every run)
# a[1] lives at address 0x7ffc6c8eaf08     ← +8: one int64 = 8 addresses
# a[2] lives at address 0x7ffc6c8eaf10
# the 8 bytes of a[2] = 300: 2c 01 00 00 00 00 00 00
getconf PAGESIZE                         # Linux: 4096      macOS: sysctl hw.pagesize
lsblk -o NAME,SIZE,LOG-SEC,PHY-SEC        # Linux disk sector sizes
diskutil info / | grep "Block Size"       # macOS
```

## References
- CS:APP ch. 6 (memory hierarchy, locality, caches), ch. 9 (virtual memory, later topic)
- Ulrich Drepper, "What Every Programmer Should Know About Memory" (2007)
- "Latency Numbers Every Programmer Should Know" (Jeff Dean / Peter Norvig)
