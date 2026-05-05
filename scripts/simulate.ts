/*
 * Simulate N rounds where the user plays the same max-product strategy
 * as Sam, against the three named opponents. Prints empirical EV +
 * variance per player. Run with `npm run simulate` or
 * `npx tsx scripts/simulate.ts [N]`.
 */
// Node 18's globalThis doesn't expose crypto by default; polyfill from
// node:crypto so deck.ts's crypto.getRandomValues works.
import { webcrypto } from 'node:crypto';
if (!(globalThis as { crypto?: unknown }).crypto) {
  (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
}
import { dealRound } from '../src/lib/deck';
import { playMatch, pickOpponentArrangement } from '../src/lib/match';
import { OPPONENT_SLOTS } from '../src/lib/opponents';

const N = Number(process.argv[2] ?? 1000);
const USER_STRATEGY = (process.argv[3] ?? 'maxProduct') as 'maxProduct' | 'frontWeighted' | 'lexBack';

console.log(`Simulating ${N} rounds — user plays ${USER_STRATEGY}`);
console.log(`Opponents: ${OPPONENT_SLOTS.map(s => `${s.name} (${s.strategy})`).join(', ')}`);
console.log();

const userPoints: number[] = [];
const oppPoints: number[][] = OPPONENT_SLOTS.map(() => []);
let userScoops = 0;
let userScooped = 0;
const oppScoops: number[] = OPPONENT_SLOTS.map(() => 0);
const oppScooped: number[] = OPPONENT_SLOTS.map(() => 0);

const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const round = dealRound(3);
  const userArr = pickOpponentArrangement(round.player, USER_STRATEGY);
  const result = playMatch(userArr, round.opponents);

  userPoints.push(result.total);
  for (const o of result.opponents) {
    if (o.scooped === 'us') userScoops++;
    if (o.scooped === 'them') userScooped++;
  }
  result.opponents.forEach((o, j) => {
    oppPoints[j].push(o.roundTotal);
    // count opp's scoop status against the user
    if (o.scooped === 'them') oppScoops[j]++;
    if (o.scooped === 'us') oppScooped[j]++;
  });
}
const dt = Date.now() - t0;

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const avg = (a: number[]) => sum(a) / a.length;
const std = (a: number[]) => {
  const m = avg(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
};

const players = [
  { name: 'You', points: userPoints, scoops: userScoops, scooped: userScooped },
  ...OPPONENT_SLOTS.map((s, i) => ({
    name: s.name, points: oppPoints[i], scoops: oppScoops[i], scooped: oppScooped[i]
  }))
];

// Sort by total for leaderboard view
players.sort((a, b) => sum(b.points) - sum(a.points));

console.log(`took ${dt}ms (${(dt / N).toFixed(2)}ms/round)`);
console.log();
console.log('rank  player          total      avg/hand     σ/hand    scoops vs others   scooped by others');
console.log('────  ──────────────  ────────   ──────────   ────────  ────────────────   ─────────────────');
for (let i = 0; i < players.length; i++) {
  const p = players[i];
  console.log(
    `${String(i + 1).padStart(2)}    ${p.name.padEnd(14)}  ${String(sum(p.points)).padStart(7)}    ${avg(p.points).toFixed(3).padStart(7)}     ${std(p.points).toFixed(2).padStart(6)}    ${String(p.scoops).padStart(8)}           ${String(p.scooped).padStart(8)}`
  );
}

console.log();
console.log(`zero-sum check: ${sum([...userPoints, ...oppPoints.flat()])}  (should be 0)`);
