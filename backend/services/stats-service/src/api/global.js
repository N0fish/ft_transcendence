import { db } from '../db/index.js';

export default async function (fastify) {
  fastify.get('/stats/global', async (req, reply) => {
    const matches = db.prepare(`SELECT * FROM matches`).all();
    const players = {};

    for (const m of matches) {
      [m.player1Id, m.player2Id].forEach(id => {
        if (!players[id]) {
          players[id] = { id, wins: 0, matches: 0 };
        }
        players[id].matches++;
        if (m.winnerId === id) {
          players[id].wins++;
        }
      });
    }

    const top5 = Object.values(players)
      .map(p => ({ ...p, winRatio: (p.wins / p.matches).toFixed(2) }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 5);

    return {
      totalMatches: matches.length,
      topPlayers: top5
    };
  });
  fastify.get('/stats', async (req, reply) => {
    const matches = db.prepare(`SELECT * FROM matches`).all();

    return matches;
  });
}
