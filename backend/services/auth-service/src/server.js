'use strict';

const path = require('path');
require('dotenv').config();
const fs = require('fs');
const fastify = require('fastify')({
  logger: true,
  https: {
    key: fs.readFileSync('../../../certs/key.pem'),
    cert: fs.readFileSync('../../../certs/cert.pem')
  }
});
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

axios.defaults.httpsAgent = httpsAgent;
fastify.decorate('axios', axios);

fastify.register(cors, {
  origin: [
    'https://localhost:5173',
    'https://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  credentials: true,               // Required for cookies/auth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ]
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  errorFormat: 'pretty',
  log: ['query', 'info', 'warn', 'error'],
});

fastify.decorate('prisma', prisma);

prisma.$on('error', (e) => {
  fastify.log.error(e);
});

const closeGracefully = async (signal) => {
  fastify.log.info(`Received signal ${signal}, shutting down`);
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);

fastify.register(jwt, {
  secret: process.env.JWT_SECRET,
  sign: {
    expiresIn: '1d'
  }
});

fastify.get('/health', async () => {
  return { status: 'ok', service: 'auth-service' };
});

const registerRoutes = async () => {
  let authRoutePath;
  try {
    authRoutePath = './routes/auth';
    await fastify.register(require(authRoutePath), { prefix: '/auth' });
  } catch (error) {
    try {
      authRoutePath = './routes/auth.js';
      await fastify.register(require(authRoutePath), { prefix: '/auth' });
    } catch (routeError) {
      fastify.log.error(`Failed to load auth routes: ${routeError.message}`);
      process.exit(1);
    }
  }
  fastify.log.info(`Loaded auth routes from ${authRoutePath}`);
};

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/',
  decorateReply: false
});

const start = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./prisma/data/auth.db';
      fastify.log.info(`DATABASE_URL not defined, using default: ${process.env.DATABASE_URL}`);
    }

    await registerRoutes();

    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Auth service is running securely at https://${host}:${port}`);
  } catch (error) {
    fastify.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();