import {
    Color3, Color4,
    Engine,
    FreeCamera,
    HemisphericLight,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3
} from '@babylonjs/core';

export interface PlayerState {
    id?: number;
    z: number;
    score: number;
}

interface GameState {
    ball: { x: number; z: number; vx: number; vz: number };
    players: Record<number, PlayerState>;
    status: 'waiting' | 'countdown' | 'running' | 'paused' | 'ended';
    countdown?: number;
    timeElapsed?: number;
}

export class MultiplayerGame3D {
    private engine: Engine;
    private scene: Scene;
    private canvas: HTMLCanvasElement;

    private table: any;
    private ball: any;
    private paddles: Record<number, any> = {};

    public gameState: GameState | null = null;
    private opponentId: number | null = null;
    private isPaused: boolean = false;

    private readonly TABLE_WIDTH = 20;
    private readonly TABLE_DEPTH = 12;
    private readonly PADDLE_HEIGHT = 3;
    private readonly BALL_RADIUS = 0.5;

    private ballTrail: any[] = [];
    private readonly MAX_TRAIL_LENGTH = 10;

    constructor(container: HTMLElement, playerIds: number[]) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        container.appendChild(this.canvas);

        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.1, 0.1, 0.2, 1);

        this.createCamera();
        this.createLight();
        this.createTable();
        this.createBall();
        this.createCenterLine();
        this.initializePaddles(playerIds);

        this.engine.runRenderLoop(() => {
            if (!this.isPaused || !this.gameState || this.gameState.status !== 'paused') {
                this.scene.render();
            }
        });
        window.addEventListener('resize', () => {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.engine.resize();
        });
    }

    private initializePaddles(playerIds: number[]): void {
        this.createPaddle(playerIds[0], true);
        this.createPaddle(playerIds[1], false);
    }

    public setPlayerId(id: number, opponent: number): void {
        this.opponentId = opponent;
        // Find opponent ID
        // if (id === 1) {
        //     this.opponentId = 2;
        // } else {
        //     this.opponentId = 1;
        // }

        if (this.paddles[id]) {
            const myPaddleMat = new StandardMaterial('myPaddleMat', this.scene);
            myPaddleMat.diffuseColor = new Color3(0, 0.8, 1);
            this.paddles[id].material = myPaddleMat;
        }

        if (this.opponentId && this.paddles[this.opponentId]) {
            const opponentPaddleMat = new StandardMaterial('opponentPaddleMat', this.scene);
            opponentPaddleMat.diffuseColor = new Color3(1, 0.2, 0.2); 
            this.paddles[this.opponentId].material = opponentPaddleMat;
        }
    }

    public updateState(state: GameState): void {
        if (this.gameState?.status !== 'paused' && state.status === 'paused') {
            this.isPaused = true;
        } else if (this.gameState?.status === 'paused' && state.status !== 'paused') {
            this.isPaused = false;
        }

        this.gameState = state;

        this.renderGame();
    }

    private createCamera(): void {
        const camera = new FreeCamera('camera', new Vector3(0, 15, -30), this.scene);
        camera.setTarget(Vector3.Zero());
    }

    private createLight(): void {
        const light = new HemisphericLight('light1', new Vector3(0, 1, 0), this.scene);
        light.intensity = 1.0;
    }

    private createTable(): void {
        this.table = MeshBuilder.CreateBox('table', {
            width: this.TABLE_WIDTH,
            height: 0.5,
            depth: this.TABLE_DEPTH
        }, this.scene);

        const tableMat = new StandardMaterial('tableMat', this.scene);
        tableMat.diffuseColor = new Color3(0, 0.5, 0); 
        this.table.material = tableMat;

        this.table.position.y = -0.25;
    }

    private createCenterLine(): void {
        const centerLine = MeshBuilder.CreateBox('centerLine', {
            width: 0.1,
            height: 0.1,
            depth: this.TABLE_DEPTH
        }, this.scene);

        const lineMat = new StandardMaterial('lineMat', this.scene);
        lineMat.diffuseColor = new Color3(1, 1, 1);
        lineMat.alpha = 0.6;
        centerLine.material = lineMat;

        centerLine.position.y = 0.05; 
    }

    public resetForNewGame(): void {
        if (this.ball) {
            this.ball.position.set(0, this.BALL_RADIUS, 0);
        }

        if (this.paddles[1]) {
            this.paddles[1].position.set(-this.TABLE_WIDTH/2 + 0.5, 0.5, 0);
        }
        if (this.paddles[2]) {
            this.paddles[2].position.set(this.TABLE_WIDTH/2 - 0.5, 0.5, 0);
        }

        this.ballTrail.forEach(trail => {
            if (trail) {
                trail.dispose();
            }
        });
        this.ballTrail = [];

        this.gameState = null;
        this.isPaused = false;
    }

    private createPaddle(id: number, isLeft: boolean): void {
        const paddle = MeshBuilder.CreateBox(`paddle_${id}`, {
            width: 0.5,
            height: 1,
            depth: this.PADDLE_HEIGHT
        }, this.scene);

        const paddleMat = new StandardMaterial('paddleMat', this.scene);
        paddleMat.diffuseColor = new Color3(1, 1, 1);
        paddle.material = paddleMat;

        paddle.position = new Vector3(
            isLeft ? -this.TABLE_WIDTH/2 + 0.5 : this.TABLE_WIDTH/2 - 0.5,
            0.5, 
            0
        );

        this.paddles[id] = paddle;
    }

    private createBall(): void {
        this.ball = MeshBuilder.CreateSphere('ball', {
            diameter: this.BALL_RADIUS * 2
        }, this.scene);

        const ballMat = new StandardMaterial('ballMat', this.scene);
        ballMat.diffuseColor = new Color3(1, 0, 0);

        this.ball.material = ballMat;

        this.ball.position = new Vector3(0, this.BALL_RADIUS, 0);
    }

    private updateBallTrail(): void {
        if (this.gameState && this.gameState.status === 'running') {
            const trailParticle = MeshBuilder.CreateSphere('trail', {
                diameter: this.BALL_RADIUS * 1.5 * (0.3 + Math.random() * 0.3)
            }, this.scene);

            const trailMat = new StandardMaterial('trailMat', this.scene);
            trailMat.diffuseColor = new Color3(1, 0.6, 0);
            trailMat.alpha = 0.5;
            trailMat.emissiveColor = new Color3(0.5, 0.3, 0);
            trailParticle.material = trailMat;

            trailParticle.position.copyFrom(this.ball.position);

            this.ballTrail.push(trailParticle);

            if (this.ballTrail.length > this.MAX_TRAIL_LENGTH) {
                const oldest = this.ballTrail.shift();
                if (oldest) {
                    oldest.dispose();
                }
            }

            this.ballTrail.forEach((particle, index) => {
                if (particle && particle.material) {
                    const alpha = 0.5 * (1 - index / this.MAX_TRAIL_LENGTH);
                    (particle.material as StandardMaterial).alpha = alpha;

                    const scale = 1 - (index / this.MAX_TRAIL_LENGTH) * 0.8;
                    particle.scaling.set(scale, scale, scale);
                }
            });
        }
    }

    private renderGame(): void {
        if (this.isPaused && this.gameState && this.gameState.status === 'paused') {
            return;
        }

        if (!this.gameState) return;

        if (this.ball && this.gameState.ball) {
            this.ball.position.x = this.gameState.ball.x;
            this.ball.position.y = this.BALL_RADIUS;
            this.ball.position.z = this.gameState.ball.z;

            this.updateBallTrail();
        }

        Object.entries(this.gameState.players).forEach(([idStr, player]) => {
            const id = parseInt(idStr, 10);
            if (isNaN(id)) return;
            if (this.paddles[id]) {
                this.paddles[id].position.z = player.z;
            }
        });
    }

    public dispose(): void {
        this.ballTrail.forEach(trail => {
            if (trail) {
                trail.dispose();
            }
        });

        this.engine.dispose();
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}