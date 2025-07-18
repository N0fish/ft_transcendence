import { Game } from "../babylon/canvas.ts";
import { navigateTo } from "../main.ts";

export function GamePage(): string {
    return `
    <div class="w-[60%] m-auto flex flex-col justify-center items-center mt-2 space-y-4 relative">
      <div id="score" class="text-4xl font-bold my-4 flex items-center">
        <span id="playerScore" class="text-blue-700">0</span>
        <span class="mx-4">:</span>
        <span id="aiScore" class="text-red-700">0</span>
      </div>
      
      <div id="game-wrapper" class="w-[800px] h-[600px] relative">
        <div id="game-container" class="w-full h-full outline outline-accent rounded-md overflow-hidden">
          <canvas id="renderCanvas" class="w-full h-full"></canvas>
        </div>
        
        <div id="gameOverModal" class="hidden absolute inset-0 bg-gray-900 rounded-md flex flex-col justify-center items-center">
          <div class="p-8 w-full max-w-md text-center">
            <h2 id="gameOverMessage" class="text-4xl font-bold mb-6">Game Over</h2>
            
            <div class="text-5xl font-bold my-8 flex items-center justify-center">
              <span id="finalPlayerScore" class="text-blue-500">0</span>
              <span class="mx-6 text-white">:</span>
              <span id="finalAiScore" class="text-red-500">0</span>
            </div>
            
            <p class="text-xl mb-8">
              <span class="text-blue-500 font-bold">You</span> vs <span class="text-red-500 font-bold">AI</span>
            </p>
            
            <div class="flex justify-center space-x-4">
              <button id="tryAgainButton" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Play Again
              </button>
              <button id="goHomeButton" class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Exit Game
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex space-x-4 mt-4">
        <button id="startGameButton" class="px-6 py-3 bg-blue-600 text-white cursor-pointer rounded-lg hover:bg-blue-700 transition-colors">
          Start Game
        </button>
      </div>
    </div>
  `;
}

export function loadGamePage(): void {
    const gameContainer = document.getElementById("game-container");
    const scoreElement = document.getElementById("score");
    const playerScoreElement = document.getElementById("playerScore");
    const aiScoreElement = document.getElementById("aiScore");
    const finalPlayerScoreElement = document.getElementById("finalPlayerScore");
    const finalAiScoreElement = document.getElementById("finalAiScore");
    const gameOverModal = document.getElementById("gameOverModal");
    const gameOverMessage = document.getElementById("gameOverMessage");
    const tryAgainButton = document.getElementById("tryAgainButton");
    const goHomeButton = document.getElementById("goHomeButton");
    const startGameButton = document.getElementById("startGameButton");

    if (!gameContainer) {
        console.error("Game container not found!");
        return;
    }

    let game: Game | null = null;
    let isGameInProgress = false;
    let currentPlayerScore = 0;
    let currentAiScore = 0;

    try {
        game = new Game(gameContainer, {
            onScoreUpdate: (playerScore: number, aiScore: number) => {
                currentPlayerScore = playerScore;
                currentAiScore = aiScore;

                if (playerScoreElement) playerScoreElement.textContent = playerScore.toString();
                if (aiScoreElement) aiScoreElement.textContent = aiScore.toString();
            },
            onGameOver: (winner: 'player' | 'ai') => {
                if (finalPlayerScoreElement) finalPlayerScoreElement.textContent = currentPlayerScore.toString();
                if (finalAiScoreElement) finalAiScoreElement.textContent = currentAiScore.toString();

                if (gameOverMessage) {
                    if (winner === 'player') {
                        gameOverMessage.textContent = "🎉 You Win! 🎉";
                        gameOverMessage.className = "text-4xl font-bold mb-6 text-blue-500";
                    } else {
                        gameOverMessage.textContent = "Game Over";
                        gameOverMessage.className = "text-4xl font-bold mb-6 text-red-500";
                    }
                }

                if (scoreElement) scoreElement.classList.add("hidden");
                if (gameContainer && gameOverModal) {
                    gameContainer.classList.add("hidden");
                    gameOverModal.classList.remove("hidden");
                }

                isGameInProgress = false;
            }
        });

    } catch (error) {
        console.error("Error creating game instance:", error);
        return;
    }

    if (startGameButton) {
        startGameButton.addEventListener("click", () => {
            if (!isGameInProgress && game) {
                if (scoreElement) scoreElement.classList.remove("hidden");
                if (gameContainer && gameOverModal) {
                    gameContainer.classList.remove("hidden");
                    gameOverModal.classList.add("hidden");
                }

                game.start();
                isGameInProgress = true;
                startGameButton.classList.add("hidden");

                if (gameContainer.querySelector('canvas')) {
                    (gameContainer.querySelector('canvas') as HTMLElement).focus();
                }
            }
        });
    }

    if (tryAgainButton) {
        tryAgainButton.addEventListener("click", () => {
            if (game) {
                if (scoreElement) scoreElement.classList.remove("hidden");
                if (gameContainer && gameOverModal) {
                    gameContainer.classList.remove("hidden");
                    gameOverModal.classList.add("hidden");
                }

                if (startGameButton) startGameButton.classList.remove("hidden");

                game.reset();
                isGameInProgress = true;

                if (gameContainer.querySelector('canvas')) {
                    (gameContainer.querySelector('canvas') as HTMLElement).focus();
                }
            }
        });
    }

    const homeButtons = [goHomeButton, document.getElementById("backHomeButton")];
    homeButtons.forEach(button => {
        if (button) {
            button.addEventListener("click", () => {
                if (game) {
                    game.dispose();
                    game = null;
                }
                navigateTo("/rules");
            });
        }
    });

    window.addEventListener('beforeunload', () => {
        if (game) {
            game.dispose();
            game = null;
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target && (e.target as HTMLElement).closest('#game-container')) {
            if (gameContainer.querySelector('canvas')) {
                (gameContainer.querySelector('canvas') as HTMLElement).focus();
            }
        }
    });
}