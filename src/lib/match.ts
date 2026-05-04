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
import { rank3, rank5, nameHand3, nameHand5 } from './evaluator';
import { solve, checkArrangement } from './solver';

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

  // Solve each opponent's hand once.
  const oppArrangements = opponents.map(cards => solve(cards).optimum);

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
