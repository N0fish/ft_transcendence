import { AUTH_CONFIGS, InitRegisterFormElements, RegisterFormElements, TwoFARegisterFormElements } from '../auth.types';
import { init2FAHandler, setupRegisterHandler, twoFAHandler } from './register.handler';


export function renderRegisterPage(): string {
  const config = AUTH_CONFIGS.register;
  const email = localStorage.getItem("email");

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
              <input type="email" id="email" class="w-full px-3 py-2 border border-accent rounded-md focus:outline-none" required value=${email}/>
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

export function renderInitRegisterPage(): string {
  const config = AUTH_CONFIGS.register;

  return `
    <div class="flex justify-center h-screen">
      <div class="wrapper flex flex-col justify-center items-center">
        <div class="w-full max-w-md p-8 space-y-6 rounded-lg">
          <h2 class="text-2xl text-accent font-bold text-center">${config.title}</h2>
          <form id="register-form" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-accent">Email</label>
              <input type="email" id="email" class="w-full px-3 py-2 border border-accent rounded-md focus:outline-none" required />
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

export function setupInitRegisterPage(): void {
    const elements: InitRegisterFormElements = {
        form: document.getElementById('register-form') as HTMLFormElement,
        emailInput: document.getElementById('email') as HTMLInputElement,
        messageElement: document.getElementById('register-message') as HTMLElement
    };

  init2FAHandler(elements);
}

export function render2FARegisterPage(): string {
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

export function setup2FARegisterPage(): void {
  const elements: TwoFARegisterFormElements = {
    form: document.getElementById('register-form') as HTMLFormElement,
    codeInput: document.getElementById('code') as HTMLInputElement,
    emailInput: document.getElementById('email') as HTMLInputElement,
    messageElement: document.getElementById('register-message') as HTMLElement
  };

  twoFAHandler(elements, "/register");
}