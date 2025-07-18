'use strict';

const axios = require('axios');
const { z } = require('zod');

const findMatchSchema = z.object({
  mode: z.enum(['random', 'invite']),
  opponentId: z.number().optional()
});

module.exports = async function (fastify, opts) {
  const { matchmakingQueue, privateMatches, activeMatches } = opts;

  fastify.post('/find-match', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { mode, opponentId } = findMatchSchema.parse(request.body);
      const userId = request.user.id;

      if (matchmakingQueue.some(e => e.player.id === userId) || privateMatches.has(userId) || activeMatches.has(userId)) {
        // console.log(`Player ${userId} already in queue for matches`);
        // return reply.code(409).send({ error: 'Already in matchmaking' });
        return reply.code(200).send({ status: 'queued' });
      }

      const profileRes = await axios.get(`${process.env.USER_PROFILE_SERVICE_URL}/users/${userId}`, {
        headers: { Authorization: request.headers.authorization }
      });

      const player = {
        id: userId,
        username: profileRes.data.username,
        avatar: profileRes.data.avatar,
        rating: profileRes.data.rating
      };

      const timeoutCallback = () => {
        reply.code(408).send({
          status: 'timeout',
          message: 'The opponent\'s waiting time has expired. Try again later.',
          retryAfter: 300
        });
      };

      if (mode === 'random') {
        matchmakingQueue.push({ player, timeJoined: Date.now(), timeoutCallback });
        return reply.code(200).send({ status: 'queued' });
      }

      if (!opponentId) {
        return reply.code(400).send({ error: 'opponentId is required' });
      }

      privateMatches.set(userId, { player, opponentId, timeJoined: Date.now(), timeoutCallback });
      return reply.code(200).send({ status: 'invitation_sent' });

    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: `Internal error ${err}` });
    }
  });

  fastify.delete('/cancel-match', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    // Remove from queue
    const index = matchmakingQueue.findIndex(e => e.player.id === userId);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
    }

    // Remove from private matches
    privateMatches.delete(userId);

    if (activeMatches.has(userId)) {
      const matchData = activeMatches.get(userId);
      if (matchData.status === 'ready') {
        matchData.status = 'cancelled';
        activeMatches.set(matchData.player1Id, matchData);
        activeMatches.set(matchData.player2Id, matchData);
      }
    }

    return reply.code(200).send({ message: 'Matchmaking canceled' });
    // Handle active matches - FIXED: completely remove from activeMatches
    // if (activeMatches.has(userId)) {
    //   const matchData = activeMatches.get(userId);
      
    //   // Delete both player entries from activeMatches
    //   activeMatches.delete(matchData.player1Id);
    //   activeMatches.delete(matchData.player2Id);
      
    //   // Optionally notify game engine that match was cancelled
    //   try {
    //     if (matchData.status === 'ready' && process.env.GAME_ENGINE_URL) {
    //       await axios.post(`${process.env.GAME_ENGINE_URL}/cancel-match`, {
    //         roomId: matchData.roomId
    //       }).catch(err => {
    //         fastify.log.warn(`Failed to notify game engine about cancellation: ${err.message}`);
    //         // Continue even if game engine notification fails
    //       });
    //     }
    //   } catch (error) {
    //     fastify.log.error(`Error while trying to cancel match: ${error.message}`);
    //     // We still want to continue and remove the match from our records
    //   }
    // }

    // return reply.send({ message: 'Matchmaking canceled' });
    });

    fastify.post('/match-result', async (request, reply) => {
      const { roomId } = request.body;
      
      // Find all users associated with this room and remove them
      // const usersToRemove = [];
      
      for (const [userId, matchData] of activeMatches.entries()) {
        if (matchData.roomId === roomId) {
          // usersToRemove.push(userId);
          activeMatches.delete(userId);
        }
      }
      
      // Delete entries outside the loop to avoid modifying while iterating
      // for (const userId of usersToRemove) {
      //   activeMatches.delete(userId);
      // }

      return reply.send({ message: 'Match result received' });
    });

    fastify.get('/active-matches', { onRequest: [fastify.authenticate] }, async () => {
      return Array.from(activeMatches.entries()).map(([userId, data]) => ({ userId, ...data }));
    });

    fastify.get('/match-status', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    if (activeMatches.has(userId)) {
      const matchData = activeMatches.get(userId);

      if (matchData.status === 'cancelled') {
        return reply.code(200).send({ status: 'cancelled' });
      }

      return reply.code(200).send({
        status: 'ready',
        roomId: matchData.roomId,
        wsUrl: matchData.wsUrl,
        player1: matchData.player1,
        player2: matchData.player2
      });
    }

    const isInQueue = matchmakingQueue.some(e => e.player.id === userId);
    if (isInQueue) {
      return reply.code(200).send({ status: 'waiting' });
    }
    return reply.code(404).send({ error: 'Not in matchmaking' });
  });
};