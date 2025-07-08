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
        duration: 6 * 60 * 60 * 1000,      // 1 hour
        warningTime: 5 * 60 * 1000     // 5 minutes warning
    }
};

window.AuthManager = class {
    constructor() {
        this.isAuthenticated = false;
        this.userRole = null;
        this.userID = null;
        this.username = null;
        this.userGroupID = null;
        this.groupName = null;
        this.accessToken = null;
        this.refreshToken = null;
        
        // Session timeout management
        this.tokenExpiryTime = null;
        this.tokenRefreshTimer = null;
        this.warningTimer = null;
        this.isRefreshing = false;
        this.warningShown = false;
        
        // Configuration
        this.WARNING_MINUTES_BEFORE_EXPIRY = 5; // Warn 5 minutes before expiry
        this.AUTO_REFRESH_MINUTES_BEFORE_EXPIRY = 2; // Auto-refresh 2 minutes before expiry
        
        this.init();
    }

    init() {
        // Try to load from localStorage
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');
        const userId = localStorage.getItem('userId');
        const userGroupID = localStorage.getItem('userGroupID');
        const groupName = localStorage.getItem('groupName');
        const tokenExpiry = localStorage.getItem('token_expiry');
        const refreshToken = localStorage.getItem('refresh_token');
        
        console.log('DEBUG: AuthManager init - loading from localStorage:', {
            tokenPresent: !!token,
            tokenPreview: token ? token.substring(0, 30) + '...' : 'Not found',
            role: role,
            username: username,
            userId: userId,
            userGroupID: userGroupID,
            groupName: groupName,
            tokenExpiry: tokenExpiry,
            refreshTokenPresent: !!refreshToken
        });
        
        if (token && role && username) {
            this.accessToken = token;
            this.userRole = role;
            this.username = username;
            this.userID = userId ? parseInt(userId) : null;
            this.userGroupID = userGroupID ? parseInt(userGroupID) : null;
            this.groupName = groupName;
            this.refreshToken = refreshToken;
            this.tokenExpiryTime = tokenExpiry ? parseInt(tokenExpiry) : null;
            this.isAuthenticated = true;
            
            // Set up session timers if we have expiry time
            if (this.tokenExpiryTime) {
                this.setupTokenRefreshTimers();
            } else {
                // If no expiry time, assume 1 hour from now
                this.setTokens(token, refreshToken, 3600);
            }
            
            console.log('DEBUG: AuthManager initialized with stored credentials');
        } else {
            console.log('DEBUG: No valid stored credentials found');
            this.isAuthenticated = false;
        }
    }

    // Enhanced token storage with expiry tracking
    setTokens(accessToken, refreshToken = null, expiresIn = 3600) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.isAuthenticated = true;
        
        // Calculate expiry time
        this.tokenExpiryTime = Date.now() + (expiresIn * 1000);
        
        // Store in localStorage
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('token_expiry', this.tokenExpiryTime.toString());
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
        
        // Set up automatic refresh timers
        this.setupTokenRefreshTimers();
    }

    // Set up timers for warning and auto-refresh (auto-refresh disabled)
    setupTokenRefreshTimers() {
        this.clearTokenTimers();
        
        if (!this.tokenExpiryTime) return;
        
        const timeToExpiry = this.tokenExpiryTime - Date.now();
        const warningTime = timeToExpiry - (this.WARNING_MINUTES_BEFORE_EXPIRY * 60 * 1000);
        
        console.log('DEBUG: Setting up token timers (auto-refresh disabled):', {
            timeToExpiry: Math.floor(timeToExpiry / 1000),
            warningIn: Math.floor(warningTime / 1000)
        });
        
        // Set warning timer only (auto-refresh disabled)
        if (warningTime > 0) {
            this.warningTimer = setTimeout(() => {
                this.showSessionWarning();
            }, warningTime);
        }
        
        // Auto-refresh timer disabled - endpoints not available
        // this.tokenRefreshTimer = setTimeout(() => {
        //     this.attemptBackgroundRefresh();
        // }, refreshTime);
    }

    // Clear existing timers
    clearTokenTimers() {
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }

    // Check if token is close to expiry
    isTokenNearExpiry(minutesBuffer = 5) {
        if (!this.tokenExpiryTime) return false;
        const timeToExpiry = this.tokenExpiryTime - Date.now();
        return timeToExpiry < (minutesBuffer * 60 * 1000);
    }

    // Check if token is expired
    isTokenExpired() {
        if (!this.tokenExpiryTime) return false;
        return Date.now() >= this.tokenExpiryTime;
    }

    // Show session timeout warning
    showSessionWarning() {
        if (this.warningShown) return;
        this.warningShown = true;
        
        const timeLeft = Math.ceil((this.tokenExpiryTime - Date.now()) / (60 * 1000));
        
        this.showSessionWarningModal(timeLeft).then((continueSession) => {
            if (continueSession) {
                // User chose to continue - attempt refresh
                this.attemptBackgroundRefresh();
            }
        });
    }

    // Background token refresh (DISABLED - endpoints not available)
    async attemptBackgroundRefresh() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        
        console.log('Token refresh disabled - endpoints not available. Showing session expiry modal instead.');
        
        try {
            // Instead of trying to refresh, show session expiry modal
            this.handleRefreshFailure();
        } finally {
            this.isRefreshing = false;
        }
    }

    // Refresh using refresh token (DISABLED - endpoint not available)
    async refreshAccessToken() {
        console.log('Token refresh endpoint not available - cannot refresh token');
        throw new Error('Token refresh functionality disabled - endpoint not available');
    }

    // Validate current session and extend if possible (DISABLED - endpoint not available)
    async validateAndExtendSession() {
        console.log('Session validation endpoint not available - cannot extend session');
        throw new Error('Session validation functionality disabled - endpoint not available');
    }

    // Handle refresh failure
    handleRefreshFailure() {
        console.warn('Token refresh failed - user will need to re-authenticate');
        this.showReauthenticationModal();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('authenticationFailed'));
    }

    // Show session warning modal
    showSessionWarningModal(minutesLeft) {
        return new Promise((resolve) => {
            const modalHtml = `
                <div id="sessionWarningModal" class="modal" style="display: block; z-index: 10000;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Session Expiring Soon</h3>
                        </div>
                        <div class="modal-body">
                            <p>Your session will expire in <strong>${minutesLeft} minute(s)</strong>.</p>
                            <p>Do you want to extend your session?</p>
                        </div>
                        <div class="modal-footer">
                            <button id="extendSession" class="btn btn-primary">Extend Session</button>
                            <button id="endSession" class="btn btn-secondary">End Session</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modal = document.getElementById('sessionWarningModal');
            const extendBtn = document.getElementById('extendSession');
            const endBtn = document.getElementById('endSession');
            
            const cleanup = () => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            };
            
            extendBtn.onclick = () => {
                cleanup();
                resolve(true);
            };
            
            endBtn.onclick = () => {
                cleanup();
                this.logout();
                resolve(false);
            };
        });
    }

    // Show re-authentication modal
    showReauthenticationModal() {
        const modalHtml = `
            <div id="reauthModal" class="modal" style="display: block; z-index: 10000;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Session Expired</h3>
                    </div>
                    <div class="modal-body">
                        <p>Your session has expired. Please log in again to continue.</p>
                        <div id="loginForm">
                            <input type="text" id="modalUsername" placeholder="Username" class="form-control mb-2">
                            <input type="password" id="modalPassword" placeholder="Password" class="form-control mb-2">
                            <div id="modalLoginError" class="alert alert-danger" style="display: none;"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="modalLogin" class="btn btn-primary">Login</button>
                        <button id="modalCancel" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('reauthModal');
        const loginBtn = document.getElementById('modalLogin');
        const cancelBtn = document.getElementById('modalCancel');
        const usernameInput = document.getElementById('modalUsername');
        const passwordInput = document.getElementById('modalPassword');
        const errorDiv = document.getElementById('modalLoginError');
        
        const cleanup = () => {
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };
        
        loginBtn.onclick = async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                errorDiv.textContent = 'Please enter both username and password';
                errorDiv.style.display = 'block';
                return;
            }
            
            try {
                loginBtn.disabled = true;
                loginBtn.textContent = 'Logging in...';
                
                await this.performLogin(username, password);
                cleanup();
                
                // Dispatch success event
                window.dispatchEvent(new CustomEvent('reauthenticationSuccess'));
                
            } catch (error) {
                errorDiv.textContent = error.message || 'Login failed. Please try again.';
                errorDiv.style.display = 'block';
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            this.logout();
            window.location.href = '/';
        };
        
        // Allow Enter key to submit
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
    }

    // Perform login operation
    async performLogin(username, password) {
        const response = await fetch(`${AUTH_CONFIG.baseUrl}${AUTH_CONFIG.endpoints.login}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }
        
        const data = await response.json();
        
        // Store authentication data
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.userRole = data.role;
        this.username = data.username;
        this.userID = data.userId;
        this.userGroupID = data.userGroupID;
        this.groupName = data.groupName;
        this.isAuthenticated = true;
        
        // Store in localStorage
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken || '');
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', data.userId.toString());
        localStorage.setItem('userGroupID', data.userGroupID?.toString() || '');
        localStorage.setItem('groupName', data.groupName || '');
        
        // Set up tokens with expiry
        this.setTokens(data.accessToken, data.refreshToken, data.expiresIn || 3600);
    }

    // Enhanced authenticatedFetch (token refresh disabled)
    async authenticatedFetch(url, options = {}) {
        // Check if token is expired before making request
        if (this.isTokenExpired()) {
            console.log('Token expired - showing session expiry modal');
            this.handleRefreshFailure();
            throw new Error('Authentication token has expired');
        }
        
        // Add auth headers
        const headers = {
            ...options.headers,
            ...this.getAuthHeaders()
        };
        
        const fetchOptions = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(url, fetchOptions);
            
            // If 401 or 403, immediately handle as session expiry (no retry)
            if (response.status === 401 || response.status === 403) {
                console.log('Received 401/403 - token refresh disabled, showing session expiry modal');
                this.handleRefreshFailure();
                throw new Error('Authentication failed - session expired');
            }
            
            return response;
            
        } catch (error) {
            console.error('Authenticated fetch failed:', error);
            throw error;
        }
    }

    getAuthHeaders() {
        if (this.accessToken) {
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            };
            return headers;
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
        console.log('DEBUG: AuthManager logout called');
        
        // Clear timers
        this.clearTokenTimers();
        
        // Clear properties
        this.isAuthenticated = false;
        this.userRole = null;
        this.userID = null;
        this.username = null;
        this.userGroupID = null;
        this.groupName = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiryTime = null;
        this.warningShown = false;
        
        // Clear localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiry');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        localStorage.removeItem('userGroupID');
        localStorage.removeItem('groupName');
        
        console.log('DEBUG: AuthManager logout completed, all data cleared');
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }

    // Get session status for UI indicators
    getSessionStatus() {
        if (!this.isAuthenticated) {
            return { status: 'unauthenticated', timeLeft: 0 };
        }
        
        if (!this.tokenExpiryTime) {
            return { status: 'authenticated', timeLeft: 0 };
        }
        
        const timeLeft = Math.max(0, this.tokenExpiryTime - Date.now());
        const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
        
        if (timeLeft <= 0) {
            return { status: 'expired', timeLeft: 0 };
        } else if (timeLeft <= (this.WARNING_MINUTES_BEFORE_EXPIRY * 60 * 1000)) {
            return { status: 'expiring', timeLeft: minutesLeft };
        } else {
            return { status: 'active', timeLeft: minutesLeft };
        }
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
        userGroupID: authManager.userGroupID,
        groupName: authManager.groupName,
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
