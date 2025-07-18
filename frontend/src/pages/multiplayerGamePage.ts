import { GameInfo } from "../models/game";
import { MultiplayerGame3D } from "../multiplayer/canvas";
import { MultiplayerConnection } from "../multiplayer/connection";

export function MultiplayerGamePage(): string {
    return `
    <div class="w-[60%] m-auto flex flex-col justify-center items-center mt-2 space-y-4 relative">
      <h1 id="roomTitle" class="text-2xl text-accent font-bold">Loading Players...</h1>

      <div id="scoreDisplay" class="text-4xl font-bold my-4 flex items-center">
        <span id="p1Score" class="">0</span>
        <span class="mx-4">:</span>
        <span id="p2Score" class="">0</span>
      </div>

      <div id="countdown-display" class="text-5xl font-bold absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-white hidden">
        5
      </div>

      <div id="pause-overlay" class="hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-dark bg-opacity-80 p-8 rounded-lg shadow-lg text-center">
        <h2 class="text-2xl font-bold text-accent mb-4">Game Paused</h2>
        <p id="pause-reason" class="text-lg text-white mb-4">Waiting for opponent to reconnect...</p>
        <div class="animate-pulse">
          <div class="flex justify-center space-x-2">
            <div class="h-3 w-3 bg-accent rounded-full"></div>
            <div class="h-3 w-3 bg-accent rounded-full"></div>
            <div class="h-3 w-3 bg-accent rounded-full"></div>
          </div>
        </div>
      </div>

      <div id="game-container" class="w-[800px] h-[600px] outline outline-accent rounded-md overflow-hidden">
      </div>

      <button id="startGameButton" class="px-4 py-2 bg-accent text-light cursor-pointer rounded hover:bg-secondary">Start Game</button>

      <!-- Game Over Container - Centered with no border or background -->
      <div id="gameOverContainer" class="hidden w-[800px] h-[600px] absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center">
        <div class="bg-dark p-8 rounded-lg shadow-lg w-full max-w-md mx-auto">
          <h2 id="gameOverTitle" class="text-3xl font-bold mb-4 text-center"></h2>
          
          <div id="gameOverContent" class="mb-6">
            <!-- Game over content will be inserted here -->
          </div>
          
        </div>
      </div>
    </div>
  `;
}

export function loadMultiplayerGamePage(gameData: any): void {
    let storedGameData: any = null;
    try {
        const storedData = localStorage.getItem("gameInfo");
        if (storedData) {
            storedGameData = JSON.parse(storedData);
            console.log("Retrieved game data from localStorage:", storedGameData);
        }
    } catch (error) {
        console.error("Error parsing game data from localStorage:", error);
    }

    const gameInfo: GameInfo = storedGameData || gameData;
    const currentUserId = getCurrentUserId();
    const container = document.getElementById("game-container");
    const p1Score = document.getElementById("p1Score");
    const p2Score = document.getElementById("p2Score");
    const opponentScore = document.getElementById("opponentScore");
    const scoreDisplay = document.getElementById("scoreDisplay");
    const roomTitle = document.getElementById("roomTitle");
    const gameOverContainer = document.getElementById("gameOverContainer");
    const gameOverTitle = document.getElementById("gameOverTitle");
    const gameOverContent = document.getElementById("gameOverContent");
    const startButton = document.getElementById("startGameButton");
    const tryAgain = document.getElementById("tryAgainButton");
    const goHome = document.getElementById("goHomeButton");
    const countdownDisplay = document.getElementById("countdown-display");
    const pauseOverlay = document.getElementById("pause-overlay");
    const pauseReason = document.getElementById("pause-reason");

    if (!container || !gameInfo || !gameInfo.player1 || !gameInfo.player2) return;
    const opponentId = gameInfo.player1.id === currentUserId ? gameInfo.player2.id : gameInfo.player1.id;

    if (roomTitle && gameInfo.player1 && gameInfo.player2) {
        const player1Name = gameInfo.player1.username || "Player 1";
        const player2Name = gameInfo.player2.username || "Player 2";
        roomTitle.textContent = `${player1Name} vs ${player2Name}`;

        if (gameInfo.player1.id === currentUserId) {
            roomTitle.innerHTML = `<span class="text-sky-500">${player1Name}</span> vs <span class="text-accent">${player2Name}</span>`;
        } else if (gameInfo.player2.id === currentUserId) {
            roomTitle.innerHTML = `<span class="text-accent">${player1Name}</span> vs <span class="text-sky-500">${player2Name}</span>`;
        } else {
            roomTitle.innerHTML = `${player1Name} vs ${player2Name}`;
        }
    }

    const canvas = new MultiplayerGame3D(container, [gameInfo.player1.id, gameInfo.player2.id]);
    p1Score?.setAttribute("data-player-id", "" + gameInfo.player1.id);
    if (gameInfo.player1.id === currentUserId) {
        p1Score?.classList.add("text-sky-500");
        p2Score?.classList.add("text-accent");
    } else {
        p1Score?.classList.add("text-accent");
        p2Score?.classList.add("text-sky-500");
    }
    p2Score?.setAttribute("data-player-id", ""+gameInfo.player2.id);
    let connection: MultiplayerConnection | null = null;
    let isGameOver = false;

    function getCurrentUserId(): number {
        try {
            const userString = localStorage.getItem("user");
            if (!userString) {
                console.error("No user found in localStorage");
                return 0;
            }

            const user = JSON.parse(userString);
            if (!user || typeof user.id !== 'number') {
                console.error("Invalid user data in localStorage:", user);
                return 0;
            }

            return user.id;
        } catch (error) {
            console.error("Error getting user ID from localStorage:", error);
            return 0;
        }
    }

    startButton?.addEventListener('click', () => {
        if (startButton) {
            startButton.style.display = 'none';
        }

        startMultiplayerGame();
    });

    const togglePauseOverlay = (show: boolean, reason: string = "Waiting for opponent to reconnect...") => {
        if (!pauseOverlay || !pauseReason) return;

        if (show) {
            pauseOverlay.classList.remove("hidden");
            pauseReason.textContent = reason;
        } else {
            pauseOverlay.classList.add("hidden");
        }
    };

    const startMultiplayerGame = () => {
        console.log("Starting game with data:", gameInfo);

        connection = new MultiplayerConnection(canvas, currentUserId, gameInfo);

        connection.onGameState = (state) => {
            if (isGameOver) return;

            const isPlayer1 = gameInfo.player1?.id === currentUserId;

            // const playerPosition = isPlayer1 ? 1 : 2;
            // const opponentPosition = isPlayer1 ? 2 : 1;

            if (state.players && p1Score && p2Score) {
                const myScore = state.players[currentUserId]?.score ?? 0;
                const theirScore = state.players[opponentId]?.score ?? 0;
                if (isPlayer1) {
                    p1Score.textContent = myScore.toString();
                    p2Score.textContent = theirScore.toString();
                } else {
                    p2Score.textContent = myScore.toString();
                    p1Score.textContent = theirScore.toString();
                }
            }

            if (state.status === 'paused') {
                togglePauseOverlay(true, "Waiting for opponent to reconnect...");
            } else if (state.status === 'running') {
                togglePauseOverlay(false);
            }
        };

        connection.onCountdown = (count) => {
            if (countdownDisplay) {
                countdownDisplay.textContent = count.toString();
                countdownDisplay.classList.remove("hidden");

                countdownDisplay.classList.add("animate-pulse");

                if (count === 0) {
                    setTimeout(() => {
                        countdownDisplay.classList.add("hidden");
                        countdownDisplay.classList.remove("animate-pulse");
                    }, 1000);
                }
            }
        };

        connection.onGameOver = async(winnerId, score) => {
            isGameOver = true;
            togglePauseOverlay(false);
            showGameOver(winnerId, score);
            if (connection) {
                connection.disconnect();
                connection = null;
            }
        };

        connection.connect();

        if (connection) {
            connection.startGame();
        }
    };

    const showGameOver = (winnerId: number, score: number[]) => {
        if (!gameOverContainer || !gameOverTitle || !gameOverContent) return;
        togglePauseOverlay(false);
        if (container) {
            const canvasElement = container.querySelector('canvas');
            if (canvasElement) {
                canvasElement.style.display = 'none';
            }
        }
        if (roomTitle) roomTitle.style.display = 'none';
        if (scoreDisplay) scoreDisplay.style.display = 'none';
        gameOverContainer.classList.remove("hidden");
        const [player1Score, player2Score] = score;
        const isPlayer1 = gameInfo.player1?.id === currentUserId;
        const iWon = (isPlayer1 && winnerId === currentUserId) || (!isPlayer1 && winnerId === currentUserId);

        if (iWon) {
            gameOverTitle.innerHTML = `🎉 You Win! 🎉`;
            gameOverTitle.className = "text-3xl font-bold mb-4 text-center text-emerald-500";
        } else {
            gameOverTitle.innerHTML = `Game Over`;
            gameOverTitle.className = "text-3xl font-bold mb-4 text-center text-slate-500";
        }

        const player1Name = gameInfo.player1?.username || "Player 1";
        const player2Name = gameInfo.player2?.username || "Player 2";
        const player1Id = gameInfo.player1?.id || 0;
        const player2Id = gameInfo.player2?.id || 0;

        gameOverContent.innerHTML = `
            <div class="bg-dark-800 p-4 rounded-lg mb-4">
                <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
                    <a href="/user?id=${player1Id}" class="${player1Id === currentUserId ? 'text-sky-500' : 'text-accent'} hover:underline text-lg">
                        ${player1Name}
                    </a>
                    <span class="text-2xl font-bold ${player1Id === currentUserId ? 'text-sky-500' : 'text-accent'}">${player1Score}</span>
                </div>
                <div class="flex justify-between items-center">
                    <a href="/user?id=${player2Id}" class="${player2Id === currentUserId ? 'text-sky-500' : 'text-accent'} hover:underline text-lg">
                        ${player2Name}
                    </a>
                    <span class="text-2xl font-bold ${player2Id === currentUserId ? 'text-sky-500' : 'text-accent'}">${player2Score}</span>
                </div>
            </div>
        `;
    };

    tryAgain?.addEventListener('click', () => {
        if (!gameOverContainer) return;

        gameOverContainer.classList.add("hidden");
        isGameOver = false;

        if (connection) {
            connection.disconnect();
            connection = null;
        }

        if (container) {
            const canvasElement = container.querySelector('canvas');
            if (canvasElement) {
                canvasElement.style.display = 'block';
            }
        }

        if (roomTitle) roomTitle.style.display = 'block';
        if (scoreDisplay) scoreDisplay.style.display = 'flex';

        canvas.resetForNewGame();

        if (startButton) {
            startButton.style.display = 'block';
        }
    });

    goHome?.addEventListener('click', () => {
        isGameOver = true;

        if (connection) {
            connection.disconnect();
            connection = null;
        }

        canvas.dispose();
        window.location.hash = "";
    });

    window.addEventListener('beforeunload', () => {
        isGameOver = true;

        if (connection) {
            connection.disconnect();
            connection = null;
        }
    });
}