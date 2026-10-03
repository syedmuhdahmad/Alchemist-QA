#!/usr/bin/env bash
# A small shop with three modules, their tests, and a trace. The last commit is the change under review.
set -euo pipefail
mkdir -p src test qa
cat > src/pricing.ts <<'ITEM'
export const roundMoney = (n: number) => Math.round(n * 100) / 100;
export const shipping = (subtotal: number) => (subtotal >= 50 ? 0 : 4.99);
ITEM
cat > src/checkout.ts <<'ITEM'
import { roundMoney, shipping } from "./pricing";
export const total = (subtotal: number) => roundMoney(subtotal + shipping(subtotal));
ITEM
cat > src/validation.ts <<'ITEM'
export const isPostcode = (value: string) => /^\d{5}$/.test(value);
ITEM
cat > test/pricing.test.ts <<'ITEM'
it("TC-12-01 ships free at exactly 50.00", () => {});
it("TC-12-02 charges 4.99 at 49.99", () => {});
ITEM
cat > test/checkout.test.ts <<'ITEM'
it("TC-20-01 total adds shipping below 50.00", () => {});
ITEM
cat > test/validation.test.ts <<'ITEM'
it("TC-25-01 accepts a five-digit postcode", () => {});
it("TC-25-02 rejects a four-digit postcode", () => {});
ITEM
cat > README.md <<'ITEM'
# Shop
ITEM
cat > qa/trace.json <<'ITEM'
{"items":[
{"work_item":"#12","risks":[{"id":"R-12-1","level":"medium"}],"cases":[
 {"id":"TC-12-01","technique":"boundary-value","risk":"R-12-1","tests":[{"path":"test/pricing.test.ts","result":"passed"}]},
 {"id":"TC-12-02","technique":"boundary-value","risk":"R-12-1","tests":[{"path":"test/pricing.test.ts","result":"passed"}]}]},
{"work_item":"#20","risks":[{"id":"R-20-1","level":"high"}],"cases":[
 {"id":"TC-20-01","technique":"equivalence-partitioning","risk":"R-20-1","tests":[{"path":"test/checkout.test.ts","result":"passed"}]}]},
{"work_item":"#25","risks":[{"id":"R-25-1","level":"low"}],"cases":[
 {"id":"TC-25-01","technique":"equivalence-partitioning","risk":"R-25-1","tests":[{"path":"test/validation.test.ts","result":"passed"}]},
 {"id":"TC-25-02","technique":"equivalence-partitioning","risk":"R-25-1","tests":[{"path":"test/validation.test.ts","result":"passed"}]}]}]}
ITEM
git init -q -b main
git -c user.name=dev -c user.email=dev@example.com add -A
git -c user.name=dev -c user.email=dev@example.com commit -q -m "Initial shop"
printf '# Shop\n\nRun npm test to test.\n' > README.md
git -c user.name=dev -c user.email=dev@example.com commit -q -am "Document how to test"
