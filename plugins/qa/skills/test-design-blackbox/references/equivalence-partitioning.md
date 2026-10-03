# Equivalence partitioning

CTFL v4.0.1, section 4.2.1.

1. For each input or output named in the rule, split its possible values into groups the product must treat the same way. Include groups of invalid values.
2. Each group is a partition. Partitions do not overlap, and together they cover every value.
3. Write one case per valid partition. Several valid partitions may share a case when nothing is lost by it.
4. Write one case per invalid partition, alone. Two invalid values in one case hide each other: the first rejection masks the second.
5. Pick a value from the middle of the partition, not its edge. Edges belong to boundary values.

Example: a promo code field. Valid partitions are "the known code in upper case" and "the known code in another case". Invalid partitions are "an unknown code" and "an empty field".
