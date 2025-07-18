import { AuthCredentials, AuthMode, AuthResponse, TwoFACredentials } from './auth.types';

class AuthService {
    async authenticate(mode: AuthMode, credentials: AuthCredentials): Promise<AuthResponse> {
        const endpoint = mode === 'login' ? '/login' : '/register';

        try {
            const response = await fetch(`/auth${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Authentication failed');
            }

            const data: AuthResponse = await response.json();

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            return data;
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    async emailVerification2FA( credentials: TwoFACredentials): Promise<void> {
        try {
            const response = await fetch(`/auth/2fa/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }
            localStorage.setItem('email', JSON.stringify(credentials.email));
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    async inputVerification2FA(credentials: TwoFACredentials): Promise<void> {
        try {
            const response = await fetch(`/auth/2fa/email`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    isAuthenticated() {
        return !!this.getAuthToken();
    }
}

export const authService = new AuthService();