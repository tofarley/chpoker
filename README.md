# chpoker

A single-player [Chinese Poker](https://en.wikipedia.org/wiki/Chinese_poker)
puzzle that runs in the browser. You're dealt 13 cards and have to arrange
them into Front (3) · Middle (5) · Back (5) so that each row beats the row
above it (Back ≥ Middle ≥ Front in poker hand strength). Press **Solve** to
see three different "best" arrangements and compare them to your own.

No backend, no install, no app store. Drag cards between rows with mouse or
touch.

## Why this exists

[primedope.com's solver](https://www.primedope.com/play-online-chinese-poker/)
does the math correctly but the UI is clunky. This is a from-scratch
Svelte rebuild with a snappier drag/drop feel and three different solver
outputs side-by-side.

## What the solver shows

When you click **Solve**, it runs all 72,072 ways to partition 13 cards
into 3+5+5 and reports three arrangements:

- **Best balanced** — maximizes the product of normalized hand strengths
  across all three rows. Usually the most useful "what should I have
  played" answer.
- **Strongest possible Back** — the absolute strongest 5-card hand you
  could have made, with the strongest legal Middle and Front filling in.
- **Strongest possible Front** — the strongest 3-card front hand you
  could have made (often a non-obvious play, since the Front is the
  hardest position to fill).

Live foul detection runs on every drag — the status bar tells you
immediately if your arrangement violates Back ≥ Middle ≥ Front.

## Tech

- **Vite 5 + Svelte 4 + TypeScript** for the UI
- **interactjs** for drag/drop (touch + pointer)
- **Web Audio API** for the swap sound (synthesized, no audio assets)
- **Vitest** for the test suite
- No backend; ships as a static site

The solver is a custom 5-card poker evaluator with a unified rank
encoding so 3-card and 5-card scores can be compared directly (needed
for live foul detection). Solve takes ~80ms in the browser for any hand.

## Correctness

The solver is validated against
[primedope.com's solver](https://www.primedope.com/play-online-chinese-poker/)
as a test oracle. Their JS is fetched into a gitignored cache, run in a
Node VM, and used to generate 122 fixtures (12 hand-picked edge cases +
110 random hands), each checked across 4 modes. Test suite:
**520 passing**.

```
npm run test:run     # full vitest suite
npm run fixtures:gen # regenerate primedope fixtures (lazy-fetches their JS)
```

See [CLAUDE.md](./CLAUDE.md) for the testing strategy and the one place
we intentionally diverge from primedope (we strictly maximize the front
kicker; they don't).

## Local development

```bash
npm install
npm run dev      # vite dev server on :5173
npm run check    # svelte-check + tsc
npm run build    # static bundle to dist/  (~133 KB JS, ~42 KB gzip)
npm test         # vitest watch mode
```

Requires Node 18 or newer.

## Project layout

```
src/
  App.svelte             # root: header, board, status, actions, solve panel
  lib/
    types.ts             # Card, Arrangement, SolveResult
    deck.ts              # shuffle, dealHand
    evaluator.ts         # rank3, rank5, hand naming
    solver.ts            # 72,072-partition enumerator
    sound.ts             # Web Audio synth
  components/
    Card.svelte          # CSS-drawn card
    HandRow.svelte       # one labeled row
    Board.svelte         # the three rows + drag/drop wiring (FLIP animation)
    MiniArrangement.svelte  # static card display for the solve panel
tests/
  evaluator.test.ts      # rank/naming unit tests
  manual-cases.test.ts   # hand-written fixtures (extend manual-cases.json)
  solver.test.ts         # 122-case oracle comparison
  fixtures/              # checked-in primedope fixtures
  oracle/                # Node-vm wrapper around primedope's JS
```

For deeper context (algorithm details, drag/drop quirks, animation
approach, testing rules), see [CLAUDE.md](./CLAUDE.md).

## Acknowledgments

The hand evaluator design draws on
[Cactus Kev's poker hand evaluator](http://suffe.cool/poker/evaluator.html)
ideas. The solver is validated against
[primedope.com's Chinese Poker solver](https://www.primedope.com/play-online-chinese-poker/) —
thanks to them for shipping the original tool and keeping the JS readable
enough to use as an oracle.

## License

MIT
