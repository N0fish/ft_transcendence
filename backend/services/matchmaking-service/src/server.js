'use strict';

const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
require('dotenv').config();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

axios.defaults.httpsAgent = httpsAgent;

const fastify = require('fastify')({
  logger: true,
  https: {
    key: fs.readFileSync('../../../certs/key.pem'),
    cert: fs.readFileSync('../../../certs/cert.pem')
  }
});

fastify.decorate('axios', axios);

const matchmakingQueue = [];
const privateMatches = new Map();
const activeMatches = new Map();

const setupJwt = async () => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET
  });

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
};

const registerRoutes = async () => {
  await fastify.register(require('./routes/matchmaking'), {
    prefix: '/',
    matchmakingQueue,
    privateMatches,
    activeMatches
  });
};

fastify.get('/health', async () => ({ 
  status: 'ok', 
  service: 'matchmaking-service'
}));

const closeGracefully = async (signal) => {
  fastify.log.info(`Received signal ${signal}, shutting down`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);

const start = async () => {
  try {
    fastify.register(cors, {
      origin: [
        'https://localhost:5173',
        'https://127.0.0.1:5173'
      ],
      credentials: true,               // Required for cookies/auth
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization'
      ]
    });
    await setupJwt();
    await registerRoutes();

    const port = process.env.PORT || 3003;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    fastify.log.info(`Waiting Room service running securely at https://${host}:${port}`);

    const startMatchmaking = require('./services/matchmaker');
    startMatchmaking(matchmakingQueue, privateMatches, activeMatches, fastify.log, fastify.axios);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();