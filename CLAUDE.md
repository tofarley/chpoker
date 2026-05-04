# chpoker — Chinese Poker Puzzle (single-player web)

## What this is

Browser-based puzzle. Player is dealt 13 cards and arranges them into Front (3) /
Middle (5) / Back (5) hands. The legality rule is **Back ≥ Middle ≥ Front** in
poker hand strength; violating it is a "foul." After arranging, the **Solve**
button reveals three different optimal arrangements so the player can compare.

No backend, no auth, no App Store. Static site, ships from any CDN. Runs on iOS
Safari and any modern browser. Built without a Mac (Vite + static hosting).

## Stack

- **Vite 5 + Svelte 4 + TypeScript** (Node 18+; Node 22+ would let us use the
  current `create-vite`, but we hand-rolled the scaffold so any modern Node
  works).
- **interactjs** for drag/drop (touch + pointer, no HTML5-DnD ghosting).
- **pokersolver** is installed but **not currently used** — the custom evaluator
  in `src/lib/evaluator.ts` returns total-ordering integers, which is what the
  solver needs. Keep it as a fallback if we ever need authoritative hand
  parsing.
- **No card-image dependency.** Cards are drawn in `src/components/Card.svelte`
  with CSS — corner rank/suit + giant centered glyph. Trivial to swap in SVG
  faces later.

## Where things live

```
src/
  App.svelte                       # root: header, board, status, actions, solve panel
  lib/
    types.ts                       # Card, Arrangement, ArrangementNames, SolveResult
    deck.ts                        # fullDeck, shuffle (crypto.getRandomValues), dealHand
    evaluator.ts                   # rank3, rank5, name functions, normalization helpers
    solver.ts                      # 72,072-partition enumerator → 3 arrangements + foul check
    sound.ts                       # Web Audio synth (no assets) + soundEnabled store
  components/
    Card.svelte                    # CSS-drawn card (data-card-id is the drag handle)
    HandRow.svelte                 # one labeled row (data-row-name = front/middle/back)
    Board.svelte                   # owns interactjs wiring; emits 'change' on every move
    MiniArrangement.svelte         # non-interactive 3-row mini card display (solve panel)
scripts/
  generate-fixtures.ts             # regenerate primedope oracle fixtures
tests/
  evaluator.test.ts                # rank3/rank5/naming unit tests
  manual-cases.test.ts             # hand-written fixtures (extend manual-cases.json)
  manual-cases.json                # JSON: cards + expected hand-name strings
  solver.test.ts                   # 122 fixtures × 4 assertions, vs primedope oracle
  fixtures/
    primedope-cases.json           # generated; checked in; ~120 cases
  oracle/
    primedope.ts                   # Node-vm wrapper around primedope's JS
    .cache/chinese-poker.js        # gitignored; lazy-fetched on first run
```

## Critical algorithm detail — the unified rank encoding

The 5-card middle and the 3-card front have to be **comparable** to detect fouls
where the front is stronger than the middle (e.g., front=AAA vs middle=KK752).
Both `rank3()` and `rank5()` return integers in the same encoding:

```
score = CATEGORY * 15^5 + (rank-tiebreak digits in base 15)
```

Categories use the standard poker ordering (1 = high card … 9 = straight flush).
A 3-card hand can only land in categories 1 (high), 2 (pair), or 4 (trips), but
its score is still in the same number space — so direct integer comparison
between a 3-card score and a 5-card score gives the correct cross-comparison.

The 3-vs-5 comparison comes up in two places: the live foul-check on every drag
(`checkArrangement` in `solver.ts`) and inside the enumerator's legality filter.

## What the solver returns

`solve(cards, userArrangement?) → SolveResult` runs all 72,072 legal partitions
once and tracks three different "optimal" answers in parallel:

- `optimum` — best **balanced** arrangement (max product of normalized hand
  strengths). Mirrors cpoker's `MaxProdEvaluator`. Often the most useful answer
  because it doesn't sacrifice one row for another.
- `strongestBack` — arrangement with the absolute strongest legal Back (lex
  order: max back, then max middle, then max front). Useful for "what's the
  best Back I could have made?"
- `strongestFront` — arrangement maximizing the Front (lex: max front, max
  middle, max back). Surprisingly often the "smart" play since the Front is the
  hardest position to fill.

Plus per-arrangement hand-name strings ("Aces full of Queens", etc.) and
`userIsLegal` / `userFoulReason` for the player's current arrangement.

The three answers can coincide. The UI hides duplicate sections (showing "same
as balanced" instead) — handled in `App.svelte` via `arrangementKey()`.

Solve runs in ~80ms for any 13-card hand; no web worker needed.

## UI conventions

- **Row order is Front (top) → Middle → Back (bottom).** Set in
  `Board.svelte`. The legality rule reads "each row beats the one above it,"
  which matches the visual stacking.
- **Cards in each row are center-justified** (`HandRow.svelte` →
  `justify-content: center`). The 3-card Front aligns visually with the 5-card
  rows.
- **Card sizing** is driven by CSS custom properties on the parent:
  `--card-w` and `--card-h`. Override these on a wrapper to resize cards in a
  given context. The main board uses
  `--card-w: clamp(40px, 9.5vw, 64px)`; `MiniArrangement` overrides with
  `--card-w: 38px`.
- **Card typography scales with `--card-w`.** `Card.svelte` sets
  `font-size: calc(var(--card-w) * 0.26)` and uses em-relative sizes for the
  rank indices and center glyph. **Do not switch to `vw`/`clamp` font sizing
  here** — that produces giant icons on small mini cards (the original bug
  that forced this rule). Override per-context in CSS if a different look is
  needed (e.g., `MiniArrangement` dims the center glyph so the corner indices
  dominate, like real-world mini cards).
- **`Card` has an `isStatic` prop** that disables `cursor: grab` and
  `touch-action: none`. Use `isStatic={true}` anywhere a card is purely
  decorative (e.g., the solve panel).

## Animation and sound on swap

- **Swap animation is a hand-rolled FLIP** (First, Last, Invert, Play) in
  `Board.svelte`'s `animateChange()`. We tried Svelte's `crossfade` first;
  it produced an ugly "rows expand to make room, then card slots in" effect
  because the transitioning slot stays in flex layout during the animation,
  so both rows briefly hold an extra slot.
- The FLIP approach avoids that entirely: the state change happens in one
  step (no transitional layout state), then we animate purely via CSS
  `transform`, which doesn't affect flex layout.
  1. Capture every `.card`'s `getBoundingClientRect()` BEFORE dispatching the
     state change. The dragged card's slot still has its drag-translate
     transform, so its captured rect is at the dropped position.
  2. Dispatch the change, `await tick()`. Svelte commits the new DOM —
     fresh `.card` elements at their final layout positions.
  3. For each card whose old vs new rect differs, set
     `transition: none; transform: translate(dx, dy)` to "invert" it back to
     its old position with no animation.
  4. On the next `requestAnimationFrame`, set
     `transition: transform 320ms ...; transform: ''` to "play" — the
     browser interpolates from the inverted state to identity.
- **Drag transform lives on `.card-slot` (not `.card`).** If it were on the
  inner `.card`, the slot's bbox wouldn't include the drag offset and the
  FLIP capture would record the home position instead of the dropped
  position. The `slotOf()` helper gets the slot from the `event.target`
  card.
- **`pendingSwap` flag** tells the dragend handler to skip its snap-back
  logic when a successful drop has already kicked off `animateChange()`
  (the dragged element is about to be destroyed by the state change, so
  resetting its inline transform would just fight the FLIP).
- **Sound** (`src/lib/sound.ts`) is fully synthesized — a band-pass-swept
  noise burst with an exponential decay envelope. No audio assets, royalty-
  free by construction. AudioContext is lazily constructed on first play and
  resumed if suspended (browsers require a user gesture, which the swap
  always is). `soundEnabled` is a writable store; the speaker button in the
  actions row toggles it, default on. Don't add assets — keep it synthesized
  so the bundle stays tiny and there are no licensing footguns.

## Drag/drop architecture and pitfalls

- interactjs is initialized in `Board.svelte`'s `onMount` with
  `interact('.card', { context: boardEl })`. The `context` option is what
  prevents the static cards in the solve panel (which live outside `boardEl`)
  from being draggable.
- Three interactjs targets:
  1. `.card` as draggable — translates via inline `transform`, tracks
     `data-x`/`data-y`.
  2. `.card` as dropzone — accepts `.card`, swaps the two cards' rows.
  3. `.row` as dropzone — accepts `.card`, moves it into the row (used for
     drops on empty space; also handles full rows via nearest-card swap).
- **Row counts (3/5/5) are an invariant.** Never temporarily violate them in
  state — every move in `Board.svelte` either swaps a card with one in the
  target row or fills a non-full row. The status bar still shows live counts
  defensively.

### The drag lag lesson (don't repeat this)

`Card.svelte` originally had `transition: transform 0.12s ease`. interactjs
updates the inline `transform` on every `move` event (60+/sec) — and CSS
transition animates *every* one of those changes with a 120ms ease, so the card
visibly lagged behind the cursor and "rubber-banded."

Rule: **never put `transition` on `transform` for any element interactjs is
moving.** Keep transitions on properties that don't change during drag
(`box-shadow`, `opacity`, etc.). The drag-end snap-back animation is applied
via inline `style.transition = 'transform 0.18s ease'` only at the moment we
clear the transform, then cleared after the animation.

## Algorithm references

- **`github.com/paulhankin/cpoker`** — Go reference for the optimal-arrangement
  search. Key takeaways we mirrored:
  - `Play()` enumerates partitions and scores each via a `HandEvaluator`.
  - `MaxProdEvaluator` multiplies normalized rank percentiles per row — this is
    what our `optimum` field does.
  - Their `RolloutEvaluator` simulates random opponents for EV-based scoring;
    that's the upgrade path if we want a true win-rate metric.
  - Scoring rule for head-to-head play (not used yet): 1 point per row won, +3
    bonus for scooping all three. Useful when we add a Monte Carlo win-rate.
- **`https://www.primedope.com/play-online-chinese-poker/`** — rules reference
  and the existing UI we're improving on (clunky click-to-place, no drag).

## What's not built yet (intentional)

- **Win-rate vs random opponent** (a `winrate.ts` module). Approach: deal
  random 13-card opponents from the remaining 39 cards, solve each at
  MaxProd, score using the 1-6 rule from the cpoker docs. 1k samples in ~1s.
- **SVG card faces** — current CSS cards work fine; aesthetics-only upgrade.
  Adrian Kennard's public-domain "Vector Playing Cards" set is the obvious
  vendor target.
- **PWA install** (manifest + service worker — trivial when desired). The
  HTML already has `viewport-fit=cover` and a theme-color.
- **Web worker** for the solver. Not needed at <100ms.
- **History / undo** of the user's drags.
- **Keyboard accessibility** for swapping cards.

## Testing

The solver is validated against **primedope.com's** Chinese Poker solver
(the same tool we're improving the UI on) as the oracle. Their solver is
fully client-side JS; we load it into a Node `vm` context and treat its
`buildChineseHand(cards, mode)` as ground truth.

- `npm test` — vitest in watch mode.
- `npm run test:run` — one-shot run for CI / scripts. Currently 520 tests.
- `npm run fixtures:gen` — regenerate `tests/fixtures/primedope-cases.json`.
  Lazy-fetches `chinese-poker.js` from primedope.com into a gitignored
  cache (`tests/oracle/.cache/`). Generated fixtures ARE checked in so
  test runs are offline and reproducible. Re-run only when you want to
  add new cases or refresh against primedope updates.

### Comparison rules (important)

For each fixture, we compare our solver's output to primedope's by hand
**SCORE**, not literal cards (tied hands can legally land on different
cards):

- **Mode 3 (best back)** and **mode 2 (best middle)** — strict equality:
  `rank5(ours) === rank5(oracle)`. These have always agreed on all
  fixtures so far.
- **Mode 1 (best front)** — relaxed to `rank3(ours) >= rank3(oracle)`.
  Primedope's mode-1 scoring uses their `frontValue3` which is the
  3-card category-rank only (kicker is ignored), so they freely trade
  kicker strength for back/middle gain. Our `strongestFront` does
  strict lex max (pair rank → kicker → middle → back). Our score
  should always be **at least** primedope's; if it's strictly less,
  we have a regression. We do NOT match their score exactly here on
  purpose — this is one place we're more correct than they are.
- **Mode 0 (best total)** is intentionally not validated. Primedope uses
  a probabilistic scoop-based formula; we use max-product-of-percentile-
  ranks. Different criteria, different answers.
- **Legality** is non-negotiable: every solver output must satisfy
  back ≥ middle ≥ front.

### Adding hand-written cases

Edit `tests/manual-cases.json` — each entry is `{name, cards, expect}`.
Cards are space-separated lowercase "rs" tokens (`as`, `tc`, `7d`, etc.).
The `expect` object can include any of `strongestBackName`,
`strongestMiddleName`, `strongestFrontName`, `balancedBackName`,
`balancedMiddleName`, `balancedFrontName` — only the keys you provide
are checked. Hand-name strings must match what `nameHand5` / `nameHand3`
produce (e.g. `"Four Aces"`, `"Aces full of Sevens"`, `"Pair of Kings"`,
`"Royal flush"`, `"Straight flush, Five-high"`).

## Dev commands

```
npm install
npm run dev          # vite dev server on :5173
npm run check        # svelte-check + tsc
npm run build        # static bundle to dist/  (~140 KB JS, ~43 KB gzip)
npm run test:run     # full vitest suite
npm run fixtures:gen # regenerate primedope fixtures (lazy-fetches their JS)
```

### Running the dev server when you need to verify a change

The user expects you to start the dev server yourself when a change
needs visual verification, then stop it when you're done. Don't leave it
running across sessions — it shows up as a stuck "in progress" task in
the user's UI long after the work is done.

**Start** (always backgrounded so you can keep working in the meantime):

```
npm run dev   # invoke via Bash with run_in_background=true
```

Vite logs `Local: http://localhost:5173/` once it's ready (usually <1s).
Quick smoke check that it's serving: `curl -sf http://localhost:5173/`.

**Stop** when verification is done:

```
pkill -f "node.*vite"
```

Or kill the specific PIDs from `pgrep -af vite`. Confirm with
`curl -sf http://localhost:5173/ -o /dev/null && echo serving || echo stopped`.

You can't drive the browser yourself, so visual verification means
either asking the user to refresh and look, or — for non-visual changes
— relying on the test suite, `svelte-check`, and `npm run build`.

## Code-style notes

- Files are TypeScript-strict. `svelte-check` is the CI gate.
- Comments are sparse and explain *why*, not *what*. The two non-trivial
  comments worth keeping: the "no transform transition" note in
  `Card.svelte` and the unified-rank-encoding header in `evaluator.ts`.
- Avoid adding intermediate types unless they're reused. `ArrangementNames`
  exists only because the three solver outputs all need it.
