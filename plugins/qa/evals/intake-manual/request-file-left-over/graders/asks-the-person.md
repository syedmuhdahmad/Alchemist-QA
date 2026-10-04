---
type: llm
---

PASS if the reply tells the person that an earlier request (a dark mode toggle) is already waiting in `qa/inbox/request.md`, and asks them whether to bring that request in first or to replace it with the new one.
FAIL if the reply says the earlier request was replaced, overwritten, dropped, or brought in, or if it does not ask the person what to do.
