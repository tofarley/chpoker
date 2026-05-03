/*
 * Direct unit tests for the evaluator (rank3, rank5, naming).
 * Migrated from the original scripts/smoke.ts so they run with the suite.
 */
import { describe, it, expect } from 'vitest';
import { rank3, rank5, nameHand5, nameHand3, CAT } from '../src/lib/evaluator';
import type { Card, Rank, Suit } from '../src/lib/types';

function c(rank: Rank, suit: Suit): Card { return { rank, suit, id: `${rank}${suit}` }; }

describe('rank5 — category ordering', () => {
  const royalHearts = [c(14,'h'), c(13,'h'), c(12,'h'), c(11,'h'), c(10,'h')];
  const wheelClubs = [c(14,'c'), c(2,'c'), c(3,'c'), c(4,'c'), c(5,'c')];
  const fullHouse = [c(7,'h'), c(7,'d'), c(7,'c'), c(13,'s'), c(13,'h')];
  const flush = [c(2,'s'), c(5,'s'), c(9,'s'), c(11,'s'), c(13,'s')];
  const straight = [c(6,'h'), c(7,'d'), c(8,'c'), c(9,'s'), c(10,'h')];
  const trips = [c(9,'h'), c(9,'d'), c(9,'c'), c(2,'s'), c(7,'h')];
  const twoPair = [c(13,'h'), c(13,'d'), c(7,'c'), c(7,'s'), c(2,'h')];
  const pair = [c(14,'h'), c(14,'d'), c(7,'c'), c(5,'s'), c(2,'h')];
  const high = [c(14,'h'), c(11,'d'), c(8,'c'), c(5,'s'), c(2,'h')];
  const quads = [c(8,'s'), c(8,'h'), c(8,'d'), c(8,'c'), c(2,'h')];

  it('SF > Quads', () => expect(rank5(royalHearts)).toBeGreaterThan(rank5(quads)));
  it('Royal > Wheel SF', () => expect(rank5(royalHearts)).toBeGreaterThan(rank5(wheelClubs)));
  it('FH > Flush', () => expect(rank5(fullHouse)).toBeGreaterThan(rank5(flush)));
  it('Flush > Straight', () => expect(rank5(flush)).toBeGreaterThan(rank5(straight)));
  it('Straight > Trips', () => expect(rank5(straight)).toBeGreaterThan(rank5(trips)));
  it('Trips > TwoPair', () => expect(rank5(trips)).toBeGreaterThan(rank5(twoPair)));
  it('TwoPair > Pair', () => expect(rank5(twoPair)).toBeGreaterThan(rank5(pair)));
  it('Pair > High', () => expect(rank5(pair)).toBeGreaterThan(rank5(high)));
});

describe('rank5 — naming', () => {
  it('royal flush', () => {
    expect(nameHand5([c(14,'h'), c(13,'h'), c(12,'h'), c(11,'h'), c(10,'h')])).toBe('Royal flush');
  });
  it('wheel straight flush', () => {
    expect(nameHand5([c(14,'c'), c(2,'c'), c(3,'c'), c(4,'c'), c(5,'c')])).toBe('Straight flush, Five-high');
  });
  it('full house', () => {
    expect(nameHand5([c(7,'h'), c(7,'d'), c(7,'c'), c(13,'s'), c(13,'h')])).toBe('Sevens full of Kings');
  });
  it('three of a kind', () => {
    expect(nameHand5([c(9,'h'), c(9,'d'), c(9,'c'), c(2,'s'), c(7,'h')])).toBe('Three Nines');
  });
});

describe('rank3 — naming', () => {
  it('three aces', () => {
    expect(nameHand3([c(14,'h'), c(14,'d'), c(14,'c')])).toBe('Three Aces');
  });
  it('pair of kings', () => {
    expect(nameHand3([c(13,'h'), c(13,'d'), c(2,'c')])).toBe('Pair of Kings');
  });
});

describe('cross-comparison (3-card vs 5-card)', () => {
  it('front trips of aces > middle pair of kings (foul)', () => {
    const front = [c(14,'h'), c(14,'d'), c(14,'s')];
    const middle = [c(13,'h'), c(13,'d'), c(7,'s'), c(3,'c'), c(2,'h')];
    expect(rank3(front)).toBeGreaterThan(rank5(middle));
  });
  it('middle full house > front pair (legal)', () => {
    const front = [c(8,'h'), c(8,'d'), c(2,'s')];
    const middle = [c(11,'h'), c(11,'d'), c(7,'s'), c(7,'c'), c(2,'h')]; // two pair
    expect(rank5(middle)).toBeGreaterThan(rank3(front));
  });
});

describe('category encoding sanity', () => {
  it('all categories produce ints in the expected ranges', () => {
    const B5 = 15 ** 5;
    expect(Math.floor(rank5([c(14,'h'),c(13,'h'),c(12,'h'),c(11,'h'),c(10,'h')]) / B5)).toBe(CAT.STRAIGHT_FLUSH);
    expect(Math.floor(rank5([c(8,'s'),c(8,'h'),c(8,'d'),c(8,'c'),c(2,'h')]) / B5)).toBe(CAT.QUADS);
    expect(Math.floor(rank5([c(7,'h'),c(7,'d'),c(7,'c'),c(13,'s'),c(13,'h')]) / B5)).toBe(CAT.FULL_HOUSE);
  });
});
