'use strict';

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
require('dotenv').config();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

axios.defaults.httpsAgent = httpsAgent;

const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers
        };
      }
    }
  },
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: true,
      useDefaults: true
    }
  },
  https: {
    key: fs.readFileSync('../../../certs/key.pem'),
    cert: fs.readFileSync('../../../certs/cert.pem')
  }
});

fastify.decorate('axios', axios);

fastify.register(require('@fastify/cors'), {
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

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET
});

fastify.decorate('authenticate', async (req, reply) => {
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

fastify.register(require('@fastify/swagger'), {
  routePrefix: '/docs',
  swagger: {
    info: {
      title:       'Tournament Service API',
      description: 'API for managing tournaments and match results',
      version:     '1.0.0'
    },
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here'
    },
    host: 'localhost:3004',
    schemes: ['https'],
    consumes: ['application/json'],
    produces: ['application/json']
  },
  exposeRoute: true
});

fastify.addContentTypeParser(
  'application/json', 
  { parseAs: 'string' }, 
  function (req, body, done) {
  try {
    if (body === "") {
      done(null, {})
      return;
    }
    const json = JSON.parse(body);
    done(null, json);
  } catch (err) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

fastify.get('/health', async () => ({ 
  status: 'ok', 
  service: 'tournament-service'
}));

fastify.get('/test',  async () => ({ 
  message: 'Tournament service is working correctly' 
}));

try {
  const verifyJWT = require('./middleware/auth');
  fastify.decorate('auth', verifyJWT);
  fastify.log.info('Custom auth middleware registered');
} catch (err) {
  fastify.log.warn('No custom auth middleware found, using built-in authenticate');
  fastify.decorate('auth', fastify.authenticate);
}

const registerRoutes = async () => {
  try {
    const tournamentsPath  = path.resolve(__dirname, 'routes/tournaments.js');
    const matchResultsPath = path.resolve(__dirname, 'routes/matchResults.js');
    const tournamentMatchPath = path.resolve(__dirname, 'routes/tournamentMatch.js');

    fastify.log.info('Registering tournaments routes from:', tournamentsPath);
    await fastify.register(require(tournamentsPath), { prefix: '/' });

    fastify.log.info('Registering matchResults routes from:', matchResultsPath);
    await fastify.register(require(matchResultsPath), { prefix: '/' });

    fastify.log.info('Registering tournamentRoundPath routes from:', tournamentMatchPath);
    await fastify.register(require(tournamentMatchPath), { prefix: '/' });

    fastify.log.info('All routes registered successfully');
  } catch (err) {
    fastify.log.error('Failed to register routes:', err);
  }
};
registerRoutes().catch(err => {
  fastify.log.error('Route registration failed:', err);
});

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(`Error: ${error.message}`);
  const status = error.statusCode || 500;
  reply.status(status).send({
    error:      status >= 500 ? 'Internal Server Error' : error.message,
    statusCode: status,
    details:    process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
});

fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error:      'Not Found',
    statusCode: 404,
    message:    `Route ${request.method}:${request.url} not found`
  });
});

const closeGracefully = async (signal) => {
  fastify.log.info(`Received signal to terminate: ${signal}`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);
process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('Unhandled Rejection at:');
  fastify.log.error(promise);
  fastify.log.error('Reason:', reason);
});

const start = async () => {
  try {
    const port = process.env.PORT || 3004;
    const host = process.env.HOST || '0.0.0.0';
    fastify.log.info(`Starting tournament service on port ${port}`);
    
    await fastify.listen({ port, host });
    fastify.log.info(`Tournament service listening securely at https://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();