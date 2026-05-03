import type { Arrangement, Card, SolveResult } from './types';
import { rank3, rank5, normRank3, normRank5, nameHand3, nameHand5 } from './evaluator';

// Generate all k-combinations of indices [0..n-1] as arrays.
function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    out.push(idx.slice());
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return out;
}

// 1287 * 56 = 72,072 partitions, precomputed once.
const BACK_PICKS = combinations(13, 5);
const MIDDLE_PICKS = combinations(8, 5);

interface ScoredArrangement {
  arrangement: Arrangement;
  backScore: number;
  middleScore: number;
  frontScore: number;
}

function pick<T>(arr: T[], indices: number[]): T[] {
  return indices.map(i => arr[i]);
}

function complement(n: number, indices: number[]): number[] {
  const set = new Set(indices);
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (!set.has(i)) out.push(i);
  return out;
}

export function checkArrangement(a: Arrangement): {
  legal: boolean;
  reason: string | null;
  backScore: number;
  middleScore: number;
  frontScore: number;
} {
  const backScore = rank5(a.back);
  const middleScore = rank5(a.middle);
  const frontScore = rank3(a.front);
  if (middleScore > backScore) {
    return { legal: false, reason: 'Middle is stronger than Back', backScore, middleScore, frontScore };
  }
  if (frontScore > middleScore) {
    return { legal: false, reason: 'Front is stronger than Middle', backScore, middleScore, frontScore };
  }
  return { legal: true, reason: null, backScore, middleScore, frontScore };
}

function* enumerateLegal(cards: Card[]): Generator<ScoredArrangement> {
  for (const backIdx of BACK_PICKS) {
    const back = pick(cards, backIdx);
    const backScore = rank5(back);
    const remaining = complement(13, backIdx); // 8 indices
    for (const midSubIdx of MIDDLE_PICKS) {
      const midIdx = midSubIdx.map(i => remaining[i]);
      const middle = pick(cards, midIdx);
      const middleScore = rank5(middle);
      if (middleScore > backScore) continue;
      const frontIdx = remaining.filter(i => !midIdx.includes(i));
      const front = pick(cards, frontIdx);
      const frontScore = rank3(front);
      if (frontScore > middleScore) continue;
      yield { arrangement: { back, middle, front }, backScore, middleScore, frontScore };
    }
  }
}

function namesFor(a: Arrangement) {
  return {
    back: nameHand5(a.back),
    middle: nameHand5(a.middle),
    front: nameHand3(a.front)
  };
}

export function solve(cards: Card[], userArrangement?: Arrangement): SolveResult {
  if (cards.length !== 13) throw new Error('solve needs 13 cards');

  let lexBack: ScoredArrangement | null = null;
  let lexMiddle: ScoredArrangement | null = null;
  let lexFront: ScoredArrangement | null = null;
  let prod: ScoredArrangement | null = null;
  let prodScore = -1;

  for (const sa of enumerateLegal(cards)) {
    // Strongest back: max back, tiebreak by middle, then front
    if (
      !lexBack ||
      sa.backScore > lexBack.backScore ||
      (sa.backScore === lexBack.backScore && sa.middleScore > lexBack.middleScore) ||
      (sa.backScore === lexBack.backScore && sa.middleScore === lexBack.middleScore && sa.frontScore > lexBack.frontScore)
    ) {
      lexBack = sa;
    }
    // Strongest middle: max middle, tiebreak by back, then front
    if (
      !lexMiddle ||
      sa.middleScore > lexMiddle.middleScore ||
      (sa.middleScore === lexMiddle.middleScore && sa.backScore > lexMiddle.backScore) ||
      (sa.middleScore === lexMiddle.middleScore && sa.backScore === lexMiddle.backScore && sa.frontScore > lexMiddle.frontScore)
    ) {
      lexMiddle = sa;
    }
    // Strongest front: max front, tiebreak by middle, then back
    if (
      !lexFront ||
      sa.frontScore > lexFront.frontScore ||
      (sa.frontScore === lexFront.frontScore && sa.middleScore > lexFront.middleScore) ||
      (sa.frontScore === lexFront.frontScore && sa.middleScore === lexFront.middleScore && sa.backScore > lexFront.backScore)
    ) {
      lexFront = sa;
    }
    // Balanced: max product of normalized scores
    const p = normRank5(sa.backScore) * normRank5(sa.middleScore) * normRank3(sa.frontScore);
    if (p > prodScore) {
      prodScore = p;
      prod = sa;
    }
  }

  if (!lexBack || !lexMiddle || !lexFront || !prod) {
    throw new Error('no legal arrangement found (impossible for 13 cards)');
  }

  let userIsLegal = true;
  let userFoulReason: string | null = null;
  if (userArrangement) {
    const chk = checkArrangement(userArrangement);
    userIsLegal = chk.legal;
    userFoulReason = chk.reason;
  }

  return {
    optimum: prod.arrangement,
    optimumScore: prodScore,
    optimumNames: namesFor(prod.arrangement),
    strongestBack: lexBack.arrangement,
    strongestBackNames: namesFor(lexBack.arrangement),
    strongestMiddle: lexMiddle.arrangement,
    strongestMiddleNames: namesFor(lexMiddle.arrangement),
    strongestFront: lexFront.arrangement,
    strongestFrontNames: namesFor(lexFront.arrangement),
    userIsLegal,
    userFoulReason
  };
}
