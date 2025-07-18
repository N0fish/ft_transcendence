'use strict';

module.exports = async function (fastify, opts) {
    const prisma = fastify.prisma || require('@prisma/client').PrismaClient();

    fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);

            const friendsData = await prisma.friend.findMany({
                where: { userId },
                include: {
                    friend: true
                }
            });

            const friends = friendsData.map(f => ({
                userId: f.friend.userId,
                username: f.friend.username,
                avatar: f.friend.avatar,
                status: f.friend.status,
                rating: f.friend.rating
            }));

            return friends;
        } catch (error) {
            fastify.log.error('Error retrieving friends:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    fastify.post('/:friendId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);
            const friendId = parseInt(request.params.friendId);

            if (isNaN(friendId)) {
                return reply.code(400).send({ error: 'Invalid friend ID' });
            }

            if (userId === friendId) {
                return reply.code(400).send({ error: 'Cannot add yourself as a friend' });
            }

            const friendProfile = await prisma.profile.findUnique({
                where: { userId: friendId }
            });

            if (!friendProfile) {
                return reply.code(404).send({ error: 'User not found' });
            }

            const existingFriend = await prisma.friend.findFirst({
                where: {
                    userId,
                    friendId
                }
            });

            if (existingFriend) {
                return reply.code(409).send({ error: 'Already friends' });
            }

            const blockRelation = await prisma.blockedUser.findFirst({
                where: {
                    OR: [
                        { userId, blockedId: friendId },
                        { userId: friendId, blockedId: userId }
                    ]
                }
            });

            if (blockRelation) {
                return reply.code(403).send({ error: 'Cannot add user as friend due to blocking' });
            }

            await prisma.$transaction([
                prisma.friend.create({
                    data: {
                        userId,
                        friendId
                    }
                }),
                prisma.friend.create({
                    data: {
                        userId: friendId,
                        friendId: userId
                    }
                })
            ]);

            return { message: 'Friend added successfully' };
        } catch (error) {
            if (error.code) {
                switch (error.code) {
                    case 'P2003':
                        return reply.code(404).send({ error: 'User or friend not found' });
                    default:
                        fastify.log.error(`Prisma error: ${error.code} - ${error.message}`);
                }
            }

            fastify.log.error('Error adding friend:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    fastify.delete('/:friendId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);
            const friendId = parseInt(request.params.friendId);

            if (isNaN(friendId)) {
                return reply.code(400).send({ error: 'Invalid friend ID' });
            }

            const existingFriendship = await prisma.friend.findFirst({
                where: {
                    userId,
                    friendId
                }
            });

            if (!existingFriendship) {
                return reply.code(404).send({ error: 'Friend relationship not found' });
            }

            await prisma.$transaction([
                prisma.friend.deleteMany({
                    where: {
                        userId,
                        friendId
                    }
                }),
                prisma.friend.deleteMany({
                    where: {
                        userId: friendId,
                        friendId: userId
                    }
                })
            ]);

            return { message: 'Friend removed successfully' };
        } catch (error) {
            fastify.log.error('Error removing friend:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Get list of blocked users
    fastify.get('/blocked', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);

            const blockedUsersData = await prisma.blockedUser.findMany({
                where: { userId },
                include: {
                    blocked: true
                }
            });

            const blockedUsers = blockedUsersData.map(b => ({
                userId: b.blocked.userId,
                username: b.blocked.username,
                avatar: b.blocked.avatar,
                blockedAt: b.createdAt
            }));

            return blockedUsers;
        } catch (error) {
            fastify.log.error('Error retrieving blocked users:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    fastify.post('/block/:userId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);
            const blockedId = parseInt(request.params.userId);

            if (isNaN(blockedId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            if (userId === blockedId) {
                return reply.code(400).send({ error: 'Cannot block yourself' });
            }

            const userToBlock = await prisma.profile.findUnique({
                where: { userId: blockedId }
            });

            if (!userToBlock) {
                return reply.code(404).send({ error: 'User not found' });
            }

            // Check if already blocked
            const existingBlock = await prisma.blockedUser.findFirst({
                where: {
                    userId,
                    blockedId
                }
            });

            if (existingBlock) {
                return reply.code(409).send({ error: 'User already blocked' });
            }

            await prisma.$transaction(async (tx) => {
                await tx.blockedUser.create({
                    data: {
                        userId,
                        blockedId
                    }
                });
                
                await tx.friend.deleteMany({
                    where: {
                        OR: [
                            { userId, friendId: blockedId },
                            { userId: blockedId, friendId: userId }
                        ]
                    }
                });
            });

            return { message: 'User blocked successfully' };
        } catch (error) {
            fastify.log.error('Error blocking user:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Unblock a user
    fastify.delete('/block/:userId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);
            const blockedId = parseInt(request.params.userId);

            if (isNaN(blockedId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            const existingBlock = await prisma.blockedUser.findFirst({
                where: {
                    userId,
                    blockedId
                }
            });

            if (!existingBlock) {
                return reply.code(404).send({ error: 'User is not blocked' });
            }

            await prisma.blockedUser.deleteMany({
                where: {
                    userId,
                    blockedId
                }
            });

            return { message: 'User unblocked successfully' };
        } catch (error) {
            fastify.log.error('Error unblocking user:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Check if a user is blocked
    fastify.get('/is-blocked/:userId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);
            const targetId = parseInt(request.params.userId);

            if (isNaN(targetId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            const blockRelation = await prisma.blockedUser.findFirst({
                where: {
                    OR: [
                        { userId, blockedId: targetId },
                        { userId: targetId, blockedId: userId }
                    ]
                }
            });

            return { 
                isBlocked: !!blockRelation,
                direction: blockRelation 
                    ? (blockRelation.userId === userId ? 'outgoing' : 'incoming')
                    : null
            };
        } catch (error) {
            fastify.log.error('Error checking block status:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Get all friend requests (sent and received)
    fastify.get('/requests', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);

            const sentRequests = await prisma.friendRequest.findMany({
                where: { 
                    senderId: userId,
                    status: 'pending'
                },
                include: {
                    receiver: {
                        select: {
                            userId: true,
                            username: true,
                            avatar: true,
                            status: true
                        }
                    }
                }
            });

            const receivedRequests = await prisma.friendRequest.findMany({
                where: { 
                    receiverId: userId,
                    status: 'pending'
                },
                include: {
                    sender: {
                        select: {
                            userId: true,
                            username: true,
                            avatar: true,
                            status: true
                        }
                    }
                }
            });

            return {
                sent: sentRequests,
                received: receivedRequests
            };
        } catch (error) {
            fastify.log.error('Error retrieving friend requests:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Get count of pending received requests (for notification badge)
    fastify.get('/requests/pending-count', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);

            const count = await prisma.friendRequest.count({
                where: { 
                    receiverId: userId,
                    status: 'pending'
                }
            });

            return { count };
        } catch (error) {
            fastify.log.error('Error counting pending requests:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Send a friend request
    fastify.post('/requests', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const senderId = parseInt(request.user.id);
            const { receiverId } = request.body;

            if (!receiverId || isNaN(parseInt(receiverId))) {
                return reply.code(400).send({ error: 'Invalid receiver ID' });
            }

            const receiverIdInt = parseInt(receiverId);

            if (senderId === receiverIdInt) {
                return reply.code(400).send({ error: 'Cannot send friend request to yourself' });
            }

            const receiver = await prisma.profile.findUnique({
                where: { userId: receiverIdInt }
            });

            if (!receiver) {
                return reply.code(404).send({ error: 'User not found' });
            }

            const existingFriend = await prisma.friend.findFirst({
                where: {
                    userId: senderId,
                    friendId: receiverIdInt
                }
            });

            if (existingFriend) {
                return reply.code(409).send({ error: 'Already friends with this user' });
            }

            const blockRelation = await prisma.blockedUser.findFirst({
                where: {
                    OR: [
                        { userId: senderId, blockedId: receiverIdInt },
                        { userId: receiverIdInt, blockedId: senderId }
                    ]
                }
            });

            if (blockRelation) {
                return reply.code(403).send({ error: 'Cannot send friend request due to blocking' });
            }

            const existingRequest = await prisma.friendRequest.findFirst({
                where: {
                    senderId,
                    receiverId: receiverIdInt,
                    status: 'pending'
                }
            });

            if (existingRequest) {
                return reply.code(409).send({ error: 'Friend request already sent' });
            }

            const reverseRequest = await prisma.friendRequest.findFirst({
                where: {
                    senderId: receiverIdInt,
                    receiverId: senderId,
                    status: 'pending'
                }
            });

            if (reverseRequest) {
                await prisma.$transaction(async (tx) => {
                    await tx.friendRequest.update({
                        where: { id: reverseRequest.id },
                        data: { status: 'accepted' }
                    });

                    await tx.friend.create({
                        data: {
                            userId: senderId,
                            friendId: receiverIdInt
                        }
                    });

                    await tx.friend.create({
                        data: {
                            userId: receiverIdInt,
                            friendId: senderId
                        }
                    });
                });

                return { message: 'Friend request accepted automatically' };
            }

            const friendRequest = await prisma.friendRequest.create({
                data: {
                    senderId,
                    receiverId: receiverIdInt,
                    status: 'pending'
                }
            });

            return { 
                message: 'Friend request sent successfully',
                requestId: friendRequest.id
            };
        } catch (error) {
            fastify.log.error('Error sending friend request:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Accept a friend request
    fastify.patch('/requests/:requestId/accept', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);
            const requestId = parseInt(request.params.requestId);

            if (isNaN(requestId)) {
                return reply.code(400).send({ error: 'Invalid request ID' });
            }

            const friendRequest = await prisma.friendRequest.findUnique({
                where: { id: requestId }
            });

            if (!friendRequest) {
                return reply.code(404).send({ error: 'Friend request not found' });
            }

            if (friendRequest.receiverId !== userId) {
                return reply.code(403).send({ error: 'Not authorized to accept this request' });
            }

            if (friendRequest.status !== 'pending') {
                return reply.code(400).send({ error: `Request already ${friendRequest.status}` });
            }

            await prisma.$transaction(async (tx) => {
                await tx.friendRequest.update({
                    where: { id: requestId },
                    data: { status: 'accepted' }
                });

                await tx.friend.create({
                    data: {
                        userId,
                        friendId: friendRequest.senderId
                    }
                });

                await tx.friend.create({
                    data: {
                        userId: friendRequest.senderId,
                        friendId: userId
                    }
                });
            });

            return { message: 'Friend request accepted' };
        } catch (error) {
            fastify.log.error('Error accepting friend request:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Decline a friend request
    fastify.patch('/requests/:requestId/decline', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);
            const requestId = parseInt(request.params.requestId);

            if (isNaN(requestId)) {
                return reply.code(400).send({ error: 'Invalid request ID' });
            }

            const friendRequest = await prisma.friendRequest.findUnique({
                where: { id: requestId }
            });

            if (!friendRequest) {
                return reply.code(404).send({ error: 'Friend request not found' });
            }

            if (friendRequest.receiverId !== userId) {
                return reply.code(403).send({ error: 'Not authorized to decline this request' });
            }

            if (friendRequest.status !== 'pending') {
                return reply.code(400).send({ error: `Request already ${friendRequest.status}` });
            }

            await prisma.friendRequest.update({
                where: { id: requestId },
                data: { status: 'declined' }
            });

            return { message: 'Friend request declined' };
        } catch (error) {
            fastify.log.error('Error declining friend request:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Cancel a sent friend request
    fastify.delete('/requests/:requestId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = parseInt(request.user.id);
            const requestId = parseInt(request.params.requestId);

            if (isNaN(requestId)) {
                return reply.code(400).send({ error: 'Invalid request ID' });
            }

            const friendRequest = await prisma.friendRequest.findUnique({
                where: { id: requestId }
            });

            if (!friendRequest) {
                return reply.code(404).send({ error: 'Friend request not found' });
            }

            if (friendRequest.senderId !== userId) {
                return reply.code(403).send({ error: 'Not authorized to cancel this request' });
            }

            await prisma.friendRequest.delete({
                where: { id: requestId }
            });

            return { message: 'Friend request cancelled' };
        } catch (error) {
            fastify.log.error('Error cancelling friend request:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
};