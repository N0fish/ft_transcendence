async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const url = `/auth${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(localStorage.getItem('authToken') ? {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                } : {}),
                ...options.headers,
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Request to ${url} failed:`, error);
        throw error;
    }
}

export async function login(email: string, password: string) {
    const response = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    if (response.require2FA) {
        return {
            require2FA: true,
            userId: response.userId
        };
    }

    if (response.token) {
        return {
            token: response.token,
            user: response.user || null
        };
    }

    throw new Error(response.error || 'Invalid login response');
}
