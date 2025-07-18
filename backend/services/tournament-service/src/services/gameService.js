const axios = require('axios');

// Start match via Game Engine
async function startMatch(matchData, logger, config) {
  try {
    logger.info(`Calling Game Engine for match ${matchData.roomId}`);
    await axios.post(
      `${config.GAME_ENGINE_SERVICE_URL}/start-match`,
      matchData,
      { timeout: config.REQUEST_TIMEOUT }
    );
    logger.info(`Match ${matchData.roomId} started`);
  } catch (err) {
    logger.error(`Game Engine error for ${matchData.roomId}: ${err.message}`, err);
    throw new Error(`Failed to start match ${matchData.roomId}`);
  }
}

module.exports = {
  startMatch,
}