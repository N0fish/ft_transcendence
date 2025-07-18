const axios = require('axios');

// Configuration
const config = {
  USER_PROFILE_SERVICE_URL: process.env.USER_PROFILE_SERVICE_URL || 'https://user-service:3002',
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '5000', 10)
};

const logger = {
  info:  msg => console.log(`[USER-SVC][INFO]  ${new Date().toISOString()} - ${msg}`),
  warn:  msg => console.warn(`[USER-SVC][WARN]  ${new Date().toISOString()} - ${msg}`),
  error: msg => console.error(`[USER-SVC][ERROR] ${new Date().toISOString()} - ${msg}`)
};

/**
 * Fetch user profile from User Service, with retries.
 * @param {number} userId 
 * @returns {Promise<{ id: number, username: string, avatar?: string, rating?: number }>}
 */
async function getUserProfile(userId) {
  let retries = 3;
  let lastErr;
  while (retries--) {
    try {
      const res = await axios.get(
        `${config.USER_PROFILE_SERVICE_URL}/users/${userId}`,
        { timeout: config.REQUEST_TIMEOUT }
      );
      return res.data;
    } catch (err) {
      lastErr = err;
      logger.warn(`fetch profile ${userId} failed (${err.message}), retries left ${retries}`);
      if (err.response?.status === 404) {
        throw new Error(`User ${userId} not found`);
      }
      // backoff
      await new Promise(r => setTimeout(r, 500));
    }
  }
  logger.error(`User service unavailable after retries: ${lastErr.message}`);
  throw new Error('User service unavailable');
}

module.exports = { getUserProfile };