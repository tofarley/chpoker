/*
 * Opponent slot definitions: name, AI strategy, and a short user-facing
 * description. Three slots, fixed order. The slot index is also the key
 * into the persistent standings store, so changing the order would
 * break running totals — append new slots if we ever go beyond three.
 */

export type Strategy = 'lexBack' | 'maxProduct' | 'frontWeighted';

export interface OpponentSlot {
  name: string;
  strategy: Strategy;
  description: string;
}

export const OPPONENT_SLOTS: readonly OpponentSlot[] = [
  {
    name: 'The Tourist',
    strategy: 'lexBack',
    description: 'maxes the back hand and lets the front fend for itself'
  },
  {
    name: 'Solid Sam',
    strategy: 'maxProduct',
    description: 'plays the max-product balanced optimum'
  },
  {
    name: 'The Professor',
    strategy: 'frontWeighted',
    description: 'plays balanced but weights the front more'
  }
];

export const OPPONENT_NAMES = OPPONENT_SLOTS.map(s => s.name);
