// JS/auth/authManager.js
// Authentication configuration and AuthManager class for Registry Services
//<!-- Session logic is now centralized in authManager.js -->
window.AUTH_CONFIG = {
    baseUrl: 'https://registryservices-staging.azurewebsites.net/api',
    endpoints: {
        login: '/auth/login'
    },
    tokenKeys: {
        access: 'access_token'
    },
    session: {
        duration: 6 *60 * 60 * 1000,      // 1 hour
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
        // Expose JWT and decoded payload for debugging/inspection
        this.token = undefined;
        this.tokenData = undefined;
        this.init();
    }

    // Debug function to return the token, refreshToken, and expiry that should be stored on login
    getLoginTokenDebugInfo(data, username) {
        const tokenToStore = data.token || data.accessToken;
        const refreshTokenToStore = data.refreshToken;
        const expiresInToStore = data.expiresIn || 3600;
        const usernameToStore = data.username || username;
        return {
            token: tokenToStore,
            refreshToken: refreshTokenToStore,
            expiresIn: expiresInToStore,
            username: usernameToStore
        };
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
        let refreshToken = localStorage.getItem('refresh_token');
        // Treat both null and the string 'null' as no token
        if (refreshToken === null || refreshToken === 'null') {
            refreshToken = undefined;
        }
        
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
            // Expose JWT and decoded payload for debugging/inspection
            this.token = token;
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    this.tokenData = JSON.parse(atob(parts[1]));
                } else {
                    this.tokenData = undefined;
                }
            } catch (e) {
                this.tokenData = undefined;
            }
            
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
    setTokens(accessToken, refreshToken, expiresIn, username, userId, userGroupID, groupName) {
        this.accessToken = accessToken;
        // Never store the string 'null' as a refresh token
        if (refreshToken === null || refreshToken === 'null') {
            this.refreshToken = undefined;
        } else {
            this.refreshToken = refreshToken;
        }
        this.tokenExpiryTime = Date.now() + (expiresIn * 1000);
        this.isAuthenticated = true;
        this.warningShown = false;

        // Expose JWT and decoded payload for debugging/inspection
        this.token = accessToken;
        try {
            const parts = accessToken.split('.');
            if (parts.length === 3) {
                this.tokenData = JSON.parse(atob(parts[1]));
            } else {
                this.tokenData = undefined;
            }
        } catch (e) {
            this.tokenData = undefined;
        }

        // Store tokens and expiry time in localStorage
        localStorage.setItem('access_token', this.accessToken);
        // Only store refresh_token if it is defined and not 'null'
        if (this.refreshToken) {
            localStorage.setItem('refresh_token', this.refreshToken);
        } else {
            localStorage.removeItem('refresh_token');
        }
        localStorage.setItem('token_expiry', this.tokenExpiryTime.toString());

        // Store user info if provided (during login)
        if (username) {
            this.username = username;
            localStorage.setItem('username', this.username);
        }
        if (userId) {
            this.userID = userId;
            localStorage.setItem('userId', this.userID);
        }
        if (userGroupID) {
            this.userGroupID = userGroupID;
            localStorage.setItem('userGroupID', this.userGroupID);
        }
        if (groupName) {
            this.groupName = groupName;
            localStorage.setItem('groupName', this.groupName);
        }

        this.setupTokenRefreshTimers();

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('authenticationChanged', { detail: { isAuthenticated: true } }));
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
        // No silent auto-refresh timer per requirements
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
            } else {
                // User chose not to continue, or closed the modal
                this.logout();
            }
        });
    }

    // Background token refresh (DISABLED - endpoints not available)
    async attemptBackgroundRefresh() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        console.log('Attempting to refresh token...');
        try {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                console.log('Token refreshed successfully.');
                // The warning modal should be closed by showSessionWarningModal
            } else {
                console.log('Token refresh failed. User will be logged out.');
                this.handleRefreshFailure();
            }
        } catch (error) {
            console.error('Error during token refresh attempt:', error);
            this.handleRefreshFailure();
        } finally {
            this.isRefreshing = false;
        }
    }

    // Refresh using refresh token (DISABLED - endpoint not available)
    async refreshAccessToken() {
        if (!this.refreshToken) {
            console.error('No refresh token available.');
            this.logout();
            return false;
        }
        // Debug: Show tokens being sent to the API
        console.log('[DEBUG] Calling refresh endpoint with:', {
            refreshToken: this.refreshToken,
            accessToken: this.accessToken
        });
        try {
            const response = await fetch(`${AUTH_CONFIG.baseUrl}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refreshToken: this.refreshToken,
                    accessToken: this.accessToken
                })
            });
            if (response.ok) {
                const data = await response.json();
                // Assuming the refresh response contains token, refreshToken, and expiresIn
                this.setTokens(data.token, data.refreshToken, data.expiresIn);
                console.log('Successfully refreshed and set new tokens.');
                window.dispatchEvent(new CustomEvent('tokenRefreshed'));
                return true;
            } else {
                console.error('Refresh token request failed with status:', response.status);
                this.logout(); // Logout if refresh fails
                return false;
            }
        } catch (error) {
            console.error('Error fetching refresh token:', error);
            this.logout();
            return false;
        }
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

                // Pause for debug: show a message and button before closing modal and redirecting
                const modalBody = modal.querySelector('.modal-body');
                const pauseDiv = document.createElement('div');
                pauseDiv.style.marginTop = '20px';
                pauseDiv.innerHTML = `
                    <div style="color: #d9534f; font-weight: bold;">Paused for debug: Check the console and storage now.</div>
                    <button id="continueLoginBtn" style="margin-top: 16px; padding: 8px 20px; font-size: 1rem; background: #09f; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Continue to Application</button>
                `;
                modalBody.appendChild(pauseDiv);
                loginBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
                usernameInput.disabled = true;
                passwordInput.disabled = true;
                errorDiv.style.display = 'none';
                document.getElementById('continueLoginBtn').onclick = () => {
                    cleanup();
                    // Dispatch success event
                    window.dispatchEvent(new CustomEvent('reauthenticationSuccess'));
                };

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
        // Debug: Show what was received from the server
        console.log('[DEBUG] Login response data:', data);
        // Store authentication data using setTokens
        const tokenToStore = data.token || data.accessToken;
        const refreshTokenToStore = data.refreshToken;
        const expiresInToStore = data.expiresIn || 3600;
        const usernameToStore = data.username || username;
        const userIdToStore = data.userId;
        const userGroupIDToStore = data.userGroupID;
        const groupNameToStore = data.groupName;
        // Explicitly log the refreshToken value for debugging
        console.log('[DEBUG] Login response refreshToken:', data.refreshToken, '| typeof:', typeof data.refreshToken);
        console.log('[DEBUG] Storing tokens and user info:', {
            token: tokenToStore,
            refreshToken: refreshTokenToStore,
            expiresIn: expiresInToStore,
            username: usernameToStore,
            userId: userIdToStore,
            userGroupID: userGroupIDToStore,
            groupName: groupNameToStore
        });
        this.setTokens(
            tokenToStore,
            refreshTokenToStore,
            expiresInToStore,
            usernameToStore,
            userIdToStore,
            userGroupIDToStore,
            groupNameToStore
        );

        // Log all localStorage values after login and before redirect (for debugging refresh token presence)
        if (typeof window !== 'undefined' && window.localStorage) {
            const allLocalStorage = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                allLocalStorage[key] = localStorage.getItem(key);
            }
            console.log('[DEBUG] localStorage after login, before redirect:', allLocalStorage);
        }
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
    // TEMPORARY: Allow manual refresh from the console for debugging
    forceRefreshToken() {
        console.log('[DEBUG] Forcing refresh token via forceRefreshToken()');
        return this.refreshAccessToken();
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
    if (user.role && user.role.toLowerCase() === 'admin') return 'admin';
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
