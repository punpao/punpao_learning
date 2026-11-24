# Part 1: Bits, bytes, hex and integers

> **Objective:** You can convert between binary, decimal and hex, explain how a signed
> integer is stored (two's complement), and predict when an integer overflows.
> **Date:** 2026-11-20 · **Prev:** — · **Next:** [02](02-floats-and-text.md)

## TL;DR
- Everything in a computer is bits. **Bits have no meaning by themselves; the program reading them gives the meaning.** `1111 1011` is 251 (unsigned) or −5 (signed).
- 1 byte = 8 bits = 256 values. 1 hex digit = 4 bits, so 1 byte = 2 hex digits (`0xfb`).
- n-bit unsigned: 0 … 2ⁿ − 1. n-bit signed (two's complement): −2ⁿ⁻¹ … 2ⁿ⁻¹ − 1. The top bit has a **negative** place value.
- Negate by hand: flip all the bits, then add 1.
- Fixed-width integers **overflow**: C/Java/NumPy wrap silently (C signed = undefined behaviour), SQL raises an error, Python `int` never overflows.

## Intuition
A computer stores everything as rows of tiny on/off switches (bits). There is no "number 5"
or "letter A" inside, only bit patterns. The same 8 bits can be a positive number, a negative
number, a character or part of a pixel. It depends only on how the program reads them. Many
bugs come from one program writing bits with one meaning and another program reading them
with a different meaning.

## Mechanics

### Binary
Each place is a power of 2:

```text
bit position:   7    6    5    4    3    2    1    0
place value:  128   64   32   16    8    4    2    1

  0 0 0 0 1 1 0 1   =  8 + 4 + 1  =  13
```

Numbers worth memorizing: 2⁸ = 256 · 2¹⁰ = 1,024 · 2¹⁶ = 65,536 · 2³¹ ≈ 2.1 billion ·
2³² ≈ 4.3 billion · 2⁶³ ≈ 9.2 × 10¹⁸.

### Hex
Base 16, with digits `0–9 a–f`. One hex digit = 4 bits, so one byte = two hex digits.

```text
binary:   1111 1011
hex:         f    b      →  0xfb  =  15×16 + 11  =  251
```

Hex is not a different kind of number; it is a short way to write bits. It shows up in
memory addresses, hashes, UUIDs, colours (`#ff8800`) and hex dumps.

### Unsigned vs signed (two's complement)

```text
int8 (two's complement):
bit position:    7    6    5    4    3    2    1    0
place value:  -128   64   32   16    8    4    2    1

  0111 1111  =  127   (largest int8)
  1000 0000  = -128   (smallest int8)
  1111 1111  =  -1
```

| Type | Range |
|---|---|
| `uint8` | 0 … 255 |
| `int8` | −128 … 127 |
| `int32` | −2,147,483,648 … 2,147,483,647 |
| `int64` | about ±9.2 × 10¹⁸ |

**Why two's complement?** The same adder circuit gives correct results for both signed and
unsigned numbers, with no special logic for a minus sign:
`0000 0101 (5) + 1111 1111 (−1) = 1 0000 0100`. The 9th bit falls off, which leaves
`0000 0100` = 4 ✓.

For n bits, signed value = unsigned value − 2ⁿ when the top bit is 1
(for example `1000 0001`: 129 − 256 = −127).

### Integer overflow
When a result needs more bits than the type has, the extra bits are dropped and the value wraps:

```text
int8:   0111 1111  (127)
      +         1
      = 1000 0000  (-128)

The int8 number line is a circle: ... 126, 127, -128, -127, ... -1, 0, 1, ...
```

| Language / type | On overflow |
|---|---|
| C/C++ unsigned | wraps (defined) |
| C/C++ signed | **undefined behaviour** |
| Java `int`/`long` | wraps silently (`Math.addExact` throws instead) |
| Python `int` | never overflows (any size) |
| NumPy / pandas fixed ints | wraps silently |
| SQL `INTEGER`/`BIGINT` | raises an error |

### Byte order (endianness), short intro
How the bytes of a multi-byte number are ordered in memory. **Little-endian** (least
significant byte first) is used by x86 and normally ARM, so almost all laptops and servers.
**Big-endian** (most significant byte first) is used by network protocols ("network byte order").

```text
the number 1 as 4 bytes:
big-endian:     00 00 00 01
little-endian:  01 00 00 00
```

## Worked example: −5 as an `int8`
1. +5 = `0000 0101`
2. Flip the bits → `1111 1010`
3. Add 1 → `1111 1011` = `0xfb`
4. Check: −128 + 64 + 32 + 16 + 8 + 2 + 1 = −5 ✓
5. The same bits read as unsigned = 251.

## Try it yourself
```bash
python3 -c '
print(bin(13), hex(255), int("ff", 16), int("1101", 2))
print((-5).to_bytes(1, "big", signed=True).hex(), (251).to_bytes(1, "big").hex())
print((1).to_bytes(4, "big").hex(), (1).to_bytes(4, "little").hex())
import sys; print(sys.byteorder)
print(2**100)
'
```
**Expected output:**
```text
0b1101 0xff 255 13
fb fb
00000001 01000000
little
1267650600228229401496703205376
```

NumPy overflow (needs `pip install numpy`); notice that there is no error:
```bash
python3 -c 'import numpy as np; print(np.array([2147483647], dtype=np.int32) + 1)'
# [-2147483648]
```

C overflow (`gcc` on Linux; on macOS `gcc` is clang and works the same). Save as `overflow.c`:
```c
#include <stdio.h>
#include <stdint.h>
int main(void) {
    int32_t a = 2147483647;   /* largest int32 */
    uint8_t b = 255;          /* largest uint8 */
    int8_t  c = 127;          /* largest int8  */
    b = b + 1;
    c = (int8_t)(c + 1);
    printf("uint8  255 + 1 = %u\n", b);
    printf("int8   127 + 1 = %d\n", c);
    /* do the add as unsigned (defined wrap), then read the bits as signed */
    printf("int32  max + 1 = %d\n", (int32_t)((uint32_t)a + 1u));
    return 0;
}
```
```bash
gcc -Wall -o overflow overflow.c && ./overflow
# uint8  255 + 1 = 0
# int8   127 + 1 = -128
# int32  max + 1 = -2147483648
```

The real bytes of a file:
```bash
printf 'Hi!\n' > hi.txt
xxd hi.txt               # macOS has it; Linux may need `apt install xxd`
od -An -tx1 hi.txt       # works on both:  48 69 21 0a
```
`48 69 21 0a` = `H`, `i`, `!`, newline.

## Why it matters in practice
- **Running out of IDs:** a 32-bit `INTEGER` primary key stops at 2,147,483,647, and then
  inserts fail. Fixing it needs a migration to `BIGINT` on a big, busy table. YouTube's view
  counter was 32-bit signed until "Gangnam Style" passed 2³¹ − 1 views in 2014.
- **Silent wrong numbers in pipelines:** summing or casting to `int32` in pandas/NumPy can
  wrap into negative numbers with no error. Parquet/Spark column widths (`INT32` vs `INT64`)
  must match between the writer and the reader.
- **Year 2038:** Unix time stored as signed 32-bit seconds overflows on 2038-01-19.
- **Reading hex:** hashes, UUIDs, addresses in crash logs and hex dumps of files.

## Misconceptions & interview traps
- ❌ "Python ints overflow at 2⁶³" → ✅ plain Python `int` has no limit, **but** NumPy, pandas, Java, C and DB columns are fixed-width and do overflow.
- ❌ "Overflow always throws an error" → ✅ C/Java/NumPy usually wrap silently (C signed is undefined behaviour); SQL databases raise an error.
- ❌ "`abs(x)` is always ≥ 0" → ✅ `Math.abs(Integer.MIN_VALUE)` returns `-2147483648`, because +2,147,483,648 doesn't fit in an `int32`. The same idea causes the binary-search bug `mid = (lo + hi) / 2`; use `lo + (hi - lo) / 2`.

## Check for understanding

**Q1.** An `int8` holds the bits `1000 0001`. What is it as unsigned, and as signed (two's complement)?
- **My answer (summary):** unsigned 128 + 1 = 120; signed −128 + 1 = −127.
- **Feedback:** Signed ✅. Unsigned ❌: 128 + 1 = **129** (a slip; the method was right).
  Check: signed = unsigned − 2⁸ → 129 − 256 = −127.

**Q2.** A Postgres table uses `INTEGER` (32-bit signed) for its auto-increment `id`, at about
50 rows/s, all day. How long until inserts fail? What would you change, and what else must change?
- **My answer (summary):** the limit is 2³¹ − 1; solve `2³¹ − 1 − (50·60·60·60·24)·n < 0` for n
  days (not computed). Would change to a string, or to unsigned int to double the time.
- **Feedback:** Partly right.
  - The formula has an extra `× 60`: a day is 60 × 60 × 24 = **86,400 s**. Finish the estimate:
    2.15 × 10⁹ ÷ (50 × 86,400 ≈ 4.32 × 10⁶ per day) ≈ **497 days ≈ 1.4 years**.
  - A string id: no. It is bigger, slower to index and compare, sorts wrongly (`"10" < "9"`), and doesn't solve anything.
  - Unsigned: **Postgres has no unsigned integer types** (MySQL's `INT UNSIGNED` exists and only doubles the time to about 2.7 years).
  - ✅ The fix is **`BIGINT`** (+ `ALTER SEQUENCE … AS bigint`): it lasts about 5.8 billion years at 50/s.
  - Also change: foreign-key columns in other tables; app code reading the id as a 32-bit
    type (Java `int`, protobuf `int32`); Spark/Parquet/warehouse schemas. Plan the migration
    (a type change rewrites and locks a big table, so add a new column, backfill, swap). Rolled-back inserts
    still use up sequence values. Alert before the limit. Postgres fails loudly at the limit
    (`reached maximum value of sequence` / `integer out of range`). It does not wrap.

## Quick quiz (2026-11-20): 1/4

**Q1.** (a) `0x7F` and `0x80` as `int8`; (b) −20 as `int8` in binary and hex.
- **My answer:** (a) 127 (0x80 not answered); (b) `1110 1100` = `0xEC`.
- **Feedback:** ¾. (a) `0x80` = `1000 0000` = **−128**. (b) correct.

**Q2.** Java: `int a = 2_000_000_000; int b = 2_000_000_000; long total = a + b;`. What prints?
- **My answer:** 4,000,000,000 (because `long` is 64 bits).
- **Feedback:** ❌. It prints **−294,967,296**. `a + b` is calculated in 32-bit `int` arithmetic
  first and wraps (4,000,000,000 − 2³²). Only then is it widened to `long`. The type you assign
  to does not change how the right-hand side is calculated. Fix: `(long) a + b`, or use
  `Math.addExact` to throw on overflow.

**Q3.** pandas `int32` columns: 50,000 × 99,000 gives 655,032,704. Correct value, why, fix?
- **My answer:** no idea; thought int32 can still hold 50,000 × 99,000.
- **Feedback:** ❌. Correct = **4,950,000,000**. `int32` = 32 **bits** (max ≈ 2.1 billion, 10 digits), not 32 digits.
  The inputs fit, but the product doesn't. Only the low 32 bits are kept:
  4,950,000,000 − 2³² = 655,032,704. That is below 2³¹, so it reads as **positive**. Wrapped values are not always
  negative, which makes them hard to spot. Fix: `.astype("int64")` before multiplying; store money as `int64`;
  add sanity checks.
- **Another angle (odometer):** a 6-digit car odometer shows 500,000 after 1,500,000 km. The number is positive and looks normal, but it's wrong.
  ```bash
  python3 -c 'print((50_000 * 99_000) % 2**32)'   # 655032704: keep only the low 32 bits
  ```

**Q4.** Unix time in **milliseconds** in a signed 32-bit int. How long until overflow?
- **My answer:** 2³¹ − 1 milliseconds (not converted).
- **Feedback:** ¼. Finish with a number and a unit:
  2³¹ ms ≈ 2.15 × 10⁹ ms ÷ 1,000 ≈ 2.15 × 10⁶ s ÷ 86,400 ≈ **24.9 days** (late January 1970).
  Millisecond timestamps need `int64`; today's is about 1.8 × 10¹².
  That's why Java's `currentTimeMillis()` returns `long`.

## References
- *Computer Systems: A Programmer's Perspective* (CS:APP), ch. 2.1–2.3
- `man xxd`, `man od`
- Python docs: `int.to_bytes`, `bin`, `hex`
- PostgreSQL docs: Numeric Types (8.1), `CREATE SEQUENCE`
