import { AUTH_CONFIGS, RegisterFormElements } from '../auth.types';
import { setupRegisterHandler } from './register.handler';

export function renderRegisterPage(): string {
    const config = AUTH_CONFIGS.register;

    return `
    <div class="flex justify-center h-screen">
      <div class="wrapper flex flex-col justify-center items-center">
        <div class="w-full max-w-md p-8 space-y-6 rounded-lg">
          <h2 class="text-2xl text-accent font-bold text-center">${config.title}</h2>
          <form id="register-form" class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-accent">Username</label>
              <input type="text" id="username" class="w-full px-3 py-2 border border-accent rounded-md focus:outline-none" required />
            </div>
            <div>
              <label for="email" class="block text-sm font-medium text-accent">Email</label>
              <input type="email" id="email" class="w-full px-3 py-2 border border-accent rounded-md focus:outline-none" required />
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-accent">Password</label>
              <input type="password" id="password" class="w-full px-3 py-2 border border-accent rounded-md focus:outline-none" required minlength="8" />
            </div>
            <button type="submit" class="w-full px-4 py-2 bg-accent text-light cursor-pointer rounded hover:bg-secondary">${config.title}</button>
          </form>
          <p class="text-sm text-center">
            <span class="text-accent">${config.alternateText}</span>
            <a href="${config.alternateLink}" class="font-medium text-light hover:underline">${config.alternateLinkText}</a>
          </p>
          <p id="register-message" class="text-center text-sm font-medium hidden"></p>
        </div>
      </div>
    </div>
  `;
}

export function setupRegisterPage(): void {
    const elements: RegisterFormElements = {
        form: document.getElementById('register-form') as HTMLFormElement,
        usernameInput: document.getElementById('username') as HTMLInputElement,
        emailInput: document.getElementById('email') as HTMLInputElement,
        passwordInput: document.getElementById('password') as HTMLInputElement,
        messageElement: document.getElementById('register-message') as HTMLElement
    };

    setupRegisterHandler(elements);
}