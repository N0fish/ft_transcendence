import { db } from '../db/index.js';
import { calculateUserStats } from '../stats/calculator.js';

export default async function (fastify) {
  fastify.get('/stats/user/:id', async (req, reply) => {
    const userId = parseInt(req.params.id);
    const matches = db.prepare(`
      SELECT * FROM matches
      WHERE player1Id = ? OR player2Id = ?
    `).all(userId, userId);

    return await calculateUserStats(userId, matches);
  });
}
