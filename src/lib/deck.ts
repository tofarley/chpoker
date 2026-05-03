import type { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['c', 'd', 'h', 's'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function fullDeck(): Card[] {
  const out: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      out.push({ rank: r, suit: s, id: `${r}${s}` });
    }
  }
  return out;
}

function cryptoRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('bad bound');
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % maxExclusive;
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealHand(): Card[] {
  return shuffle(fullDeck()).slice(0, 13);
}

export const RANK_LABEL: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

export const SUIT_GLYPH: Record<Suit, string> = {
  c: '♣', d: '♦', h: '♥', s: '♠'
};

export const RANK_NAME: Record<Rank, string> = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens',
  8: 'Eights', 9: 'Nines', 10: 'Tens', 11: 'Jacks', 12: 'Queens',
  13: 'Kings', 14: 'Aces'
};

export const RANK_NAME_SINGULAR: Record<Rank, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
  8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen',
  13: 'King', 14: 'Ace'
};
