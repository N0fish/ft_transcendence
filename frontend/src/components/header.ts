import { navigateTo } from "../main.ts";
import { setupBurgerMenu } from "./burgerMenu.ts";
import { isAuthenticated } from "../fetch/auth/authGuard.ts";

export function createHeader(): string {
    return `
        <header class="w-full text-light p-4 flex justify-between items-center">
            <h1 class="text-xl font-bold">
                 <img src="/small-logo.svg" alt="logo" class="w-12 h-12">
            </h1>
            <button id="burger-button" class="md:hidden p-2 rounded-lg">
                <span class="block w-6 h-0.5 bg-white mb-1"></span>
                <span class="block w-6 h-0.5 bg-white mb-1"></span>
                <span class="block w-6 h-0.5 bg-white"></span>
            </button>
            <nav id="menu" class="hidden absolute top-16 left-0 w-full text-gray-200 md:block md:static md:w-auto">
                <ul class="flex flex-col text-xl md:flex-row md:space-x-4 p-4 md:p-0">
                    <li><a href="/rules" class="block p-2 hover:text-accent">Game</a></li>
                    <li><a href="/tournament" class="block p-2 hover:text-accent">Tournament</a></li>
                    ${isAuthenticated() ? `
                        <li><a href="/profile" class="block p-2 hover:text-accent">Profile</a></li>
                        <li><a href="/stats" class="block p-2 hover:text-accent">Statistics</a></li>
                        <li><button id="logout-button" class="block p-2 hover:text-accent w-full text-left">Logout</button></li>

                    ` : `
                        <li><a href="/login" class="block p-2 hover:text-accent">Login</a></li>
                        <li><a href="/register" class="block p-2 hover:text-accent">Register</a></li>
                    `}
                </ul>
            </nav>
        </header>
    `;
}

export function setupHeader() {
    setupBurgerMenu();

    document.getElementById('logout-button')?.addEventListener('click', async (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        navigateTo('/login');
    });
}