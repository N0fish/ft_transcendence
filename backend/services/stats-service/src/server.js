import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import Fastify from 'fastify';

import fs from 'fs';
import axios from 'axios';
import https from 'https';

import globalStatsRoute from './api/global.js';
import ingestRoute from './api/ingest.js';
import userStatsRoute from './api/user.js';
import { initDB, migrate } from './db/index.js';

dotenv.config();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

axios.defaults.httpsAgent = httpsAgent;

const port = process.env.SERVICE_PORT || 4100;

const fastify = Fastify({
  logger: true,
  https: {
    key: fs.readFileSync('../../../certs/key.pem'),
    cert: fs.readFileSync('../../../certs/cert.pem')
  }
});

fastify.decorate('axios', axios);

await fastify.register(cors, {
  origin: [
    'https://localhost:5173',
    'https://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ]
});

initDB();

await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Stats Service API',
      description: 'API for game statistics and player performance',
      version: '1.0.0'
    }
  }
});

await fastify.register(fastifySwaggerUI, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list' }
});

await fastify.register(ingestRoute);
await fastify.register(userStatsRoute);
await fastify.register(globalStatsRoute);

fastify.get('/health', async () => {
  return { status: 'ok' };
});

const closeGracefully = async (signal) => {
  fastify.log.info(`Received signal ${signal}, shutting down`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);

const start = async () => {
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Stats Service running securely at https://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();