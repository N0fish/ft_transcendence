// auth.config.ts
export interface AuthConfig {
    title: string;
    alternateText: string;
    alternateLink: string;
    alternateLinkText: string;
}

export interface AuthConfigs {
    login: AuthConfig;
    register: AuthConfig;
    register2Fa: AuthConfig;
}

export const AUTH_CONFIGS: AuthConfigs = {
    login: {
        title: 'Login',
        alternateText: 'Don\'t have an account?',
        alternateLink: '/register-init',
        alternateLinkText: 'Register'
    },
    register: {
        title: 'Register',
        alternateText: 'Already have an account?',
        alternateLink: '/login',
        alternateLinkText: 'Login'
    },
    register2Fa: {
        title: 'Input 2FA code',
        alternateText: 'Already have an account?',
        alternateLink: '/login',
        alternateLinkText: 'Login'
    }
};

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}

export interface AuthError {
    message: string;
    statusCode?: number;
}

export type AuthMode = 'login' | 'register';

export interface TwoFACredentials {
    email: string;
    code?: string;
}

export interface AuthCredentials {
    username?: string;
    email: string;
    password: string;
}

export interface InitRegisterFormElements {
    form: HTMLFormElement;
    emailInput: HTMLInputElement;
    messageElement: HTMLElement;
}

export interface TwoFARegisterFormElements {
    form: HTMLFormElement;
    emailInput: HTMLInputElement;
    codeInput: HTMLInputElement;
    messageElement: HTMLElement;
}

export interface RegisterFormElements {
    form: HTMLFormElement;
    usernameInput: HTMLInputElement;
    emailInput: HTMLInputElement;
    passwordInput: HTMLInputElement;
    messageElement: HTMLElement;
}

export interface AuthFormElements {
    form: HTMLFormElement;
    emailInput: HTMLInputElement;
    passwordInput: HTMLInputElement;
    messageElement: HTMLElement;
}
