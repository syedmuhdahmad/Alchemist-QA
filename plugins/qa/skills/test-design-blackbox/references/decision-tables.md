# Decision tables

CTFL v4.0.1, section 4.2.3. Use when a result depends on two or more conditions together.

1. List the conditions (each true or false, or a small set of values) and the actions.
2. Write every combination as a column. With n true-or-false conditions there are 2^n columns.
3. Remove columns that cannot happen, and merge columns whose result does not depend on one condition. Note each merge.
4. Each remaining column is one case. Its expected result is the set of actions for that column.
5. Note any column the basis does not settle. That is a gap: raise it as a question, and do not invent the answer.

Example: a promo code and a product on sale. Conditions: code valid, product on sale. Four columns; only "valid and not on sale" is discounted.
