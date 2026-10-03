# Boundary value analysis

CTFL v4.0.1, section 4.2.2. Applies only to partitions whose values are ordered, such as amounts, counts, lengths, and dates.

1. Find each boundary: the edge where one partition ends and the next begins.
2. Use two values per boundary: the last value inside the partition and the first value outside it, at the smallest step the field allows (one unit, one cent, one character, one day).
3. Use three values (just below, on, just above) when the rule says "at least", "at most", or "from", because those words are where off-by-one mistakes live.
4. Say which side each value is on in the case, so a failure points at the exact comparison.

Example: "free shipping when the subtotal is 50.00 or more". The step is one cent, so test 49.99 (charged) and 50.00 (free); add 50.01 for three-value analysis.
