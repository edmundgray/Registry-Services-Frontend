/******************************************************************************
    Log in/out functionality
    General
 ******************************************************************************/
let loggedInStatus = false; // Will be updated by updateVisibility()
console.log("Page load: User authentication will be checked by AuthManager");

/******************************************************************************
    Debug Functions
 ******************************************************************************/
// Debug function to check token time remaining - call from console: checkTokenTime()
function checkTokenTime() {
    try {
        if (!window.authManager) {
            console.log('❌ AuthManager not available');
            return;
        }

        const token = window.authManager.accessToken;
        if (!token) {
            console.log('❌ No access token found');
            return;
        }

        // Decode the JWT token to get expiry time
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = expiry - now;

        console.log('🔐 Token Debug Information:');
        console.log('  Current time:', new Date().toLocaleString());
        console.log('  Token expires:', new Date(expiry * 1000).toLocaleString());
        console.log('  Time remaining:', timeRemaining, 'seconds');
        console.log('  Time remaining:', Math.floor(timeRemaining / 60), 'minutes and', timeRemaining % 60, 'seconds');
        
        if (timeRemaining <= 0) {
            console.log('  Status: ❌ TOKEN EXPIRED');
        } else if (timeRemaining <= 300) { // 5 minutes
            console.log('  Status: ⚠️ TOKEN EXPIRING SOON');
        } else {
            console.log('  Status: ✅ TOKEN VALID');
        }

        // Show auth manager state
        console.log('  Auth Manager State:');
        console.log('    - isAuthenticated:', window.authManager.isAuthenticated);
        console.log('    - warningShown:', window.authManager.warningShown);
        
        return {
            timeRemaining,
            expired: timeRemaining <= 0,
            expiringSoon: timeRemaining <= 300,
            expiryDate: new Date(expiry * 1000),
            authManagerState: {
                isAuthenticated: window.authManager.isAuthenticated,
                warningShown: window.authManager.warningShown
            }
        };
    } catch (error) {
        console.error('❌ Error checking token time:', error);
        return null;
    }
}

// Make the debug function globally accessible
window.checkTokenTime = checkTokenTime;

function toggleLogin() 
{
    // Check if user is currently logged in
    const isLoggedIn = window.authManager && window.authManager.isAuthenticated;
    
    if (isLoggedIn) {
        // User is logged in, so logout
        logout();
    } else {
        // User is not logged in, show login form
        showLoginForm();
    }
}

function updateVisibility() 
{
    // Update loggedInStatus to be compatible with new auth system
    loggedInStatus = window.authManager && window.authManager.isAuthenticated;
    
    document.querySelectorAll(".protected").forEach(item => 
    {
        item.style.display = loggedInStatus ? "block" : "none";
    });

    const loginLogoutButton = document.getElementById("loginLogoutButton");
    if (loginLogoutButton) {
        loginLogoutButton.innerText = loggedInStatus ? "Logout" : "Login";
    }

    // Safely check for elements before accessing parentElement
    const coreInvoiceModelLink = document.querySelector("a[href='coreInvoiceModel.html']");
    const extensionComponentLink = document.querySelector("a[href='ExtensionComponentDataModel.html']");
    
    const coreInvoiceModel = coreInvoiceModelLink ? coreInvoiceModelLink.parentElement : null;
    const extensionComponent = extensionComponentLink ? extensionComponentLink.parentElement : null;

    if (coreInvoiceModel && extensionComponent) 
    {
        if (loggedInStatus) 
        {
            coreInvoiceModel.classList.add("child-element");
            extensionComponent.classList.add("child-element");
        } 
        else 
        {
            coreInvoiceModel.classList.remove("child-element");
            extensionComponent.classList.remove("child-element");
        }
    }
}

/******************************************************************************
    1/2 Country and Extension Component Dropdown Population
 ******************************************************************************/

document.addEventListener("DOMContentLoaded", function () 
{
    updateVisibility();

    // Country dropdown population moved to registryTable.js for registry-specific pages
    // For other pages that need country dropdown, this code should be page-specific

/******************************************************************************
    2/2 Country and Extension Component Dropdown Population
 ******************************************************************************/

/******************************************************************************
    Authentication and General UI Management
    - All table-related functionality moved to registryTable.js
    - Country dropdown moved to registryTable.js for registry pages
 ******************************************************************************/
    // Note: All table management is now handled by registryTable.js

});

// ----------- CODE FROM MAIN BRANCH (role/access/session management, etc.) ------------

// Login Modal HTML and functionality
function createLoginModal() {
    const modalHTML = `
        <div id="loginModal" style="
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        ">
            <div style="
                background-color: white;
                margin: 15% auto;
                padding: 20px;
                border-radius: 8px;
                width: 300px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ">
                <h2>Login</h2>
                <form id="loginForm">
                    <div style="margin-bottom: 15px;">
                        <label for="username">Username:</label>
                        <input type="text" id="username" name="username" value="Admin" required style="
                            width: 100%;
                            padding: 8px;
                            margin-top: 5px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                        ">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" value="Password123" required style="
                            width: 100%;
                            padding: 8px;
                            margin-top: 5px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                        ">
                    </div>
                    <div style="text-align: right;">
                        <button type="button" onclick="closeLoginModal()" style="
                            background: #ccc;
                            border: none;
                            padding: 8px 16px;
                            margin-right: 10px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Cancel</button>
                        <button type="submit" style="
                            background: #007cba;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Login</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add form submission handler
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            await loginUser(username, password);
            loggedInStatus = true;
            updateVisibility();
            closeLoginModal();
            showMessage('Login successful!', 'success');
            
            // Redirect to eInvoicingSpecificationRegistry.html after successful login
            setTimeout(() => {
                window.location.href = 'eInvoicingSpecificationRegistry.html';
            }, 1000);
        } catch (error) {
            showMessage(`Login failed: ${error.message}`, 'error');
        }
    });
}

// getPropertyValue function moved to registryTable.js where it's used

// Authentication functions for testing
async function loginUser(username, password) {
    console.log('DEBUG: Attempting login with username:', username);
    
    try {
        // Make actual API call to login endpoint
        const loginUrl = `${AUTH_CONFIG.baseUrl}/auth/login`;
        console.log('DEBUG: Making login API call to:', loginUrl);
        
        const loginResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        console.log('DEBUG: Login API response status:', loginResponse.status);
        console.log('DEBUG: Login API response headers:', Object.fromEntries(loginResponse.headers.entries()));
        
        if (!loginResponse.ok) {
            const errorText = await loginResponse.text();
            console.error('DEBUG: Login API error response:', errorText);
            throw new Error(`Login failed: ${loginResponse.status} - ${errorText}`);
        }
        
        const loginData = await loginResponse.json();
        console.log('DEBUG: Login API response data:', loginData);
        
        // Extract token and user info from response - handle multiple possible field names
        const accessToken = loginData.token || loginData.accessToken || loginData.access_token || loginData.authToken;
        const userRole = loginData.role || loginData.userRole || loginData.roles || 'User';
        const userId = loginData.id || loginData.userId || loginData.user_id || loginData.userID;
        const userGroupID = loginData.userGroupID || loginData.groupId || loginData.group_id;
        const groupName = loginData.groupName || loginData.group_name;
        
        if (!accessToken) {
            console.error('DEBUG: No access token found in login response. Available fields:', Object.keys(loginData));
            throw new Error('Login response did not contain an access token');
        }
        
        console.log('DEBUG: Real login successful!');
        console.log('DEBUG: Token received (first 30 chars):', accessToken.substring(0, 30) + '...');
        console.log('DEBUG: User role:', userRole);
        console.log('DEBUG: User ID:', userId);
        console.log('DEBUG: User Group ID:', userGroupID);
        console.log('DEBUG: Group Name:', groupName);
        
        // IMPORTANT: Clear any old authentication data first
        window.authManager.logout();
        localStorage.clear(); // Clear all old data
        
        // Set up the auth manager with real data from API
        window.authManager.isAuthenticated = true;
        window.authManager.username = username;
        window.authManager.userRole = userRole;
        window.authManager.userID = userId;
        window.authManager.userGroupID = userGroupID;
        window.authManager.groupName = groupName;
        window.authManager.accessToken = accessToken;
        
        // Store in localStorage with the correct keys
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('username', username);
        if (userId) {
            localStorage.setItem('userId', userId.toString());
        }
        if (userGroupID) {
            localStorage.setItem('userGroupID', userGroupID.toString());
        }
        if (groupName) {
            localStorage.setItem('groupName', groupName);
        }
        
        console.log('DEBUG: Auth manager updated with real token');
        console.log('DEBUG: Token stored in localStorage:', localStorage.getItem('access_token').substring(0, 30) + '...');
        console.log('DEBUG: Auth manager verification:', {
            isAuthenticated: window.authManager.isAuthenticated,
            accessToken: window.authManager.accessToken ? window.authManager.accessToken.substring(0, 30) + '...' : 'Not set',
            username: window.authManager.username,
            userRole: window.authManager.userRole
        });
        
        return {
            success: true,
            username: username,
            role: userRole,
            token: accessToken
        };
        
    } catch (error) {
        console.error('DEBUG: Login failed:', error);
        
        // For development/testing fallback - only if API call fails due to network issues
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('network')) {
            console.warn('DEBUG: API seems unavailable, falling back to test mode');
            
            // Only allow test credentials in fallback mode
            if ((username === 'Admin' && password === 'Password123') || 
                (username === 'Admin' && password === 'Admin')) {
                
                console.log('DEBUG: Using test fallback login');
                
                // Clear any old authentication data first
                window.authManager.logout();
                localStorage.clear();
                
                // Set up the auth manager with test data
                const testToken = `test-token-for-${username.toLowerCase()}-${Date.now()}`;
                
                window.authManager.isAuthenticated = true;
                window.authManager.username = username;
                window.authManager.userRole = 'Admin';
                window.authManager.userID = username === 'Admin' ? 1 : 2;
                window.authManager.accessToken = testToken;
                
                // Store in localStorage
                localStorage.setItem('access_token', testToken);
                localStorage.setItem('userRole', 'Admin');
                localStorage.setItem('username', username);
                
                console.log('DEBUG: Test token stored:', testToken.substring(0, 30) + '...');
                
                return {
                    success: true,
                    username: username,
                    role: 'Admin',
                    token: testToken
                };
            }
        }
        
        // Re-throw the original error if not a network issue or invalid credentials
        throw error;
    }
}

// Admin login function for testing
async function adminLogin() {
    console.log('DEBUG: Admin login as Admin/Admin');
    try {
        const result = await loginUser('Admin', 'Password123');
        console.log('DEBUG: Login result:', result);
        
        // Force refresh the auth manager to ensure it has the latest token
        window.authManager.init();
        
        loggedInStatus = true;
        updateVisibility();
        updateUserDisplay();
        showMessage('Admin login successful! Logged in as Admin (Admin)', 'success');
        
        // Trigger specification reload if on mySpecifications page
        if (typeof window.reloadSpecificationsAfterLogin === 'function') {
            setTimeout(() => window.reloadSpecificationsAfterLogin(), 200);
        }
        
        // Redirect to eInvoicingSpecificationRegistry.html after successful login
        setTimeout(() => {
            window.location.href = 'eInvoicingSpecificationRegistry.html';
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('DEBUG: Admin login failed:', error);
        showMessage(`Admin login failed: ${error.message}`, 'error');
        return false;
    }
}

// Demo login function for easy testing
async function demoLogin() {
    console.log('DEBUG: Demo login as Admin/Admin');
    try {
        const result = await loginUser('Admin', 'Password123');
        console.log('DEBUG: Login result:', result);
        
        // Force refresh the auth manager to ensure it has the latest token
        window.authManager.init();
        
        loggedInStatus = true;
        updateVisibility();
        updateUserDisplay();
        showMessage('Demo login successful! Logged in as Admin (Admin)', 'success');
        
        // Trigger specification reload if on mySpecifications page
        if (typeof window.reloadSpecificationsAfterLogin === 'function') {
            setTimeout(() => window.reloadSpecificationsAfterLogin(), 200);
        }
        
        // Redirect to eInvoicingSpecificationRegistry.html after successful login
        setTimeout(() => {
            window.location.href = 'eInvoicingSpecificationRegistry.html';
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('DEBUG: Demo login failed:', error);
        showMessage(`Demo login failed: ${error.message}`, 'error');
        return false;
    }
}

// Function to show user-friendly messages
function showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create or update message display
    let messageDiv = document.getElementById('userMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'userMessage';
        messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px; padding: 15px; border-radius: 5px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(messageDiv);
    }
    
    // Set color based on type
    const colors = {
        success: 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
        error: 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;',
        info: 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
    };
    
    messageDiv.style.cssText += colors[type] || colors.info;
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>${message}</span>
            <button onclick="document.getElementById('userMessage').remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; margin-left: 10px;">&times;</button>
        </div>
    `;
    
    // Auto-hide after 5 seconds for success/info messages
    if (type !== 'error') {
        setTimeout(() => {
            const msgDiv = document.getElementById('userMessage');
            if (msgDiv && msgDiv.parentNode) {
                msgDiv.remove();
            }
        }, 5000);
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Simplified role checking for prototype
function getCurrentUser() {
    // Use window.authManager to ensure we're accessing the global auth manager
    if (!window.authManager || !window.authManager.isAuthenticated) {
        return { role: 'Guest', isAuthenticated: false };
    }
    
    return {
        id: window.authManager.userID,
        username: window.authManager.username,
        role: window.authManager.userRole || 'User',
        userGroupID: window.authManager.userGroupID,
        groupName: window.authManager.groupName,
        isAuthenticated: window.authManager.isAuthenticated
    };
}

// Simple role hierarchy for prototype
function getAccessLevel() {
    const user = getCurrentUser();
    if (user.role === 'Admin') return 'admin';
    if (user.isAuthenticated) return 'user';
    return 'guest';
}

// Check if user can access specific features
function canAccess(requiredLevel) {
    const userLevel = getAccessLevel();
    
    // Access hierarchy: admin > user > guest
    const levels = { guest: 0, user: 1, admin: 2 };
    return levels[userLevel] >= levels[requiredLevel];
}

// Convenience functions
function isAdmin() {
    return getAccessLevel() === 'admin';
}

function isLoggedIn() {
    return getAccessLevel() !== 'guest';
}

// Example usage for different access levels in your prototype:
/*

// In your HTML, you can use these classes:
// class="admin-only" - Only visible to admins
// class="user-only" - Only visible to logged-in users
// class="protected" - Only visible to logged-in users (existing)

// Example API calls with different access levels:
// Public endpoints (no auth needed):
// - GET /api/extensionmodels/headers (public list)
// - GET /api/countries (public data)

// User endpoints (requires login):
// - GET /api/user/specifications (user's own data)
// - POST /api/user/save (save user data)

// Admin endpoints (requires admin role):
// - POST /api/admin/specifications (manage all data)
// - DELETE /api/admin/users (user management)

*/

// Update visibility based on access levels
function updateVisibilityWithRoles() {
    const accessLevel = getAccessLevel();
    
    // Handle existing protected elements
    document.querySelectorAll(".protected").forEach(item => {
        item.style.display = isLoggedIn() ? "block" : "none";
    });
    
    // Handle admin-only elements
    document.querySelectorAll(".admin-only").forEach(item => {
        item.style.display = isAdmin() ? "block" : "none";
    });
    
    // Handle user-only elements
    document.querySelectorAll(".user-only").forEach(item => {
        item.style.display = isLoggedIn() ? "block" : "none";
    });
    
    // Handle create/edit buttons (requires login)
    document.querySelectorAll(".create-edit-only").forEach(item => {
        item.style.display = canCreateOrEdit() ? "block" : "none";
    });
    
    // Handle delete buttons (admin only)
    document.querySelectorAll(".delete-only").forEach(item => {
        item.style.display = canDelete() ? "block" : "none";
    });
    
    // Update login button
    const loginButton = document.getElementById("loginLogoutButton");
    if (loginButton) {
        loginButton.innerText = isLoggedIn() ? "Logout" : "Login";
    }
    
    // Update user status display
    updateUserStatus();
    
    // Update existing navigation elements
    const coreInvoiceModel = document.querySelector("a[href='coreInvoiceModelRead.html']")?.parentElement;
    const extensionComponent = document.querySelector("a[href='ExtensionComponentDataModelRead.html']")?.parentElement;

    if (coreInvoiceModel && extensionComponent) {
        if (isLoggedIn()) {
            coreInvoiceModel.classList.add("child-element");
            extensionComponent.classList.add("child-element");
        } else {
            coreInvoiceModel.classList.remove("child-element");
            extensionComponent.classList.remove("child-element");
        }
    }
    
    console.log(`UI updated for access level: ${accessLevel}`);
}

/******************************************************************************
    API Helper Functions for Prototype
 ******************************************************************************/
// Example function to create a new specification (requires login)
async function createSpecification(specData) {
    try {
        const response = await authenticatedFetch('/api/specifications', {
            method: 'POST',
            body: JSON.stringify(specData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showMessage('Specification created successfully!', 'success');
            return result;
        }
    } catch (error) {
        console.error('Failed to create specification:', error);
        // Error message already shown by authenticatedFetch
        throw error;
    }
}

// Example function to get specifications - REMOVED: Now handled by registryTable.js
// Use registryTable.js fetchSpecifications() function instead

// fetchCoreInvoiceModels function removed - now handled by coreInvoiceModel.js
// Core Invoice Model data fetching is managed by coreInvoiceModel.js

// Core Invoice Model page initialization removed - handled by coreInvoiceModel.js

// Check if user can perform write operations
function canCreateOrEdit() {
    return isLoggedIn(); // Any logged-in user can create/edit for prototype
}

// Check if user can delete
function canDelete() {
    return isAdmin(); // Only admins can delete for prototype
}

// Simple session management for prototype
function startSessionMonitoring() {
    // Check token validity every 5 minutes
    setInterval(() => {
        if (authManager.isAuthenticated) {
            authManager.validateTokens();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Initialize session monitoring when page loads
document.addEventListener("DOMContentLoaded", function() {
    startSessionMonitoring();
});

// Simple user status display for prototype
function updateUserStatus() {
    const user = getCurrentUser();
    const statusElement = document.getElementById('userStatus');
    
    if (statusElement) {
        if (user.isAuthenticated) {
            statusElement.textContent = `Logged in as: ${user.username} (${user.role})`;
            statusElement.style.display = 'block';
        } else {
            statusElement.style.display = 'none';
        }
    }
}

// Add this to your HTML where you want to show user status:
// <div id="userStatus" style="display: none; font-size: 12px; color: #666;"></div>

// Utility function for debouncing search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Pagination estimation function moved to registryTable.js

/******************************************************************************
    Specification Editing Workflow Functions
 ******************************************************************************/

// Function to initiate editing of an existing specification
function editSpecification(identityID) {
    console.log('DEBUG: editSpecification called with ID:', identityID);
    console.log('DEBUG: editSpecification - ID type:', typeof identityID);
    
    // Use the data manager to set up edit mode
    const dataManager = SpecificationDataManager.initializeForEdit(identityID);
    console.log('DEBUG: editSpecification - Data manager initialized, mode:', dataManager.currentMode);
    console.log('DEBUG: editSpecification - Stored specificationIdentityId:', localStorage.getItem('specificationIdentityId'));
    
    // Store the return page based on current location (if not already set)
    if (!localStorage.getItem("returnToPage")) {
        const currentPage = window.location.pathname.split('/').pop();
        localStorage.setItem("returnToPage", currentPage || "mySpecifications.html");
    }
    console.log('DEBUG: editSpecification - Return page set to:', localStorage.getItem("returnToPage"));
    
    // Set breadcrumb context for edit workflow
    if (window.breadcrumbManager) {
        // Determine source based on current page
        const currentPage = window.location.pathname.split('/').pop();
        let source = 'mySpecs'; // Default
        
        if (currentPage === 'eInvoicingSpecificationRegistry.html' || 
            currentPage === 'viewSpecification.html') {
            // Check if we came from registry or have registry context
            const existingContext = window.breadcrumbManager.getContext();
            if (existingContext && existingContext.source === 'registry') {
                source = 'registry';
            } else if (document.referrer.includes('eInvoicingSpecificationRegistry.html')) {
                source = 'registry';
            } else if (currentPage === 'eInvoicingSpecificationRegistry.html') {
                source = 'registry';
            }
        }
        
        const editContext = {
            source: source,
            action: 'edit',
            currentPage: 'IdentifyingInformation.html',
            specId: identityID,
            specIdentityId: identityID
        };
        
        console.log('DEBUG: editSpecification - Setting breadcrumb context:', editContext);
        window.breadcrumbManager.setContext(editContext);
    }
    
    // Navigate to IdentifyingInformation.html
    console.log('DEBUG: editSpecification - Navigating to IdentifyingInformation.html');
    window.location.href = 'IdentifyingInformation.html';
}

function viewSpecification(identityID) {
    console.log('Viewing specification with ID:', identityID);

    if (!identityID) {
        console.error('No identityID provided for viewing specification');
        alert('Error: No specification ID provided');
        return;
    }

    // Store the specification ID for the view page
    localStorage.setItem('viewSpecificationId', identityID);

    // Navigate to the view specification page with the ID as a URL parameter
    const viewUrl = `viewSpecification.html?id=${identityID}`;
    console.log('DEBUG: Navigating to view page:', viewUrl);

    // Set breadcrumb context for viewing from mySpecifications or other sources
    if (window.breadcrumbManager) {
        const context = {
            source: 'mySpecs', // Default to mySpecs, update if actual source is registry
            action: 'view',
            currentPage: 'viewSpecification.html',
            specId: identityID,
            specIdentityId: identityID
        };
        // Try to determine source from referrer if needed, or ensure calling context sets it
        const referrer = document.referrer;
        if (referrer.includes('eInvoicingSpecificationRegistry.html')) {
            context.source = 'registry';
        } else if (referrer.includes('mySpecifications.html')) {
            context.source = 'mySpecs';
        } else if (referrer.includes('governingEntityView.html')) { // Add governingEntityView as a source
            context.source = 'governingEntityView'; // Or 'admin' if you have a specific source name for admin pages
        }
        window.breadcrumbManager.setContext(context);
    }

    window.location.href = viewUrl;
}

// Function to initiate creation of a new specification
function createNewSpecification() {
    console.log('Initiating creation of new specification');
    
    // Use the data manager to set up create mode
    SpecificationDataManager.initializeForCreate();
    
    // Store the return page so cancel can navigate back
    localStorage.setItem("returnToPage", "mySpecifications.html");
    
    // Navigate to IdentifyingInformation.html
    window.location.href = 'IdentifyingInformation.html';
}

// Function to check current editing mode (for debugging)
function getCurrentEditingMode() {
    const mode = localStorage.getItem('editMode');
    const specId = localStorage.getItem('specificationIdentityId');
    return {
        mode: mode || 'create',
        specificationId: specId,
        isEditing: mode === 'edit' && specId
    };
}