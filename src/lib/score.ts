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

// Opponent slot names. Cosmetic for now — all three play the same balanced
// optimum strategy. The "tier" feel (Tourist < Sam < Professor) is just
// flavor; if we add real difficulty later it will reuse these slots:
//   Tourist   → random legal arrangement
//   Solid Sam → strongest-back lex
//   Professor → balanced max-product (current behavior of all three)
export const OPPONENT_NAMES = ['The Tourist', 'Solid Sam', 'The Professor'] as const;

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

export function recordRound(userTotal: number, opponentRoundTotals: number[]): void {
  if (opponentRoundTotals.length !== NUM_OPP_SLOTS) {
    throw new Error(`expected ${NUM_OPP_SLOTS} opponent round totals, got ${opponentRoundTotals.length}`);
  }
  // opponentRoundTotals are already from the OPPONENT's POV — what they
  // netted this round across vs-user + vs-other-opponents. Just add.
  standings.update(s => ({
    handsPlayed: s.handsPlayed + 1,
    user: s.user + userTotal,
    opponents: s.opponents.map((cum, i) => cum + opponentRoundTotals[i])
  }));
}

export function resetStandings(): void {
  standings.set({
    handsPlayed: 0,
    user: 0,
    opponents: Array(NUM_OPP_SLOTS).fill(0)
  });
}
