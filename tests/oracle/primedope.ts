/*
 * Oracle wrapper around primedope.com's client-side Chinese Poker solver.
 *
 * Their entire solver is in a single self-contained chinese-poker.js file
 * (https://www.primedope.com/wp-content/themes/primedope/embeds/chinese-poker.js).
 * We load it into a Node VM, stub out the DOM globals it touches, and call
 * its `buildChineseHand(cards, mode)` entry point — the same one their UI
 * uses for "Best solution / Best front / Best middle / Best back".
 *
 * Modes (from their code):
 *   0 = best total solution (their custom scoring)
 *   1 = best possible front
 *   2 = best possible middle
 *   3 = best possible back
 *
 * We use this only as a test oracle — fixtures generated from this are
 * checked in; the JS itself is fetched on demand into a gitignored cache
 * directory so we don't redistribute it.
 */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Card, Rank, Suit } from '../../src/lib/types';

const PRIMEDOPE_JS_URL = 'https://www.primedope.com/wp-content/themes/primedope/embeds/chinese-poker.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'chinese-poker.js');

export type PrimedopeMode = 0 | 1 | 2 | 3;
export type PrimedopeArrangement = { front: Card[]; middle: Card[]; back: Card[] };

interface OracleContext {
  context: vm.Context;
  cardLookup: Map<string, number>;
  reverseLookup: Map<number, Card>;
}

let _oracle: OracleContext | null = null;

async function loadJs(): Promise<string> {
  if (fs.existsSync(CACHE_FILE)) {
    return fs.readFileSync(CACHE_FILE, 'utf8');
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const res = await fetch(PRIMEDOPE_JS_URL);
  if (!res.ok) throw new Error(`failed to fetch primedope js: ${res.status}`);
  const src = await res.text();
  fs.writeFileSync(CACHE_FILE, src, 'utf8');
  return src;
}

const RANK_FROM_LETTER: Record<string, Rank> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  't': 10, 'j': 11, 'q': 12, 'k': 13, 'a': 14
};

function cardFromName(name: string): Card {
  const r = RANK_FROM_LETTER[name[0].toLowerCase()];
  const s = name[1].toLowerCase() as Suit;
  return { rank: r, suit: s, id: `${r}${s}` };
}

function nameFromCard(c: Card): string {
  const rankLetter = c.rank <= 9 ? String(c.rank) : 'tjqka'[c.rank - 10];
  return `${rankLetter}${c.suit}`;
}

export async function getOracle(): Promise<OracleContext> {
  if (_oracle) return _oracle;
  const src = await loadJs();
  const sandbox: Record<string, unknown> = {
    document: { write: () => {}, getElementById: () => null },
    Math, Date, Array, Object, String, Number, JSON, Boolean
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(src, context);

  // Build a name→encoded-card lookup so we can translate user-supplied cards
  // into primedope's bit-packed integer format.
  const namedDeck = vm.runInContext(`
    var deck = Array(52);
    init_deck(deck);
    JSON.stringify(deck.map(c => [cardName(c), c]));
  `, context) as string;
  const cardLookup = new Map<string, number>();
  const reverseLookup = new Map<number, Card>();
  for (const [name, encoded] of JSON.parse(namedDeck) as [string, number][]) {
    cardLookup.set(name.toLowerCase(), encoded);
    reverseLookup.set(encoded, cardFromName(name));
  }

  _oracle = { context, cardLookup, reverseLookup };
  return _oracle;
}

export async function solveOptimal(cards: Card[], mode: PrimedopeMode): Promise<PrimedopeArrangement> {
  if (cards.length !== 13) throw new Error(`solveOptimal needs 13 cards, got ${cards.length}`);
  const oracle = await getOracle();
  const encoded = cards.map(c => {
    const name = nameFromCard(c);
    const v = oracle.cardLookup.get(name);
    if (v === undefined) throw new Error(`unknown card: ${name}`);
    return v;
  });

  // Stash the input on the sandbox so the VM expression can read it.
  (oracle.context as unknown as Record<string, unknown>).__cards = encoded;
  (oracle.context as unknown as Record<string, unknown>).__mode = mode;
  const raw = vm.runInContext(`
    (function () {
      var r = buildChineseHand(__cards.slice(), __mode);
      return JSON.stringify({
        front: r.frontHand,
        middle: r.middleHand,
        back: r.backHand
      });
    })();
  `, oracle.context) as string;
  const parsed = JSON.parse(raw) as { front: number[]; middle: number[]; back: number[] };

  const decode = (arr: number[]): Card[] => arr.map(v => {
    const c = oracle.reverseLookup.get(v);
    if (!c) throw new Error(`unknown encoded card: ${v}`);
    return c;
  });

  return {
    front: decode(parsed.front),
    middle: decode(parsed.middle),
    back: decode(parsed.back)
  };
}
