import { createHeader, setupHeader } from "./components/header.ts";
import { authGuard } from "./fetch/auth/authGuard.ts";
import { render2FALoginPage, renderLoginPage, setup2FALoginPage, setupLoginPage } from "./fetch/auth/login/login.page.ts";
import { render2FARegisterPage, renderInitRegisterPage, renderRegisterPage, setup2FARegisterPage, setupInitRegisterPage, setupRegisterPage } from "./fetch/auth/register/register.page.ts";
import { initializeProfile, ProfilePage } from "./fetch/profile/profile.page.ts";
import { setupPlayButton } from "./fetch/tournament/tournament.handler.ts";
import { setupTournamentPage, TournamentPage } from "./fetch/tournament/tournament.page.ts";
import { BlockPage } from "./fetch/user/blockUser.page.ts";
import { pingSelf } from "./fetch/user/user.handler.ts";
import { initializeUserPage, UserPage } from "./fetch/user/user.page.ts";
import { NotFoundPage } from "./pages/404.ts";
import { GamePage, loadGamePage } from "./pages/gamePage.ts";
import { HomePage, setupHomePage } from "./pages/homePage.ts";
import { loadMultiplayerGamePage, MultiplayerGamePage } from './pages/multiplayerGamePage.ts';
import { loadStartGamePage, startGamePage } from "./pages/startGamePage.ts";
import { loadStatsPage, StatsPage } from "./pages/statsPage.ts";
import { loadWaitingRoomPage, WaitingRoomPage } from './pages/waitingRoom.ts';
import './style.css';
import { getUrlParams } from "./utils/url.ts";

const app = document.getElementById("app") as HTMLElement;

export function getQueryParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    const queryIndex = url.indexOf("?");

    if (queryIndex === -1)
        return params;

    const queryString = url.substring(queryIndex + 1);

    queryString.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        if (key && value !== undefined) {
            params[key] = decodeURIComponent(value);
        }
    });

    return params;
}

function getCurrentPath(): string {
    return window.location.pathname;
}

function setBackground(path: string) {
    const backgrounds: Record<string, string> = {
        "/": "/backgrounds/logo_4k.png",
        "/rules": "/backgrounds/empty_4k.png",
        "/game": "/backgrounds/rockets_4k.png",
        "/stats": "/backgrounds/stars_4k.png",
        "/tournament": "/backgrounds/swords_4k.png",
    };

    const bg = backgrounds[path] || "/backgrounds/empty_4k.png";

    const bgDiv = document.getElementById("background");
    if (bgDiv) {
        bgDiv.style.backgroundImage = `url('${bg}')`;
    }
}

async function render() {
    if (!authGuard())
        return;

    const path = getCurrentPath();
    const queryParams = getQueryParams(window.location.search);

    setBackground(path.startsWith('/game') ? '/game' : path);

    app.innerHTML = '';

    if (!['/', '/login', '/login-2fa', '/register', '/register-init', '/register-2fa'].includes(path)) {
        app.innerHTML += createHeader();
        await pingSelf();
    }

    let mainContent = '';
    switch (path) {
        case "/":
            mainContent = HomePage();
            break;
        case "/rules":
            mainContent = startGamePage();
            break;
        case "/game":
            mainContent = GamePage();
            break;
        case "/login":
            mainContent = renderLoginPage();
            break;
        case "/login-2fa":
            mainContent = render2FALoginPage();
            break;
        case "/register":
            mainContent = renderRegisterPage();
            break;
        case "/register-init":
            mainContent = renderInitRegisterPage();
            break;
        case "/register-2fa":
            mainContent = render2FARegisterPage();
            break;
        case "/profile":
            mainContent = ProfilePage();
            break;
        case "/multiplayer":
            const roomId = queryParams["id"];
            const playerId = Number(queryParams["playerId"]);
            mainContent = roomId && playerId
                ? MultiplayerGamePage()
                : NotFoundPage();
            break;
        case "/tournament":
            mainContent = await TournamentPage();
            break;
        case "/stats":
            mainContent = StatsPage();
            break;
        case "/user":
            mainContent = UserPage();
            break;
        case "/not-found":
            mainContent = NotFoundPage();
            break;
        case "/blocked":
            mainContent = BlockPage();
            break;
        case '/waiting-room':
            const [ waitingRoomId ] = getUrlParams(window.location.search, ["id"])
            mainContent = WaitingRoomPage(waitingRoomId);
            break;
        default:
            mainContent = NotFoundPage();
    }

    app.innerHTML += mainContent;

    initializePage(path, queryParams);
}

function initializePage(path: string, queryParams: Record<string, string>) {
    switch (path) {
        case "/":
            setupHomePage();
            break;
        case "/rules":
            loadStartGamePage();
            break;
        case "/game":
            loadGamePage();
            break;
        case "/login":
            setupLoginPage();
            break;
        case "/login-2fa":
            setup2FALoginPage();
            break;
        case "/register":
            setupRegisterPage();
            break;
        case "/register-init":
            setupInitRegisterPage();
            break;
        case "/register-2fa":
            setup2FARegisterPage();
            break;
        case "/profile":
            initializeProfile();
            break;
        case "/stats":
            loadStatsPage();
            break;
        case "/user":
            const userId = queryParams["id"];
            if (!userId) {
                navigateTo("/not-found");
            } else {
                initializeUserPage(userId);
            }
            break;
        case "/tournament":
            setupTournamentPage();
            setupPlayButton();
            break;
        case '/waiting-room':
            loadWaitingRoomPage();
            break;
        case "/multiplayer":
            if (queryParams["id"] && queryParams["playerId"]) {
                loadMultiplayerGamePage(queryParams["id"]);
            }
            break;
    }

    if (!['/login', '/register', '/'].includes(path)) {
        setupHeader();
    }
    attachEventListeners();
}

export function navigateTo(path: string) {
    window.history.pushState({}, "", path);
    render();
}

function attachEventListeners() {
    document.getElementById("to-profile")?.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("/profile");
    });

    document.getElementById("to-login")?.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("/login");
    });

    document.getElementById("to-game")?.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo(`/game`);
    });

    document.getElementById("rules")?.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo(`/rules`);
    });


    document.querySelectorAll(".game-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const gameId = link.getAttribute("data-id");
            if (gameId) {
                navigateTo(`/game`);
            }
        });
    });
}

window.addEventListener("popstate", render);

window.addEventListener("DOMContentLoaded", render);