import { authService } from '../auth.service';
import { InitRegisterFormElements, RegisterFormElements, TwoFARegisterFormElements } from '../auth.types';
import { showError, showSuccess } from '../auth.utils';
import { navigateTo } from "../../../main.ts";

export function twoFAHandler(elements: TwoFARegisterFormElements, locationRoute: string, cb?: () => void): void {
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = elements.codeInput.value.trim();
        const email = elements.emailInput.value.trim();

        try {
            await authService.inputVerification2FA({ code, email });
            showSuccess(elements.messageElement, '2FA input successful! Redirecting...');
            setTimeout(() => navigateTo(locationRoute), 1500);
            if (!!cb) {
                cb();
            }
        } catch (error) {
            showError(
                elements.messageElement,
                error instanceof Error ? error.message : 'Registration failed. Please try again.'
            );
        }
    });
}

export function init2FAHandler(elements: InitRegisterFormElements): void {
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = elements.emailInput.value.trim();

        try {
            await authService.emailVerification2FA({ email });
            showSuccess(elements.messageElement, '2Fa initialization success! Redirecting...');
            setTimeout(() => navigateTo('/register-2fa'), 1500);
        } catch (error) {
            showError(
                elements.messageElement,
                error instanceof Error ? error.message : 'Registration failed. Please try again.'
            );
        }
    });
}

export function setupRegisterHandler(elements: RegisterFormElements): void {
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = elements.usernameInput.value.trim();
        const email = elements.emailInput.value.trim();
        const password = elements.passwordInput.value.trim();

        try {
            await authService.authenticate("register", { username, email, password });
            showSuccess(elements.messageElement, 'Registration successful! Redirecting...');
            setTimeout(() => navigateTo('/rules'), 1500);
        } catch (error) {
            showError(
                elements.messageElement,
                error instanceof Error ? error.message : 'Registration failed. Please try again.'
            );
        }
    });
}