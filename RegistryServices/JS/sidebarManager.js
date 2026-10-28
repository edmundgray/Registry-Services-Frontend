// SPDX-FileCopyrightText: 2025 CEN - European Committee for Standardization
// SPDX-License-Identifier: EUPL-1.2
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
                },
                {
                    id: 'signUp',
                    href: '#',
                    icon: 'fa-solid fa-user-plus',
                    text: 'Sign Up',
                    onclick: 'showSignUpModal()'
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
            const onclickAttr = item.onclick ? `onclick="${item.onclick}"` : '';
            sidebarHTML += `
                    <li>
                        <a href="${item.href}" ${onclickAttr}>
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
