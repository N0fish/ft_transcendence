module.exports = {
  port: process.env.PORT || 3004,
  jwtSecret: process.env.JWT_SECRET,
  userProfileServiceUrl: process.env.USER_PROFILE_SERVICE_URL || 'https://user-profile-service:3002',
  gameEngineServiceUrl: process.env.GAME_ENGINE_SERVICE_URL || 'https://game-engine:4000',
  statsServiceUrl: process.env.STATS_SERVICE_URL || 'https://stats-service:3005'
};
