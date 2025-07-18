'use strict';

const axios = require('axios');

const MATCH_TIMEOUT = 10 * 60 * 1000; // 10 minutes

module.exports = function startMatchmaking(queue, privateMatches, activeMatches, logger) {
  setInterval(async () => {
    try {
      await processPendingMatches(queue, privateMatches, activeMatches, logger);
      await checkTimeouts(queue, privateMatches, logger);
    } catch (error) {
      logger.error('Error in matchmaking cycle:', error);
    }
  }, 2000); // every 2 seconds
};

async function processPendingMatches(queue, privateMatches, activeMatches, logger) {
  // logger.info(`Current queue length: ${queue.length}`);
  // logger.info(`Current players in queue: ${queue.map(entry => entry.player.username).join(", ")}`);

  for (const [userId, invitation] of privateMatches.entries()) {
    if (privateMatches.has(invitation.opponentId)) {
      const opponentInvitation = privateMatches.get(invitation.opponentId);
      if (opponentInvitation.opponentId === userId) {
        logger.info(`Creating private match between ${userId} and ${invitation.opponentId}`);
        privateMatches.delete(userId);
        privateMatches.delete(invitation.opponentId);
        await createMatch(invitation.player, opponentInvitation.player, "invite", activeMatches, logger);
      }
    }
  }

  while (queue.length >= 2) {
    const player1 = queue.shift();
    const player2 = queue.shift();
    logger.info(`Creating random match between ${player1.player.username} (ID: ${player1.player.id}) and ${player2.player.username} (ID: ${player2.player.id})`);
    await createMatch(player1.player, player2.player, "random", activeMatches, logger);
  }
}

async function checkTimeouts(queue, privateMatches, logger) {
  const now = Date.now();

  for (let i = queue.length - 1; i >= 0; i--) {
    const entry = queue[i];
    if (now - entry.timeJoined > MATCH_TIMEOUT) {
      logger.info(`Player ${entry.player.username} (ID: ${entry.player.id}) timed out in queue`);
      queue.splice(i, 1);
      entry.timeoutCallback?.();
    }
  }

  for (const [userId, entry] of privateMatches.entries()) {
    if (now - entry.timeJoined > MATCH_TIMEOUT) {
      logger.info(`Player ${userId} timed out waiting for invite`);
      privateMatches.delete(userId);
      entry.timeoutCallback?.();
    }
  }
}

async function createMatch(player1, player2, mode, activeMatches, logger) {
  try {
    const roomId = `game-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (!process.env.GAME_ENGINE_URL) {
      throw new Error("GAME_ENGINE_URL is not defined in environment variables");
    }

    const response = await axios.post(`${process.env.GAME_ENGINE_URL}/start-match`, {
      roomId,
      player1,
      player2,
      mode
    });

    const matchData = {
      roomId,
      wsUrl: response.data.wsUrl,
      player1,
      player2,
      player1Id: player1.id,
      player2Id: player2.id,
      mode,
      startTime: Date.now(),
      status: "ready"
    };

    activeMatches.set(player1.id, matchData);
    activeMatches.set(player2.id, matchData);

    logger.info(`Match created: ${roomId}, WebSocket: ${response.data.wsUrl}`);
    return matchData;
  } catch (error) {
    logger.error(`Failed to create match: ${error.message}`);
    throw error;
  }
}
