# Part 2: Floating point and text encoding

> **Objective:** You can explain why `0.1 + 0.2 != 0.3`, choose between `float` and
> `decimal` for a column, and explain how ASCII and UTF-8 store text as bytes.
> **Date:** 2026-11-20 · **Prev:** [01](01-bits-bytes-integers.md) · **Next:** [03](03-cpu-basics.md)

## TL;DR
- A float is binary scientific notation with a **fixed number of significant digits** (float64 ≈ 15–17, float32 ≈ 7). Every operation **rounds** to the nearest representable value.
- 0.1 repeats forever in binary, so it can't be stored exactly → `0.1 + 0.2 != 0.3`. Never compare floats with `==`; float addition is **not associative**.
- Money: `DECIMAL(p, s)` or `BIGINT` minor units (satang). Measurements / ML: `float64`.
- Unicode = catalogue (character → code point, e.g. `U+0E01`). UTF-8 = encoding (code point → 1–4 bytes). Thai = 3 bytes per code point, emoji = 4.
- UTF-8 bytes: `0…` = ASCII, `110…`/`1110…`/`11110…` = lead byte (number of leading 1s = bytes in the character), `10…` = continuation.

## Intuition
1/3 in decimal is `0.3333…`, so with a fixed number of digits you must stop and round. 1/10 in
**binary** is `0.000110011001100…`, which also repeats forever. So `0.1` is stored as the nearest
double, not as 0.1. Only sums of powers of 2 (0.5, 0.25, 0.375) are exact.

For text: the CPU knows only numbers, so we need an agreed table (character → number) and a
rule for writing those numbers as bytes. If the writer and reader use different tables, you get garbage.

## Mechanics

### IEEE 754
```text
value = (-1)^sign  ×  1.fraction  ×  2^(exponent - bias)

float64 ("double"), 64 bits:
┌──────┬───────────────┬──────────────────────────────────────────┐
│ sign │ exponent      │ fraction (mantissa)                      │
│ 1 bit│ 11 bits       │ 52 bits                                  │
└──────┴───────────────┴──────────────────────────────────────────┘
float32: 1 + 8 + 23 bits
```

| Type | Bits | Significant decimal digits | Integers exact up to |
|---|---|---|---|
| `float32` | 32 | about 7 | 2²⁴ = 16,777,216 |
| `float64` | 64 | about 15–17 | 2⁵³ ≈ 9.0 × 10¹⁵ |

The exponent sets the size (so the point "floats"); the fraction sets the precision.

### Why `0.1 + 0.2 != 0.3`
```text
0.1        is stored as  0.1000000000000000055511151231257827...
0.2        is stored as  0.2000000000000000111022302462515654...
0.1 + 0.2  rounds to     0.3000000000000000444089209850062616...
0.3        is stored as  0.2999999999999999888977697537484345...
```
Three roundings (store 0.1, store 0.2, round the sum). The sum lands on the double just above
0.3, while `0.3` is the double just below. Raw bits of 0.1 as float64: `3fb999999999999a`.
The `9`s are the repeating `1001` pattern, and the final `a` is where it rounded up.

### Consequences
1. Compare with a tolerance: `math.isclose`, `pytest.approx`.
2. Not associative: `(0.1 + 0.2) + 0.3 = 0.6000000000000001`, `0.1 + (0.2 + 0.3) = 0.6`.
3. Big + small loses the small: `1e16 + 1 - 1e16 = 0.0` (the gap between doubles at 10¹⁶ is 2).

### Float vs decimal
| Use | Pick |
|---|---|
| Money, prices, balances, anything that must add up exactly | `DECIMAL(p, s)`, or `BIGINT` minor units |
| Measurements, scientific values, ML features, ratios | `float64` / `DOUBLE` |

### ASCII, Unicode, UTF-8
- **ASCII:** 7 bits, 128 characters. `A` = `0x41`, `a` = `0x61`, `0` = `0x30`, newline = `0x0a`.
- **Unicode:** a code point for every character (`U+0E01` = ก, `U+1F600` = 😀). Thai is `U+0E00–U+0E7F`. Not an encoding.
- **UTF-8:** 1–4 bytes per code point; every ASCII file is valid UTF-8.

```text
code point range      bytes   bit pattern
U+0000  – U+007F       1      0xxxxxxx                              ← same as ASCII
U+0080  – U+07FF       2      110xxxxx 10xxxxxx
U+0800  – U+FFFF       3      1110xxxx 10xxxxxx 10xxxxxx            ← Thai
U+10000 – U+10FFFF     4      11110xxx 10xxxxxx 10xxxxxx 10xxxxxx   ← emoji

lead byte: number of leading 1s = number of bytes in the character
continuation byte: always starts with 10
```

## Worked example: `ก` (U+0E01) → UTF-8
```text
1. U+0E01 in binary:          0000 1110 0000 0001
2. Range U+0800–U+FFFF → 3 bytes: 1110xxxx 10xxxxxx 10xxxxxx (16 x's)
3. Split 4 + 6 + 6:            0000 | 111000 | 000001
4. Fill in:   1110 0000   10 111000   10 000001  =  E0 B8 81
```
`"ไทย"` = 3 code points, 9 bytes. `"ที่"` looks like one character but is 3 code points (ท + ี + ่).

**Mojibake** = decoding with the wrong encoding: UTF-8 `café` read as Latin-1 → `cafÃ©`.
A Thai `cp874`/TIS-620 file read as UTF-8 → `UnicodeDecodeError: invalid continuation byte`.

## Try it yourself
```bash
python3 -c '
from decimal import Decimal
print(0.1 + 0.2, 0.1 + 0.2 == 0.3)            # 0.30000000000000004 False
print(Decimal(0.1))                             # the exact stored value
print(Decimal("0.1") + Decimal("0.2"))          # 0.3   (string in -> exact decimal)
t = 0.0
for _ in range(10): t += 0.1
print(t, t == 1.0)                              # 0.9999999999999999 False
print((0.1 + 0.2) + 0.3, 0.1 + (0.2 + 0.3))     # 0.6000000000000001 0.6
print(float(2**53 + 1))                         # 9007199254740992.0  (the +1 is lost)
'
```
⚠️ `Decimal(0.1)` converts an already-rounded float; `Decimal("0.1")` is exact. Create decimals from strings.

```bash
python3 -c '
for s in ["A", "é", "ก", "ไทย", "ที่", "😀"]:
    b = s.encode("utf-8")
    print(repr(s), "code points:", len(s), "bytes:", len(b), b.hex(" "))
print("café".encode("utf-8").decode("latin-1"))
'
```
**Expected output:**
```text
'A' code points: 1 bytes: 1 41
'é' code points: 1 bytes: 2 c3 a9
'ก' code points: 1 bytes: 3 e0 b8 81
'ไทย' code points: 3 bytes: 9 e0 b9 84 e0 b8 97 e0 b8 a2
'ที่' code points: 3 bytes: 9 e0 b8 97 e0 b8 b5 e0 b9 88
'😀' code points: 1 bytes: 4 f0 9f 98 80
cafÃ©
```

```bash
printf 'ไทย hello\n' > th.txt
file th.txt            # th.txt: Unicode text, UTF-8 text   (older: "UTF-8 Unicode text")
od -An -tx1 th.txt     # e0 b9 84 e0 b8 97 e0 b8 a2 20 68 65 6c 6c 6f 0a
```
`file` guesses the encoding; files carry no "I am UTF-8" label.

## Why it matters in practice
- **Money in `FLOAT`/`DOUBLE`:** totals like `.9999999`, reports that don't reconcile. Use `DECIMAL` or `BIGINT` satang.
- **Spark sums that change between runs:** partitions are combined in a different order each run, and float addition isn't associative.
- **Big IDs in JSON:** a JavaScript `Number` is float64, so integers above 2⁵³ lose precision; that is why some APIs send `id_str`.
- **Broken Thai in CSVs:** legacy `cp874`/TIS-620 files read as UTF-8; an Excel BOM (`EF BB BF`) makes the first column `﻿id`. Read with `encoding="cp874"` / `"utf-8-sig"`.
- **Length limits:** bytes vs characters (100 Thai characters = 300 bytes). MySQL `utf8` = at most 3 bytes, so no emoji; use `utf8mb4`.

## Misconceptions & interview traps
- ❌ "Float error is random" → ✅ rounding is exact and repeatable (IEEE 754); results change only when the order of operations changes.
- ❌ "Float for money, round on display" → ✅ errors build up before display, and rounding hides real differences; store money exactly.
- ❌ "Unicode = UTF-8" → ✅ Unicode is the catalogue; UTF-8 (and UTF-16, used by Java/JS strings) are encodings.
- ❌ "1 character = 1 byte" → ✅ only for ASCII; Thai is 3 bytes, emoji 4, and one visible Thai character can be several code points.

## Check for understanding

**Q1.** Spark `SUM(amount)` on a `DOUBLE` column gives `1234567.8900000001` one run and
`1234567.89` the next, on the same data. Why? What type for money, and why?
- **My answer (summary):** Data is split differently each run, e.g. (0.1+0.4)+(0.2+0.3) vs
  (0.1+0.2)+(0.3+0.4); different additions round differently. (Money type not answered.)
- **Feedback:** Core cause ✅: partitions are combined in a different grouping/order, each
  addition rounds, float addition is not associative. Note: that specific example gives `1.0`
  every way; `(0.1+0.2)+0.3` vs `0.1+(0.2+0.3)` shows the effect. ❌ Missing half: use
  `DECIMAL(p, s)` or `BIGINT` minor units. These store base-10 exactly, so addition is exact and
  gives the same total in any order.

**Q2.** Bytes `E0 B8 81 41`. (a) Characters as UTF-8, and how to tell from the first bits?
(b) Characters as Latin-1, and is the file damaged?
- **My answer (summary):** "it contains 2 bytes, I don't know".
- **Feedback:** ❌. (a) 4 bytes, **2 characters** (`ก` + `A`):
  ```text
  E0  1110 0000   lead byte, three 1s → 3-byte character
  B8  1011 1000   10 → continuation
  81  1000 0001   10 → continuation (character done)
  41  0100 0001   0  → ASCII 'A'
  ```
  (b) Latin-1 shows **4 characters** (`à`, `¸`, invisible U+0081, `A`). The bytes are **not
  damaged**; re-read as UTF-8 and you get `กA`. But if the tool **saves** it as UTF-8, it
  becomes `C3 A0 C2 B8 C2 81 41`. That is **double encoding**, and now the file really is damaged.
- **Another angle (train):** each character is a train. The engine (lead byte) shows how many cars
  (count of leading 1s); every car (continuation) starts with `10`; a byte starting with `0` is an
  engine with no cars (ASCII). A reader can resync anywhere by skipping `10…` bytes.
  ```python
  data = bytes.fromhex("e0 b8 81 41")
  for byte in data:
      bits = f"{byte:08b}"
      if bits.startswith("0"):
          role = "1-byte character (ASCII)"
      elif bits.startswith("10"):
          role = "continuation byte"
      else:
          n = len(bits) - len(bits.lstrip("1"))   # count the leading 1s
          role = f"lead byte: character uses {n} bytes"
      print(f"{byte:02X}  {bits}  {role}")
  ```
  Output:
  ```text
  E0  11100000  lead byte: character uses 3 bytes
  B8  10111000  continuation byte
  81  10000001  continuation byte
  41  01000001  1-byte character (ASCII)
  ```

## References
- CS:APP ch. 2.4 (floating point)
- David Goldberg, "What Every Computer Scientist Should Know About Floating-Point Arithmetic"
- Python docs: `decimal`, "Floating Point Arithmetic: Issues and Limitations"
- Joel Spolsky, "The Absolute Minimum Every Software Developer Must Know About Unicode and Character Sets"
- RFC 3629 (UTF-8)
