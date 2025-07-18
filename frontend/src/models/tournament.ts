export interface CreateTournament {
  name: string;
  maxPlayers: number;
}

export interface DeleteTournament {
  tournamentId: number;
}

export interface JoinTournament {
  userId: number;
  tournamentId?: number;
}

export enum GameStatus {
  WAITING = "waiting",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export interface Tournament {
  id: number;
  name: string;
  status: string;           
  maxPlayers: number;
  currentPlayers: number; 
  ownerUserId: number;
  winnerId?: number | null;
  joined?: boolean;
  endedAt?: string | null;
}

export interface JoinResponse {
  success: boolean;
  tournamentId: number;
  count: number;
  maxPlayers: number;
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