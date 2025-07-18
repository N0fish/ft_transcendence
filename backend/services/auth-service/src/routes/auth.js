'use strict';

const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { z } = require('zod');
const axios = require('axios');
const { find2FAByEmail, createNew2FAAndSendCodeRoutine } = require('../2fa');

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const verify2faSchema = z.object({
  userId: z.number(),
  token: z.string().length(6)
});

const enable2faSchema = z.object({
  secret: z.string(),
  token: z.string().length(6)
});

module.exports = async function (fastify, opts) {
  const prisma = fastify.prisma || require('@prisma/client').PrismaClient();
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({
        valid: false,
        error: 'Token expired or invalid'
      });
    }
  });
  
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password } = registerSchema.parse(request.body);
      
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
      });
      if (existingUser) {
        return reply.code(409).send({
          error: 'User already exists',
          emailExists: existingUser.email === email,
          usernameExists: existingUser.username === username
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: { username, email, password: hashedPassword }
      });
      fastify.log.info(`Created auth record for user ${newUser.id}`);
      
      try {
        const profileServiceUrl = process.env.USER_SERVICE_URL || 'https://localhost:3002';
        
        fastify.log.info(`Calling profile service at ${profileServiceUrl}`);
        
        const response = await axios.post(
          `${profileServiceUrl}/init-profile`,
          {
            userId: newUser.id,
            username: newUser.username
          },
          {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Request': 'true'
            }
          }
        );
        
        fastify.log.info('Profile created:', response.data);
      } catch (error) {
        fastify.log.error('Profile creation failed:', {
          error: error.message,
          config: error.config,
          response: error.response?.data
        });
        
        await prisma.user.delete({ where: { id: newUser.id } });
        
        return reply.code(502).send({
          error: 'Failed to create user profile',
          details: {
            profileServiceError: error.message,
            profileServiceUrl: process.env.USER_PROFILE_SERVICE_URL
          }
        });
      }
      
      const token = fastify.jwt.sign({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      });
      
      return reply.code(201).send({
        message: 'Registration successful',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        },
        token
      });
      
    } catch (error) {
      fastify.log.error('Registration failed:', error);
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }
      
      return reply.code(500).send({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }
      
      if (user.twoFactorEnabled) {
        return reply.code(200).send({
          require2FA: true,
          userId: user.id
        });
      }
      
      const token = fastify.jwt.sign({ 
        id: user.id,
        username: user.username,
        email: user.email
      });
      
      return reply.code(200).send({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  const init2faSchema = z.object({
    email: z.string().email(),
  });

  fastify.post('/2fa/email', async (request, reply) => {
    try {
      const { email } = init2faSchema.parse(request.body);
      let twoFA = await find2FAByEmail(prisma, email);
      if (!twoFA) {
        twoFA = await createNew2FAAndSendCodeRoutine(prisma, email);
        fastify.log.info(`Created 2fa record ${twoFA.id} for email ${email}`);
      } else {
        fastify.log.info(`2fa record already existed ${twoFA.id} for email ${email}`);
      }
      return reply.code(200).send({ message: "ok", email });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  })

  const validate2faSchema = z.object({
    email: z.string().email(),
    code: z.string(),
  });

  fastify.put('/2fa/email', async (request, reply) => {
    try {
      const { email, code } = validate2faSchema.parse(request.body);
      const twoFA = await find2FAByEmail(prisma, email);
      if (!twoFA) {
        fastify.log.info(`No 2fa record for email ${email}`);
        return reply.code(404).send({ message: `No 2fa record for email ${email}` });
      }
      if (twoFA.data !== code) {
        fastify.log.info(`TwoFA id ${twoFA.id}: codes didnt match (${code}) for ${email}`);
        return reply.code(400).send({ message: `Codes did not match` });
      }
      await prisma.twoFA.update({
        where: { id: twoFA.id },
        data: {
          validatedAt: new Date(),
        }
      });
      return reply.code(200).send({ message: "ok" });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  })
  
  fastify.post('/enable-2fa', { onRequest: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = request.user.id;
      
      const secret = speakeasy.generateSecret({
        name: `FT Transcendence (${request.user.username})`
      });
      
      await prisma.user.update({
        where: { id: userId },
        data: { 
          twoFactorSecret: secret.base32,
          twoFactorEnabled: false
        }
      });
      
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
      
      return reply.code(200).send({ 
        secret: secret.base32,
        qrCode: qrCodeUrl
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  fastify.post('/verify-2fa', async (request, reply) => {
    try {
      const { userId, token } = verify2faSchema.parse(request.body);
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user || !user.twoFactorSecret) {
        return reply.code(400).send({ error: '2FA setup not initiated' });
      }
      
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token
      });
      
      if (!verified) {
        return reply.code(401).send({ error: 'Invalid 2FA token' });
      }
      
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true }
      });
      
      const jwtToken = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email
      });
      
      return reply.code(200).send({
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  fastify.get('/validate-token', { onRequest: fastify.authenticate }, async (request, reply) => {
    try {
      return reply.code(200).send({
        valid: true,
        user: {
          id: request.user.id,
          username: request.user.username
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(401).send({
        valid: false,
        error: 'Token expired or invalid'
      });
    }
  });
};