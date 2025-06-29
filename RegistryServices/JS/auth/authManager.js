// JS/auth/authManager.js
// Authentication configuration and AuthManager class for Registry Services

window.AUTH_CONFIG = {
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

window.AuthManager = class {
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
        const userId = localStorage.getItem('userId');
        
        console.log('DEBUG: AuthManager init - loading from localStorage:', {
            tokenPresent: !!token,
            tokenPreview: token ? token.substring(0, 30) + '...' : 'Not found',
            role: role,
            username: username,
            userId: userId
        });
        
        if (token && role && username) {
            this.accessToken = token;
            this.userRole = role;
            this.username = username;
            this.userID = userId ? parseInt(userId) : null;
            this.isAuthenticated = true;
            
            console.log('DEBUG: AuthManager initialized with stored credentials');
        } else {
            console.log('DEBUG: No valid stored credentials found');
            this.isAuthenticated = false;
        }
    }

    getAuthHeaders() {
        console.log('DEBUG: getAuthHeaders called. Current state:', {
            isAuthenticated: this.isAuthenticated,
            accessTokenPresent: !!this.accessToken,
            accessTokenPreview: this.accessToken ? this.accessToken.substring(0, 30) + '...' : 'Not set'
        });
        
        if (this.accessToken) {
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            };
            console.log('DEBUG: Returning auth headers with token:', this.accessToken.substring(0, 30) + '...');
            return headers;
        }
        
        console.log('DEBUG: No access token available, returning basic headers');
        return {
            'Content-Type': 'application/json'
        };
    }

    validateTokens() {
        // Simple validation - in a real app this would check token expiration
        return this.isAuthenticated;
    }

    logout() {
        console.log('DEBUG: AuthManager logout called');
        this.isAuthenticated = false;
        this.userRole = null;
        this.userID = null;
        this.username = null;
        this.accessToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        console.log('DEBUG: AuthManager logout completed, all data cleared');
    }
}

// Helper functions for authentication
function getCurrentUser(authManager) {
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

function getAccessLevel(authManager) {
    const user = getCurrentUser(authManager);
    if (user.role === 'Admin') return 'admin';
    if (user.isAuthenticated) return 'user';
    return 'guest';
}

function canAccess(authManager, requiredLevel) {
    const userLevel = getAccessLevel(authManager);
    const levels = { guest: 0, user: 1, admin: 2 };
    return levels[userLevel] >= levels[requiredLevel];
}

function isAdmin(authManager) {
    return getAccessLevel(authManager) === 'admin';
}

function isLoggedIn(authManager) {
    return getAccessLevel(authManager) !== 'guest';
}
