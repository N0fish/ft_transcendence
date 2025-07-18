export interface Match {
  opponent: string;
  opponentId: number;
  result: "Win" | "Lose";
  score: string;
  playedAt: string;
}

export interface PlayerStats {
  wins?: number;
  losses?: number;
  totalMatches?: number;
  winRatio?: string;
  matchHistory?: Match[];
  playedAt?: string;
}