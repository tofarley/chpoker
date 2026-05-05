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

// Professor's scoring is EV-aware (ported from cpoker's mode-0 formula):
// explicitly models scoop probability and per-row expected wins instead of
// the geometric-mean shortcut that max-product uses. Combines:
//   - pScoop bonus       (you win all three → +6)
//   - pScooped penalty   (you lose all three → -6)
//   - mid-ground sum     (expected per-row wins, scaled to ±something)
// Empirically beats max-product when properly tuned.

/*
 * AI strategy pickers. Each takes 13 cards and returns the arrangement
 * that strategy produces, given the legal-partition enumerator from the
 * solver.
 */

// Naive beginner: always make the back as strong as possible, then break
// ties by max middle, then max front. Same "lex-back" arrangement that
// the solver surfaces as `strongestBack` in the Solve panel — it
// over-emphasizes the back and tends to leave weak fronts, which is a
// real-world beginner mistake (and the strategy guide flags front
// strength as the most under-played position).
function pickLexBack(cards: Card[]): Arrangement {
  let best: ScoredArrangement | null = null;
  for (const sa of enumerateLegal(cards)) {
    if (
      !best ||
      sa.backScore > best.backScore ||
      (sa.backScore === best.backScore && sa.middleScore > best.middleScore) ||
      (sa.backScore === best.backScore && sa.middleScore === best.middleScore && sa.frontScore > best.frontScore)
    ) {
      best = sa;
    }
  }
  if (!best) throw new Error('no legal arrangements (impossible for 13 cards)');
  return best.arrangement;
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
  return pickByScore(cards, sa => {
    const f = normRank3(sa.frontScore);
    const m = normRank5(sa.middleScore);
    const b = normRank5(sa.backScore);
    const pScoop = f * m * b;
    const pScooped = (1 - f) * (1 - m) * (1 - b);
    // 6 for full scoop, -6 for getting scooped, otherwise expected per-row
    // wins (normRank ≈ P(win row) vs uniform; 2x-1.5 maps [0,1] to [-1,+1]).
    return 6 * pScoop
         - 6 * pScooped
         + (1 - pScoop - pScooped) * 2 * (f + m + b - 1.5);
  });
}

export function pickOpponentArrangement(cards: Card[], strategy: Strategy): Arrangement {
  switch (strategy) {
    case 'lexBack':        return pickLexBack(cards);
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
