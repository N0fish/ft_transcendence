import { AUTH_CONFIGS, AuthFormElements, TwoFARegisterFormElements } from '../auth.types.ts';
import { twoFAHandler } from '../register/register.handler.ts';
import { setupLoginHandler } from './login.handler';

export function renderLoginPage(): string {
    const config = AUTH_CONFIGS.login;

    return `
    <div class="flex justify-center h-screen">
      <div class="wrapper flex flex-col justify-center items-center">
        <div class="w-full max-w-md p-8 space-y-6 rounded-lg">
          <h2 class="text-2xl text-accent font-bold text-center">${config.title}</h2>
          <form id="login-form" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-accent">Email</label>
              <input type="email" id="email" class="w-full px-3 py-2 border border-accent rounded-md focus:outline-none" required />
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-accent">Password</label>
              <input type="password" id="password" class="w-full px-3 py-2 border border-accent rounded-md focus:outline-none" required />
            </div>
            <button type="submit" class="w-full px-4 py-2 bg-accent text-light cursor-pointer rounded hover:bg-secondary">${config.title}</button>
          </form>
          <p class="text-sm text-center">
            <span class="text-accent">${config.alternateText}</span>
            <a href="${config.alternateLink}" class="font-medium text-light hover:underline">${config.alternateLinkText}</a>
          </p>
          <p id="login-message" class="text-center text-sm font-medium"></p>
        </div>
      </div>
    </div>
  `;
}

export function setupLoginPage(): void {
    const elements: AuthFormElements = {
        form: document.getElementById('login-form') as HTMLFormElement,
        emailInput: document.getElementById('email') as HTMLInputElement,
        passwordInput: document.getElementById('password') as HTMLInputElement,
        messageElement: document.getElementById('login-message') as HTMLElement
    };
    sessionStorage.setItem("redirectAfterLogin", "/login-2fa")
    setupLoginHandler(elements);
}

export function render2FALoginPage(): string {
  const config = AUTH_CONFIGS.register2Fa;
  const email = localStorage.getItem("email");

  return `
    <div class="flex justify-center h-screen">
      <div class="wrapper flex flex-col justify-center items-center">
        <div class="w-full max-w-md p-8 space-y-6 rounded-lg">
          <h2 class="text-2xl text-accent font-bold text-center">${config.title}</h2>
          <form id="register-form" class="space-y-4">
            <div>
              <label for="code" class="block text-sm font-medium text-accent">Code</label>
              <input type="text" id="code" class="w-full px-3 py-2 border border-accent rounded-md focus:outline-none" required />
              <input type="hidden" id="email" value=${email} />
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

export function setup2FALoginPage(): void {
  const elements: TwoFARegisterFormElements = {
    form: document.getElementById('register-form') as HTMLFormElement,
    codeInput: document.getElementById('code') as HTMLInputElement,
    emailInput: document.getElementById('email') as HTMLInputElement,
    messageElement: document.getElementById('register-message') as HTMLElement
  };

  twoFAHandler(elements,
    "/profile",
      () => {
        localStorage.setItem("authToken", sessionStorage.getItem("futureAuthToken") || "")
        sessionStorage.removeItem("futureAuthToken")
    });
}