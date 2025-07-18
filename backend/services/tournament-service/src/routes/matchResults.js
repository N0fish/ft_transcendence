const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { processTournamentRound } = require('../services/tournamentService');

const matchResultSchema = {
  body: {
    type: 'object',
    required: ['matchId', 'player1Id', 'player2Id', 'winnerId', 'score'],
    properties: {
      tournamentId: { type: 'integer' },
      matchId: { type: 'integer' },
      round: { type: 'integer' },
      player1Id: { type: 'integer' },
      player2Id: { type: 'integer' },
      winnerId: { type: 'integer' },
      score: {
        type: 'array',
        items: { type: 'integer' },
        minItems: 2,
        maxItems: 2
      }
    }
  }
};

async function matchResultRoutes(fastify, options) {
  fastify.post(
    '/match-result',
    { schema: matchResultSchema },
    async (request, reply) => {
      const {
        tournamentId,
        matchId,
        round,
        player1Id,
        player2Id,
        winnerId,
        score
      } = request.body;
      console.log("[POST /match-result] payload:", request.body);
      // Validate winner
      if (winnerId !== player1Id && winnerId !== player2Id) {
        return reply
          .code(400)
          .send({
            error: 'Invalid winner ID',
            message: 'Winner must be one of the players in the match'
          });
      }

      // Validate score array
      if (
        !Array.isArray(score) ||
        score.length !== 2 ||
        score.some(s => typeof s !== 'number' || s < 0)
      ) {
        return reply.code(400).send({ error: 'Invalid score array' });
      }

      try {
        const result = await prisma.$transaction(async prismaTransaction => {
          if (typeof tournamentId === 'number') {
            const mId = parseInt(matchId, 10);

            const matchExists = await prismaTransaction.tournamentMatch.findFirst({
              where: { 
                id: mId, 
              }
            });

            if (!matchExists) {
              console.error("prisma.$transaction: Match not found:", mId);
              const err = new Error('Match not found');
              err.code = 'P2025';
              throw err;
            }

            if (matchExists.winnerId) {
              console.error("prisma.$transaction: Match already completed:", mId, ", winnerId:", matchExists.winnerId);
              throw new Error('Match already completed');
            }

            const updatedMatch = await prismaTransaction.tournamentMatch.update({
              where: { id: mId },
              data: {
                winnerId,
                score: score.join('-'),
                playedAt: new Date()
              }
            });

            fastify.log.info(
              `Tournament match ${mId} result recorded: ${player1Id} vs ${player2Id}, winner: ${winnerId}, score: ${score.join(
                '-'
              )}`
            );

            return {
              success: true,
              message: 'Tournament match result recorded',
              type: 'tournament',
              tournamentId: updatedMatch.tournamentId,
              round: updatedMatch.round,
              matchId: mId,
              match: updatedMatch
            };
            // return { 
            //   success: true, 
            //   message: 'Tournament match result recorded',
            //   match: {
            //     id: updatedMatch.id,
            //     tournamentId: updatedMatch.tournamentId,
            //     round: updatedMatch.round,
            //     winnerId: updatedMatch.winnerId,
            //     score: updatedMatch.score
            //   }
            // };
          } else {
            const singleMatch = await prismaTransaction.singleMatch.create({
              data: {
                player1Id,
                player2Id,
                winnerId,
                score: score.join('-')
              }
            });

            fastify.log.info(
              `Single match result recorded: ${player1Id} vs ${player2Id}, winner: ${winnerId}, score: ${score.join(
                '-'
              )}`
            );

            return {
              success: true,
              message: 'Single match result recorded',
              type: 'single',
              match: singleMatch
            };
            // return { 
            //   success: true, 
            //   message: 'Single match result recorded',
            //   match: {
            //     id: singleMatch.id,
            //     player1Id: singleMatch.player1Id,
            //     player2Id: singleMatch.player2Id,
            //     winnerId: singleMatch.winnerId,
            //     score: singleMatch.score,
            //     playedAt: singleMatch.playedAt
            //   }
            // };
          }
        });

        if (result && result.type === 'tournament') {
          // setImmediate(() => {
            processTournamentRound(result.matchId, result.tournamentId, result.round)
              .then(() =>
                fastify.log.info(
                  `Processed round ${result.round} for tournament ${result.tournamentId}`
                )
              )
              .catch(err =>
                fastify.log.error(
                  `Tournament progression error: ${err.message}`
                )
              );
          // });
        }

        return reply.send(result);
      } catch (error) {
        fastify.log.error(`Error processing match result: ${error.stack}`);
        if (error.code === 'P2025') {
          return reply.code(404).send({ error: 'Match not found' });
        }
        return reply
          .code(500)
          .send({
            error: 'Failed to process match result',
            message: error.message
          });
      }
    }
  );

  fastify.addHook('onResponse', async (request, reply) => {
    if (
      request.raw.url === '/match-result' &&
      reply.statusCode === 200 &&
      request.body?.tournamentId && 
      request.body?.matchId &&
      request.body?.round
    ) {
      try {
        await processTournamentRound(request.body.matchId, request.body.tournamentId, request.body.round);
      } catch (error) {
        fastify.log.error(`Failed to process tournament round: ${error.message}`);
      }
    }
  });

  fastify.get('/match/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    try {
      const tMatch = await prisma.tournamentMatch.findUnique({ 
        where: { id } 
      });
      if (tMatch) {
        return reply.send({ 
          type: 'tournament', 
          match: tMatch 
        });
      }
      const sMatch = await prisma.singleMatch.findUnique({ 
        where: { id } 
      });
      if (sMatch) {
        return reply.send({ 
          type: 'single', 
          match: sMatch 
        });
      }
      return reply.code(404).send({ 
        error: 'Match not found' 
      });
    } catch (error) {
      fastify.log.error(`Error fetching match ${id}: ${error.message}`);
      return reply.code(500).send({ 
        error: 'Failed to fetch match' 
      });
    }
  });
}

module.exports = matchResultRoutes;