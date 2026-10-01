# Dungeon Mapper engineering priorities

## Value before perfection

- Weigh expected user benefit and risk against time, effort, complexity,
  maintenance and compute/CI cost before starting or escalating work.
- If the likely benefit is negligible, proactively recommend against further
  work before requesting more budget or starting another diagnostic loop.
  Do not wait for the owner to question the value.
- Prefer reliable, simpler behavior over tiny optimizations or pixel-level
  perfection without demonstrated user impact. Available budget is not a
  spending target.
- Protect meaningful correctness: map geometry, editing, save/recovery,
  player-safe fog and hidden content, usable exports/print scale, accessibility,
  privacy and security. Small differences can matter in those contexts.
- When an optimization is removed, review whether its specialized test still
  serves an active requirement before investing in more exactness.
- Keep findings and uncertainty explicit. This preference does not authorize
  changing required checks, tolerances, budgets or release gates without
  separate explicit approval, nor treating failed evidence as passing.

The owner's October 1, 2026 decision and concrete rendering example are in
[the UX-09 handoff](../docs/UX-09-HANDOFF.md#owner-value-judgment-proportionate-quality-work).
Apply this principle to all work in this repository, not only that example.
