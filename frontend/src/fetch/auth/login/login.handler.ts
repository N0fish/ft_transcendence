import { login } from '../../api.ts';
import { authService } from "../auth.service.ts";
import { AuthFormElements } from '../auth.types.ts';
import { clearError, showError } from '../auth.utils.ts';

export function setupLoginHandler(elements: AuthFormElements): void {
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError(elements.messageElement);

        const email = elements.emailInput.value.trim();
        const password = elements.passwordInput.value.trim();

        if (!email) {
            showError(elements.messageElement, 'Email is required');
            elements.emailInput.focus();
            return;
        }

        if (!password) {
            showError(elements.messageElement, 'Password is required');
            elements.passwordInput.focus();
            return;
        }

        try {
            const submitButton = elements.form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.setAttribute('disabled', 'true');
                submitButton.textContent = 'Signing in...';
            }

            const loginResponse = await login(email, password);

            // if (loginResponse.require2FA) {
            //     sessionStorage.setItem('2faEmail', email);
            //     sessionStorage.setItem('2faUserId', loginResponse.userId);
            //     await send2FAEmail(email);
            //     navigateTo('/verify-2fa');
            //     return;
            // }

            // localStorage.setItem('authToken', loginResponse.token);
            sessionStorage.setItem('futureAuthToken', loginResponse.token);
            localStorage.setItem('user', JSON.stringify(loginResponse.user));
            localStorage.setItem('email', email);
            await authService.emailVerification2FA({ email });

            window.location.href = "/login-2fa";

        } catch (error) {
            console.error('Login error:', error);
            showError(
                elements.messageElement,
                error instanceof Error ? error.message : 'Login failed. Please try again.'
            );
        } finally {
            const submitButton = elements.form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.removeAttribute('disabled');
                submitButton.textContent = 'Sign In';
            }
        }
    });
}