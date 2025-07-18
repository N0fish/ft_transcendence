export interface Player {
  id: number;
  username: string;
  rating: number;
  avatar: string;
}

export interface GameInfo {
  player1?: Player;
  player2?: Player;
  roomId: string;
  status: string;

  wsUrl?: string;
}