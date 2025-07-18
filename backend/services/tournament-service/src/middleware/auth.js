const jwt = require('jsonwebtoken');

/**
 * JWT Verification Middleware
 * Verifies user authentication tokens and adds user data to request
 * 
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
async function verifyJWT(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization format. Expected "Bearer [token]"');
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token.trim() === '') {
      throw new Error('No token provided');
    }
    
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      request.log.error('JWT_SECRET environment variable is not defined');
      return reply.code(500).send({
        error: 'Server configuration error',
        statusCode: 500
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    request.user = decoded;
    
    if (request.log) {
      request.log.info(`User ${decoded.id || decoded.username || 'unknown'} authenticated`);
    }
  } catch (err) {
    let statusCode = 401;
    let errorMessage = 'Authentication failed';
    
    if (err.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
      errorMessage = 'Token expired';
      statusCode = 403;
    } else if (err.message.includes('Authorization header')) {
      errorMessage = 'Authorization header missing';
    } else if (err.message.includes('No token')) {
      errorMessage = 'No token provided';
    }
    
    if (request.log) {
      request.log.warn(`Authentication failed: ${err.message}`);
    }
    
    return reply.code(statusCode).send({
      error: errorMessage,
      statusCode
    });
  }
}

module.exports = verifyJWT;