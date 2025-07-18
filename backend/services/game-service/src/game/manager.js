import GameInstance from './instance.js';

class GameManager {
    constructor() {
        this.activeGames = new Map();         // roomId → GameInstance
        this.waitingPlayers = new Map();      // roomId → { socket, playerId }
        this.rooms = new Map();               // roomId → { player1Id, player2Id }
        this.playerToRoom = new Map();        // playerId → roomId
        this.disconnected = new Map();        // playerId → { roomId, timestamp }
        this.finishedRooms = new Set();       // Set of roomIds that have finished games

        // Run cleanup more frequently
        setInterval(() => this.cleanupDisconnected(), 5000);
        setInterval(() => this.logStatus(), 60000);
    }

    logStatus() {
        console.log(`=== Game Service Status ===`);
        console.log(`Active games: ${this.activeGames.size}`);
        console.log(`Waiting rooms: ${this.waitingPlayers.size}`);
        console.log(`Total rooms: ${this.rooms.size}`);
        console.log(`Disconnected players: ${this.disconnected.size}`);
        console.log(`Finished rooms: ${this.finishedRooms.size}`);
        console.log(`========================`);
    }

    getGameByRoom(roomId) {
        // Don't return games from finished rooms
        if (this.finishedRooms.has(roomId)) {
            console.log(`Room ${roomId} is finished, not returning game`);
            return null;
        }
        return this.activeGames.get(roomId);
    }

    cleanupRoom(roomId, player1Id, player2Id) {
        // Ensure we're working with numbers
        player1Id = Number(player1Id);
        player2Id = Number(player2Id);

        console.log(`Cleaning up room ${roomId}, players: ${player1Id}, ${player2Id}`);

        // Mark the room as finished first
        this.finishedRooms.add(roomId);

        // Remove game from active games
        this.activeGames.delete(roomId);

        // Remove room data
        this.rooms.delete(roomId);
        this.waitingPlayers.delete(roomId);

        // Remove player associations
        this.playerToRoom.delete(player1Id);
        this.playerToRoom.delete(player2Id);

        // Remove any disconnected records
        this.disconnected.delete(player1Id);
        this.disconnected.delete(player2Id);

        console.log(`Deleted room: ${roomId}`);

        // Schedule complete cleanup of finished room after a delay
        // This allows any reconnection attempts to get a proper "Room doesn't exist" error
        setTimeout(() => {
            this.finishedRooms.delete(roomId);
            console.log(`Completely removed finished room ${roomId} from records`);
        }, 30000); // 30 seconds
    }

    createRoom(roomId, player1Id, player2Id, options = {}) {
        // Convert player IDs to numbers
        player1Id = Number(player1Id);
        player2Id = Number(player2Id);

        // Create a new room with player IDs
        this.rooms.set(roomId, { player1Id, player2Id, options });
        console.log(`Created room ${roomId} with players ${player1Id} and ${player2Id}`);

        // Pre-initialize a game instance
        // const game = new GameInstance(
        //     roomId,
        //     (finishedRoomId, p1Id, p2Id) => this.cleanupRoom(finishedRoomId, p1Id, p2Id),
        //     {
        //         player1: { id: player1Id, ...options.player1 || {} },
        //         player2: { id: player2Id, ...options.player2 || {} },
        //         ...options
        //     }
        // );

        // return game;
    }

    joinWaiting(roomId, socket, playerId, options = {}) {
        // Convert playerId to number
        playerId = Number(playerId);

        // Check if the room is finished first
        if (this.finishedRooms.has(roomId)) {
            return socket.send(JSON.stringify({
                type: 'error',
                message: `Room ${roomId} does not exist`
            }));
        }

        // Get room players or create if doesn't exist
        let roomPlayers = this.rooms.get(roomId);
        if (!roomPlayers) {
            return socket.send(JSON.stringify({
                type: 'error',
                message: 'Room does not exist'
            }));
        }

        // Log the comparison for debugging
        console.log(`Player ${playerId} trying to join room ${roomId}, options:`, options);
        console.log(`Room players: player1=${roomPlayers.player1Id} (${typeof roomPlayers.player1Id}), player2=${roomPlayers.player2Id} (${typeof roomPlayers.player2Id})`);

        // Compare as numbers
        if (roomPlayers.player1Id != playerId && roomPlayers.player2Id != playerId) {
            return socket.send(JSON.stringify({
                type: 'error',
                message: `You are not a player in this room (your id: ${playerId})`
            }));
        }

        // Check if player is already in another active game
        const existingRoom = this.playerToRoom.get(playerId);
        if (existingRoom && existingRoom !== roomId) {
            return socket.send(JSON.stringify({
                type: 'error',
                message: 'You are already in another game'
            }));
        }

        // Check if a game instance already exists
        if (this.activeGames.has(roomId)) {
            const game = this.activeGames.get(roomId);
            console.log(`Game exists for room ${roomId}, checking if player ${playerId} can reconnect`);

            if (game.player1Id == playerId || game.player2Id == playerId) {
                // Handle reconnection
                console.log(`Player ${playerId} reconnecting to existing game in room ${roomId}`);
                game.handleReconnect(playerId, socket);
                this.playerToRoom.set(playerId, roomId);
                return;
            }
            return socket.send(JSON.stringify({
                type: 'error',
                message: 'Game already started with different players'
            }));
        }

        // Handle waiting room logic
        if (!this.waitingPlayers.has(roomId)) {
            // First player joining
            console.log(`Player ${playerId} is first to join waiting room ${roomId}, options:`, options);
            this.waitingPlayers.set(roomId, { socket, playerId, options });

            socket.send(JSON.stringify({
                type: 'waiting',
                message: 'Waiting for opponent to join'
            }));
        } else {
            // Second player joining
            const {
                socket: opponentSocket,
                playerId: opponentId,
                options: opponentOptions
            } = this.waitingPlayers.get(roomId);
            this.waitingPlayers.delete(roomId);

            console.log(`Player ${playerId} is second to join waiting room ${roomId}, opponent: ${opponentId}`);

            if (opponentId === playerId) {
                return socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Cannot join twice with same player ID'
                }));
            }

            // Merge options from both players
            const mergedOptions = {
                ...opponentOptions,
                ...options
            };

            // Get existing pre-initialized game or create new one
            let game = this.activeGames.get(roomId);
            if (!game) {
                const roomData = this.rooms.get(roomId);
                if (!roomData) {
                    return socket.send(JSON.stringify({
                        type: 'error',
                        message: 'Room no longer exists'
                    }));
                }

                // Create new game instance
                console.log(`Creating new game instance for room ${roomId}`);
                game = new GameInstance(
                    roomId,
                    (finishedRoomId, p1Id, p2Id) => this.cleanupRoom(finishedRoomId, p1Id, p2Id),
                    {
                        player1: { id: roomData.player1Id },
                        player2: { id: roomData.player2Id },
                        ...mergedOptions
                    }
                );
            }

            // Set player sockets
            game.sockets[playerId] = socket;
            game.sockets[opponentId] = opponentSocket;

            // Store active game
            this.activeGames.set(roomId, game);
            this.playerToRoom.set(playerId, roomId);
            this.playerToRoom.set(opponentId, roomId);

            // Start the game loop
            game.startUpdate();

            // Notify players
            socket.send(JSON.stringify({
                type: 'gameStart',
                payload: { yourId: playerId }
            }));
            opponentSocket.send(JSON.stringify({
                type: 'gameStart',
                payload: { yourId: opponentId }
            }));
        }
    }

    handleDisconnect(playerId) {
        // Convert to number
        playerId = Number(playerId);

        const roomId = this.playerToRoom.get(playerId);
        if (!roomId) {
            // Player not in a game, check if waiting
            for (const [waitingRoomId, data] of this.waitingPlayers.entries()) {
                if (data.playerId === playerId) {
                    this.waitingPlayers.delete(waitingRoomId);
                    console.log(`Player ${playerId} left waiting room ${waitingRoomId}`);
                    break;
                }
            }
            return;
        }

        // Don't process disconnects from finished rooms
        if (this.finishedRooms.has(roomId)) {
            console.log(`Player ${playerId} disconnected from finished room ${roomId}, ignoring`);
            return;
        }

        const game = this.activeGames.get(roomId);
        if (!game) {
            console.warn(`Player ${playerId} disconnected but game ${roomId} not found`);
            this.playerToRoom.delete(playerId);
            return;
        }

        this.disconnected.set(playerId, {
            roomId,
            timestamp: Date.now()
        });

        game.handleDisconnect(playerId);
    }

    handleReconnect(playerId, socket) {
        // Convert to number
        playerId = Number(playerId);

        const roomId = this.playerToRoom.get(playerId);

        // Check if the room is finished
        if (roomId && this.finishedRooms.has(roomId)) {
            socket.send(JSON.stringify({
                type: 'error',
                message: `Room ${roomId} does not exist`
            }));
            return false;
        }

        const game = this.activeGames.get(roomId);

        if (game) {
            console.log(`Player ${playerId} reconnecting to game in room ${roomId}`);
            game.handleReconnect(playerId, socket);
            this.disconnected.delete(playerId);
            return true;
        }

        console.warn(`Player ${playerId} tried to reconnect but no active game found`);
        return false;
    }

    cleanupDisconnected() {
        const now = Date.now();
        const timeout = 30000; // 30 seconds

        for (const [playerId, { roomId, timestamp }] of this.disconnected.entries()) {
            // Skip finished rooms
            if (this.finishedRooms.has(roomId)) {
                this.disconnected.delete(playerId);
                continue;
            }

            if (now - timestamp > timeout) {
                const game = this.activeGames.get(roomId);
                if (game) {
                    // Convert playerId to number and find other player
                    const pid = Number(playerId);
                    const otherId = game.player1Id === pid ? game.player2Id : game.player1Id;

                    console.log(`Player ${pid} didn't reconnect - ending game ${roomId}, declaring ${otherId} as winner`);
                    game.handleTimeoutEnd(otherId);
                }
                this.disconnected.delete(playerId);
                this.playerToRoom.delete(playerId);
            }
        }
    }
}

export { GameManager };
const gameManager = new GameManager();
export default gameManager;