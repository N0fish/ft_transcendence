import {
  cancelTournament,
  getBracket,
  getTournamentById,
  Tournament,
  TournamentBracket
} from "../fetch/fetchTournament";
import { navigateTo } from "../main";

export async function TournamentDetailPage(): Promise<string> {
  const parts = location.pathname.split("/");
  const id = Number(parts[parts.length - 1]);
  if (isNaN(id)) {
    return `<p class="text-red-500">Invalid tournament ID</p>`;
  }

  let tour: Tournament;
  let bracketData: TournamentBracket;
  try {
    [tour, bracketData] = await Promise.all([
      getTournamentById(id),
      getBracket(id)
    ]);
  } catch (err: any) {
    return `<p class="text-red-500">Error loading tournament: ${err.message}</p>`;
  }

  const roundNumbers = Object.keys(bracketData.bracket)
    .map(r => Number(r))
    .sort((a, b) => a - b);

  let bracketHtml = "";
  if (roundNumbers.length === 0) {
    bracketHtml = `<p class="text-gray-400">Bracket is not available yet.</p>`;
  } else {
    for (const round of roundNumbers) {
      bracketHtml += `<section class="mb-6">
        <h2 class="text-xl font-semibold text-white mb-2">Round ${round}</h2>
        <ul class="list-disc pl-6 text-white">`;

      for (const m of bracketData.bracket[round]) {
        const p1 = m.player1.username;
        const p2 = m.player2 ? m.player2.username : "BYE";
        const outcome = m.winnerId === null
          ? "pending"
          : (m.winnerId === m.player1.id ? `${p1} won` : `${p2} won`);

        bracketHtml += `<li class="mb-1 flex justify-between">
            <span>${p1} vs ${p2}</span>
            <span class="italic">${outcome}</span>
          </li>`;
      }

      bracketHtml += `</ul></section>`;
    }
  }

  return `
    <div class="container mx-auto px-4 py-8 text-white">
      <button id="backBtn" class="mb-4 px-4 py-2 bg-gray-600 rounded hover:bg-secondary">
        ← Back to list
      </button>

      <h1 class="text-3xl font-bold mb-2">${tour.name}</h1>
      <p class="mb-1">Status: <span class="capitalize">${tour.status}</span></p>
      <p class="mb-4">Players: ${tour.currentPlayers}/${tour.maxPlayers}</p>

      <div id="actions" class="mb-6">
        ${
          tour.status === "waiting"
            && tour.ownerUserId === JSON.parse(localStorage.getItem("user") || "{}").id
            ? `<button id="cancelBtn" class="px-4 py-2 bg-red-600 rounded hover:bg-red-700">
                 Cancel Tournament
               </button>`
            : ``
        }
      </div>

      <div id="bracket">${bracketHtml}</div>
    </div>
  `;
}

export function setupTournamentDetailPage(): void {
  document.getElementById("backBtn")?.addEventListener("click", () =>
    navigateTo("/tournaments")
  );

  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      const id = Number(location.pathname.split("/").pop());
      if (!confirm("Are you sure you want to cancel this tournament?"))
        return;
      try {
        await cancelTournament(id);
        navigateTo("/tournaments");
      } catch (err: any) {
        alert("Failed to cancel: " + err.message);
      }
    });
  }
}
