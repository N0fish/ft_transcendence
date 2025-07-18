const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function tournamentMatchRoutes(fastify, options) {
  fastify.get(
    '/tournaments/:id/match',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' }
          }
        },
        querystring: {
          type: 'object',
          required: ['playerId'],
          properties: {
            playerId: { type: 'integer' }
          }
        }
      }
    },
    async (req, reply) => {
      const tournamentId = parseInt(req.params.id, 10);
      const playerId = parseInt(req.query.playerId);

      const match = await prisma.tournamentMatch.findFirst({
        where: {
          tournamentId,
          winnerId: null,
          playedAt: null,
          OR: [
            { player1Id: playerId },
            { player2Id: playerId }
          ]
        }
      });
      return { roomId: `tournament-${tournamentId}-match-${match.id}`, player1Id: match.player1Id, player2Id: match.player2Id };
    }
  );
}

module.exports = tournamentMatchRoutes;
