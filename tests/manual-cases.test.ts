/*
 * Hand-written test cases — extend tests/manual-cases.json freely.
 *
 * Each case provides 13 cards and any subset of expected hand names. Useful
 * for locking in answers we've verified by hand or noticed regressed in the
 * past, separate from the auto-generated primedope fixture set.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { solve, checkArrangement } from '../src/lib/solver';
import type { Card, Rank, Suit } from '../src/lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASES = path.join(__dirname, 'manual-cases.json');

interface Expect {
  strongestBackName?: string;
  strongestMiddleName?: string;
  strongestFrontName?: string;
  balancedBackName?: string;
  balancedMiddleName?: string;
  balancedFrontName?: string;
}
interface ManualCase {
  name: string;
  cards: string;
  expect: Expect;
}

const RANK_LETTER: Record<string, Rank> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  't': 10, 'j': 11, 'q': 12, 'k': 13, 'a': 14
};

function parseCards(s: string): Card[] {
  const tokens = s.trim().split(/\s+/);
  if (tokens.length !== 13) throw new Error(`expected 13 cards, got ${tokens.length}`);
  const cards = tokens.map(t => {
    const r = RANK_LETTER[t[0].toLowerCase()];
    const u = t[1].toLowerCase() as Suit;
    if (!r || !'cdhs'.includes(u)) throw new Error(`bad card: ${t}`);
    return { rank: r, suit: u, id: `${r}${u}` };
  });
  const ids = new Set(cards.map(c => c.id));
  if (ids.size !== 13) throw new Error('duplicate cards');
  return cards;
}

const file = JSON.parse(fs.readFileSync(CASES, 'utf8')) as { cases: ManualCase[] };

describe('manual cases', () => {
  for (const tc of file.cases) {
    describe(tc.name, () => {
      const cards = parseCards(tc.cards);
      const result = solve(cards);

      it('all four solver outputs are legal', () => {
        for (const a of [result.optimum, result.strongestBack, result.strongestMiddle, result.strongestFront]) {
          expect(checkArrangement(a).legal).toBe(true);
        }
      });

      const checks: { key: keyof Expect; actual: () => string }[] = [
        { key: 'strongestBackName', actual: () => result.strongestBackNames.back },
        { key: 'strongestMiddleName', actual: () => result.strongestMiddleNames.middle },
        { key: 'strongestFrontName', actual: () => result.strongestFrontNames.front },
        { key: 'balancedBackName', actual: () => result.optimumNames.back },
        { key: 'balancedMiddleName', actual: () => result.optimumNames.middle },
        { key: 'balancedFrontName', actual: () => result.optimumNames.front }
      ];
      for (const { key, actual } of checks) {
        if (tc.expect[key] !== undefined) {
          it(`${key} = ${tc.expect[key]}`, () => {
            expect(actual()).toBe(tc.expect[key]);
          });
        }
      }
    });
  }
});
