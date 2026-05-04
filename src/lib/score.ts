/*
 * Running standings across hands. Persists to localStorage so the totals
 * survive a page refresh. State is just four numbers (you + 3 opponent
 * slots) plus a hand count and a roundId nonce we bump on every deal so
 * the App can tell whether the current round has already been committed
 * to standings.
 *
 * Note that "Opponent 1/2/3" are slots, not consistent identities — each
 * deal gives them a fresh hand, but the slot's running tally is the
 * cumulative points scored against you from that slot across all hands.
 */
import { writable, type Writable } from 'svelte/store';

export interface Standings {
  handsPlayed: number;
  user: number;
  opponents: number[];
}

const STORAGE_KEY = 'chpoker:standings:v1';
const NUM_OPP_SLOTS = 3;

const initial: Standings = {
  handsPlayed: 0,
  user: 0,
  opponents: Array(NUM_OPP_SLOTS).fill(0)
};

function loadFromStorage(): Standings {
  if (typeof localStorage === 'undefined') return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<Standings>;
    if (
      typeof parsed.handsPlayed === 'number' &&
      typeof parsed.user === 'number' &&
      Array.isArray(parsed.opponents) &&
      parsed.opponents.length === NUM_OPP_SLOTS &&
      parsed.opponents.every(n => typeof n === 'number')
    ) {
      return parsed as Standings;
    }
  } catch {
    /* ignore corrupted state */
  }
  return initial;
}

function persist(s: Standings) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota / private mode */ }
}

export const standings: Writable<Standings> = writable(loadFromStorage());
standings.subscribe(persist);

export function recordRound(userTotal: number, oppPoints: number[]): void {
  if (oppPoints.length !== NUM_OPP_SLOTS) {
    throw new Error(`expected ${NUM_OPP_SLOTS} opponent points, got ${oppPoints.length}`);
  }
  standings.update(s => ({
    handsPlayed: s.handsPlayed + 1,
    user: s.user + userTotal,
    // oppPoints[i] is OUR score against opp i; opp i's tally grows by -oppPoints[i].
    opponents: s.opponents.map((cum, i) => cum + (-oppPoints[i]))
  }));
}

export function resetStandings(): void {
  standings.set({
    handsPlayed: 0,
    user: 0,
    opponents: Array(NUM_OPP_SLOTS).fill(0)
  });
}
