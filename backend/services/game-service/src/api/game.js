import gameManager from '../game/manager.js';
import crypto from 'crypto';

/**
 * Game API routes
 * @param {FastifyInstance} fastify - Fastify instance
 */
export default async function (fastify) {
  fastify.post('/start-match', {
    schema: {
      body: {
        type: 'object',
        required: ['player1', 'player2'],
        properties: {
          roomId: { type: 'string' },
          player1: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'integer' },
              username: { type: 'string' },
              avatar: { type: 'string' },
              rating: { type: 'integer' }
            }
          },
          player2: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'integer' },
              username: { type: 'string' },
              avatar: { type: 'string' },
              rating: { type: 'integer' }
            }
          },
          mode: { type: 'string' },
          tournamentId: { type: ['integer', 'null'] },
          matchId: { type: ['integer', 'null'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { 
        roomId = `game-${crypto.randomBytes(4).toString('hex')}`, 
        player1, 
        player2, 
        mode, 
        tournamentId, 
        matchId 
      } = request.body;

      gameManager.createRoom(roomId, player1.id, player2.id, {
        player1,
        player2,
        mode, 
        tournamentId,
        matchId
      });

      return {
        roomId,
        wsUrl: `wss://${request.hostname}:${process.env.SERVICE_PORT || 4004}/game/${roomId}`
      };
    } catch (error) {
      fastify.log.error(`Error starting match: ${error.message}`);
      return reply.code(500).send({ error: 'Failed to start match', message: error.message });
    }
  });

  fastify.get('/active-games', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            games: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  roomId: { type: 'string' },
                  player1Id: { type: 'integer' },
                  player2Id: { type: 'integer' },
                  status: { type: 'string' },
                  score: {
                    type: 'array',
                    items: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const games = [];
      
      for (const [roomId, game] of gameManager.activeGames.entries()) {
        games.push({
          roomId,
          player1Id: game.player1Id,
          player2Id: game.player2Id,
          status: game.status,
          score: [
            game.players[game.player1Id].score,
            game.players[game.player2Id].score
          ]
        });
      }
      
      return { games };
    } catch (error) {
      fastify.log.error(`Error fetching active games: ${error.message}`);
      return reply.code(500).send({ error: 'Failed to fetch active games', message: error.message });
    }
  });

  fastify.get('/game/:roomId/status', {
    schema: {
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            roomId: { type: 'string' },
            status: { type: 'string' },
            players: {
              type: 'object',
              patternProperties: {
                '^[0-9]+$': {
                  type: 'object',
                  properties: {
                    z: { type: 'number' },
                    score: { type: 'integer' }
                  }
                }
              }
            },
            ball: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                z: { type: 'number' },
                vx: { type: 'number' },
                vz: { type: 'number' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      const game = gameManager.getGameByRoom(roomId);
      
      if (!game) {
        return reply.code(404).send({ error: 'Game not found' });
      }
      
      return {
        roomId,
        status: game.status,
        players: game.players,
        ball: game.ball,
        timeElapsed: (Date.now() - game.startTime) / 1000
      };
    } catch (error) {
      fastify.log.error(`Error fetching game status: ${error.message}`);
      return reply.code(500).send({ error: 'Failed to fetch game status', message: error.message });
    }
  });

  fastify.get('/health', async () => {
    return { status: 'ok', activeGames: gameManager.activeGames.size };
  });
}
