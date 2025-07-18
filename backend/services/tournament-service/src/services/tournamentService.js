const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { startMatch } = require('./gameService.js');

const config = {
  USER_PROFILE_SERVICE_URL: process.env.USER_PROFILE_SERVICE_URL || 'https://user-service:3002',
  GAME_ENGINE_SERVICE_URL: process.env.GAME_ENGINE_SERVICE_URL || 'https://game-service:4004',
  STATS_SERVICE_URL: process.env.STATS_SERVICE_URL || 'https://stats-service:4100',
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '5000')
};

const logger = {
  info: msg => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: msg => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (msg, err) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`);
    if (err && err.stack) console.error(err.stack);
  }
};

async function getUserProfile(userId) {
  let retries = 3;

  while (retries--) {
    try {
      const res = await axios.get(
        `${config.USER_PROFILE_SERVICE_URL}/users/${userId}`,
        { timeout: config.REQUEST_TIMEOUT }
      );
      return res.data;
    } catch (err) {
      lastError = err;
      logger.warn(`Failed to fetch profile ${userId}, retries left ${retries}: ${err.message}`);
      if (err.response?.status === 404)
        throw new Error(`User ${userId} not found`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`User Profile Service unavailable`);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function createTournamentRound(tournamentId, participants, roundNumber) {
  logger.info(`Creating round ${roundNumber} for tournament ${tournamentId}`);

  let byePlayer = null;
  if (participants.length % 2 !== 0) {
    const idx = Math.floor(Math.random() * participants.length);
    byePlayer = participants.splice(idx, 1)[0];
    // const byeMatch = await prisma.tournamentMatch.create({
    //   data: {
    //     tournamentId,
    //     round: roundNumber,
    //     player1Id: byePlayer.userId,
    //     player2Id: null,
    //     winnerId: byePlayer.userId,
    //     score: 'bye',
    //     playedAt: new Date()
    //   }
    // });
    logger.info(`Player ${byePlayer.userId} receives a bye`);
  }

  for (let i = 0; i < participants.length; i += 2) {
    const p1 = participants[i], p2 = participants[i+1];
    try {
      const [u1, u2] = await Promise.all([
        getUserProfile(p1.userId),
        getUserProfile(p2.userId)
      ]);
      const match = await prisma.tournamentMatch.create({
        data: {
          tournamentId,
          round: roundNumber,
          player1Id: p1.userId,
          player2Id: p2.userId
        }
      });
      const roomId = `tournament-${tournamentId}-match-${match.id}`;
      await startMatch({
        roomId,
        player1: { id: p1.userId, username: u1.username, avatar: u1.avatar, rating: u1.rating },
        player2: { id: p2.userId, username: u2.username, avatar: u2.avatar, rating: u2.rating },
        mode: 'tournament',
        tournamentId,
        matchId: match.id,
        round: roundNumber
      }, logger, config);
      logger.info(`Match ${match.id} created: ${u1.username} vs ${u2.username}`);
    } catch (err) {
      logger.error(`Failed to create match for ${p1.userId} vs ${p2.userId}: ${err.message}`, err);
    }
  }
}

// Process a round’s results and advance or finish tournament
async function processTournamentRound(matchId, tournamentId, round) {
  logger.info(`Processing results for matchId ${matchId} tournament ${tournamentId} round ${round}`);
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, round }
  });
  const incomplete = matches.filter(m => !m.winnerId);
  if (incomplete.length) {
    logger.info(`Round ${round} not complete: ${incomplete.length} pending`);
    return;
  }

  const winners = matches.map(m => ({ userId: m.winnerId, tournamentId }));
  if (winners.length === 1) {
    // Final winner
    const win = winners[0];
    const profile = await getUserProfile(win.userId);
    await prisma.$transaction(async tx => {
      await tx.tournament.update({
        where: { 
          id: tournamentId 
        },
        data: { 
          status: 'completed', 
          winnerId: win.userId, 
          endedAt: new Date() 
        }
      });
    });
    logger.info(`Tournament ${tournamentId} completed. Winner: ${profile.username}`);
    // Notify Stats Service (non-blocking)
    axios.post(`${config.STATS_SERVICE_URL}/tournament-stats`, {
      tournamentId, winnerId: win.userId, winnerName: profile.username, completedAt: new Date()
    }).catch(e => logger.error(`Stats Service error: ${e.message}`));
  } else {
    // Next round
    logger.info(`Starting next round ${round+1} for tournament ${tournamentId}`);
    await createTournamentRound(tournamentId, winners, round + 1);
  }
}

async function startTournament(tournamentId) {
  let info;
  try {
    // Phase 1: get participants + mark in_progress
    info = await prisma.$transaction(async tx => {
      const t = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: { participants: true }
      });
      if (!t)
        throw new Error(`Tournament ${tournamentId} not found`);
      if (t.status !== 'waiting')
        throw new Error(`Cannot start status=${t.status}`);
      if (t.participants.length < 2)
        throw new Error(`Need ≥2 participants`);
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'in_progress' }
      });
      return {
        participants: shuffleArray(t.participants),
        name: t.name
      };
    });
  } catch (err) {
    logger.error(`startTournament failed: ${err.message}`, err);
    throw err;
  }

  // Phase 2: create round 1
  logger.info(`Starting tournament ${tournamentId} (${info.name}) with ${info.participants.length} players`);
  await createTournamentRound(tournamentId, info.participants, 1);
  logger.info(`Tournament ${tournamentId} round 1 created`);
}

module.exports = {
  getUserProfile,
  startMatch,
  startTournament,
  createTournamentRound,
  processTournamentRound
};