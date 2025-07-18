import { navigateTo } from "../main.ts";

export function startGamePage(): string {
    return `
    <div class="p-20 flex flex-col justify-between items-center text-center space-y-4 relative">
      <h2 class="text-3xl font-bold text-accent">Start a New Game</h2>
      
      <div id="html-target" class="text-left text-accent">
        <h3 class="text-2xl font-semibold text-accent">Welcome to Pig-Pong! 🐷🏓</h3>
        <p class="text-lg text-gray-300">
            Ready to paddle your way to victory? Whether you're a seasoned Pong champion or a curious newcomer, this is the place to test your reflexes and have fun.
        </p>

        <div class="mt-6">
            <h4 class="text-xl font-semibold text-accent">🐖 How to Play:</h4>
            <ol class="list-decimal list-inside text-light">
                <li>Use your paddle 🏓 to keep the ball in play.</li>
                <li>Move your paddle <strong>up</strong> ⬆️ and <strong>down</strong> ⬇️ to block and bounce the ball back to your opponent.</li>
                <li>If the ball passes your paddle, your opponent scores a point.</li>
                <li>First player to reach <strong>11 points</strong> wins the match 🏆!</li>
            </ol>
        </div>

        <div class="mt-6">
            <h4 class="text-xl font-semibold text-accent">🎮 Controls:</h4>
            <ul class="list-disc list-inside text-light">
                <li><strong>W</strong>: Move paddle <strong>up</strong></li>
                <li><strong>S</strong>: Move paddle <strong>down</strong></li>
            </ul>
        </div>

        <div class="mt-6">
            <h4 class="text-xl font-semibold text-accent">✨ Game Tips:</h4>
            <ul class="list-disc list-inside text-light">
                <li>Watch the ball carefully—speed increases as the match heats up!</li>
                <li>Predict your opponent's moves and stay one step ahead.</li>
                <li>Stay cool, even if you miss a shot. The next rally is yours to win!</li>
            </ul>
        </div>
        <p class="text-gray-300">Click below to search for an opponent and start playing Pig-Pong!</p>
        <p class="mt-6 text-lg text-gray-300">Good luck and have fun!</p>
      </div>

      <div class="flex gap-4">
          <button id="searchBtn" class="w-40 px-4 py-2 bg-accent text-white cursor-pointer rounded hover:bg-secondary">
            Play with a human
          </button>
          <button id="startBtn" class="w-40 px-4 py-2 bg-accent text-white cursor-pointer rounded hover:bg-secondary">
            Play with an AI
          </button>
      </div>
    </div>
    `;
}

export function loadStartGamePage() {
    const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement;
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;

    startBtn.addEventListener('click', () => {
        navigateTo(`/game`);
    });

    searchBtn.addEventListener("click", async () => {
        try {
            searchBtn.disabled = true;

            const res = await fetch(`/go/find-match`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
                body: JSON.stringify({
                    mode: "random"
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                if (res.status === 408) {
                    alert(err.message || "Timeout waiting for opponent.");
                } else {
                    alert("Matchmaking failed.");
                }
                return;
            }

            navigateTo(`/waiting-room`);
        } catch (err) {
            console.error("Failed to find match:", err);
            alert("Something went wrong. Please try again.");
        } finally {
            searchBtn.disabled = false;
        }
    });
}