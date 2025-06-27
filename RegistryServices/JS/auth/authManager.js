// JS/auth/authManager.js
// Authentication configuration and AuthManager class for Registry Services

export const AUTH_CONFIG = {
    baseUrl: 'https://registryservices-staging.azurewebsites.net/api',
    endpoints: {
        login: '/auth/login'
    },
    tokenKeys: {
        access: 'access_token'
    },
    session: {
        duration: 60 * 60 * 1000,      // 1 hour
        warningTime: 5 * 60 * 1000     // 5 minutes warning
    }
};

export class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.userRole = null;
        this.userID = null;
        this.username = null;
        this.accessToken = null;
        this.init();
    }

    init() {
        // Try to load from localStorage
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');
        
        if (token && role) {
            this.accessToken = token;
            this.userRole = role;
            this.username = username;
            this.isAuthenticated = true;
        }
    }

    getAuthHeaders() {
        if (this.accessToken) {
            return {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Content-Type': 'application/json'
        };
    }

    validateTokens() {
        // Simple validation - in a real app this would check token expiration
        return this.isAuthenticated;
    }

    logout() {
        this.isAuthenticated = false;
        this.userRole = null;
        this.userID = null;
        this.username = null;
        this.accessToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
    }
}

// Helper functions for authentication
export function getCurrentUser(authManager) {
    if (!authManager.isAuthenticated) {
        return { role: 'Guest', isAuthenticated: false };
    }
    return {
        id: authManager.userID,
        username: authManager.username,
        role: authManager.userRole || 'User',
        isAuthenticated: authManager.isAuthenticated
    };
}

export function getAccessLevel(authManager) {
    const user = getCurrentUser(authManager);
    if (user.role === 'Admin') return 'admin';
    if (user.isAuthenticated) return 'user';
    return 'guest';
}

export function canAccess(authManager, requiredLevel) {
    const userLevel = getAccessLevel(authManager);
    const levels = { guest: 0, user: 1, admin: 2 };
    return levels[userLevel] >= levels[requiredLevel];
}

export function isAdmin(authManager) {
    return getAccessLevel(authManager) === 'admin';
}

export function isLoggedIn(authManager) {
    return getAccessLevel(authManager) !== 'guest';
}
