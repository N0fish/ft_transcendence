'use strict';

const path = require('path');
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const multipart = require('@fastify/multipart');
const staticFiles = require('@fastify/static');
const fs = require('fs');
const axios = require('axios');
const https = require('https');

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

// Register plugins
fastify.register(cors, {
  origin: [
    'https://localhost:5173',
    'https://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  exposedHeaders: ['Authorization']
});

fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  errorFormat: 'pretty',
  log: ['query', 'info', 'warn', 'error'],
});

fastify.decorate('prisma', prisma);

prisma.$on('error', (e) => {
  fastify.log.error('Prisma error:', e);
});

const setupUploads = async () => {
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  await fastify.register(staticFiles, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false
  });
};

const closeGracefully = async (signal) => {
  fastify.log.info(`Received signal ${signal}, shutting down`);
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);

const setupJwt = async () => {
  try {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }

    fastify.register(jwt, {
      secret: process.env.JWT_SECRET
    });

    fastify.decorate('authenticate', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (error) {
        console.error('JWT verification failed:', error);
        reply.code(401).send({ error: 'Unauthorized' });
      }
    });
  } catch (error) {
    fastify.log.error(`Failed to setup JWT: ${error.message}`);
    process.exit(1);
  }
};

const registerRoutes = async () => {
  try {
    let routePath = './routes';

    await fastify.register(require(`${routePath}/profile`), { prefix: '/' });
    await fastify.register(require(`${routePath}/friends`), { prefix: '/friends' });
    await fastify.register(require(`${routePath}/matches`), { prefix: '/matches' });

    fastify.log.info('Routes registered successfully');
  } catch (error) {
    fastify.log.error(`Failed to register routes: ${error.message}`);
    process.exit(1);
  }
};

fastify.get('/health', async () => {
  return { status: 'ok', service: 'user-profile-service' };
});

const start = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:/app/data/profile.db';
      fastify.log.info(`DATABASE_URL not defined, using default: ${process.env.DATABASE_URL}`);
    }

    await setupUploads();
    await setupJwt();
    await registerRoutes();

    const port = process.env.PORT || 3002;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`User Profile service is running securely at https://${host}:${port}`);
    fastify.log.info(`User Profile service is running securely at https://${host}:${port}`);
  } catch (error) {
    fastify.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();