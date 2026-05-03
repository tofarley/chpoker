/*
 * Generates test fixtures by running primedope's solver against ~120 hands.
 * Run with `npm run fixtures:gen`. Output goes to tests/fixtures/primedope-cases.json.
 *
 * Each fixture records the 13-card input plus the oracle's arrangement for
 * each of the 4 primedope modes (0=best total, 1=best front, 2=best middle,
 * 3=best back). Cards use primedope's compact "rs" string form (e.g. "ah").
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { fullDeck, shuffle } from '../src/lib/deck';
import type { Card, Rank, Suit } from '../src/lib/types';
import { solveOptimal, type PrimedopeMode } from '../tests/oracle/primedope';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'tests', 'fixtures', 'primedope-cases.json');

const RANK_LETTER: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: 't', 11: 'j', 12: 'q', 13: 'k', 14: 'a'
};
const LETTER_RANK: Record<string, Rank> = Object.fromEntries(
  (Object.entries(RANK_LETTER) as [string, string][]).map(([r, l]) => [l, Number(r) as Rank])
) as Record<string, Rank>;

function cardToStr(c: Card): string { return `${RANK_LETTER[c.rank]}${c.suit}`; }
function cardFromStr(s: string): Card {
  const r = LETTER_RANK[s[0]];
  const u = s[1] as Suit;
  return { rank: r, suit: u, id: `${r}${u}` };
}

// crypto-based shuffle for reproducible-quality randomness in Node
function nodeShuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const r = crypto.randomInt(0, i + 1);
    [a[i], a[r]] = [a[r], a[i]];
  }
  return a;
}

function randomHand(): Card[] {
  // Deck order is irrelevant for random hands, but we keep it shuffled
  // anyway so the fixture file isn't biased toward sorted inputs.
  return nodeShuffle(fullDeck()).slice(0, 13);
}

// A few hand-picked edge cases to anchor the fixture set on known scenarios.
function namedCases(): { name: string; cards: Card[] }[] {
  const c = (s: string) => cardFromStr(s);
  const cases: { name: string; cards: Card[] }[] = [
    {
      name: 'four-aces-plus-trips',
      cards: ['as','ah','ad','ac', 'ks','kh','kd', '7s','7h', '5s','4h','3d','2c'].map(c)
    },
    {
      name: 'royal-flush-dealt',
      cards: ['as','ks','qs','js','ts', 'ah','kh', '7d','7c', '5d','3c','2h','2s'].map(c)
    },
    {
      name: 'two-flushes',
      cards: ['as','ks','qs','js','9s', 'ah','kh','jh','9h','3h', '2c','2d','5c'].map(c)
    },
    {
      name: 'wheel-straight',
      cards: ['as','2c','3d','4h','5s', 'kc','kd','7s','7h', '9c','9d','jc','jd'].map(c)
    },
    {
      name: 'all-low',
      cards: ['2s','2h','3d','3c','4s', '4h','5s','5d','6c','6h', '7s','7h','8d'].map(c)
    },
    {
      name: 'rainbow-broadway',
      cards: ['as','kh','qd','jc','ts', '9h','8d','7c','6s', '5h','4d','3c','2s'].map(c)
    },
    {
      name: 'two-pair-with-kicker',
      cards: ['ks','kh','qd','qc','7s', '7h','3d','3c','2s', '2h','5d','5c','9h'].map(c)
    },
    {
      name: 'quad-twos',
      cards: ['2s','2h','2d','2c', 'as','ah','kd','qc', 'js','9h','5d','4c','3s'].map(c)
    },
    {
      name: 'three-trips',
      cards: ['as','ah','ad', 'ks','kh','kd', 'qs','qh','qd', '7c','5c','3c','2c'].map(c)
    },
    {
      name: 'straight-flush-plus-quads',
      cards: ['9s','8s','7s','6s','5s', 'ks','kh','kd','kc', 'qh','jd','tc','9c'].map(c)
    },
    {
      name: 'no-pairs-rainbow',
      cards: ['as','kh','qd','jc','9s', '8h','7d','5c','4s', '3h','tc','6d','2s'].map(c)
    },
    {
      name: 'paired-low-broadway-high',
      cards: ['as','kh','qd','jc','tc', '2s','2h','3d','3c', '4s','4h','5d','5c'].map(c)
    }
  ];
  // Validate uniqueness inside each case
  for (const k of cases) {
    const ids = new Set(k.cards.map(c => c.id));
    if (ids.size !== 13) throw new Error(`fixture ${k.name} has duplicate cards`);
  }
  return cases;
}

const RANDOM_COUNT = 110;

async function main() {
  const cases: {
    id: string;
    cards: string[];
    modes: Record<string, { front: string[]; middle: string[]; back: string[] }>;
  }[] = [];

  const named = namedCases();
  console.log(`Generating ${named.length} named + ${RANDOM_COUNT} random fixtures...`);

  let processed = 0;
  for (const { name, cards } of named) {
    const modes: Record<string, { front: string[]; middle: string[]; back: string[] }> = {};
    for (const m of [0, 1, 2, 3] as PrimedopeMode[]) {
      const r = await solveOptimal(cards, m);
      modes[String(m)] = {
        front: r.front.map(cardToStr),
        middle: r.middle.map(cardToStr),
        back: r.back.map(cardToStr)
      };
    }
    cases.push({ id: `named-${name}`, cards: cards.map(cardToStr), modes });
    processed++;
    if (processed % 5 === 0) process.stdout.write('.');
  }

  for (let i = 0; i < RANDOM_COUNT; i++) {
    const cards = randomHand();
    const modes: Record<string, { front: string[]; middle: string[]; back: string[] }> = {};
    for (const m of [0, 1, 2, 3] as PrimedopeMode[]) {
      const r = await solveOptimal(cards, m);
      modes[String(m)] = {
        front: r.front.map(cardToStr),
        middle: r.middle.map(cardToStr),
        back: r.back.map(cardToStr)
      };
    }
    cases.push({ id: `random-${String(i + 1).padStart(3, '0')}`, cards: cards.map(cardToStr), modes });
    processed++;
    if (processed % 10 === 0) process.stdout.write('.');
  }

  process.stdout.write('\n');

  const out = {
    generated: new Date().toISOString(),
    oracle: 'primedope.com chinese-poker.js (https://www.primedope.com/play-online-chinese-poker/)',
    modeKey: {
      '0': 'best total solution (primedope custom scoring)',
      '1': 'best possible front',
      '2': 'best possible middle',
      '3': 'best possible back'
    },
    count: cases.length,
    cases
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${cases.length} fixtures to ${path.relative(process.cwd(), OUT)}`);
}

main().catch(e => { console.error(e); process.exit(1); });

export { cardToStr, cardFromStr };
