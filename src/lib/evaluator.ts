import type { Card, Rank } from './types';
import { RANK_NAME, RANK_NAME_SINGULAR } from './deck';

/*
 * Unified poker hand evaluator.
 *
 * Both rank3() and rank5() return integers in the same encoding so a 5-card
 * middle and a 3-card front can be compared directly (needed to detect fouls
 * where the middle would lose to the front).
 *
 * Encoding: score = CATEGORY * BASE^5 + tiebreak, where tiebreak packs the
 * relevant card ranks (descending) into base-BASE digits.
 */

const BASE = 15;
const B1 = BASE;
const B2 = BASE * BASE;
const B3 = B2 * BASE;
const B4 = B3 * BASE;
const B5 = B4 * BASE;

export const CAT = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  TRIPS: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  QUADS: 8,
  STRAIGHT_FLUSH: 9
} as const;

interface RankCount { rank: Rank; n: number; }

function countByRank(cards: Card[]): RankCount[] {
  const m = new Map<Rank, number>();
  for (const c of cards) m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
  // Sort by count desc, then rank desc — pairs/trips first by importance
  return [...m.entries()]
    .map(([rank, n]) => ({ rank, n }))
    .sort((a, b) => (b.n - a.n) || (b.rank - a.rank));
}

function isFlush(cards: Card[]): boolean {
  const s = cards[0].suit;
  return cards.every(c => c.suit === s);
}

// Returns the high card rank of a straight, or 0 if not a straight.
// A-2-3-4-5 ("wheel") returns 5.
function straightHigh(cards: Card[]): Rank | 0 {
  const ranks = [...new Set(cards.map(c => c.rank))].sort((a, b) => a - b);
  if (ranks.length < 5) return 0;
  // Check for normal straight at the top
  for (let i = ranks.length - 1; i >= 4; i--) {
    if (ranks[i] - ranks[i - 4] === 4) return ranks[i] as Rank;
  }
  // Wheel: A,2,3,4,5
  if (ranks.includes(14) && ranks.includes(2) && ranks.includes(3)
      && ranks.includes(4) && ranks.includes(5)) return 5;
  return 0;
}

export function rank5(cards: Card[]): number {
  if (cards.length !== 5) throw new Error('rank5 needs 5 cards');
  const flush = isFlush(cards);
  const sHigh = straightHigh(cards);
  if (flush && sHigh) {
    return CAT.STRAIGHT_FLUSH * B5 + sHigh * B4;
  }
  const counts = countByRank(cards);
  // Quads: [4, 1]
  if (counts[0].n === 4) {
    return CAT.QUADS * B5 + counts[0].rank * B4 + counts[1].rank * B3;
  }
  // Full house: [3, 2]
  if (counts[0].n === 3 && counts[1].n === 2) {
    return CAT.FULL_HOUSE * B5 + counts[0].rank * B4 + counts[1].rank * B3;
  }
  if (flush) {
    const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
    return CAT.FLUSH * B5
      + ranks[0] * B4 + ranks[1] * B3 + ranks[2] * B2 + ranks[3] * B1 + ranks[4];
  }
  if (sHigh) {
    return CAT.STRAIGHT * B5 + sHigh * B4;
  }
  // Trips: [3, 1, 1]
  if (counts[0].n === 3) {
    return CAT.TRIPS * B5
      + counts[0].rank * B4 + counts[1].rank * B3 + counts[2].rank * B2;
  }
  // Two pair: [2, 2, 1]
  if (counts[0].n === 2 && counts[1].n === 2) {
    return CAT.TWO_PAIR * B5
      + counts[0].rank * B4 + counts[1].rank * B3 + counts[2].rank * B2;
  }
  // One pair: [2, 1, 1, 1]
  if (counts[0].n === 2) {
    return CAT.PAIR * B5
      + counts[0].rank * B4
      + counts[1].rank * B3 + counts[2].rank * B2 + counts[3].rank * B1;
  }
  // High card
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  return CAT.HIGH_CARD * B5
    + ranks[0] * B4 + ranks[1] * B3 + ranks[2] * B2 + ranks[3] * B1 + ranks[4];
}

export function rank3(cards: Card[]): number {
  if (cards.length !== 3) throw new Error('rank3 needs 3 cards');
  const counts = countByRank(cards);
  // Trips: [3]
  if (counts[0].n === 3) {
    return CAT.TRIPS * B5 + counts[0].rank * B4;
  }
  // Pair: [2, 1]
  if (counts[0].n === 2) {
    return CAT.PAIR * B5 + counts[0].rank * B4 + counts[1].rank * B3;
  }
  // High card
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  return CAT.HIGH_CARD * B5 + ranks[0] * B4 + ranks[1] * B3 + ranks[2] * B2;
}

// Approximate min/max scores for normalization (for max-product scoring).
// Worst high-card hand vs royal flush — used only as scaling.
export const MIN_RANK5 = CAT.HIGH_CARD * B5 + 7 * B4 + 5 * B3 + 4 * B2 + 3 * B1 + 2;
export const MAX_RANK5 = CAT.STRAIGHT_FLUSH * B5 + 14 * B4;
export const MIN_RANK3 = CAT.HIGH_CARD * B5 + 4 * B4 + 3 * B3 + 2 * B2;
export const MAX_RANK3 = CAT.TRIPS * B5 + 14 * B4;

export function normRank5(score: number): number {
  return (score - MIN_RANK5) / (MAX_RANK5 - MIN_RANK5);
}

export function normRank3(score: number): number {
  return (score - MIN_RANK3) / (MAX_RANK3 - MIN_RANK3);
}

// ---- Hand naming ----------------------------------------------------------

function categoryOfScore(score: number): number {
  return Math.floor(score / B5);
}

export function nameHand5(cards: Card[]): string {
  const score = rank5(cards);
  const cat = categoryOfScore(score);
  const counts = countByRank(cards);
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  switch (cat) {
    case CAT.STRAIGHT_FLUSH: {
      const high = straightHigh(cards);
      if (high === 14) return 'Royal flush';
      return `Straight flush, ${RANK_NAME_SINGULAR[high as Rank]}-high`;
    }
    case CAT.QUADS:
      return `Four ${RANK_NAME[counts[0].rank]}`;
    case CAT.FULL_HOUSE:
      return `${RANK_NAME[counts[0].rank]} full of ${RANK_NAME[counts[1].rank]}`;
    case CAT.FLUSH:
      return `Flush, ${RANK_NAME_SINGULAR[ranks[0]]}-high`;
    case CAT.STRAIGHT:
      return `Straight, ${RANK_NAME_SINGULAR[straightHigh(cards) as Rank]}-high`;
    case CAT.TRIPS:
      return `Three ${RANK_NAME[counts[0].rank]}`;
    case CAT.TWO_PAIR:
      return `${RANK_NAME[counts[0].rank]} and ${RANK_NAME[counts[1].rank]}`;
    case CAT.PAIR:
      return `Pair of ${RANK_NAME[counts[0].rank]}`;
    default:
      return `${RANK_NAME_SINGULAR[ranks[0]]}-high`;
  }
}

export function nameHand3(cards: Card[]): string {
  const score = rank3(cards);
  const cat = categoryOfScore(score);
  const counts = countByRank(cards);
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  switch (cat) {
    case CAT.TRIPS:
      return `Three ${RANK_NAME[counts[0].rank]}`;
    case CAT.PAIR:
      return `Pair of ${RANK_NAME[counts[0].rank]}`;
    default:
      return `${RANK_NAME_SINGULAR[ranks[0]]}-high`;
  }
}
