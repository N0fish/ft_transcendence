import {
    Engine,
    Scene,
    FreeCamera,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core';

interface GameOptions {
    onScoreUpdate?: (playerScore: number, aiScore: number) => void;
    onGameOver?: (winner: 'player' | 'ai') => void;
}

export class Game {
    private isGameRunning: boolean = false;
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private paddleLeft: any;
    private paddleRight: any;
    private ball: any;

    private ballDirection: Vector3 = new Vector3(0.15, 0, 0.1);

    private playerScore: number = 0;
    private aiScore: number = 0;
    private readonly winningScore: number = 11;

    private onScoreUpdate?: (playerScore: number, aiScore: number) => void;
    private onGameOver?: (winner: 'player' | 'ai') => void;

    private boundInputHandler: (event: KeyboardEvent) => void;

    constructor(container: HTMLElement, options: GameOptions = {}) {
        this.onScoreUpdate = options.onScoreUpdate;
        this.onGameOver = options.onGameOver;

        let canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'renderCanvas';
            canvas.className = 'w-full h-full';
            container.appendChild(canvas);
        }
        this.canvas = canvas;

        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);

        this.createCamera();
        this.createLight();
        this.createGameObjects();

        this.boundInputHandler = this.handleInput.bind(this);

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    public start(): void {
        this.playerScore = 0;
        this.aiScore = 0;
        this.updateScores();

        this.resetBall();
        this.paddleLeft.position = new Vector3(-9.5, 0.5, 0);
        this.paddleRight.position = new Vector3(9.5, 0.5, 0);

        this.addInputHandler();

        if (!this.isGameRunning) {
            this.isGameRunning = true;
            this.engine.stopRenderLoop(); 
            this.engine.runRenderLoop(() => {
                this.update();
                this.scene.render();
            });
        }
    }

    private addInputHandler(): void {
        window.removeEventListener('keydown', this.boundInputHandler);
        window.addEventListener('keydown', this.boundInputHandler);
    }

    private createCamera(): void {
        const camera = new FreeCamera('camera1', new Vector3(0, 15, -30), this.scene);
        camera.setTarget(Vector3.Zero());
        camera.attachControl(this.canvas, true);
    }

    private createLight(): void {
        const light = new HemisphericLight('light1', new Vector3(0, 1, 0), this.scene);
        light.intensity = 1.0;
    }

    private createGameObjects(): void {
        const table = MeshBuilder.CreateBox('table', { width: 20, height: 0.5, depth: 12 }, this.scene);
        const tableMaterial = new StandardMaterial('tableMat', this.scene);
        tableMaterial.diffuseColor = new Color3(0, 0.5, 0);
        table.material = tableMaterial;
        table.position.y = -0.25;

        const middleLine = MeshBuilder.CreatePlane('middleLine', { width: 0.2, height: 12 }, this.scene);
        const lineMataterial = new StandardMaterial('lineMat', this.scene);
        lineMataterial.diffuseColor = new Color3(1, 1, 1); 
        lineMataterial.specularColor = new Color3(0, 0, 0); 
        middleLine.material = lineMataterial;
        middleLine.position.y = 0.01; 
        middleLine.rotation.x = Math.PI / 2; 

        this.paddleLeft = MeshBuilder.CreateBox('paddleLeft', { width: 0.5, height: 1, depth: 3 }, this.scene);
        this.paddleLeft.position = new Vector3(-9.5, 0.5, 0);

        this.paddleRight = MeshBuilder.CreateBox('paddleRight', { width: 0.5, height: 1, depth: 3 }, this.scene);
        this.paddleRight.position = new Vector3(9.5, 0.5, 0);

        this.ball = MeshBuilder.CreateSphere('ball', { diameter: 1 }, this.scene);
        this.ball.position = new Vector3(0, 0.5, 0);

        const playerPaddleMat = new StandardMaterial('playerPaddleMat', this.scene);
        playerPaddleMat.diffuseColor = new Color3(0, 0.4, 1);
        this.paddleLeft.material = playerPaddleMat;

        const aiPaddleMat = new StandardMaterial('aiPaddleMat', this.scene);
        aiPaddleMat.diffuseColor = new Color3(1, 0.2, 0.2); 
        this.paddleRight.material = aiPaddleMat;

        const ballMat = new StandardMaterial('ballMat', this.scene);
        ballMat.diffuseColor = new Color3(1, 0.8, 0); 
        this.ball.material = ballMat;
    }

    private handleInput(event: KeyboardEvent): void {
        console.log('Key pressed:', event.key);

        const step = 1.5;
        const halfHeight = 0.5;
        const minZ = -4.5 + halfHeight;
        const maxZ = 4.5 - halfHeight;

        switch (event.key) {
            case 's':
            case 'S': 
                if (this.paddleLeft.position.z > minZ) {
                    this.paddleLeft.position.z -= step;
                }
                break;
            case 'w':
            case 'W':
                if (this.paddleLeft.position.z < maxZ) {
                    this.paddleLeft.position.z += step;
                }
                break;

            case 'ArrowUp':
                if (this.paddleLeft.position.z < maxZ) {
                    this.paddleLeft.position.z += step;
                }
                break;
            case 'ArrowDown':
                if (this.paddleLeft.position.z > minZ) {
                    this.paddleLeft.position.z -= step;
                }
                break;
        }
    }

    private updateScores(): void {
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.playerScore, this.aiScore);
        }
    }

    private checkGameOver(): boolean {
        if (this.playerScore >= this.winningScore || this.aiScore >= this.winningScore) {
            const winner = this.playerScore >= this.winningScore ? 'player' : 'ai';
            if (this.onGameOver) {
                this.onGameOver(winner);
            }

            this.isGameRunning = false;
            this.engine.stopRenderLoop();

            this.engine.runRenderLoop(() => {
                this.scene.render();
            });

            return true;
        }
        return false;
    }

    private resetBall(): void {
        this.ball.position.set(0, 0.5, 0);

        const initialSpeed = 0.2;

        const angleVariation = Math.PI/6;
        const randomAngle = (Math.random() * angleVariation * 2) - angleVariation;

        const direction = this.ballDirection.x > 0 ? -1 : 1;

        this.ballDirection = new Vector3(
            Math.cos(randomAngle) * initialSpeed * direction,
            0,
            Math.sin(randomAngle) * initialSpeed
        );
    }

    public reset(): void {
        this.engine.stopRenderLoop();
        this.isGameRunning = false;
        this.start();
    }

    public dispose(): void {
        window.removeEventListener('keydown', this.boundInputHandler);
        this.engine.stopRenderLoop();
        this.scene.dispose();
        this.engine.dispose();
    }

    private update(): void {
        this.ball.position.addInPlace(this.ballDirection);

        const ballRadius = 0.5;
        const paddleHeight = 3;
        const tableWidth = 20;
        const tableDepth = 12;
        const paddleLeftX = -tableWidth/2; 
        const paddleRightX = tableWidth/2;
        const paddleSurfaceOffset = 0.5;

        if (this.ball.position.z + ballRadius >= tableDepth/2) {
            this.ball.position.z = tableDepth/2 - ballRadius;
            this.ballDirection.z *= -1;
        }
        if (this.ball.position.z - ballRadius <= -tableDepth/2) {
            this.ball.position.z = -tableDepth/2 + ballRadius;
            this.ballDirection.z *= -1;
        }

        const nextBallPos = this.ball.position.add(this.ballDirection);

        if (this.ballDirection.x < 0) {
            const paddleSurfaceX = paddleLeftX + paddleSurfaceOffset;
            const paddleCenterZ = this.paddleLeft.position.z;

            if (nextBallPos.x - ballRadius <= paddleSurfaceX &&
                this.ball.position.x - ballRadius >= paddleSurfaceX - 1) {

                if (Math.abs(this.ball.position.z - paddleCenterZ) <= paddleHeight/2 + ballRadius) {
                    const timeToCollision = (paddleSurfaceX - (this.ball.position.x - ballRadius)) / this.ballDirection.x;
                    const collisionZ = this.ball.position.z + this.ballDirection.z * timeToCollision;

                    if (Math.abs(collisionZ - paddleCenterZ) <= paddleHeight/2) {
                        this.ball.position.x = paddleSurfaceX + ballRadius + 0.01;

                        this.ballDirection.x *= -1;

                        const hitPosition = (collisionZ - paddleCenterZ) / (paddleHeight/2);
                        this.ballDirection.z += hitPosition * 0.15;

                        const currentSpeed = this.ballDirection.length();
                        this.ballDirection.normalize().scaleInPlace(currentSpeed);
                    }
                }
            }
        }

        if (this.ballDirection.x > 0) {
            const paddleSurfaceX = paddleRightX - paddleSurfaceOffset;
            const paddleCenterZ = this.paddleRight.position.z;

            if (nextBallPos.x + ballRadius >= paddleSurfaceX &&
                this.ball.position.x + ballRadius <= paddleSurfaceX + 1) {

                if (Math.abs(this.ball.position.z - paddleCenterZ) <= paddleHeight/2 + ballRadius) {
                    const timeToCollision = (paddleSurfaceX - (this.ball.position.x + ballRadius)) / this.ballDirection.x;
                    const collisionZ = this.ball.position.z + this.ballDirection.z * timeToCollision;

                    if (Math.abs(collisionZ - paddleCenterZ) <= paddleHeight/2) {
                        this.ball.position.x = paddleSurfaceX - ballRadius - 0.01;
                        this.ballDirection.x *= -1;

                        const hitPosition = (collisionZ - paddleCenterZ) / (paddleHeight/2);
                        this.ballDirection.z += hitPosition * 0.15;

                        const currentSpeed = this.ballDirection.length();
                        this.ballDirection.normalize().scaleInPlace(currentSpeed);
                    }
                }
            }
        }

        if (this.ballDirection.x > 0) {
            const reactionDelay = 0.5;
            const targetZ = this.ball.position.z + (this.ballDirection.z * reactionDelay);
            const currentZ = this.paddleRight.position.z;
            const moveSpeed = 0.08;

            if (currentZ < targetZ - 0.1) {
                this.paddleRight.position.z = Math.min(currentZ + moveSpeed, tableDepth/2 - paddleHeight/2);
            } else if (currentZ > targetZ + 0.1) {
                this.paddleRight.position.z = Math.max(currentZ - moveSpeed, -tableDepth/2 + paddleHeight/2);
            }
        }

        if (this.ball.position.x < paddleLeftX) {
            this.aiScore++;
            this.updateScores();
            if (!this.checkGameOver()) this.resetBall();
        } else if (this.ball.position.x > paddleRightX) {
            this.playerScore++;
            this.updateScores();
            if (!this.checkGameOver()) this.resetBall();
        }
    }
}