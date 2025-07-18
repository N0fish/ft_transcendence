import gameManager from '../game/manager.js';

const socketErrAndClose = (socket, err) => {
    console.error(`WebSocket error: ${err}`);
    socket.send(JSON.stringify({ type: 'error', message: err }));
    socket.close();
};

export const websocketIndex = (socket, req) => {
    const roomId = req.params.roomId;
    let playerId = null;

    console.log(`New WebSocket connection for room: ${roomId}`);

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (typeof data !== 'object' || data === null) {
                return socketErrAndClose(socket, 'Invalid message format');
            }

            const { type } = data;

            if (type === 'joinGame') {
                playerId = data.playerId;

                if (typeof playerId !== 'number' && typeof playerId !== 'string') {
                    return socketErrAndClose(socket, 'Missing or invalid playerId');
                }

                if (typeof playerId === 'string') {
                    playerId = parseInt(playerId, 10);
                    if (isNaN(playerId)) {
                        return socketErrAndClose(socket, 'Invalid playerId format');
                    }
                }

                console.log(`Player ${playerId} joining room ${roomId}`);

                const roomPlayers = gameManager.rooms.get(roomId);
                if (!roomPlayers) {
                    return socketErrAndClose(socket, `Room ${roomId} does not exist`);
                }

                console.log(`Room players:`, roomPlayers, `data:`, data);
                console.log(`Checking if player ${playerId} is in room: player1=${roomPlayers.player1Id}, player2=${roomPlayers.player2Id}`);

                if (roomPlayers.player1Id != playerId && roomPlayers.player2Id != playerId) {
                    return socketErrAndClose(socket, `Player ${playerId} is not a player in room ${roomId}`);
                }

                const existingRoom = gameManager.playerToRoom.get(playerId);
                if (existingRoom === roomId) {
                    const game = gameManager.getGameByRoom(roomId);
                    if (game) {
                        console.log(`Player ${playerId} reconnecting to room ${roomId}`);
                        gameManager.handleReconnect(playerId, socket);
                        return;
                    }
                }

                console.log(`Player ${playerId} joining waiting room ${roomId}`);
                gameManager.joinWaiting(
                    roomId,
                    socket,
                    playerId,
                    {
                        tournamentId: roomPlayers.options.tournamentId,
                        matchId: roomPlayers.options.matchId,
                    }
                );
            }

            if (type === 'move') {
                console.log("websocketIndex moving!")
                if (playerId === null) {
                    console.warn(`Move requested but no player ID is set`);
                    return;
                }

                const game = gameManager.getGameByRoom(roomId);
                if (game) {
                    game.handleMove(playerId, data.payload || data);
                } else {
                    console.warn(`Game not found for room ${roomId} when handling move`);
                }
            }

            if (type === 'startGame') {
                if (playerId === null) {
                    console.warn(`Start game requested but no player ID is set`);
                    return;
                }

                const game = gameManager.getGameByRoom(roomId);
                if (game && game.status === 'waiting') {
                    console.log(`Starting countdown for game in room ${roomId}`);
                    game.startCountdown();
                } else if (game) {
                    console.warn(`Cannot start game in room ${roomId}, status: ${game.status}`);
                } else {
                    console.warn(`Game not found for room ${roomId} when trying to start`);
                }
            }

            if (type === 'reconnect') {
                if (playerId === null) {
                    console.warn(`Reconnect requested but no player ID is set`);
                    return;
                }
                gameManager.handleReconnect(playerId, socket);
            }

            if (type === 'ping') {
                socket.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (err) {
            console.error('WebSocket error:', err);
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });

    socket.on('close', () => {
        if (playerId !== null) {
            console.warn(`Player ${playerId} disconnected from room ${roomId}`);
            gameManager.handleDisconnect(playerId);
        }
    });
};
