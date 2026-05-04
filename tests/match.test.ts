/*
 * Unit tests for the head-to-head scoring (1-6 rule).
 */
import { describe, it, expect } from 'vitest';
import { scoreAgainst, playMatch } from '../src/lib/match';
import type { Arrangement, Card, Rank, Suit } from '../src/lib/types';

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit, id: `${rank}${suit}` });

// helpers — pre-built rows of varying strength
const royalSpades = [c(14,'s'), c(13,'s'), c(12,'s'), c(11,'s'), c(10,'s')]; // SF
const fullKQ      = [c(13,'h'), c(13,'d'), c(13,'c'), c(12,'s'), c(12,'h')]; // FH
const flushHi     = [c(14,'d'), c(11,'d'), c(8,'d'), c(5,'d'), c(2,'d')];    // flush A-high
const pair77K     = [c(7,'h'), c(7,'c'), c(13,'s')];                          // pair 7s
const pair77Five  = [c(7,'d'), c(7,'s'), c(5,'h')];                           // pair 7s lower kicker
const high1052    = [c(10,'h'), c(5,'c'), c(2,'d')];                          // 10-high

describe('scoreAgainst — basic outcomes', () => {
  it('user wins all three rows → +6 scoop', () => {
    const user: Arrangement = { front: pair77K, middle: fullKQ, back: royalSpades };
    const opp: Arrangement = { front: high1052, middle: flushHi, back: fullKQ };
    const r = scoreAgainst(user, opp);
    expect(r.outcomes).toEqual({ front: 'win', middle: 'win', back: 'win' });
    expect(r.points).toBe(6);
    expect(r.scooped).toBe('us');
  });

  it('user loses all three rows → -6 scooped', () => {
    const user: Arrangement = { front: high1052, middle: flushHi, back: fullKQ };
    const opp: Arrangement = { front: pair77K, middle: fullKQ, back: royalSpades };
    const r = scoreAgainst(user, opp);
    expect(r.points).toBe(-6);
    expect(r.scooped).toBe('them');
  });

  it('2 wins + 1 loss → +1', () => {
    const user: Arrangement = { front: pair77K, middle: fullKQ, back: flushHi };
    const opp: Arrangement = { front: high1052, middle: flushHi, back: royalSpades };
    const r = scoreAgainst(user, opp);
    expect(r.outcomes).toEqual({ front: 'win', middle: 'win', back: 'loss' });
    expect(r.points).toBe(1);
    expect(r.scooped).toBeNull();
  });

  it('1 win + 1 tie + 1 loss → 0', () => {
    const user: Arrangement = { front: pair77K,    middle: fullKQ, back: flushHi };
    const opp:  Arrangement = { front: pair77Five, middle: fullKQ, back: royalSpades };
    const r = scoreAgainst(user, opp);
    expect(r.outcomes.front).toBe('win');   // higher kicker
    expect(r.outcomes.middle).toBe('tie');  // same hand
    expect(r.outcomes.back).toBe('loss');
    expect(r.points).toBe(0);
  });

  it('all three rows tie → 0', () => {
    const user: Arrangement = { front: pair77K, middle: fullKQ, back: royalSpades };
    const opp:  Arrangement = { front: pair77K, middle: fullKQ, back: royalSpades };
    const r = scoreAgainst(user, opp);
    expect(r.outcomes).toEqual({ front: 'tie', middle: 'tie', back: 'tie' });
    expect(r.points).toBe(0);
  });
});

describe('playMatch — fouls', () => {
  it('fouled arrangement returns flat -6 total regardless of opponent count', () => {
    // user front (AAA) > middle (KKpair) → foul: front beats middle
    const userArr: Arrangement = {
      front: [c(14,'s'), c(14,'h'), c(14,'d')],
      middle: [c(13,'h'), c(13,'d'), c(7,'s'), c(3,'c'), c(2,'h')],
      back: [c(11,'h'), c(11,'d'), c(11,'s'), c(11,'c'), c(8,'h')]
    };
    const opp1 = [
      c(2,'s'), c(3,'s'), c(4,'s'), c(5,'s'), c(6,'s'),
      c(2,'c'), c(3,'c'), c(4,'c'), c(5,'c'), c(6,'c'),
      c(2,'d'), c(3,'d'), c(4,'d')
    ];
    const r = playMatch(userArr, [opp1]);
    expect(r.userFouled).toBe(true);
    expect(r.total).toBe(-6);
    expect(r.opponents).toHaveLength(1);
    expect(r.opponents[0].points).toBe(0); // no individual credit vs user
    expect(r.opponents[0].pointsVsOthers).toBe(0); // only one opp; no others
    expect(r.opponents[0].roundTotal).toBe(0); // 0 vs user + 0 vs others
  });
});

describe('playMatch — opp-vs-opp scoring', () => {
  it('opponents score against each other (zero-sum across opp roundTotals minus their vs-user share)', () => {
    // Three opponents, three distinct hands. Cards constructed so each opp
    // gets a fresh 13. The user plays a strong, legal arrangement.
    const userArr: Arrangement = {
      front:  [c(14,'s'), c(14,'h'), c(14,'d')],
      middle: [c(12,'s'), c(12,'h'), c(12,'d'), c(12,'c'), c(11,'s')],
      back:   [c(13,'s'), c(13,'h'), c(13,'d'), c(13,'c'), c(14,'c')]
    };
    // Opp 1: a flush + trips
    const o1 = [c(2,'s'), c(5,'s'), c(8,'s'), c(11,'s'), c(2,'h'), c(2,'d'), c(2,'c'), c(7,'h'), c(7,'d'), c(4,'h'), c(4,'d'), c(9,'c'), c(3,'h')];
    // Opp 2: trips + pair
    const o2 = [c(3,'s'), c(3,'c'), c(3,'d'), c(8,'h'), c(8,'c'), c(6,'s'), c(6,'h'), c(6,'c'), c(5,'h'), c(5,'c'), c(9,'s'), c(9,'h'), c(11,'c')];
    // Opp 3: high cards mostly
    const o3 = [c(10,'h'), c(10,'d'), c(10,'c'), c(7,'s'), c(7,'c'), c(4,'s'), c(4,'c'), c(11,'d'), c(11,'h'), c(9,'d'), c(8,'d'), c(6,'d'), c(5,'d')];
    const r = playMatch(userArr, [o1, o2, o3]);
    expect(r.userFouled).toBe(false);
    expect(r.opponents).toHaveLength(3);
    // Cross-scoring is symmetric: sum of pointsVsOthers across opps must be 0
    const crossSum = r.opponents.reduce((s, o) => s + o.pointsVsOthers, 0);
    expect(crossSum).toBe(0);
    // Each opp's roundTotal = pointsVsUser + pointsVsOthers
    for (const o of r.opponents) {
      expect(o.roundTotal).toBe(-o.points + o.pointsVsOthers);
    }
    // User total still equals sum of user-vs-each-opp (unchanged by cross-scoring)
    expect(r.total).toBe(r.opponents.reduce((s, o) => s + o.points, 0));
  });

  it('foul does not zero out opp-vs-opp scoring', () => {
    // User fouls; opps still play each other.
    const userArr: Arrangement = {
      front: [c(14,'s'), c(14,'h'), c(14,'d')], // AAA
      middle: [c(13,'h'), c(13,'d'), c(7,'s'), c(3,'c'), c(2,'h')], // pair Ks — foul
      back: [c(11,'h'), c(11,'d'), c(11,'s'), c(11,'c'), c(8,'h')] // quad Js
    };
    const o1 = [c(2,'s'), c(5,'s'), c(8,'s'), c(11,'s'), c(2,'c'), c(2,'d'), c(7,'h'), c(7,'d'), c(4,'h'), c(4,'d'), c(9,'c'), c(3,'h'), c(3,'d')];
    const o2 = [c(3,'s'), c(3,'c'), c(8,'h'), c(8,'c'), c(8,'d'), c(6,'s'), c(6,'h'), c(6,'c'), c(5,'h'), c(5,'c'), c(9,'s'), c(9,'h'), c(11,'c')];
    const r = playMatch(userArr, [o1, o2]);
    expect(r.userFouled).toBe(true);
    expect(r.total).toBe(-6);
    // pointsVsUser should be 0 for both, but pointsVsOthers should be opposite
    // and non-zero (one opp beats the other).
    expect(r.opponents[0].points).toBe(0);
    expect(r.opponents[1].points).toBe(0);
    expect(r.opponents[0].pointsVsOthers).toBe(-r.opponents[1].pointsVsOthers);
    expect(r.opponents[0].roundTotal).toBe(r.opponents[0].pointsVsOthers);
    expect(r.opponents[1].roundTotal).toBe(r.opponents[1].pointsVsOthers);
  });
});

describe('playMatch — multiple opponents', () => {
  it('total is the sum of per-opponent points (legal arrangement)', () => {
    // Legal user arrangement: back (quad K + A) > middle (quad Q + J) > front (AAA).
    const userArr: Arrangement = {
      front:  [c(14,'s'), c(14,'h'), c(14,'d')],
      middle: [c(12,'s'), c(12,'h'), c(12,'d'), c(12,'c'), c(11,'s')],
      back:   [c(13,'s'), c(13,'h'), c(13,'d'), c(13,'c'), c(14,'c')]
    };
    const opp1 = [
      c(2,'s'), c(2,'h'), c(2,'d'), c(2,'c'),
      c(3,'s'), c(3,'h'), c(3,'d'), c(3,'c'),
      c(4,'s'), c(4,'h'), c(4,'d'), c(4,'c'),
      c(5,'s')
    ];
    const r = playMatch(userArr, [opp1]);
    expect(r.userFouled).toBe(false);
    expect(r.opponents).toHaveLength(1);
    expect(r.total).toBe(r.opponents[0].points);
    expect(r.opponents[0].points).toBeGreaterThanOrEqual(-6);
    expect(r.opponents[0].points).toBeLessThanOrEqual(6);
  });
});
