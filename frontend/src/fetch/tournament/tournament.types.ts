export interface CreateTournament {
  name: string;
  maxPlayers: number;
}

export interface JoinTournament {
  userId: number;
  tournamentId?: number;
}

export interface DeleteTournament {
  tournamentId: number;
}

export interface BracketMatch {
  matchId: number;
  player1: { id: number; username: string };
  player2: { id: number; username: string } | null;
  winnerId: number | null;
  score: string | null;
}

export interface TournamentBracket {
  tournamentId: number;
  bracket: Record<number, BracketMatch[]>;
}