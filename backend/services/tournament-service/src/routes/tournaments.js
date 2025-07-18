const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { startTournament } = require('../services/tournamentService');
const { getUserProfile }  = require('../services/userService');

async function tournamentRoutes(fastify, options) {
  const createSchema = {
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name:       { 
          type: 'string', 
          minLength: 3 
        },
        maxPlayers: { 
          type: 'integer', 
          minimum: 2, 
          maximum: 64, 
          default: 4
        }
      }
    }
  };

  const joinSchema = {
    body: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId:       { type: 'integer' },
        tournamentId: { type: 'integer' }
      }
    }
  };

  const leaveSchema = {
    body: {
      type: 'object',
      required: ['userId', 'tournamentId'],
      properties: {
        userId:       { type: 'integer' },
        tournamentId: { type: 'integer' }
      }
    }
  };

  fastify.get(
    '/tournaments',
    { preHandler: fastify.auth },
    async (req, reply) => {
      try {
        const tours = await prisma.tournament.findMany({
          include: { participants: true },
          orderBy: { createdAt: 'desc' }
        });
        return tours.map(t => ({
          id:             t.id,
          name:           t.name,
          status:         t.status,
          maxPlayers:     t.maxPlayers,
          currentPlayers: t.participants.length,
          ownerUserId:    t.ownerUserId,
          winnerId:       t.winnerId,
          joined:         t.participants.some(p => p.userId === req.user.id),
          endedAt:        t.endedAt,
        }));
      } catch (error) {
        fastify.log.error(`Error fetching tournaments: ${error.message}`);
        reply.code(500).send({ error: 'Failed to fetch tournaments' });
      }
    }
  );

  fastify.get(
    '/tournaments/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { 
            id: { type: 'integer' } 
          }
        }
      },
      preHandler: fastify.auth,
    },
    async (req, reply) => {
      
      try {
        const id = parseInt(req.params.id, 10);
        const t  = await prisma.tournament.findUnique({
          where:   { id },
          include: { participants: true, matches: true }
        });
        if (!t)
          return reply.code(404).send({ error: 'Tournament not found' });
        return {
          id:             t.id,
          name:           t.name,
          status:         t.status,
          maxPlayers:     t.maxPlayers,
          currentPlayers: t.participants.length,
          ownerUserId:    t.ownerUserId,
          winnerId:       t.winnerId,
          joined:         t.participants.some(p => p.userId === req.user.id),
          endedAt:        t.endedAt,
        };
      } catch (error) {
        fastify.log.error(`Error fetching tournament ${id}: ${error.message}`);
        reply.code(500).send({ error: 'Failed to fetch tournament' });
      }
    }
  );

  fastify.get(
    '/tournaments/:id/bracket',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { 
            id: { type: 'integer' } 
          }
        }
      }
    },
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      const t  = await prisma.tournament.findUnique({ where: { id } });
      if (!t)
        return reply.code(404).send({ error: 'Tournament not found' });

      const parts = await prisma.tournamentParticipant.findMany({
        where: { tournamentId: id },
        select: { userId: true, username: true }
      });
      const nameMap = Object.fromEntries(parts.map(p => [p.userId, p.username]));

      const matches = await prisma.tournamentMatch.findMany({
        where: { tournamentId: id },
        orderBy: { round: 'asc' }
      });

      const bracket = {};
      for (const m of matches) {
        bracket[m.round] = bracket[m.round] || [];
        bracket[m.round].push({
          matchId: m.id,
          player1: { id: m.player1Id, username: nameMap[m.player1Id] || null },
          player2: m.player2Id
            ? { id: m.player2Id, username: nameMap[m.player2Id] || null }
            : null,
          winnerId: m.winnerId,
          score:    m.score
        });
      }

      return { tournamentId: id, bracket };
    }
  );

  // POST /tournaments
  // fastify.post(
  //   '/tournaments',
  //   { schema: createSchema, preHandler: fastify.auth },
  //   async (req, reply) => {
  //     const { name, maxPlayers } = req.body;
  //     const ownerUserId = req.user.id;

  //     // prevent more than one waiting tournament per user
  //     const existing = await prisma.tournament.findFirst({
  //       where: { status: 'waiting', ownerUserId }
  //     });
  //     if (existing) {
  //       return reply.code(400).send({ error: 'You already have an open tournament' });
  //     }

  //     const newT = await prisma.tournament.create({
  //       data: { name, maxPlayers, status: 'waiting', ownerUserId }
  //     });
  //     fastify.log.info(`Tournament created: ${newT.id}`);
  //     return reply.code(201).send(newT);
  //   }
  // );
  fastify.post(
    '/tournaments',
    { schema: createSchema, preHandler: fastify.auth },
    async (req, reply) => {
      const { name, maxPlayers } = req.body;
      const ownerUserId = req.user.id;
  
      const openCount = await prisma.tournament.count({
        where: { status: 'waiting', ownerUserId }
      });
      if (openCount >= 9) {
        return reply
          .code(400)
          .send({ error: 'You already have the maximum number (9) of open tournaments' });
      }
  
      const newT = await prisma.tournament.create({
        data: { name, maxPlayers, status: 'waiting', ownerUserId }
      });
      fastify.log.info(`Tournament created: ${newT.id}`);
      return reply.code(201).send(newT);
    }
  );

  fastify.post(
    '/tournaments/join',
    { schema: joinSchema, preHandler: fastify.auth },
    async (req, reply) => {
      const userId       = req.user.id;
      const { tournamentId } = req.body;
      const alreadyIn = await prisma.tournamentParticipant.findFirst({
        where: {
          userId,
          tournament: { status: 'waiting' }
        }
      });
      if (alreadyIn) {
        return reply
          .code(400)
          .send({ error: 'You are already in a waiting tournament' });
      }

      const profile = await getUserProfile(userId);
      // find or create waiting tournament
      const result = await prisma.$transaction(async tx => {
        let tour = tournamentId
          ? await tx.tournament.findUnique({ where: { id: tournamentId },
            include: { 
              _count: { 
                select: { 
                  participants: true 
                } 
              } 
            } })
          : await tx.tournament.findFirst({
              where: { 
                status: 'waiting' 
              },
              include: { 
                _count: { 
                  select: { 
                    participants: true 
                  } 
                } 
              }
            });

        if (!tour) {
          tour = await tx.tournament.create({
            data: {
              name:       `Tournament ${new Date().toISOString().slice(0,10)}`,
              maxPlayers: 4,
              status:     'waiting',
              ownerUserId: userId
            },
            include: { 
              _count: { 
                select: { 
                  participants: true 
                } 
              } 
            }
          });
          fastify.log.info(`Auto-created tournament ${tour.id}`);
        }

        if (tour._count.participants >= tour.maxPlayers) {
          return reply.code(400).send({ 
            error: 'Tournament is full' 
          });
        }

        const already = await tx.tournamentParticipant.findFirst({
          where: { 
            tournamentId: tour.id, 
            userId 
          }
        });
        if (already) {
          return reply.code(400).send({ error: 'Already joined' });
        }

        await tx.tournamentParticipant.create({
          data: { 
            tournamentId: tour.id, 
            userId, 
            username: profile.username 
          }
        });

        const count = await tx.tournamentParticipant.count({
          where: { tournamentId: tour.id }
        });
        return { tournamentId: tour.id, count, maxPlayers: tour.maxPlayers };
      });

      if (result.count >= result.maxPlayers) {
        setTimeout(() => {
          startTournament(result.tournamentId)
            .then(() => fastify.log.info(`Auto-started ${result.tournamentId}`))
            .catch(err => fastify.log.error(`Auto-start failed: ${err.message}`));
        }, 0);
      }

      return { success: true, ...result };
    }
  );

  fastify.post(
    '/tournaments/leave',
    { schema: leaveSchema, preHandler: fastify.auth },
    async (req, reply) => {
      const { userId, tournamentId } = req.body;
      if (req.user.id !== userId) {
        return reply.code(403).send({ error: 'Cannot leave on behalf of another user' });
      }
      const tour = await prisma.tournament.findUnique({ where: { id: tournamentId } });
      if (!tour) 
        return reply.code(404).send({ error: 'Tournament not found' });
      if (tour.status !== 'waiting') {
        return reply.code(400).send({ error: 'Cannot leave a started tournament' });
      }

      const removed = await prisma.tournamentParticipant.deleteMany({
        where: { tournamentId, userId }
      });
      if (removed.count === 0) {
        return reply.code(404).send({ error: 'Not a participant' });
      }

      fastify.log.info(`User ${userId} left tournament ${tournamentId}`);
      return { success: true };
    }
  );

  fastify.delete(
    '/tournaments/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { 
            id: { type: 'integer' } 
          }
        }
      },
      preHandler: fastify.auth
    },
    async (req, reply) => {
      const tid = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const t = await prisma.tournament.findUnique({ where: { id: tid } });
      if (!t)
        return reply.code(404).send({ error: 'Tournament not found' });
      if (t.ownerUserId !== userId)
        return reply.code(403).send({ error: 'Not the owner' });
      // if (t.status !== 'waiting') 
      //   return reply.code(400).send({ error: 'Cannot cancel started tournament' });

      await prisma.$transaction(async tx => {
        await tx.tournamentParticipant.deleteMany({ where: { tournamentId: tid } });
        await tx.tournamentMatch.deleteMany({ where: { tournamentId: tid } })
        await tx.tournament.delete({ where: { id: tid } });
      });

      fastify.log.info(`Tournament ${tid} cancelled by ${userId}`);
      return { success: true };
    }
  );
}

module.exports = tournamentRoutes;