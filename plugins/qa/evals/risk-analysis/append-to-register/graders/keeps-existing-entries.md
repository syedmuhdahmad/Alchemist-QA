---
type: regex
target: { source: file, path: qa/risk-register.md }
# The whole #12 section from the fixture, both rows in order, character for character.
pattern: "## #12: Apply a promo code in the cart\\n\\n\\| Id \\| Risk \\| Likelihood \\| Impact \\| Level \\| Response \\|\\n\\|(?: -{3} \\|){6}\\n\\| R-12-1 \\| A product on sale is discounted again, so the shop loses money on every such order\\. \\| medium \\| high \\| high \\| Decision table over code and sale status; every case reviewed\\. \\|\\n\\| R-12-2 \\| The discount is rounded the wrong way, so totals are off by a cent\\. \\| medium \\| low \\| low \\| Equivalence partitions on amounts; happy path only\\. \\|"
---
