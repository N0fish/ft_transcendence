import { getQueryParams, navigateTo } from "../../main";
import { GameStatus, Tournament } from "../../models/tournament";
import { getLocalUser } from "../../utils/user";
import {
  cancelTournament,
  createTournament,
  getBracket,
  getTournamentById,
  getTournaments,
  joinTournament,
  leaveTournament,
} from "../fetchTournament";

const StatusToLabel: Record<GameStatus, string> = {
  [GameStatus.WAITING]: "Waiting",
  [GameStatus.IN_PROGRESS]: "In progress",
  [GameStatus.COMPLETED]: "Completed"
}

interface StatusAttributes {
  textColor: string;
  backgroundColor: string;
}

function renderTournamentItem(t: Tournament, userId: number, hasJoinedAny: boolean, hasPendingMatch: boolean): string {
  const buttons: string[] = [];
  const statesAttrs: Record<GameStatus, StatusAttributes> = {
    [GameStatus.WAITING]: { textColor: "text-yellow-400", backgroundColor: "bg-secondary" },
    [GameStatus.IN_PROGRESS]: { textColor: "text-emerald-400", backgroundColor: "bg-secondary" },
    [GameStatus.COMPLETED]: { textColor: "text-emerald-400", backgroundColor: "bg-slate-900" }
  };
  if (t.status === GameStatus.WAITING) {
    if (t.joined) {
      buttons.push(
        `<button data-id="${t.id}" class="leave-btn px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition">
          Leave
        </button>`
      );
    } else if (!hasJoinedAny) {
      buttons.push(
        `<button data-id="${t.id}" class="join-btn px-4 py-2 bg-accent text-white rounded hover:bg-red-400 transition">
          Join
        </button>`
      );
    }
  } else if (
      t.status === GameStatus.IN_PROGRESS
      && t.joined
      && hasPendingMatch
    ) {
    buttons.push(
      `<button data-id="${t.id}" class="play-btn px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition">
          Play
        </button>`
    );
  }

  buttons.push(
    `<button data-id="${t.id}" class="view-btn px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
      View
    </button>`
  );

  if (t.ownerUserId === userId) {
    buttons.push(
      `<button data-id="${t.id}" class="cancel-btn px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
        Delete
      </button>`
    );
  }

  return `
    <div class="${statesAttrs[t.status as GameStatus].backgroundColor} p-6 rounded-lg shadow-md flex flex-col justify-between">
      <div>
        <div class="text-xl font-bold text-white mb-2">${t.name}</div>
        <div class="text-gray-300 text-sm mb-4">
          ${t.currentPlayers} / ${t.maxPlayers} players — <span class="capitalize ${statesAttrs[t.status as GameStatus].textColor}">${StatusToLabel[t.status as GameStatus]}</span>
        </div>
      </div>
      <div class="flex justify-end space-x-2">
        ${buttons.join('')}
      </div>
    </div>`;
}

export async function TournamentPage(): Promise<string> {
  const params = getQueryParams(window.location.search);
  const id     = params["id"] ? Number(params["id"]) : null;
  const user = getLocalUser();

  let allTours: Tournament[] = [];
  try {
    allTours = await getTournaments();
  } catch { }
  const hasJoinedAny = allTours.some(t => t.joined && t.winnerId === null && t.endedAt === null);

  if (id !== null) {
    let tour: Tournament;
    let bracketData: Awaited<ReturnType<typeof getBracket>>;
    try {
      [tour, bracketData] = await Promise.all([
        getTournamentById(id),
        getBracket(id),
      ]);
    } catch (err: any) {
      return `<p class="text-red-500">Error loading tournament: ${err.message}</p>`;
    }

    let bracketHtml = '';
    const rounds = Object.keys(bracketData.bracket)
      .map(r => Number(r))
      .sort((a, b) => a - b);

    if (rounds.length === 0) {
      bracketHtml = `<p class="text-gray-400">Bracket is not available yet.</p>`;
    } else {
      rounds.forEach(round => {
        bracketHtml += `<section class="mb-6">
          <h2 class="text-xl font-semibold text-white mb-2">Round ${round}</h2>
          <ul class="list-disc pl-6 text-white">`;

        bracketData.bracket[round].forEach(m => {
          const p1 = m.player1.username;
          const p2 = m.player2 ? m.player2.username : "BYE";
          const outcome = m.winnerId == null
            ? "pending"
            : (m.winnerId === m.player1.id ? `${p1} won` : `${p2} won`);
          bracketHtml += `<li class="mb-1 flex justify-between">
              <span><a class="text-blue-500 hover:underline" href="/user?id=${m.player1.id}">${p1}</a> vs <a class="text-blue-500 hover:underline" href="/user?id=${m.player2?.id}">${p2}</a></span>
              <span class="italic">${outcome}</span>
            </li>`;
        });

        bracketHtml += `</ul></section>`;
      });
    }

    const currentRound = rounds.find(round =>
      bracketData.bracket[round].some(
        m => m.winnerId === null
      )
    );

    const userHasPendingMatch = !!currentRound && bracketData.bracket[currentRound].some(
      m =>
        (m.player1.id === user.id || m.player2?.id === user.id)
        && m.winnerId === null
    );

    const playButtonHtml = userHasPendingMatch
      ? `<button data-id="${tour.id}" class="play-btn px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition">
         Play
       </button>`
    : '';

    const isOwner = tour.ownerUserId === user.id;
    const joined   = tour.joined;
    const waiting  = tour.status === 'waiting';

    const cancelButtonHtml = isOwner && waiting
      ? `<button id="cancel-button" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
          Delete Tournament
        </button>`
      : '';

    const joinButtonHtml = !isOwner && waiting && !joined && !hasJoinedAny
    ? `<button id="joinBtn" class="px-4 py-2 bg-accent text-white rounded hover:bg-secondary transition">
        Join Tournament
      </button>`
    : '';

    const leaveButtonHtml = !isOwner && waiting && joined
      ? `<button id="leaveBtn" class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition">
          Leave Tournament
        </button>`
      : '';

    return `
      <div class="container mx-auto px-4 py-8 text-white">
        <button id="back-button" class="mb-4 px-4 py-2 bg-gray-600 rounded hover:bg-secondary transition">← Back to list</button>
        <h1 class="text-3xl font-bold mb-2">${tour.name}</h1>
        <div class="text-gray-300 mb-4">
          Status: <span class="capitalize">${tour.status}</span> | Players: ${tour.currentPlayers}/${tour.maxPlayers}
        </div>
        <div id="actions" class="mb-6">
          ${playButtonHtml}
          ${cancelButtonHtml}
          ${joinButtonHtml}
          ${leaveButtonHtml}
        </div>
        <div id="bracket" class="text-gray-300">
          ${bracketHtml}
        </div>
      </div>`;
  }

  const pendingMap = new Map<number, boolean>();
  await Promise.all(
    allTours
      .filter((t: Tournament) => t.status === GameStatus.IN_PROGRESS && t.joined)
      .map(async (it: Tournament) => {
        const { bracket } = await getBracket(it.id);
        const rounds = Object.keys(bracket)
          .map(r => Number(r))
          .sort((a, b) => a - b);
        const current = rounds.find(r => bracket[r].some(m => m.winnerId === null));
        const hasPending = !!current && bracket[current].some(
          m => (m.player1.id === user.id || m.player2?.id === user.id) && m.winnerId === null
        );
        pendingMap.set(it.id, hasPending);
      })
  );

  const listHtml = allTours.length
  ? allTours
    .map((it: Tournament) =>
      renderTournamentItem(
        it,
        user.id,
        hasJoinedAny,
        pendingMap.get(it.id) || false
      )
    )
    .join('')
    : `<p class="text-gray-400">No tournaments available.</p>`;

  return `
    <div class="container mx-auto px-4 py-8 text-white">
      <h1 class="text-2xl font-semibold text-center mb-6">Tournaments</h1>

      <form id="createForm" class="flex items-center space-x-4 mb-8 max-w-md mx-auto">
        <input
          id="newName"
          type="text"
          placeholder="Tournament name"
          class="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none"
          required
        />
        <button type="submit" class="px-4 py-2 bg-accent text-white rounded hover:bg-secondary transition">Create</button>
      </form>

      <div id="tournamentsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${listHtml}
      </div>
    </div>`;
}

export function setupTournamentPage(): void {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get("id");

  if (id) {
    document.getElementById("back-button")!
      .addEventListener("click", () => navigateTo("/tournament"));

    document.getElementById("cancel-button")?.
      addEventListener("click", async () => {
        await cancelTournament(Number(id));
        navigateTo("/tournament");
      });

    document.getElementById("joinBtn")?.addEventListener("click", async () => {
      const user = getLocalUser();
      try {
        await joinTournament(user.id, Number(id));
        navigateTo(`/tournament?id=${id}`);
      } catch (err: any) {
        alert("Failed to join: " + err.message);
      }
    });

    document.getElementById("leaveBtn")?.
      addEventListener("click", async () => {
        const user = getLocalUser();
        await leaveTournament(user.id, Number(id));
        navigateTo("/tournament");
      });
  } else {
    document.querySelectorAll<HTMLButtonElement>(".join-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tid = Number(btn.dataset.id);
        try {
          const user = getLocalUser();
          await joinTournament(user.id, tid);
          window.location.reload();
        } catch (err: any) {
          alert("Failed to join: " + err.message);
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>(".leave-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tid = Number(btn.dataset.id);
        const user = getLocalUser();
        await leaveTournament(user.id, tid);
        window.location.reload();
      });
    });

    document.querySelectorAll<HTMLButtonElement>(".view-btn").forEach(btn => {
      btn.addEventListener("click", () => navigateTo(`/tournament?id=${btn.dataset.id}`));
    });

    document.querySelectorAll<HTMLButtonElement>(".cancel-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tid = Number(btn.dataset.id);
        try {
          await cancelTournament(tid);
          window.location.reload();
        } catch (err: any) {
          alert("Failed to cancel: " + err.message);
        }
      });
    });

    document.getElementById("createForm")!
      .addEventListener("submit", async e => {
        e.preventDefault();
        const name = (document.getElementById("newName") as HTMLInputElement).value.trim();
        if (!name)
          return alert("Please enter a tournament name.");
        try {
          await createTournament(name);
          window.location.reload();
        } catch (err: any) {
          alert("Failed to create tournament: " + err.message);
        }
      });
  }
}