import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import fs from 'fs';
import axios from 'axios';
import https from 'https';
import gameRoutes from './api/game.js';
import { websocketIndex } from './ws/index.js';

dotenv.config();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

axios.defaults.httpsAgent = httpsAgent;

const fastify = Fastify({
  logger: true,
  https: {
    key: fs.readFileSync('../../../certs/key.pem'),
    cert: fs.readFileSync('../../../certs/cert.pem')
  }
});

fastify.decorate('axios', axios);

const port = process.env.SERVICE_PORT || 4004;

fastify.register(cors, {
  origin: [
    'https://localhost:5173',
    'https://127.0.0.1:5173',
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

await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Game Service API',
      description: 'API for starting matches in Pong game service',
      version: '1.0.0'
    }
  }
});

await fastify.register(fastifySwaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list'
  }
});

await fastify.register(fastifyWebsocket, {
  options: {
    clientTracking: true,
    verifyClient: () => true, 
    ssl: {
      key: fs.readFileSync('../../../certs/key.pem'),
      cert: fs.readFileSync('../../../certs/cert.pem'),
      rejectUnauthorized: false
    }
  }
});
await fastify.register(gameRoutes);

fastify.get('/game/:roomId', { websocket: true }, websocketIndex);

fastify.get('/', async () => {
  return { message: 'Game Service WebSocket is running' };
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
    console.log(`Game Service running securely at https://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();