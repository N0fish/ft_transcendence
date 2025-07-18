// pages/waitingRoomPage.ts

import { getTournamentMatch } from "../fetch/fetchTournament.ts";
import { navigateTo } from "../main.ts";
import { buildGameInfoFromUserIds } from "../utils/gameInfo.ts";
import { getUrlParams } from "../utils/url.ts";
import { getLocalUser } from "../utils/user.ts";

let intervalId: number | null = null;
let onLeaveHandler: ((e: BeforeUnloadEvent) => void) | null = null;

export function WaitingRoomPage(roomId: string): string {
    return `
    <div class="flex flex-col items-center justify-center top-[50%] text-center text-white space-y-6">
      <h2 class="text-3xl font-bold text-accent">Waiting for Opponent...</h2>
      <p class="text-lg text-gray-300">Room ID: <span class="font-mono text-secondary">${roomId}</span></p>
      <div class="flex items-center space-x-4">
        <div class="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full"></div>
        <span class="text-lg text-accent">Looking for a match</span>
      </div>
      
      <div class="flex gap-4 mt-8">
        <button id="leaveSearchBtn" class="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700">
          Leave Search
        </button>
      </div>
      <p class="text-gray-400 text-sm">Hang tight! We'll start as soon as someone joins your room.</p>
    </div>
  `;
}

export function loadWaitingRoomPage() {
    const leaveBtn = document.getElementById('leaveSearchBtn') as HTMLButtonElement;
    const [ tournamentId ] = getUrlParams(window.location.search, ["tournamentId"])
    const user = getLocalUser();
    
    async function leaveMatchmaking() {
        try {
            const res = await fetch(`/go/cancel-match`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify({})
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to cancel matchmaking:", err);
                alert("Failed to leave search. Try again!");
                return;
            }
        } catch (err) {
            console.error('Error leaving search:', err);
            alert('Something went wrong.');
        }
    }

    intervalId = window.setInterval(async () => {
        try {
            if (tournamentId !== "") {
                const matchData = await getTournamentMatch({ tournamentId, playerId: user.id })
                if (!matchData.roomId || !matchData.player1Id || !matchData.player2Id ) {
                    console.log("getTournamentMatch: match not ready");
                    return;
                }
                if (intervalId) {
                    clearInterval(intervalId);
                }

                localStorage.setItem("gameInfo", JSON.stringify(await buildGameInfoFromUserIds(matchData.roomId, matchData.player1Id, matchData.player2Id)));
                navigateTo(`/multiplayer?id=${matchData.roomId}&playerId=${user.id}`);
                return;
            }
            const res = await fetch(`/go/match-status`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`
                }
            });

            const data = await res.json();

            if (data.status === 'ready') {
                if (intervalId) clearInterval(intervalId);
                if (onLeaveHandler) {
                    window.removeEventListener('beforeunload', onLeaveHandler);
                    onLeaveHandler = null;
                }
                localStorage.setItem("gameInfo", JSON.stringify(data));
                navigateTo(`/multiplayer?id=${data.roomId}&playerId=${data.player1.id}`);
            }
        } catch (err) {
            console.error("Error checking match status", err);
        }
    }, 3000);

    leaveBtn?.addEventListener('click', async () => {
        if (intervalId) clearInterval(intervalId);
        if (onLeaveHandler) {
            window.removeEventListener('beforeunload', onLeaveHandler);
            onLeaveHandler = null;
        }
        if (tournamentId !== undefined && tournamentId !== null && tournamentId !== "") {
            navigateTo(`/tournament?id=${tournamentId}`);
        } else {
            await leaveMatchmaking();
            navigateTo('/rules');
        }
    });

    onLeaveHandler = () => {
        navigator.sendBeacon(`/go/cancel-match`, "{}");
    };
    window.addEventListener('beforeunload', onLeaveHandler);
}
