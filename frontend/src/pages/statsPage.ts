import { fetchPlayerStats } from "../fetch/fetchStats";
import { Match, PlayerStats } from "../models/stats";
import { toUTCSimpleDate } from "../utils/date";
import { getGraphOptions } from "../utils/graph";
import { getLocalUser } from "../utils/user";

export const StatsPage = () => {
    return `
      <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-semibold text-center mb-8">Statistics</h1>
    
    <div id="playerStats" class="grid grid-cols-4 gap-4 mb-8">
    </div>
    <div id="winChartContainer" class="p-4 bg-neutral rounded-lg shadow">
    </div>
    <h2 class="font-semibold mb-4">Match History</h2>
    
    <div class="rounded-lg overflow-hidden shadow-lg">
    
      <div class="grid grid-cols-5 gap-4 font-bold text-left p-4 bg-secondary rounded-t-lg">
        <div class="text-lg">Match</div>
        <div class="text-lg">Opponent</div>
        <div class="text-lg">Result</div>
        <div class="text-lg">Score</div>
        <div class="text-lg">Date</div>
      </div>
    
      <div id="matchHistory"></div>
    
    </div>
    
  </div>`
}

export const loadStatsPage = async () => {
    try {
        const user = getLocalUser();
        const playerStats = await fetchPlayerStats(user.id);
        const createElement = (tag: string, classNames: string, textContent = ""): HTMLElement => {
            const el = document.createElement(tag);
            el.className = classNames;
            el.textContent = textContent;
            return el;
        };
        
        const displayPlayerStats = (player: PlayerStats) => {
            const statsContainer = document.getElementById("playerStats");
            if (!statsContainer) return;
            if (!player.wins) {
                player.wins = 0;
            }
            if (!player.losses) {
                player.losses = 0;
            }
            if (!player.totalMatches) {
                player.totalMatches = 0;
            }
            if (!player.winRatio) {
                player.winRatio = "0"
            }
            const stats = [
                { label: "Wins", value: player.wins.toString(), color: "text-green-400" },
                { label: "Losses", value: player.losses.toString(), color: "text-red-400" },
                { label: "Total Games", value: player.totalMatches.toString(), color: "text-white" },
                { label: "Win rate", value: `${(Number.parseFloat(player.winRatio) * 100).toFixed(1)}%`, color: "text-blue-400" },
            ];
            
            stats.forEach(stat => {
                const card = document.createElement("div");
                card.className = "bg-secondary p-6 rounded-lg shadow-md flex flex-col items-center justify-center";
                
                const value = createElement("div", `text-3xl font-bold mb-2 ${stat.color}`, stat.value);
                const label = createElement("div", "text-gray-300 text-sm uppercase", stat.label);
                
                card.appendChild(value);
                card.appendChild(label);
                
                statsContainer.appendChild(card);
            });
        };
        
        const displayMatchTable = (player: PlayerStats) => {
            const tableBody = document.getElementById("matchHistory");
            if (!tableBody) return;
            
            player.matchHistory?.reverse().splice(0, 5).forEach((match: Match, index) => {
                const row = document.createElement("div");
                row.className = "grid grid-cols-5 gap-4 p-4 border-b border-gray-600 items-center hover:bg-gray-700 transition";
                
                const matchNumber = createElement("div", "text-white", (index + 1).toString());
                const opponent: HTMLAnchorElement = createElement("a", "text-blue-500 hover:underline", match.opponent) as HTMLAnchorElement;
                opponent.href = `/user?id=${match.opponentId}`
                const resultColor = match.result === "Win" ? "text-green-400" : "text-red-400";
                const result = createElement("div", `${resultColor} font-semibold`, match.result);
                
                const score = createElement("div", "text-white", match.score);
                row.append(matchNumber, opponent, result, score, toUTCSimpleDate(match.playedAt));
                tableBody.appendChild(row);
            });
        };
        const displayGraph = (player: PlayerStats) => {
            const container = document.querySelector("#winChartContainer");
            if (!container) {
                return;
            }

            if (!player.matchHistory) {
                return;
            }
            // @ts-ignore: is set by index.html's header
            var chart = new ApexCharts(container, getGraphOptions(player.matchHistory.reverse()));

            chart.render();

            const observer = new MutationObserver(() => {
                const menuItems = document.querySelectorAll('.apexcharts-menu-item') as NodeListOf<HTMLElement>;
                menuItems.forEach(item => {
                  item.style.color = '#1f2937';
                });
              });
            observer.observe(document.body, { childList: true, subtree: true });
        }
        displayGraph(playerStats);
        displayPlayerStats(playerStats);
        displayMatchTable(playerStats);
    } catch (error) {
        console.error(error);
    }
}