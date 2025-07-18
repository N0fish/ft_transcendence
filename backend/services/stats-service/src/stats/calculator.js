import { fetchUser } from "../utils/fetchUser.js";

async function buildMatchHistory(userId, matches) {
  const matchHistory = matches.reverse();
  const history = [];
  for (const elt of matchHistory) {
    const opponent = userId == elt.player1Id ? elt.player2Id : elt.player1Id;
    const oppentData = await fetchUser(opponent);
    history.push({
      opponent: oppentData.username,
      score: elt.score.replace(/\[([0-9]*), ?([0-9]*)\]/, "$1 - $2"),
      result: userId === elt.winnerId ? "Win" : "Lose",
      playedAt: elt.playedAt,
      opponentId: oppentData.userId,
    });
  }
  return history;
}

export async function calculateUserStats(userId, matches) {
  const total = matches.length;
  const wins = matches.filter(m => m.winnerId === userId).length;
  const winRatio = total === 0 ? "0" : (wins / total).toFixed(2);
  const durations = matches.map(m => {
    const [min, sec] = m.duration.split('m').map(x => parseInt(x));
    return min * 60 + sec;
  });
  
  const avgDuration = durations.length ? (durations.reduce((a, b) => a + b) / durations.length).toFixed(1) : 0;
  
  return {
    totalMatches: total,
    wins,
    losses: total - wins,
    winRatio,
    avgDurationSec: avgDuration,
    matchHistory: await buildMatchHistory(userId, matches),
  };
}