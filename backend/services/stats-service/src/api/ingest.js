import { db } from '../db/index.js';

export default async function (fastify) {
  fastify.post('/match-result', {
    schema: {
      body: {
        type: 'object',
        required: ['player1Id', 'player2Id', 'winnerId', 'score', 'duration'],
        properties: {
          player1Id: { type: 'integer' },
          player2Id: { type: 'integer' },
          winnerId: { type: 'integer' },
          score: { type: 'array', items: { type: 'integer' } },
          duration: { type: 'string' },
          playedAt: { type: 'string' },
          roomId: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const { player1Id, player2Id, winnerId, score, duration, playedAt, roomId } = req.body;

    try {
      const existingMatch = db.prepare(`
        SELECT id FROM matches 
        WHERE (roomId = ? OR (player1Id = ? AND player2Id = ? AND playedAt LIKE ?))
        LIMIT 1
      `).get(
        roomId, 
        player1Id, 
        player2Id, 
        playedAt ? playedAt.substring(0, 16) + '%' : null
      );

      if (existingMatch) {
        return { status: 'already_recorded', id: existingMatch.id };
      }

      db.prepare(`
        INSERT INTO matches (player1Id, player2Id, winnerId, score, duration, playedAt, roomId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(player1Id, player2Id, winnerId, JSON.stringify(score), duration, playedAt, roomId);

      return { status: 'ok' };
    } catch (error) {
      fastify.log.error(`Error recording match: ${error.message}`);
      return reply.code(500).send({ error: 'Failed to record match result' });
    }
  });
}
