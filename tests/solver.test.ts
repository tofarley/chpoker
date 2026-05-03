/*
 * Validates our solver against primedope's oracle on 100+ fixtures.
 *
 * Strategy: we don't compare arrangements card-for-card (they can legally
 * differ on tied hands — e.g. swapping which ace lands in the back vs. the
 * front when both options have equal strength). Instead we compare the
 * relevant hand SCORE for each mode:
 *
 *   - "Strongest front" agreement: rank3(ours.strongestFront.front)
 *      must equal rank3(oracle.mode1.front).
 *   - Same for middle (mode 2) and back (mode 3).
 *
 * Mode 0 (primedope's "best total") uses a different scoring function from
 * ours (a probabilistic scoop-based formula vs. our max-product-of-
 * percentiles), so we don't assert agreement there. Adding a test for it
 * would just be locking ourselves into their scoring choice.
 *
 * Every fixture also asserts that our solver's arrangements are LEGAL
 * (back ≥ middle ≥ front), which is non-negotiable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { solve, checkArrangement } from '../src/lib/solver';
import { rank3, rank5 } from '../src/lib/evaluator';
import type { Card, Rank, Suit } from '../src/lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures', 'primedope-cases.json');

interface FixtureCase {
  id: string;
  cards: string[];
  modes: Record<string, { front: string[]; middle: string[]; back: string[] }>;
}
interface FixtureFile { count: number; cases: FixtureCase[]; }

const RANK_LETTER: Record<string, Rank> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  't': 10, 'j': 11, 'q': 12, 'k': 13, 'a': 14
};

function cardFromStr(s: string): Card {
  const r = RANK_LETTER[s[0].toLowerCase()];
  const u = s[1].toLowerCase() as Suit;
  return { rank: r, suit: u, id: `${r}${u}` };
}

const fixtures = JSON.parse(fs.readFileSync(FIXTURES, 'utf8')) as FixtureFile;

describe('solver vs primedope oracle', () => {
  it(`fixture file is loaded`, () => {
    expect(fixtures.count).toBeGreaterThanOrEqual(100);
    expect(fixtures.cases).toHaveLength(fixtures.count);
  });

  for (const fx of fixtures.cases) {
    describe(fx.id, () => {
      const cards = fx.cards.map(cardFromStr);
      const result = solve(cards);
      const oracleFront = fx.modes['1'].front.map(cardFromStr);
      const oracleMiddle = fx.modes['2'].middle.map(cardFromStr);
      const oracleBack = fx.modes['3'].back.map(cardFromStr);

      it('strongest front is at least as strong as oracle (mode 1)', () => {
        // Primedope's mode-1 frontScore is based on the 3-card category-rank
        // only (their `frontValue3`), so the kicker can be freely traded for
        // back/middle gain — they may pick pair-7-5 over pair-7-8 if it
        // strengthens the rest of the arrangement. Our `strongestFront` does
        // strict lex max (pair rank, then kicker, then middle/back). So we
        // should always be ≥ them; finding a strictly weaker front is a bug.
        const us = rank3(result.strongestFront.front);
        const oracle = rank3(oracleFront);
        if (us < oracle) {
          throw new Error(
            `front weaker than oracle — us: ${result.strongestFrontNames.front} (${us}); ` +
            `oracle: ${describeFront(oracleFront)} (${oracle})`
          );
        }
        expect(us).toBeGreaterThanOrEqual(oracle);
      });

      it('strongest middle matches oracle (mode 2)', () => {
        const us = rank5(result.strongestMiddle.middle);
        const oracle = rank5(oracleMiddle);
        if (us !== oracle) {
          throw new Error(
            `middle mismatch — us: ${result.strongestMiddleNames.middle} (${us}); ` +
            `oracle: ${describe5(oracleMiddle)} (${oracle})`
          );
        }
        expect(us).toBe(oracle);
      });

      it('strongest back matches oracle (mode 3)', () => {
        const us = rank5(result.strongestBack.back);
        const oracle = rank5(oracleBack);
        if (us !== oracle) {
          throw new Error(
            `back mismatch — us: ${result.strongestBackNames.back} (${us}); ` +
            `oracle: ${describe5(oracleBack)} (${oracle})`
          );
        }
        expect(us).toBe(oracle);
      });

      it('all four arrangements (optimum + 3 lex) are legal', () => {
        for (const a of [result.optimum, result.strongestBack, result.strongestMiddle, result.strongestFront]) {
          const chk = checkArrangement(a);
          if (!chk.legal) throw new Error(`illegal arrangement: ${chk.reason}`);
          expect(chk.legal).toBe(true);
        }
      });
    });
  }
});

// --- minimal display helpers for failure messages ---
function describe5(cards: Card[]): string {
  return cards.map(c => `${c.rank}${c.suit}`).join(' ');
}
function describeFront(cards: Card[]): string {
  return cards.map(c => `${c.rank}${c.suit}`).join(' ');
}
