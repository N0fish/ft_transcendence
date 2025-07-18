import { navigateTo } from "../../main";
import { cancelTournament, createTournament, joinTournament } from "../fetchTournament";


export function setupCreateTournamentForm(): void {
  const form = document.getElementById("createTournamentForm") as HTMLFormElement | null;
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const nameInput = document.getElementById("newName") as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name) {
      return alert("Please enter a tournament name.");
    }

    try {
      const newT = await createTournament(name);
      navigateTo(`/tournament?id=${newT.id}`);
    } catch (err) {
      console.error("Create tournament failed:", err);
      alert("Failed to create tournament.");
    }
  });
}

/**
 * Wire up all “Join” buttons on the list page (page: /tournament)
 * @param userId - current logged-in user’s ID
 */
export function setupJoinButtons(userId: number): void {
  document.querySelectorAll<HTMLButtonElement>(".join-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const tid = btn.dataset.id;
      if (!tid) return;
      try {
        await joinTournament(userId, parseInt(tid, 10));
        window.location.reload();
      } catch (err) {
        console.error("Join tournament failed:", err);
        alert("Failed to join tournament.");
      }
    });
  });
}

export function setupCancelButton(): void {
  const btn = document.getElementById("cancelTournamentBtn") as HTMLButtonElement | null;
  if (!btn)
    return;

  btn.addEventListener("click", async () => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("id");
    if (!tid)
      return;

    if (!confirm("Are you sure you want to cancel this tournament?")) {
      return;
    }

    try {
      await cancelTournament(parseInt(tid, 10));
      navigateTo("/tournament");
    } catch (err) {
      console.error("Cancel tournament failed:", err);
      alert("Failed to cancel tournament.");
    }
  });
}

export function setupPlayButton(): void {
  document
    .querySelectorAll('button.play-btn')
    .forEach((node: Element) => {
      node.addEventListener("click", (e: Event) => {
        e.preventDefault();
        try {
          const tournamentId = (e.target as HTMLElement).dataset["id"];
          window.location.replace(`/waiting-room?tournamentId=${tournamentId}`);
        } catch (err) {
          console.error("Could not play in tournament: ", err)
          alert("Could not play in tournament.");
        }
      })
  })
}