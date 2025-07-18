const BASE_URL = '/tournament-api';

function buildHeaders(contentType = 'application/json'): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': contentType };
  const token = localStorage.getItem('authToken');
  if (token)
    headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface Tournament {
  id: number;
  name: string;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
  ownerUserId: number;
  winnerId?: number | null;
  joined: boolean;
}

export interface JoinResponse {
  success: boolean;
  tournamentId: number;
  count: number;
  maxPlayers: number;
}

export interface TournamentBracket {
  tournamentId: number;
  bracket: Record<
    number,
    Array<{
      matchId: number;
      player1: { id: number; username: string };
      player2: { id: number; username: string } | null;
      winnerId: number | null;
      score: string | null;
    }>
  >;
}

export async function getTournaments(): Promise<Tournament[]> {
  const res = await fetch(`${BASE_URL}/tournaments`, {
    credentials: 'include',
    headers: buildHeaders(),
  });
  if (!res.ok)
    throw new Error('Failed to fetch tournaments');
  return res.json();
}


export async function getTournamentById(id: number): Promise<Tournament> {
  const res = await fetch(`${BASE_URL}/tournaments/${id}`, {
    credentials: 'include',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch tournament');
  }
  return res.json();
}

export async function createTournament(
  name: string,
  maxPlayers: number = 4
): Promise<Tournament> {
  const res = await fetch(`${BASE_URL}/tournaments`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(),
    body: JSON.stringify({ name, maxPlayers }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create tournament');
  }
  return res.json();
}

/**
 * @param userId
 * @param tournamentId
 */
export async function joinTournament(
  userId: number,
  tournamentId?: number
): Promise<JoinResponse> {
  const body: Record<string, any> = { userId };
  if (typeof tournamentId === 'number')
    body.tournamentId = tournamentId;

  const res = await fetch(`${BASE_URL}/tournaments/join`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to join tournament');
  }
  return res.json();
}

export async function leaveTournament(
  userId: number,
  tournamentId: number
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/tournaments/leave`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(),
    body: JSON.stringify({ userId, tournamentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to leave tournament');
  }
  return res.json();
}

export async function cancelTournament(
  tournamentId: number
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel tournament');
  }
  return res.json();
}

export async function getBracket(
  tournamentId: number
): Promise<TournamentBracket> {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/bracket`, {
    credentials: 'include',
    headers: buildHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to load bracket');
  }
  return res.json();
}

interface GetTournamentMatchRequest {
  tournamentId: string,
  playerId: number,
}

interface GetTournamentMatchResponse {
  roomId?: string,
  player1Id?: number,
  player2Id?: number,
}

export async function getTournamentMatch({ tournamentId, playerId }: GetTournamentMatchRequest): Promise<GetTournamentMatchResponse> {
  try {
    const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/match?playerId=${playerId}`, {
      credentials: 'include',
      headers: buildHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to get a match');
    }
    return res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}