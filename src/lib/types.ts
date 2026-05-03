export type Suit = 'c' | 'd' | 'h' | 's';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
  id: string;
}

export type RowName = 'front' | 'middle' | 'back';

export interface Arrangement {
  front: Card[];
  middle: Card[];
  back: Card[];
}

export interface ArrangementNames {
  front: string;
  middle: string;
  back: string;
}

export interface SolveResult {
  optimum: Arrangement;
  optimumScore: number;
  optimumNames: ArrangementNames;
  strongestBack: Arrangement;
  strongestBackNames: ArrangementNames;
  strongestMiddle: Arrangement;
  strongestMiddleNames: ArrangementNames;
  strongestFront: Arrangement;
  strongestFrontNames: ArrangementNames;
  userIsLegal: boolean;
  userFoulReason: string | null;
}
