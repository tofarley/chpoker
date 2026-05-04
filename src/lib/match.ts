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
import { solve } from './solver';

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

export function playMatch(userArrangement: Arrangement, opponents: Card[][]): MatchResult {
  const oppResults: OpponentScore[] = opponents.map(oppCards => {
    const oppSolve = solve(oppCards);
    const oppArr = oppSolve.optimum;
    const score = scoreAgainst(userArrangement, oppArr);
    return {
      arrangement: oppArr,
      names: {
        front: nameHand3(oppArr.front),
        middle: nameHand5(oppArr.middle),
        back: nameHand5(oppArr.back)
      },
      ...score
    };
  });

  return {
    opponents: oppResults,
    total: oppResults.reduce((s, o) => s + o.points, 0)
  };
}
