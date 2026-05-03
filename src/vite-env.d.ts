/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module 'pokersolver' {
  export class Hand {
    rank: number;
    name: string;
    descr: string;
    cards: unknown[];
    static solve(cards: string[]): Hand;
    static winners(hands: Hand[]): Hand[];
  }
}
