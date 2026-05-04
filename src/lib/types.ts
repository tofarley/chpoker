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

export type RowOutcome = 'win' | 'loss' | 'tie';

export interface OpponentScore {
  arrangement: Arrangement;
  names: ArrangementNames;
  // vs the user (from the user's POV — positive = user beat this opp)
  outcomes: { front: RowOutcome; middle: RowOutcome; back: RowOutcome };
  rowPoints: { front: number; middle: number; back: number };
  points: number;
  scooped: 'us' | 'them' | null;
  // Opp-vs-other-opps scoring (this opp's net points across the rest of the
  // table). Plus roundTotal — what this opp actually netted this round
  // including vs user. Used for the running standings.
  pointsVsOthers: number;
  roundTotal: number;
}

export interface MatchResult {
  opponents: OpponentScore[];
  total: number;
  userFouled: boolean;
  foulReason: string | null;
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
