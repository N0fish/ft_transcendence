import notifyMatchmakingFinished from '../utils/notifyMatchmaking.js';
import sendMatchResult from '../utils/sendMatchResult.js';

const FIELD_WIDTH = 20;
const FIELD_HEIGHT = 12;
const BALL_SPEED_X = 0.15;
const BALL_SPEED_Z = 0.08;
const MAX_SCORE = 11;

export default class GameInstance {
    maxScore = MAX_SCORE;
    constructor(roomId, onGameOver, payload) {
        this.roomId = roomId;

        this.player1Id = Number(payload.player1.id);
        this.player2Id = Number(payload.player2.id);

        this.sockets = {
            [this.player1Id]: null,
            [this.player2Id]: null,
        };
        this.players = {
            [this.player1Id]: {z: 0, score: 0},
            [this.player2Id]: {z: 0, score: 0},
        };
        this.ball = {
            x: 0,
            z: 0,
            vx: BALL_SPEED_X,
            vz: BALL_SPEED_Z
        };
        this.width = FIELD_WIDTH;
        this.height = FIELD_HEIGHT;
        // this.maxScore = 11;

        this.status = 'waiting';
        this.onGameOver = onGameOver;
        this.startTime = Date.now();
        this.countdown = 5;
        this.countdownInterval = null;

        this.mode = payload.mode || 'random';
        this.tournamentId = payload.tournamentId || null;
        this.matchId = payload.matchId || null;

        this.isPaused = false;
        this.reconnectTimeouts = {};
        this.disconnected = {};

        console.log(`New game started — Room: ${this.roomId} with players ${this.player1Id} and ${this.player2Id}`);
    }

    handleMove(playerId, data) {
        playerId = Number(playerId);

        if (!this.players[playerId] || this.status !== 'running') {
            console.warn(`Move rejected for player ${playerId}, status: ${this.status}`);
            return;
        }

        if (data.direction === 'up') {
            this.players[playerId].z += 0.75; // Move paddle up (forward in 3D space)
        } else if (data.direction === 'down') {
            this.players[playerId].z -= 0.75; // Move paddle down (backward in 3D space)
        } else if (data.up) {
            this.players[playerId].z += 0.75;
        } else if (data.down) {
            this.players[playerId].z -= 0.75;
        }

        const paddleHeight = 3;
        const halfPaddleHeight = paddleHeight / 2;
        const maxZ = this.height / 2 - halfPaddleHeight;

        if (this.players[playerId].z < -maxZ) {
            this.players[playerId].z = -maxZ;
        } else if (this.players[playerId].z > maxZ) {
            this.players[playerId].z = maxZ;
        }
    }

    handleDisconnect(id) {
        id = Number(id);

        if (!this.players[id]) {
            console.warn(`Player ${id} disconnected but not found in room ${this.roomId}`);
            return;
        }

        console.log(`Player ${id} disconnected from room ${this.roomId}`);

        this.status = "paused";
        this.isPaused = true;
        this.disconnected[id] = true;

        this.broadcast("pause", {
            type: "pause",
            reason: "player disconnected",
            disconnectedId: id
        });

        this.reconnectTimeouts[id] = setTimeout(() => {
            if (!this.disconnected[id])
                return;
            console.warn(`Player ${id} did not reconnect in time — ending match`);

            this.broadcast("gameOver", {
                type: "gameOver",
                reason: "player did not reconnect in time",
                disconnectedId: id
            });
            clearInterval(this.loop);
            this.loop = null;

            const otherId = Object.keys(this.players).find(pid => Number(pid) !== id);
            this.sendMatchResult(otherId)
                .catch(err => console.error("sendMatchResult error:", err))
                .finally(() => this.onGameOver(this.roomId, this.player1Id, this.player2Id));
        }, 30000);
    }

    handleReconnect(id, newSocket) {
        id = Number(id);

        if (!this.disconnected[id]) {
            this.sockets[id] = newSocket;
            return;
        }

        this.sockets[id] = newSocket;
        delete this.disconnected[id];

        if (this.reconnectTimeouts[id]) {
            clearTimeout(this.reconnectTimeouts[id]);
            delete this.reconnectTimeouts[id];
        }

        if (Object.keys(this.disconnected).length === 0) {
            if (this.status === 'paused') {
                this.status = 'running';
                console.log(`Game resumed in room ${this.roomId}`);
            }
            this.isPaused = false;

            if (!this.loop) {
                this.loop = setInterval(() => {
                    this.update().catch(err => console.error("update error:", err));
                }, 1000 / 60);
            }

            this.broadcast("resume", {
                type: "resume",
                message: "game resumed"
            });
        }
    }

    startCountdown() {
        this.countdown = 5;
        this.status = 'countdown';

        this.broadcast("countdown", {
            type: "countdown",
            countdown: this.countdown
        });

        this.countdownInterval = setInterval(() => {
            this.countdown--;

            this.broadcast("countdown", {
                type: "countdown",
                countdown: this.countdown
            });

            if (this.countdown <= 0) {
                clearInterval(this.countdownInterval);
                this.status = 'running';
                this.startTime = Date.now();

                if (!this.loop) {
                    this.loop = setInterval(() => {
                        this.update().catch(err => console.error("update error:", err));
                    }, 1000 / 60);
                }

                this.broadcast("gameStart", {
                    type: "gameStart"
                });
            }
        }, 1000);
    }

    async update() {
        if (Object.keys(this.disconnected).length > 0 || this.isPaused || this.status !== 'running') {
            return;
        }

        // Update ball position
        this.ball.x += this.ball.vx;
        this.ball.z += this.ball.vz;

        // Ball collision with top/bottom walls
        if (this.ball.z <= -this.height / 2 || this.ball.z >= this.height / 2) {
            this.ball.vz *= -1;
        }

        // Check paddle collisions
        const paddleWidth = 0.5;
        const paddleHeight = 3;

        // Left paddle (player 1)
        const leftPaddleX = -this.width / 2 + paddleWidth / 2;
        const leftPaddleZ = this.players[this.player1Id].z;

        // Right paddle (player 2)
        const rightPaddleX = this.width / 2 - paddleWidth / 2;
        const rightPaddleZ = this.players[this.player2Id].z;

        // Ball collision with left paddle
        if (this.ball.x <= leftPaddleX + paddleWidth &&
            this.ball.x >= leftPaddleX - paddleWidth &&
            this.ball.z >= leftPaddleZ - paddleHeight / 2 &&
            this.ball.z <= leftPaddleZ + paddleHeight / 2) {

            this.ball.vx = Math.abs(this.ball.vx) * 1.05;

            const hitPosition = (this.ball.z - leftPaddleZ) / (paddleHeight / 2);
            this.ball.vz = hitPosition * BALL_SPEED_Z * 2;
        }

        // Ball collision with right paddle
        if (this.ball.x >= rightPaddleX - paddleWidth &&
            this.ball.x <= rightPaddleX + paddleWidth &&
            this.ball.z >= rightPaddleZ - paddleHeight / 2 &&
            this.ball.z <= rightPaddleZ + paddleHeight / 2) {

            this.ball.vx = -Math.abs(this.ball.vx) * 1.05; // Reverse direction and add speed

            // Adjust angle based on where ball hit paddle
            const hitPosition = (this.ball.z - rightPaddleZ) / (paddleHeight / 2);
            this.ball.vz = hitPosition * BALL_SPEED_Z * 2;
        }

        // Check for goals
        const goalLeft = this.ball.x <= -this.width / 2;
        const goalRight = this.ball.x >= this.width / 2;

        if (goalLeft || goalRight) {
            const scorerId = goalRight ? this.player1Id : this.player2Id;
            this.players[scorerId].score += 1;

            this.broadcast("goalScored", {
                type: "goalScored",
                playerId: scorerId,
                score: {
                    player1: this.players[this.player1Id].score,
                    player2: this.players[this.player2Id].score,
                },
            });

            if (this.players[scorerId].score >= this.maxScore) {
                this.status = "ended";
                this.broadcast("gameOver", {
                    type: "gameOver",
                    winnerId: scorerId,
                    score: [
                        this.players[this.player1Id].score,
                        this.players[this.player2Id].score
                    ],
                    duration: this.getDuration(),
                    status: this.isPaused ? "paused" : this.status,
                });
                clearInterval(this.loop);
                this.loop = null;

                try {
                    await this.sendMatchResult(scorerId);
                } catch (err) {
                    console.error("Error sending match result:", err);
                } finally {
                    if (this.roomId) {
                        await notifyMatchmakingFinished(this.roomId);
                    }
                    this.onGameOver(this.roomId, this.player1Id, this.player2Id);
                }
                return;
            }

            // Reset ball position after goal
            this.ball = {
                x: 0,
                z: 0,
                vx: goalRight ? BALL_SPEED_X : -BALL_SPEED_X,
                vz: (Math.random() - 0.5) * BALL_SPEED_Z * 2
            };
        }

        this.broadcast("gameState", {
            ball: this.ball,
            players: this.players,
            timeElapsed: (Date.now() - this.startTime) / 1000,
            status: this.status,
        });
    }

    getDuration() {
        const seconds = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    async sendMatchResult(winnerId) {
        console.log(`Match result: winner ${winnerId}, score [${this.players[this.player1Id].score}, ${this.players[this.player2Id].score}]`);

        return sendMatchResult({
            roomId: this.roomId,
            player1Id: this.player1Id,
            player2Id: this.player2Id,
            winnerId,
            score: [
                this.players[this.player1Id].score,
                this.players[this.player2Id].score
            ],
            duration: this.getDuration(),
            tournamentId: this.tournamentId,
            matchId: this.matchId,
            mode: this.mode,
            status: this.isPaused ? "paused" : this.status,
            playedAt: new Date().toISOString(),
        });
    }

    async handleTimeoutEnd(winnerId) {
        console.log(`Timeout ended game in room ${this.roomId}, winner: ${winnerId}`);
        this.broadcast("gameOver", {
            type: "gameOver",
            reason: "opponent did not return",
            winnerId: winnerId,
            score: [
                this.players[this.player1Id].score,
                this.players[this.player2Id].score
            ]
        });
        clearInterval(this.loop);
        this.loop = null;

        try {
            await this.sendMatchResult(winnerId);
        } catch (err) {
            console.error("sendMatchResult error:", err);
        } finally {
            if (this.roomId) {
                await notifyMatchmakingFinished(this.roomId);
            }
            console.log("Cleaning up after match end");
            this.onGameOver(this.roomId, this.player1Id, this.player2Id);
        }
    }

    startUpdate() {
        Object.entries(this.sockets).forEach(([id, socket]) => {
            if (socket) {
                socket.on("message", (message) => {
                    try {
                        const data = JSON.parse(message.toString());
                        if (data.type === 'move') {
                            this.handleMove(id, data.payload || data);
                        } else if (data.type === 'startGame' && this.status === 'waiting') {
                            console.log(`Player ${id} requested to start game in room ${this.roomId}`);
                            this.startCountdown();
                        }
                    } catch (err) {
                        console.error("Error processing message:", err);
                    }
                });

                socket.on("close", () => this.handleDisconnect(id));
            }
        });

        // Start countdown when both players are connected
        if (Object.values(this.sockets).every(socket => socket) && this.status === 'waiting') {
            console.log(`Both players connected in room ${this.roomId}, starting countdown`);
            this.startCountdown();
        }
    }

    broadcast(event, payload) {
        const updMsg = JSON.stringify({event, payload});
        Object.entries(this.sockets).forEach(([id, s]) => {
            if (s && typeof s.send === 'function') {
                s.send(updMsg);
            }
        });
    }
}