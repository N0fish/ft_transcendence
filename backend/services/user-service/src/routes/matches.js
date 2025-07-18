'use strict';

module.exports = async function (fastify, opts) {
    const prisma = fastify.prisma || require('@prisma/client').PrismaClient();

    fastify.get('/history', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);

            // Find matches where the user was either player1 or player2
            const matches = await prisma.match.findMany({
                where: {
                    OR: [
                        { player1Id: userId },
                        { player2Id: userId }
                    ]
                },
                orderBy: {
                    playedAt: 'desc'
                }
            });

            // Format and return matches
            const formattedMatches = await Promise.all(matches.map(async (match) => {
                try {
                    const [player1, player2] = await Promise.all([
                        prisma.profile.findUnique({
                            where: { userId: match.player1Id },
                            select: { username: true, avatar: true }
                        }),
                        prisma.profile.findUnique({
                            where: { userId: match.player2Id },
                            select: { username: true, avatar: true }
                        })
                    ]);

                    return {
                        id: match.id,
                        player1: {
                            id: match.player1Id,
                            username: player1?.username || 'Unknown',
                            avatar: player1?.avatar || 'default_avatar.png'
                        },
                        player2: {
                            id: match.player2Id,
                            username: player2?.username || 'Unknown',
                            avatar: player2?.avatar || 'default_avatar.png'
                        },
                        winner: match.winnerId,
                        score: JSON.parse(match.score),
                        duration: match.duration,
                        playedAt: match.playedAt
                    };
                } catch (error) {
                    fastify.log.error(`Error formatting match ${match.id}:`, error);
                    return null;
                }
            }));

            return formattedMatches.filter(match => match !== null);
        } catch (error) {
            fastify.log.error('Error retrieving match history:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Save match result (called from Game Engine)
    fastify.post('/result', async (request, reply) => {
        try {
            const { player1Id, player2Id, winnerId, score, duration } = request.body;

            // Validate input
            if (!player1Id || !player2Id || !winnerId || !score || !duration) {
                return reply.code(400).send({
                    error: 'Missing required fields: player1Id, player2Id, winnerId, score, duration are required'
                });
            }

            // Make sure players exist
            const [player1, player2] = await Promise.all([
                prisma.profile.findUnique({ where: { userId: parseInt(player1Id) } }),
                prisma.profile.findUnique({ where: { userId: parseInt(player2Id) } })
            ]);

            if (!player1 || !player2) {
                return reply.code(404).send({ error: 'One or both players not found' });
            }

            // Make sure winner is one of the players
            if (parseInt(winnerId) !== parseInt(player1Id) && parseInt(winnerId) !== parseInt(player2Id)) {
                return reply.code(400).send({ error: 'Winner must be one of the players' });
            }

            // Format score as string if it's not already
            let scoreString = score;
            if (typeof score !== 'string') {
                scoreString = JSON.stringify(score);
            }

            // Save match
            const match = await prisma.match.create({
                data: {
                    player1Id: parseInt(player1Id),
                    player2Id: parseInt(player2Id),
                    winnerId: parseInt(winnerId),
                    score: scoreString,
                    duration
                }
            });

            const winner = await prisma.profile.findUnique({
                where: { userId: parseInt(winnerId) }
            });

            const loserId = parseInt(winnerId) === parseInt(player1Id) ? parseInt(player2Id) : parseInt(player1Id);
            const loser = await prisma.profile.findUnique({
                where: { userId: loserId }
            });

            if (winner && loser) {
                const K = 32; // K-factor
                const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
                const expectedLoser = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

                const newWinnerRating = Math.round(winner.rating + K * (1 - expectedWinner));
                const newLoserRating = Math.round(loser.rating + K * (0 - expectedLoser));

                // Update ratings
                await Promise.all([
                    prisma.profile.update({
                        where: { userId: parseInt(winnerId) },
                        data: { rating: newWinnerRating }
                    }),
                    prisma.profile.update({
                        where: { userId: loserId },
                        data: { rating: newLoserRating }
                    })
                ]);
            }

            return { message: 'Match result saved successfully', matchId: match.id };
        } catch (error) {
            fastify.log.error('Error saving match result:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
};