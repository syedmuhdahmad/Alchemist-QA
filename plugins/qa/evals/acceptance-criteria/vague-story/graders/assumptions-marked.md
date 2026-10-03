---
type: llm
focus: { source: file, path: qa/basis/40.acceptance.md }
---

PASS if behaviour the story does not state (for example a limit on saved items, what happens to quantity, or whether saved items survive signing out) is marked as an assumption with a question for the owner, and the stated rules (move to saved, move back, saved items not in the cart total) each have a scenario.
FAIL if the file states unstated behaviour as fact with no assumption marker, or a stated rule has no scenario.
