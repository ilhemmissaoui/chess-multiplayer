export interface Game {
  id: number;
  whitePlayer: {
    id: number;
    username: string;
  };
  blackPlayer: {
    id: number;
    username: string;
  };
  status: GameStatus;
  currentTurn: 'white' | 'black';
  currentFen: string;
  moves: Move[];
  createdAt: string;
  updatedAt: string;
}

export type GameStatus = 'IN_PROGRESS' | 'WHITE_WON' | 'BLACK_WON' | 'DRAW' | 'ABANDONED';

export interface Move {
  gameId: number;
  from: string;
  to: string;
  piece: string;
  promotion?: string;
  fenAfter: string;
  sanNotation?: string;
  moveNumber: number;
  playerColor?: 'white' | 'black';
}
