import { GameInfo } from "../models/game";
import { MultiplayerGame3D, PlayerState } from "./canvas";

interface GameState {
    ball: { x: number; z: number; vx: number; vz: number };
    players: {
        [id: number]: {
            id?: number;
            z: number;
            score: number;
        };
    };
    timeElapsed: number;
    status: 'waiting' | 'countdown' | 'running' | 'paused' | 'ended';
    countdown?: number;
}

export class MultiplayerConnection {
    private socket!: WebSocket;
    private canvas: MultiplayerGame3D;
    private roomId: string;
    private userId: number;
    private gamePosition: number;
    private reconnectTimeout?: ReturnType<typeof setTimeout>;
    private keepAliveInterval?: ReturnType<typeof setInterval>;
    private reconnecting: boolean = false;
    private currentState: GameState | null = null;
    private isGameOver: boolean = false;

    private gameData: any;

    private lastKnownState: GameState | null = null;
    private connectionStatus: 'connected' | 'reconnecting' | 'disconnected' = 'connected';
    private stateUpdateInterval: ReturnType<typeof setInterval> | null = null;

    public onGameState?: (state: GameState) => void;
    public onGameOver?: (winnerId: number, score: number[]) => void;
    public onCountdown?: (count: number) => void;

    constructor(canvas: MultiplayerGame3D, userId: number, gameData: GameInfo) {
        this.canvas = canvas;
        this.roomId = gameData.roomId;
        this.userId = userId;
        this.gameData = gameData;

        if (gameData.player1?.id === userId) {
            this.gamePosition = 1; 
            console.log(`User ${userId} playing as position 1 (left paddle)`);
        } else if (gameData.player2?.id === userId) {
            this.gamePosition = 2; 
            console.log(`User ${userId} playing as position 2 (right paddle)`);
        } else {
            console.error(`User ${userId} is not a player in this game! (player1: ${gameData.player1?.id}, player2: ${gameData.player2?.id})`);
            this.gamePosition = 0;
            throw "invalid positions or payload";
        }

        this.canvas.setPlayerId(userId, gameData.player1?.id === userId ? gameData.player2?.id : gameData.player1?.id);
    }

    public connect(): void {
        if (this.isGameOver) {
            console.log("Game is over, not connecting");
            return;
        }

        if (this.gamePosition !== 1 && this.gamePosition !== 2) {
            console.error("Cannot connect with invalid game position");
            return;
        }

        if (this.stateUpdateInterval) {
            clearInterval(this.stateUpdateInterval);
            this.stateUpdateInterval = null;
        }

        let socketUrl = '';

        try {
            if (this.gameData && this.gameData.wsUrl) {
                const parsed = new URL(this.gameData.wsUrl);
                parsed.port = parsed.port || '4004'; 
                let originalUrl = parsed.toString().replace(/\/$/, '');
                const serverIP = window.location.hostname;
                if (serverIP !== 'localhost' && serverIP !== '127.0.0.1') {
                    originalUrl = originalUrl.replace('localhost', serverIP);
                }

                socketUrl = originalUrl;
            }
        } catch (error) {
            console.error("Error accessing wsUrl:", error);
        }

        if (!socketUrl || !socketUrl.startsWith('ws')) {
            try {
                const serverHostname = window.location.hostname;
                socketUrl = `ws://${serverHostname}:${window.location.port}/game/${this.roomId}`;

                if (window.location.protocol === 'https:') {
                    socketUrl = `wss://${serverHostname}:${window.location.port}/game/${this.roomId}`;
                }

            } catch (error) {
                socketUrl = `ws://localhost:4004/game/${this.roomId}`;
            }
        }

        this.socket = new WebSocket(socketUrl);
        this.connectionStatus = 'reconnecting';

        this.socket.addEventListener('open', () => {
            this.reconnecting = false;
            this.connectionStatus = 'connected';

            this.socket.send(JSON.stringify({
                type: 'joinGame',
                playerId: this.userId,
            }));

            this.setupKeepAlive();

            this.setupStateUpdateInterval();
        });

        this.socket.addEventListener('error', (error) => {
            console.error('[WebSocket] Error:', error);
            if (!this.isGameOver) {
                this.tryReconnect();
            }
        });

        this.socket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);

                const message = data.event ? { type: data.event, ...data.payload } : data;

                switch (message.type) {
                    case 'gameState':
                        this.handleGameState(message);
                        break;
                    case 'countdown':
                        if (this.onCountdown && typeof message.countdown === 'number') {
                            this.onCountdown(message.countdown);

                            const updatedState = this.getUpdatedState({
                                status: 'countdown',
                                countdown: message.countdown
                            });

                            this.canvas.updateState(updatedState);
                        }
                        break;
                    case 'gameStart':
                        const runningState = this.getUpdatedState({
                            status: 'running'
                        });

                        this.canvas.updateState(runningState);
                        break;
                    case 'goalScored':
                        console.log(`[WebSocket] Goal scored by player ${message.playerId}`);
                        break;
                    case 'gameOver':
                        this.isGameOver = true;
                        const endState = this.getUpdatedState({
                            status: 'ended'
                        });

                        this.canvas.updateState(endState);

                        if (this.onGameOver && Array.isArray(message.score)) {
                            this.onGameOver(message.winnerId, message.score);
                        }
                        break;
                    case 'pause':
                        console.log('[WebSocket] Game paused:', message.reason);

                        const pausedState = this.getUpdatedState({
                            status: 'paused'
                        });

                        this.canvas.updateState(pausedState);

                        if (this.onGameState) {
                            this.onGameState(pausedState);
                        }
                        break;
                    case 'resume':
                        console.log('[WebSocket] Game resumed');

                        const resumedState = this.getUpdatedState({
                            status: 'running'
                        });

                        this.canvas.updateState(resumedState);

                        if (this.onGameState) {
                            this.onGameState(resumedState);
                        }
                        break;
                    case 'error':
                        console.error('[WebSocket] Server error:', message.message);
                        break;
                }
            } catch (err) {
                console.error('[WebSocket] Failed to parse message:', err, event.data);
            }
        });

        this.socket.addEventListener('close', () => {
            console.warn('[WebSocket] Disconnected.');
            this.clearKeepAlive();

            if (!this.isGameOver) {
                console.log('[WebSocket] Trying to reconnect...');
                this.tryReconnect();
            } else {
                console.log('[WebSocket] Game is over, not reconnecting');
            }
        });

        this.setupInputControls();
    }

    private getUpdatedState(updates: Partial<GameState>): GameState {
        if (!this.currentState) {
            const defaultState: GameState = {
                ball: { x: 0, z: 0, vx: 0, vz: 0 },
                players: {
                    1: { z: 0, score: 0 },
                    2: { z: 0, score: 0 }
                },
                timeElapsed: 0,
                status: updates.status || 'waiting'
            };

            return { ...defaultState, ...updates };
        }

        return { ...this.currentState, ...updates };
    }

    private setupKeepAlive(): void {
        this.clearKeepAlive();
        this.keepAliveInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 15000);
    }

    private clearKeepAlive(): void {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = undefined;
        }
    }

    private setupStateUpdateInterval(): void {
        if (this.stateUpdateInterval) {
            clearInterval(this.stateUpdateInterval);
        }

        this.stateUpdateInterval = setInterval(() => {
            if (this.lastKnownState && this.connectionStatus !== 'connected') {
                const predictedState = this.predictGameState(this.lastKnownState);

                this.canvas.updateState(predictedState);

                this.lastKnownState = predictedState;

                console.log('[WebSocket] Using predicted game state during connection issues');
            }
        }, 16); 
    }
    private predictGameState(lastState: GameState): GameState {
        const predictedState: GameState = JSON.parse(JSON.stringify(lastState));

        if (predictedState.status === 'running') {
            predictedState.ball.x += predictedState.ball.vx;
            predictedState.ball.z += predictedState.ball.vz;
            const TABLE_DEPTH = 12; 
            if (predictedState.ball.z <= -TABLE_DEPTH / 2 || predictedState.ball.z >= TABLE_DEPTH / 2) {
                predictedState.ball.vz *= -1; 
            }

            this.handlePredictedPaddleCollisions(predictedState);
        }

        return predictedState;
    }

    private handlePredictedPaddleCollisions(state: GameState): void {
        const TABLE_WIDTH = 20; 
        const PADDLE_WIDTH = 0.5;
        const PADDLE_HEIGHT = 3;

        const leftPaddleX = -TABLE_WIDTH / 2 + PADDLE_WIDTH / 2;
        const leftPaddleZ = state.players[1]?.z || 0;

        const rightPaddleX = TABLE_WIDTH / 2 - PADDLE_WIDTH / 2;
        const rightPaddleZ = state.players[2]?.z || 0;

        const collisionBuffer = this.connectionStatus !== 'connected' ? 0.5 : 0.2;

        if (state.ball.x <= leftPaddleX + PADDLE_WIDTH + collisionBuffer &&
            state.ball.x >= leftPaddleX - PADDLE_WIDTH - collisionBuffer &&
            state.ball.z >= leftPaddleZ - PADDLE_HEIGHT / 2 - collisionBuffer &&
            state.ball.z <= leftPaddleZ + PADDLE_HEIGHT / 2 + collisionBuffer &&
            state.ball.vx < 0) { 

            state.ball.vx = Math.abs(state.ball.vx) * 1.05;

            const hitPosition = (state.ball.z - leftPaddleZ) / (PADDLE_HEIGHT / 2);
            state.ball.vz = hitPosition * 0.08 * 2;
        }

        if (state.ball.x >= rightPaddleX - PADDLE_WIDTH - collisionBuffer &&
            state.ball.x <= rightPaddleX + PADDLE_WIDTH + collisionBuffer &&
            state.ball.z >= rightPaddleZ - PADDLE_HEIGHT / 2 - collisionBuffer &&
            state.ball.z <= rightPaddleZ + PADDLE_HEIGHT / 2 + collisionBuffer &&
            state.ball.vx > 0) { 
            state.ball.vx = -Math.abs(state.ball.vx) * 1.05;

            const hitPosition = (state.ball.z - rightPaddleZ) / (PADDLE_HEIGHT / 2);
            state.ball.vz = hitPosition * 0.08 * 2; 
        }
    }

    private handleGameState(message: any): void {
        if (this.isGameOver) return;

        const players: Record<number, PlayerState> = {};

        for (const idStr in message.players) {
            const id = Number(idStr);
            const playerData = message.players[id];

            players[id] = {
                id,
                z: playerData.z,
                score: playerData.score
            };
        }

        const transformedState: GameState = {
            ball: {
                x: message.ball.x,
                z: message.ball.z,
                vx: message.ball.vx,
                vz: message.ball.vz || message.ball.vy 
            },
            players,
            timeElapsed: message.timeElapsed,
            status: message.status
        };

        this.currentState = transformedState;

        this.lastKnownState = transformedState;
        this.connectionStatus = 'connected';

        this.canvas.updateState(transformedState);

        if (this.onGameState) {
            this.onGameState(transformedState);
        }
    }

    private tryReconnect(): void {
        if (this.isGameOver) {
            console.log("Game is over, not reconnecting");
            return;
        }

        if (this.reconnecting) return;

        this.reconnecting = true;
        this.connectionStatus = 'reconnecting';

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, 3000);
    }

    private setupInputControls(): void {
        const keyState = {
            up: false,
            down: false
        };

        const handleKeyChange = (isDown: boolean, key: string) => {
            if (this.isGameOver) return;

            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

            let changed = false;

            if (key === 'w' || key === 'ArrowUp') {
                if (keyState.up !== isDown) {
                    keyState.up = isDown;
                    changed = true;
                }
            } else if (key === 's' || key === 'ArrowDown') {
                if (keyState.down !== isDown) {
                    keyState.down = isDown;
                    changed = true;
                }
            }

            if (changed) {
                this.socket.send(JSON.stringify({
                    type: 'move',
                    payload: {
                        direction: keyState.up ? 'up' : keyState.down ? 'down' : null
                    }
                }));
            }
        };

        window.addEventListener('keydown', (event) => {
            handleKeyChange(true, event.key);
        });

        window.addEventListener('keyup', (event) => {
            handleKeyChange(false, event.key);
        });
    }

    public startGame(): void {
        if (this.isGameOver) return;

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'startGame'
            }));
        }
    }

    public disconnect(): void {
        this.isGameOver = true;
        this.clearKeepAlive();

        if (this.stateUpdateInterval) {
            clearInterval(this.stateUpdateInterval);
            this.stateUpdateInterval = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }

        if (this.socket) {
            this.socket.close();
        }

        this.connectionStatus = 'disconnected';
    }
}
