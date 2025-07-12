// JS/sidebarManager.js
// Dynamic Sidebar Manager for Registry Services

class SidebarManager {
    constructor() {
        this.menuConfigs = {
            guest: [
                {
                    id: 'home',
                    href: 'eInvoicingSpecificationRegistry.html',
                    icon: 'fa-solid fa-house',
                    text: 'eInvoicing Specification Registry'
                },
                {
                    id: 'coreInvoiceRead',
                    href: 'coreInvoiceModelRead.html',
                    icon: 'fa-solid fa-car',
                    text: 'Core Invoice Model'
                },
                {
                    id: 'extensionRead',
                    href: 'ExtensionComponentDataModelRead.html',
                    icon: 'fa-solid fa-trailer',
                    text: 'Extension Component Data Model'
                }
            ],
            user: [
                {
                    id: 'home',
                    href: 'eInvoicingSpecificationRegistry.html',
                    icon: 'fa-solid fa-house',
                    text: 'eInvoicing Specification Registry'
                },
                {
                    id: 'mySpecs',
                    href: 'mySpecifications.html',
                    icon: 'fa-solid fa-folder',
                    text: 'My Specifications'
                },
                {
                    id: 'coreInvoiceRead',
                    href: 'coreInvoiceModelRead.html',
                    icon: 'fa-solid fa-car',
                    text: 'Core Invoice Model'
                },
                {
                    id: 'extensionRead',
                    href: 'ExtensionComponentDataModelRead.html',
                    icon: 'fa-solid fa-trailer',
                    text: 'Extension Component Data Model'
                }
            ],
            admin: [
                {
                    id: 'home',
                    href: 'eInvoicingSpecificationRegistry.html',
                    icon: 'fa-solid fa-house',
                    text: 'eInvoicing Specification Registry'
                },
                {
                    id: 'governingEntities',
                    href: 'governingEntityList.html',
                    icon: 'fa-solid fa-building',
                    text: 'Governing Entities'
                },
                {
                    id: 'mySpecs',
                    href: 'mySpecifications.html',
                    icon: 'fa-solid fa-folder',
                    text: 'My Specifications'
                },
                {
                    id: 'coreInvoiceRead',
                    href: 'coreInvoiceModelRead.html',
                    icon: 'fa-solid fa-car',
                    text: 'Core Invoice Model'
                },
                {
                    id: 'extensionRead',
                    href: 'ExtensionComponentDataModelRead.html',
                    icon: 'fa-solid fa-trailer',
                    text: 'Extension Component Data Model'
                }
            ]
        };
    }

    // Get the appropriate menu configuration based on user role
    getMenuConfig(userRole) {
        const role = userRole ? userRole.toLowerCase() : 'guest';
        return this.menuConfigs[role] || this.menuConfigs.guest;
    }

    // Generate the sidebar HTML
    generateSidebar(authManager) {
        const currentUser = getCurrentUser(authManager);
        const userRole = currentUser.isAuthenticated ? currentUser.role : 'Guest';
        const menuItems = this.getMenuConfig(userRole);

        // Determine the correct path for images based on current location
        const imagePath = window.location.pathname.includes('/HTML/') ? '../Images/genericLogo.png' : 'Images/genericLogo.png';

        let sidebarHTML = `
            <div class="sidebar">
                <ul>
                    <li>
                        <a class="logo">
                            <span class="icon">
                                <img src="${imagePath}" alt="Sidebar Logo" style="width: 40px; height: 40px;">
                            </span>
                            <span class="text">Registry Services</span>
                        </a>
                    </li>`;

        // Add menu items
        menuItems.forEach(item => {
            sidebarHTML += `
                    <li>
                        <a href="${item.href}">
                            <span class="icon"><i class="${item.icon}"></i></span>
                            <span class="text">${item.text}</span>
                        </a>
                    </li>`;
        });

        // Add login/logout button
        const isLoggedIn = currentUser.isAuthenticated;
        const loginText = isLoggedIn ? 'Logout' : 'Login';
        const loginAction = isLoggedIn ? 'logout()' : 'showLoginForm()';
        
        console.log('DEBUG: Generating login button - isLoggedIn:', isLoggedIn, 'action:', loginAction);
        
        sidebarHTML += `
                    <li id="loginLogoutItem">
                        <a href="#" onclick="${loginAction}">
                            <span class="icon"><i class="fa-solid fa-right-from-bracket"></i></span>
                            <span class="text" id="loginLogoutButton">${loginText}</span>
                        </a>
                    </li>
                </ul>
            </div>`;

        return sidebarHTML;
    }

    // Update the sidebar in the current page
    updateSidebar(authManager) {
        let existingSidebar = document.querySelector('.sidebar');
        if (existingSidebar) {
            const newSidebarHTML = this.generateSidebar(authManager);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newSidebarHTML;
            const newSidebar = tempDiv.querySelector('.sidebar');
            existingSidebar.parentNode.replaceChild(newSidebar, existingSidebar);
            console.log('[DEBUG] Sidebar replaced in DOM');
        } else {
            // Sidebar does not exist, create and insert it at the start of body
            const newSidebarHTML = this.generateSidebar(authManager);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newSidebarHTML;
            const newSidebar = tempDiv.querySelector('.sidebar');
            if (newSidebar) {
                document.body.insertBefore(newSidebar, document.body.firstChild);
                console.log('[DEBUG] Sidebar created and inserted in DOM');
            } else {
                console.warn('[DEBUG] Sidebar HTML generated but .sidebar not found in tempDiv');
            }
        }
    }

    // Initialize sidebar on page load
    initializeSidebar(authManager) {
        console.log('[DEBUG] sidebarManager.initializeSidebar called');
        const sidebarContainer = document.getElementById('sidebarContainer');
        if (sidebarContainer) {
            console.log('[DEBUG] #sidebarContainer found, injecting sidebar HTML');
            sidebarContainer.innerHTML = this.generateSidebar(authManager);
        } else {
            console.log('[DEBUG] #sidebarContainer NOT found, calling updateSidebar');
            this.updateSidebar(authManager);
        }
        // Check if sidebar is present in DOM after rendering
        const sidebarEl = document.querySelector('.sidebar');
        if (sidebarEl) {
            console.log('[DEBUG] Sidebar element found in DOM:', sidebarEl);
        } else {
            console.warn('[DEBUG] Sidebar element NOT found in DOM');
        }
    }
}

// Global functions for login/logout actions
function showLoginForm() {
    console.log('showLoginForm called');
    let modal = document.getElementById('loginModal');
    if (modal) {
        console.log('Modal found, showing it');
        modal.style.display = 'block';
    } else {
        console.log('Modal not found, creating it');
        createLoginModal();
        // Get the modal reference after creation and show it immediately
        modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    // Focus on the username field if modal exists
    if (modal) {
        const usernameField = modal.querySelector('#username');
        if (usernameField) {
            setTimeout(() => usernameField.focus(), 100);
        }
    }
}

function createLoginModal() {
    const modalHTML = `
        <div id="loginModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Login</h2>
                    <span class="close" onclick="closeLoginModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="loginForm" onsubmit="handleLogin(event)">
                        <div class="form-group">
                            <label for="username">Username:</label>
                            <input type="text" id="username" name="username" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Password:</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <div class="form-group">
                            <button type="submit">Login</button>
                            <button type="button" onclick="closeLoginModal()">Cancel</button>
                        </div>
                        <div id="loginError" class="error-message" style="display: none;"></div>
                    </form>
                    <div class="demo-section">
                        <h4>Demo Logins:</h4>
                        <button type="button" onclick="demoLogin('edmund', 'User')" class="demo-button">
                            Login as Edmund (User)
                        </button>
                        <button type="button" onclick="demoLogin('admin', 'Admin')" class="demo-button">
                            Login as Admin
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal after it's been added to the DOM
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
        console.log('Modal created and shown');
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Demo login logic - in production this would call an API
    let userRole = 'User';
    
    if ((username.toLowerCase() === 'admin' && password === 'admin') || 
        (username.toLowerCase() === 'admin' && password === 'Password123')) {
        userRole = 'Admin';
    } else if (username.toLowerCase() === 'edmund' && password === 'edmund') {
        userRole = 'User';
    } else {
        // Show error for invalid credentials
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = 'Invalid username or password';
        errorDiv.style.display = 'block';
        return;
    }

    // Simulate successful login
    performLogin(username, userRole);
    closeLoginModal();

    // Debug pause: show a message and button before redirect
    const pauseDiv = document.createElement('div');
    pauseDiv.id = 'loginDebugPause';
    pauseDiv.style.position = 'fixed';
    pauseDiv.style.top = '0';
    pauseDiv.style.left = '0';
    pauseDiv.style.width = '100vw';
    pauseDiv.style.height = '100vh';
    pauseDiv.style.background = 'rgba(0,0,0,0.5)';
    pauseDiv.style.display = 'flex';
    pauseDiv.style.flexDirection = 'column';
    pauseDiv.style.justifyContent = 'center';
    pauseDiv.style.alignItems = 'center';
    pauseDiv.style.zIndex = '10000';
    pauseDiv.innerHTML = `
        <div style="background: #fff; padding: 32px 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); text-align: center;">
            <div style="color: #d9534f; font-weight: bold; font-size: 1.2rem;">Paused for debug: Check the console and storage now.</div>
            <button id="continueLoginBtn" style="margin-top: 24px; padding: 10px 28px; font-size: 1rem; background: #09f; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Continue to Application</button>
        </div>
    `;
    document.body.appendChild(pauseDiv);
    document.getElementById('continueLoginBtn').onclick = function() {
        pauseDiv.remove();
        window.location.href = 'eInvoicingSpecificationRegistry.html';
    };
}

function demoLogin(username, role) {
    performLogin(username, role);
    closeLoginModal();

    // Debug pause: show a message and button before redirect
    const pauseDiv = document.createElement('div');
    pauseDiv.id = 'loginDebugPause';
    pauseDiv.style.position = 'fixed';
    pauseDiv.style.top = '0';
    pauseDiv.style.left = '0';
    pauseDiv.style.width = '100vw';
    pauseDiv.style.height = '100vh';
    pauseDiv.style.background = 'rgba(0,0,0,0.5)';
    pauseDiv.style.display = 'flex';
    pauseDiv.style.flexDirection = 'column';
    pauseDiv.style.justifyContent = 'center';
    pauseDiv.style.alignItems = 'center';
    pauseDiv.style.zIndex = '10000';
    pauseDiv.innerHTML = `
        <div style="background: #fff; padding: 32px 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); text-align: center;">
            <div style="color: #d9534f; font-weight: bold; font-size: 1.2rem;">Paused for debug: Check the console and storage now.</div>
            <button id="continueLoginBtn" style="margin-top: 24px; padding: 10px 28px; font-size: 1rem; background: #09f; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Continue to Application</button>
        </div>
    `;
    document.body.appendChild(pauseDiv);
    document.getElementById('continueLoginBtn').onclick = function() {
        pauseDiv.remove();
        window.location.href = 'eInvoicingSpecificationRegistry.html';
    };
}

function performLogin(username, role) {
    // Update AuthManager
    window.authManager.isAuthenticated = true;
    window.authManager.username = username;
    window.authManager.userRole = role;
    window.authManager.userID = role === 'Admin' ? 1 : 2;
    window.authManager.userGroupID = role === 'Admin' ? 1 : 2; // Demo group IDs
    window.authManager.groupName = role === 'Admin' ? 'Admin Group' : 'Default Group';
    window.authManager.accessToken = 'demo-token-' + Date.now();

    // Update localStorage
    localStorage.setItem('access_token', window.authManager.accessToken);
    localStorage.setItem('userRole', role);
    localStorage.setItem('username', username);
    localStorage.setItem('userId', window.authManager.userID.toString());
    localStorage.setItem('userGroupID', window.authManager.userGroupID.toString());
    localStorage.setItem('groupName', window.authManager.groupName);

    // Update sidebar
    window.sidebarManager.updateSidebar(window.authManager);
    
    // Update user display if function exists
    if (typeof updateUserDisplay === 'function') {
        updateUserDisplay();
    }

    // Update legacy visibility if function exists
    if (typeof updateVisibility === 'function') {
        updateVisibility();
    }

    console.log('User logged in:', { username, role, userGroupID: window.authManager.userGroupID });
}

function logout() {
    console.log('logout called');
    // Clear AuthManager
    window.authManager.logout();
    
    // Update sidebar
    window.sidebarManager.updateSidebar(window.authManager);
    
    // Update user display if function exists
    if (typeof updateUserDisplay === 'function') {
        updateUserDisplay();
    }

    // Update legacy visibility if function exists
    if (typeof updateVisibility === 'function') {
        updateVisibility();
    }

    console.log('User logged out');
    // Redirect to main registry page after logout
    window.location.href = 'eInvoicingSpecificationRegistry.html';
}

// Create global sidebar manager instance
window.sidebarManager = new SidebarManager();
console.log('SidebarManager initialized:', window.sidebarManager);

// Test function for debugging
window.testLogin = function() {
    console.log('Test login function called');
    showLoginForm();
};

// Reset function to clear all localStorage and test fresh state
window.resetAuth = function() {
    console.log('Clearing all authentication data');
    
    // Clear localStorage
    const authKeys = ['access_token', 'userRole', 'username', 'userId', 'userGroupID', 'groupName'];
    authKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            console.log(`Removing ${key} from localStorage`);
            localStorage.removeItem(key);
        }
    });
    
    // Reset AuthManager
    window.authManager.logout();
    
    // Update sidebar
    window.sidebarManager.updateSidebar(window.authManager);
    
    // Update user display if available
    if (typeof updateUserDisplay === 'function') {
        updateUserDisplay();
    }
    
    // Update legacy visibility if available
    if (typeof updateVisibility === 'function') {
        updateVisibility();
    }
    
    console.log('Authentication reset complete - user should now see "Login" button');
    alert('Authentication reset! You should now see a "Login" button in the sidebar.');
};
