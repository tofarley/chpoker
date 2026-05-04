// One-off: compare our solver against primedope on a specific hand.
// Run: npx tsx scripts/check-hand.ts
import { solve } from '../src/lib/solver';
import { rank3, rank5, nameHand3, nameHand5, normRank3, normRank5 } from '../src/lib/evaluator';
import type { Card, Rank, Suit } from '../src/lib/types';
import { solveOptimal, type PrimedopeMode } from '../tests/oracle/primedope';

const RANK: Record<string, Rank> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 't': 10, 'j': 11, 'q': 12, 'k': 13, 'a': 14
};
function p(s: string): Card {
  // accepts "10c" or "tc" etc.
  const lower = s.toLowerCase();
  const r = lower.startsWith('10') ? 10 : RANK[lower[0]];
  const u = (lower.startsWith('10') ? lower[2] : lower[1]) as Suit;
  return { rank: r as Rank, suit: u, id: `${r}${u}` };
}
const fmt = (cs: Card[]) => cs.map(c => `${c.rank === 10 ? 'T' : 'A23456789TJQK'[(c.rank as number) - 1] || c.rank}${c.suit}`).join(' ');

// Hand from the user
const cards = ['8c','4c','10d','4h','5h','6d','7s','3h','10s','jd','qc','kd','ac'].map(p);

console.log('Cards:', fmt(cards));
console.log();

const ours = solve(cards);
console.log('=== OUR solver ===');
console.log(`balanced (max-product):`);
console.log(`  Front : ${ours.optimumNames.front.padEnd(28)} ${fmt(ours.optimum.front)}`);
console.log(`  Middle: ${ours.optimumNames.middle.padEnd(28)} ${fmt(ours.optimum.middle)}`);
console.log(`  Back  : ${ours.optimumNames.back.padEnd(28)} ${fmt(ours.optimum.back)}`);
const oFront = normRank3(rank3(ours.optimum.front));
const oMid = normRank5(rank5(ours.optimum.middle));
const oBack = normRank5(rank5(ours.optimum.back));
console.log(`  norm scores: front=${oFront.toFixed(4)} middle=${oMid.toFixed(4)} back=${oBack.toFixed(4)}`);
console.log(`  product = ${(oFront * oMid * oBack).toFixed(6)}`);
console.log();

// User's claimed arrangement
const userArr = {
  front: ['4c','10d','3h'].map(p),
  middle: ['4h','5h','6d','7s','8c'].map(p),
  back: ['10s','jd','qc','kd','ac'].map(p)
};
const uFront = normRank3(rank3(userArr.front));
const uMid = normRank5(rank5(userArr.middle));
const uBack = normRank5(rank5(userArr.back));
console.log(`=== USER's arrangement ===`);
console.log(`  Front : ${nameHand3(userArr.front).padEnd(28)} ${fmt(userArr.front)}`);
console.log(`  Middle: ${nameHand5(userArr.middle).padEnd(28)} ${fmt(userArr.middle)}`);
console.log(`  Back  : ${nameHand5(userArr.back).padEnd(28)} ${fmt(userArr.back)}`);
console.log(`  norm scores: front=${uFront.toFixed(4)} middle=${uMid.toFixed(4)} back=${uBack.toFixed(4)}`);
console.log(`  product = ${(uFront * uMid * uBack).toFixed(6)}`);
console.log();

// Primedope oracle for all 4 modes
const modeName = ['best total (their custom scoring)', 'best front', 'best middle', 'best back'];
console.log('=== PRIMEDOPE oracle ===');
for (let m = 0; m < 4; m++) {
  const r = await solveOptimal(cards, m as PrimedopeMode);
  console.log(`mode ${m} — ${modeName[m]}:`);
  console.log(`  Front : ${nameHand3(r.front).padEnd(28)} ${fmt(r.front)}`);
  console.log(`  Middle: ${nameHand5(r.middle).padEnd(28)} ${fmt(r.middle)}`);
  console.log(`  Back  : ${nameHand5(r.back).padEnd(28)} ${fmt(r.back)}`);
  console.log();
}
