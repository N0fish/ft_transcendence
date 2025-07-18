import axios from 'axios';

export default async function sendMatchResult({
  roomId,
  player1Id,
  player2Id,
  winnerId,
  score,
  duration,
  playedAt = new Date().toISOString(),
  tournamentId = null,
  matchId = null,
  mode = 'single',
}) {
  const payload = {
    roomId,
    player1Id: Number(player1Id),
    player2Id: Number(player2Id),
    winnerId: Number(winnerId),
    score,
    duration,
    playedAt,
    tournamentId,
    matchId,
    mode,
  };
  try {
    const statsUrl = process.env.STATS_URL || 'https://localhost:4100/match-result';
    if (tournamentId !== null) {
      payload.tournamentId = tournamentId;
      const tournamentUrl = process.env.TOURNAMENT_URL || 'https://localhost:3004/match-result';
      // console.log("[TOURNAMENT MATCH RESULT] url:", tournamentUrl, ", payload:", payload)
      const response = await axios.post(tournamentUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status >= 400) {
        throw new Error(`Failed to send match result: HTTPS ${response.status}`);
      }
    }
    if (matchId !== null) {
      payload.matchId = matchId;
    }

    let response = await axios.post(statsUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status >= 400) {
      throw new Error(`Failed to send match result: HTTPS ${response.status}`);
    }

    // console.log('Match result sent:', payload);
  } catch (error) {
    console.error('Failed to send match result:', error.message);
  }
}