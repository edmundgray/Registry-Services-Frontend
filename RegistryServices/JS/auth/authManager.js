// JS/auth/authManager.js
// Authentication configuration and AuthManager class for Registry Services
//<!-- Session logic is now centralized in authManager.js -->
window.AUTH_CONFIG = {
    baseUrl: 'https://registryservices-staging.azurewebsites.net/api',
    endpoints: {
        login: '/auth/login',
        refresh: '/auth/refresh'  // Added refresh endpoint
    },
    tokenKeys: {
        access: 'access_token'
    },
    session: {
        duration: 60 * 60 * 1000,      // 1 hour
        warningTime: 5 * 60 * 1000     // Show warning 5 minutes before expiry
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
        // Configuration - use AUTH_CONFIG for consistency
        this.WARNING_SECONDS_BEFORE_EXPIRY = 5 * 60; // Warn 5 minutes before expiry
        // Expose JWT and decoded payload for debugging/inspection
        this.token = undefined;
        this.tokenData = undefined;
        this.init();
    }

    // Debug function to return the token, refreshToken, and expiry that should be stored on login
    getLoginTokenDebugInfo(data, username) {
        const tokenToStore = data.token || data.accessToken;
        const refreshTokenToStore = data.refreshToken;
        const expiresInToStore = data.expiresIn || 3600; // Default to 1 hour
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
                this.setTokens(token, refreshToken, window.AUTH_CONFIG.session.duration / 1000);
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

        // Store user role in localStorage (this was missing!)
        if (this.userRole) {
            localStorage.setItem('userRole', this.userRole);
        }

        this.setupTokenRefreshTimers();

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('authenticationChanged', { detail: { isAuthenticated: true } }));
    }

    // Set up timers for warning and auto-refresh
    setupTokenRefreshTimers() {
        this.clearTokenTimers();
        if (!this.tokenExpiryTime) return;
        
        const timeToExpiry = this.tokenExpiryTime - Date.now();
        const warningTime = timeToExpiry - (this.WARNING_SECONDS_BEFORE_EXPIRY * 1000);
        
        console.log('DEBUG: Setting up token timers:', {
            timeToExpiry: Math.floor(timeToExpiry / 1000),
            warningIn: Math.floor(warningTime / 1000),
            tokenExpiryTime: this.tokenExpiryTime,
            currentTime: Date.now()
        });
        
        // Set warning timer
        if (warningTime > 0) {
            this.warningTimer = setTimeout(() => {
                console.log('DEBUG: Warning timer fired, showing session warning');
                this.showSessionWarning();
            }, warningTime);
        } else {
            // If warning time has already passed, show warning immediately
            console.log('DEBUG: Warning time already passed, showing session warning immediately');
            setTimeout(() => this.showSessionWarning(), 100);
        }
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
    isTokenNearExpiry(secondsBuffer = 30) {
        if (!this.tokenExpiryTime) return false;
        const timeToExpiry = this.tokenExpiryTime - Date.now();
        return timeToExpiry < (secondsBuffer * 1000);
    }

    // Check if token is expired
    isTokenExpired() {
        if (!this.tokenExpiryTime) return false;
        return Date.now() >= this.tokenExpiryTime;
    }

    // Show session timeout warning with refresh option
    showSessionWarning() {
        if (this.warningShown) return;
        this.warningShown = true;

        console.log('DEBUG: showSessionWarning called - showing refresh option modal');
        
        this.showSessionWarningModal().then((userChoice) => {
            if (userChoice === 'refresh') {
                this.forceRefreshToken();
            }
            // If user chooses to continue or ignores, they'll get the expiry modal when token expires
        });
    }

    // Handle refresh failure - show expiry modal
    handleRefreshFailure() {
        console.warn('Token refresh failed - user will need to re-authenticate');
        this.logout(); // Logout immediately
        this.showSessionExpiryModal(); // Show simple expiry notice
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('authenticationFailed'));
    }

    // Session warning modal with refresh option
    showSessionWarningModal() {
        return new Promise((resolve) => {
            const timeLeft = Math.max(0, this.tokenExpiryTime - Date.now());
            const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
            
            const modalHtml = `
                <div id="sessionWarningModal" class="modal" style="display: block; z-index: 10000; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);">
                    <div class="modal-content" style="background: white; margin: 15% auto; padding: 20px; border-radius: 5px; width: 80%; max-width: 500px;">
                        <div class="modal-header">
                            <h3>Session Expiring Soon</h3>
                        </div>
                        <div class="modal-body">
                            <p>Your session will expire in approximately ${minutesLeft} minute(s).</p>
                            <p>Would you like to refresh your session to continue working?</p>
                        </div>
                        <div class="modal-footer">
                            <button id="refreshSessionBtn" class="btn btn-primary" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Refresh Session</button>
                            <button id="continueBtn" class="btn btn-secondary" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Continue</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('sessionWarningModal');
            const refreshBtn = document.getElementById('refreshSessionBtn');
            const continueBtn = document.getElementById('continueBtn');

            const cleanup = () => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            };

            refreshBtn.onclick = () => {
                cleanup();
                resolve('refresh');
            };

            continueBtn.onclick = () => {
                cleanup();
                resolve('continue');
            };

            // Allow ESC key to close modal (same as continue)
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve('continue');
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
        });
    }

    // Simple session expiry modal (shown when token actually expires)
    showSessionExpiryModal() {
        return new Promise((resolve) => {
            const modalHtml = `
                <div id="sessionExpiryModal" class="modal" style="display: block; z-index: 10000; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);">
                    <div class="modal-content" style="background: white; margin: 15% auto; padding: 20px; border-radius: 5px; width: 80%; max-width: 500px;">
                        <div class="modal-header">
                            <h3>Session Expired</h3>
                        </div>
                        <div class="modal-body">
                            <p>Your session has expired. For security reasons, you have been logged out.</p>
                            <p>Please navigate to the login page to sign in again.</p>
                        </div>
                        <div class="modal-footer">
                            <button id="sessionOkBtn" class="btn btn-primary" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">OK</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('sessionExpiryModal');
            const okBtn = document.getElementById('sessionOkBtn');

            const cleanup = () => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            };

            okBtn.onclick = () => {
                cleanup();
                resolve();
            };

            // Allow ESC key to close modal
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve();
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
        });
    }

    // Enhanced authenticatedFetch with token refresh
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
            
            // If 401 or 403, try to refresh token first
            if (response.status === 401 || response.status === 403) {
                console.log('Received 401/403 - attempting token refresh');
                const refreshSuccess = await this.attemptBackgroundRefresh();
                
                if (refreshSuccess) {
                    // Retry the original request with new token
                    const newHeaders = {
                        ...options.headers,
                        ...this.getAuthHeaders()
                    };
                    const retryOptions = {
                        ...options,
                        headers: newHeaders
                    };
                    return await fetch(url, retryOptions);
                } else {
                    // Refresh failed, handle as session expiry
                    this.handleRefreshFailure();
                    throw new Error('Authentication failed - session expired');
                }
            }
            
            return response;
            
        } catch (error) {
            console.error('Authenticated fetch failed:', error);
            throw error;
        }
    }

    // Attempt background token refresh
    async attemptBackgroundRefresh() {
        if (this.isRefreshing || !this.refreshToken) {
            console.log('Already refreshing or no refresh token available');
            return false;
        }

        this.isRefreshing = true;
        console.log('DEBUG: Attempting background token refresh');

        try {
            const response = await fetch(`${window.AUTH_CONFIG.baseUrl}${window.AUTH_CONFIG.endpoints.refresh}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: this.refreshToken
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('DEBUG: Token refresh successful');
                
                // Update tokens
                this.setTokens(
                    data.accessToken || data.token,
                    data.refreshToken || this.refreshToken, // Keep existing refresh token if new one not provided
                    data.expiresIn || 3600
                );
                
                return true;
            } else {
                console.log('DEBUG: Token refresh failed with status:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    // Force refresh token (user-initiated)
    async forceRefreshToken() {
        console.log('DEBUG: Force refresh token requested');
        const success = await this.attemptBackgroundRefresh();
        
        if (success) {
            console.log('DEBUG: Token refresh successful');
            // Reset warning shown flag so user can get warned again for the new token
            this.warningShown = false;
            
            // Show success message briefly
            const successMsg = document.createElement('div');
            successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 10px 20px; border-radius: 4px; z-index: 10001;';
            successMsg.textContent = 'Session refreshed successfully';
            document.body.appendChild(successMsg);
            
            setTimeout(() => {
                if (successMsg.parentNode) {
                    successMsg.parentNode.removeChild(successMsg);
                }
            }, 3000);
            
            return true;
        } else {
            console.log('DEBUG: Token refresh failed - showing expiry modal');
            this.handleRefreshFailure();
            return false;
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

    async registerUser(firstName, lastName, email) {
        console.log('Attempting to register user:', { firstName, lastName, email });

        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Simulated registration successful for:', email);

        return { success: true, message: 'Registration submitted for approval.'};

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
        const secondsLeft = Math.ceil(timeLeft / 1000);
        
        if (timeLeft <= 0) {
            return { status: 'expired', timeLeft: 0 };
        } else if (timeLeft <= (this.WARNING_SECONDS_BEFORE_EXPIRY * 1000)) {
            return { status: 'expiring', timeLeft: secondsLeft };
        } else {
            return { status: 'active', timeLeft: secondsLeft };
        }
    }

    // For testing - simulate login with 1-hour expiry
    simulateLogin(username = 'testuser', role = 'user') {
        console.log('DEBUG: Simulating login for testing');
        this.userRole = role;
        this.setTokens('fake-jwt-token-for-testing', 'fake-refresh-token', 3600, username, 1, 1, 'Test Group');
        console.log('DEBUG: Login simulated - token will expire in 1 hour, warning at 5 minutes');
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