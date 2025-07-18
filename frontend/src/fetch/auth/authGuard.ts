import { navigateTo } from "../../main.ts";

export function isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
}

export function authGuard(): boolean {
    const publicRoutes = ['/login', '/login-2fa', '/register', '/register-init', '/register-2fa'];
    const currentPath = window.location.pathname;
    const authenticated = isAuthenticated();

    console.log('authGuard: path =', currentPath, ', token =', authenticated);

    if (authenticated && publicRoutes.includes(currentPath)) {
        navigateTo('/waiting-room');
        return false;
    }

    if (!authenticated && !publicRoutes.includes(currentPath) && currentPath !== '/') {
        navigateTo('/login');
        return false;
    }

    return true;
}