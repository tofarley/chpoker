/*
 * Head-to-head scoring against AI opponents. Mirrors primedope's
 * `pointsAgainst` (1 point per row won, +3 bonus for scooping all three).
 *
 * Each opponent gets dealt their own 13 cards, our solver picks the
 * balanced-optimum arrangement for them (matches primedope's mode 0
 * default — see the discussion in CLAUDE.md), and we compare row-by-row.
 *
 * One known divergence from primedope: our 3-card front comparisons
 * factor in the kicker (standard Chinese Poker rule). Primedope's
 * `frontValue3` is category-rank only (kickers ignored), so two pairs
 * of 7s with different kickers tie under their rule but ours picks a
 * winner. Documented in CLAUDE.md.
 */
import type { Arrangement, Card, MatchResult, OpponentScore, RowOutcome } from './types';
import { rank3, rank5, nameHand3, nameHand5, normRank3, normRank5 } from './evaluator';
import { checkArrangement, enumerateLegal, type ScoredArrangement } from './solver';
import { OPPONENT_SLOTS, type Strategy } from './opponents';

function outcome(usScore: number, themScore: number): RowOutcome {
  if (usScore > themScore) return 'win';
  if (usScore < themScore) return 'loss';
  return 'tie';
}

function pointsForRow(o: RowOutcome): number {
  return o === 'win' ? 1 : o === 'loss' ? -1 : 0;
}

export function scoreAgainst(user: Arrangement, opp: Arrangement): Pick<OpponentScore, 'outcomes' | 'rowPoints' | 'points' | 'scooped'> {
  const front = outcome(rank3(user.front), rank3(opp.front));
  const middle = outcome(rank5(user.middle), rank5(opp.middle));
  const back = outcome(rank5(user.back), rank5(opp.back));
  const rowPoints = {
    front: pointsForRow(front),
    middle: pointsForRow(middle),
    back: pointsForRow(back)
  };
  const sum = rowPoints.front + rowPoints.middle + rowPoints.back;
  const points = sum === 3 ? 6 : sum === -3 ? -6 : sum;
  const scooped: 'us' | 'them' | null = sum === 3 ? 'us' : sum === -3 ? 'them' : null;
  return {
    outcomes: { front, middle, back },
    rowPoints,
    points,
    scooped
  };
}

// Foul = flat -6 round penalty for the user. The user's per-opp pairwise
// scoring is suppressed (no individual credit to opps from the foul), but
// opp-vs-opp scoring still happens — opponents shouldn't suffer because
// the user fouled, they keep playing the round against each other.
const FOUL_PENALTY = -6;

// Front-weighted scoring exponent for the Professor. The strategy guide
// observes that fronts win disproportionately often (because most opps
// have weak fronts), so a small front-percentile improvement is worth
// more than the same improvement to middle/back. α=1.7 captures this
// without over-prioritizing front to the point of risking scoops.
const PROFESSOR_FRONT_ALPHA = 1.7;

/*
 * AI strategy pickers. Each takes 13 cards and returns the arrangement
 * that strategy produces, given the legal-partition enumerator from the
 * solver.
 */
function pickRandomLegal(cards: Card[]): Arrangement {
  // Reservoir sampling — uniform random over all legal arrangements in a
  // single pass. Math.random() is fine here; we don't need crypto-quality
  // randomness for AI play.
  let chosen: Arrangement | null = null;
  let count = 0;
  for (const sa of enumerateLegal(cards)) {
    count++;
    if (Math.random() * count < 1) chosen = sa.arrangement;
  }
  if (!chosen) throw new Error('no legal arrangements (impossible for 13 cards)');
  return chosen;
}

function pickByScore(
  cards: Card[],
  scoreFn: (sa: ScoredArrangement) => number
): Arrangement {
  let best: ScoredArrangement | null = null;
  let bestScore = -Infinity;
  for (const sa of enumerateLegal(cards)) {
    const s = scoreFn(sa);
    if (s > bestScore) { bestScore = s; best = sa; }
  }
  if (!best) throw new Error('no legal arrangements (impossible for 13 cards)');
  return best.arrangement;
}

function pickMaxProduct(cards: Card[]): Arrangement {
  return pickByScore(cards, sa =>
    normRank3(sa.frontScore) * normRank5(sa.middleScore) * normRank5(sa.backScore));
}

function pickFrontWeighted(cards: Card[]): Arrangement {
  return pickByScore(cards, sa =>
    Math.pow(normRank3(sa.frontScore), PROFESSOR_FRONT_ALPHA)
    * normRank5(sa.middleScore) * normRank5(sa.backScore));
}

export function pickOpponentArrangement(cards: Card[], strategy: Strategy): Arrangement {
  switch (strategy) {
    case 'random':         return pickRandomLegal(cards);
    case 'maxProduct':     return pickMaxProduct(cards);
    case 'frontWeighted':  return pickFrontWeighted(cards);
  }
}

function foulResultAgainst(): Pick<OpponentScore, 'outcomes' | 'rowPoints' | 'points' | 'scooped'> {
  return {
    outcomes: { front: 'loss', middle: 'loss', back: 'loss' },
    rowPoints: { front: 0, middle: 0, back: 0 },
    points: 0,
    scooped: null
  };
}

export function playMatch(userArrangement: Arrangement, opponents: Card[][]): MatchResult {
  const userCheck = checkArrangement(userArrangement);
  const userFouled = !userCheck.legal;

  // Each opponent slot plays its assigned strategy (Tourist=random,
  // Sam=max-product, Professor=front-weighted). See opponents.ts.
  const oppArrangements = opponents.map((cards, i) => {
    const strategy = OPPONENT_SLOTS[i]?.strategy ?? 'maxProduct';
    return pickOpponentArrangement(cards, strategy);
  });

  // Cross-table: oppVsOpp[i][j] is opp i's points vs opp j (zero on diagonal).
  // Symmetric: scoreAgainst(j, i) = -scoreAgainst(i, j), so we mirror.
  const n = oppArrangements.length;
  const oppVsOpp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pts = scoreAgainst(oppArrangements[i], oppArrangements[j]).points;
      oppVsOpp[i][j] = pts;
      oppVsOpp[j][i] = -pts;
    }
  }

  const oppResults: OpponentScore[] = oppArrangements.map((oppArr, i) => {
    const baseVsUser = userFouled
      ? foulResultAgainst()
      : scoreAgainst(userArrangement, oppArr);
    // From the OPPONENT's POV: points vs user is -baseVsUser.points (since
    // baseVsUser was computed from user's POV). On a foul both are 0.
    const pointsVsUser = userFouled ? 0 : -baseVsUser.points;
    const pointsVsOthers = oppVsOpp[i].reduce((s, v) => s + v, 0);
    const roundTotal = pointsVsUser + pointsVsOthers;
    return {
      arrangement: oppArr,
      names: {
        front: nameHand3(oppArr.front),
        middle: nameHand5(oppArr.middle),
        back: nameHand5(oppArr.back)
      },
      ...baseVsUser,
      pointsVsOthers,
      roundTotal
    };
  });

  return {
    opponents: oppResults,
    total: userFouled
      ? FOUL_PENALTY
      : oppResults.reduce((s, o) => s + o.points, 0),
    userFouled,
    foulReason: userCheck.reason
  };
}
