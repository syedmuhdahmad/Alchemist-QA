# Alchemy Shop: web

Benchmark app for Alchemist-QA. React with Vite.

**It contains seeded defects on purpose. Do not fix them.** The requirements it should meet are in [`../REQUIREMENTS.md`](../REQUIREMENTS.md).

It needs the API from `../api` on port 3001. Vite proxies `/api` to it.

```bash
npm install && npm run dev
```

Add `?fail=1` to the page URL to make order placement fail, so the error path can be tested.
