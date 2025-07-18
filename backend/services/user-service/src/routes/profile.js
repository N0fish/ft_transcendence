'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const { pipeline } = require('stream');
const pump = util.promisify(pipeline);
const { z } = require('zod');

const profileUpdateSchema = z.object({
  avatar: z.string().optional(),
  status: z.string().optional(),
  username: z.string().min(1).optional(),
  name: z.string().optional(),
  bio: z.string().optional()
});

module.exports = async function (fastify, opts) {
  const prisma = fastify.prisma || require('@prisma/client').PrismaClient();
  
  fastify.post('/init-profile', async (request, reply) => {
    try {
      fastify.log.info('Received init-profile request:', request.body);

      const { userId, username } = request.body;

      if (!userId || !username) {
        fastify.log.error('Missing required fields in init-profile');
        return reply.code(400).send({ error: 'userId and username are required' });
      }

      const userIdNumber = parseInt(userId);
      const existingProfile = await prisma.profile.findUnique({
        where: { userId: userIdNumber }
      });

      if (existingProfile) {
        fastify.log.warn(`Profile already exists for user ${userId}`);
        return reply.code(200).send({ message: 'Profile already exists' });
      }

      const newProfile = await prisma.profile.create({
        data: {
          userId: userIdNumber,
          username,
          status: 'New user',
          rating: 1000
        }
      });

      fastify.log.info(`Created new profile for user ${userId}`);
      return reply.code(201).send({
        message: 'Profile created successfully',
        profile: {
          userId: newProfile.userId,
          username: newProfile.username
        }
      });
    } catch (error) {
      fastify.log.error('Error in init-profile:', {
        error: error.message,
        stack: error.stack,
        requestBody: request.body
      });

      if (error.code === 'P2002') {
        return reply.code(409).send({ error: 'Profile already exists' });
      }

      return reply.code(500).send({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // Get current user's profile
  fastify.get('/profile', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const userId = parseInt(request.user.id);
      
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          friends: {
            include: {
              friend: true
            }
          },
          blockedUsers: true
        }
      });

      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }
      
      const friendIds = profile.friends.map(f => f.friendId);
      const blockedIds = profile.blockedUsers.map(b => b.blockedId);
      
      return {
        userId: profile.userId,
        username: profile.username,
        bio: profile.bio || '',
        name: profile.name || '',
        avatar: profile.avatar,
        status: profile.status,
        rating: profile.rating,
        friends: friendIds,
        blockedUsers: blockedIds,
        lastAction: profile.lastAction,
      };
    } catch (error) {
      fastify.log.error('Error retrieving profile:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Update current user's profile
  fastify.patch('/profile', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const userId = parseInt(request.user.id);
      
      const existingProfile = await prisma.profile.findUnique({
        where: { userId }
      });
      
      if (!existingProfile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }
      
      if (request.isMultipart()) {
        const data = await request.file();
        
        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' });
        }
        
        if (!data.mimetype.startsWith('image/')) {
          return reply.code(400).send({ error: 'Only image files are allowed' });
        }
        
        const filename = `${userId}-${Date.now()}${path.extname(data.filename)}`;
        const filepath = path.join(__dirname, '../../uploads', filename);
        
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        await pump(data.file, fs.createWriteStream(filepath));
        
        await prisma.profile.update({
          where: { userId },
          data: {
            avatar: `/uploads/${filename}`
          }
        });
        
        return { message: 'Avatar updated successfully' };
      } else {
        const updateData = profileUpdateSchema.parse(request.body);

        await prisma.profile.update({
          where: { userId },
          data: updateData
        });
        
        return { message: 'Profile updated successfully' };
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      
      fastify.log.error('Error updating profile:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get all users (with optional filters and pagination)
  fastify.get('/users', async (request, reply) => {
    try {
      const { search, page = 1, limit = 20 } = request.query;
      const skip = (page - 1) * limit;
      
      let whereClause = {};
      
      if (search) {
        whereClause = {
          OR: [
            { username: { contains: search } },
            { name: { contains: search } }
          ]
        };
      }
      
      const [profiles, total] = await Promise.all([
        prisma.profile.findMany({
          where: whereClause,
          skip,
          take: parseInt(limit),
          orderBy: { username: 'asc' }
        }),
        prisma.profile.count({ where: whereClause })
      ]);

      const currentUserId = request.headers.authorization ? 
        (await request.jwtVerify().catch(() => null))?.id : null;
      
      let blockedRelationships = [];
      if (currentUserId) {
        blockedRelationships = await prisma.blockedUser.findMany({
          where: {
            OR: [
              { userId: parseInt(currentUserId) },
              { blockedId: parseInt(currentUserId) }
            ]
          }
        });
      }
      
      const formattedProfiles = profiles.map(profile => {
        const profileData = {
          userId: profile.userId,
          username: profile.username,
          avatar: profile.avatar,
          status: profile.status,
          rating: profile.rating
        };
        
        if (currentUserId) {
          const blockedByMe = blockedRelationships.some(
            rel => rel.userId === parseInt(currentUserId) && rel.blockedId === profile.userId
          );
          
          const blockedMe = blockedRelationships.some(
            rel => rel.userId === profile.userId && rel.blockedId === parseInt(currentUserId)
          );
          
          if (blockedByMe || blockedMe) {
            profileData.blockStatus = {
              isBlocked: true,
              direction: blockedByMe ? 'outgoing' : 'incoming'
            };
          }
        }
        
        return profileData;
      });

      return {
        users: formattedProfiles,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      fastify.log.error('Error retrieving users:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get profile by ID
  fastify.get('/users/:id', async (request, reply) => {
    try {
      const userId = parseInt(request.params.id);
      
      if (isNaN(userId)) {
        return reply.code(400).send({ error: 'Invalid user ID' });
      }
      
      const profile = await prisma.profile.findUnique({
        where: { userId }
      });
      
      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }
      
      // Check if current user (if authenticated) has blocked or is blocked by this user
      let blockStatus = null;
      
      try {
        const currentUser = await request.jwtVerify().catch(() => null);
        
        if (currentUser && currentUser.id) {
          const currentUserId = parseInt(currentUser.id);
          
          const blockRelation = await prisma.blockedUser.findFirst({
            where: {
              OR: [
                { userId: currentUserId, blockedId: userId },
                { userId: userId, blockedId: currentUserId }
              ]
            }
          });
          
          if (blockRelation) {
            blockStatus = {
              isBlocked: true,
              direction: blockRelation.userId === currentUserId ? 'outgoing' : 'incoming'
            };
          }
        }
      } catch (error) {
        fastify.log.warn('Error verifying JWT, proceeding without block status');
      }
      
      const response = {
        userId: profile.userId,
        username: profile.username,
        avatar: profile.avatar,
        status: profile.status,
        bio: profile.bio || '',
        rating: profile.rating,
        lastAction: profile.lastAction,
      };
      
      // Add block status if available
      if (blockStatus) {
        response.blockStatus = blockStatus;
      }
      
      return response;
    } catch (error) {
      fastify.log.error('Error retrieving user profile:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update user status
  fastify.patch('/status', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const userId = parseInt(request.user.id);
      const { status } = request.body;
      
      if (!status) {
        return reply.code(400).send({ error: 'Status is required' });
      }
      
      // Update status
      await prisma.profile.update({
        where: { userId },
        data: { status }
      });
      
      return { message: 'Status updated successfully' };
    } catch (error) {
      fastify.log.error('Error updating status:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update user status
  fastify.patch('/ping', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const userId = parseInt(request.user.id);

      // Update status
      await prisma.profile.update({
        where: { userId },
        data: { lastAction: new Date() }
      });

      return { message: 'Pong' };
    } catch (error) {
      fastify.log.error('Error pinging:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
};