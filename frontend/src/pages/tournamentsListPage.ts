import { createTournament, getTournaments, joinTournament } from "../fetch/fetchTournament";
import { navigateTo } from "../main";
import { Tournament } from "../models/tournament";

export async function TournamentsListPage() {
  const container = document.getElementById("content")!;
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">Tournaments</h1>
    <div id="list"></div>
    <hr class="my-6" />
    <h2 class="text-xl font-semibold mb-2">Create Tournament</h2>
    <form id="createTournamentForm" class="max-w-md space-y-4">
      <input id="newName" type="text" placeholder="Tournament Name" class="border p-2 w-full" required minlength="3" />
      <input id="newMaxPlayers" type="number" placeholder="Max Players (2-64)" class="border p-2 w-full" min="2" max="64" value="4" />
      <button type="submit" class="px-4 py-2 bg-accent text-white rounded">Create</button>
    </form>
  `;

  let tours: Tournament[] = [];
  try {
    tours = await getTournaments();
  } catch (err) {
    document.getElementById("list")!.innerHTML = '<p class="text-red-500">Error loading tournaments</p>';
    return;
  }

  const listDiv = document.getElementById("list")!;
  if (tours.length === 0) {
    listDiv.innerHTML = "<p>No tournaments yet.</p>";
  } else {
    listDiv.innerHTML = tours
      .map(
        t => `
      <div class="p-4 mb-2 border rounded flex justify-between items-center">
        <div>
          <div class="font-semibold">${t.name}</div>
          <div class="text-sm">${t.currentPlayers}/${t.maxPlayers} — ${t.status}</div>
        </div>
        ${t.status === "waiting"
          ? `<button data-id="${t.id}" class="join-btn px-3 py-1 bg-accent text-white rounded">Join</button>`
          : ""
        }
        <button data-id="${t.id}" class="detail-btn px-3 py-1 ml-2 bg-gray-500 text-white rounded">View</button>
      </div>`
      )
      .join("");
  }

  document.querySelectorAll<HTMLButtonElement>(".join-btn").forEach(btn => {
    btn.onclick = async () => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await joinTournament(user.userId || user.id);
      await TournamentsListPage(); 
    };
  });

  document.querySelectorAll<HTMLButtonElement>(".detail-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id!;
      navigateTo(`/tournaments/${id}`);
    };
  });

  const form = document.getElementById("createTournamentForm") as HTMLFormElement;
  form.onsubmit = async e => {
    e.preventDefault();
    const name = (document.getElementById("newName") as HTMLInputElement).value.trim();
    const maxPlayers = parseInt((document.getElementById("newMaxPlayers") as HTMLInputElement).value, 10);
    if (!name)
      return alert("Enter a tournament name at least 3 characters long");
    try {
      const newT = await createTournament(name, maxPlayers);
      navigateTo(`/tournaments/${newT.id}`);
    } catch {
      alert("Failed to create tournament");
    }
  };
}
