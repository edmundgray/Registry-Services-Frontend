/******************************************************************************
    JWT-based Authentication System
    Replaces the simple localStorage login/logout functionality
 ******************************************************************************/

// Simplified configuration for prototype
const AUTH_CONFIG = {
    baseUrl: 'https://registryservices-staging.azurewebsites.net/api',
    endpoints: {
        login: '/auth/login'
        // logout: '/auth/logout'  // Not available yet
        // refresh: '/auth/refresh'  // Not needed for prototype
    },
    tokenKeys: {
        access: 'access_token'
    },
    // Simple session configuration for prototype
    session: {
        // Keep session for 1 hour (matches JWT expiration)
        duration: 60 * 60 * 1000, // 1 hour in milliseconds
        // Show warning 5 minutes before expiration
        warningTime: 5 * 60 * 1000 // 5 minutes in milliseconds
    }
};

// Authentication state management
class AuthManager {    constructor() {
        this.isAuthenticated = false;
        this.userRole = null;
        this.userID = null;
        this.username = null;
        this.accessToken = null;
        this.init();
    }

    init() {
        // Check for existing tokens on page load
        this.loadTokensFromStorage();
        this.validateTokens();
    }    loadTokensFromStorage() {
        this.accessToken = localStorage.getItem(AUTH_CONFIG.tokenKeys.access);
        this.userID = localStorage.getItem('userID');
        this.username = localStorage.getItem('username');
        this.userRole = localStorage.getItem('userRole');
        
        if (this.accessToken) {
            try {
                const payload = this.parseJWT(this.accessToken);
                this.isAuthenticated = !this.isTokenExpired(payload);
                
                // If token is valid but we don't have user data, parse from token
                if (this.isAuthenticated && !this.userRole) {
                    this.userRole = payload.role;
                    this.userID = payload.nameid;
                    this.username = payload.unique_name;
                }
            } catch (error) {
                console.error('Invalid token format:', error);
                this.clearTokens();
            }
        }
    }

    parseJWT(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    isTokenExpired(payload) {
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime;
    }    async login(username, password) {
        try {
            console.log('Attempting login for user:', username);
            
            const response = await fetch(`${AUTH_CONFIG.baseUrl}${AUTH_CONFIG.endpoints.login}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'text/plain'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
              // Store token and user data (simplified for prototype)
            this.accessToken = data.token;
            this.userID = data.userID;
            this.username = data.username;
            this.userRole = data.role;
            this.isAuthenticated = true;

            if (!this.accessToken) {
                throw new Error('No access token received from server');
            }

            // Store in localStorage (simplified)
            localStorage.setItem(AUTH_CONFIG.tokenKeys.access, this.accessToken);
            localStorage.setItem('userID', this.userID);
            localStorage.setItem('username', this.username);
            localStorage.setItem('userRole', this.userRole);

            console.log('Login successful. User:', {
                id: this.userID,
                username: this.username,
                role: this.userRole
            });

            return { 
                success: true, 
                user: { 
                    id: this.userID,
                    username: this.username,
                    role: this.userRole
                } 
            };

        } catch (error) {
            console.error('Login failed:', error);
            this.clearTokens();
            return { success: false, error: error.message };
        }
    }    async logout() {
        // Simple logout - just clear tokens (no API call needed for prototype)
        this.clearTokens();
        console.log('User logged out');
    }    clearTokens() {
        this.isAuthenticated = false;
        this.userRole = null;
        this.userID = null;
        this.username = null;
        this.accessToken = null;
        
        localStorage.removeItem(AUTH_CONFIG.tokenKeys.access);
        localStorage.removeItem('userID');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
    }async refreshAccessToken() {
        // This API doesn't provide refresh tokens
        // If needed in the future, implement based on API documentation
        throw new Error('Token refresh not supported by this API');
    }    validateTokens() {
        if (this.accessToken) {
            try {
                const payload = this.parseJWT(this.accessToken);
                const currentTime = Date.now() / 1000;
                const timeToExpiry = payload.exp - currentTime;
                
                if (this.isTokenExpired(payload)) {
                    console.log('Access token expired, user needs to login again');
                    this.clearTokens();
                    updateVisibility();
                    showMessage('Your session has expired. Please log in again.', 'error');
                } else if (timeToExpiry < (AUTH_CONFIG.session.warningTime / 1000)) {
                    // Show warning if token expires in less than 5 minutes
                    const minutesLeft = Math.floor(timeToExpiry / 60);
                    console.log(`Token expires in ${minutesLeft} minutes`);
                    if (minutesLeft > 0) {
                        showMessage(`Your session will expire in ${minutesLeft} minute(s). Please save your work.`, 'info');
                    }
                }
            } catch (error) {
                console.error('Token validation failed:', error);
                this.clearTokens();
            }
        }
    }

    getAuthHeaders() {
        if (!this.accessToken) {
            return {};
        }
        return {
            'Authorization': `Bearer ${this.accessToken}`
        };
    }
}

// Initialize auth manager
const authManager = new AuthManager();

/******************************************************************************
    Enhanced Authentication Functions
 ******************************************************************************/

// Updated login function for demo purposes (Admin/Password123)
async function demoLogin() {
    const result = await authManager.login('Admin', 'Password123');
    
    if (result.success) {
        loggedInStatus = true;
        updateVisibility();
        showMessage(`Welcome ${result.user.username}! Role: ${result.user.role}`, 'success');
    } else {
        showMessage(`Login failed: ${result.error}`, 'error');
    }
}

// Generic login function
async function loginUser(username, password) {
    const result = await authManager.login(username, password);
    
    if (result.success) {
        loggedInStatus = true;
        updateVisibility();
        return result;
    } else {
        throw new Error(result.error);
    }
}

// Helper function to show messages to user
function showMessage(message, type = 'info') {
    // Create a simple message display
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        color: white;
        z-index: 1000;
        background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;
    
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 3000);
}

// Enhanced fetch function with method-based authentication
async function authenticatedFetch(url, options = {}) {
    const method = options.method || 'GET';
    const requiresAuth = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
    
    // For prototype: GETs are public, POST/PUT/DELETE require login
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'accept': 'text/plain',
            ...options.headers
        }
    };
    
    // Add auth headers only for methods that require authentication
    if (requiresAuth) {
        if (!authManager.isAuthenticated) {
            showMessage('Please log in to perform this action', 'error');
            throw new Error('Authentication required for this action');
        }
        
        const authHeaders = authManager.getAuthHeaders();
        config.headers = {
            ...config.headers,
            ...authHeaders
        };
    }

    try {
        let response = await fetch(url, config);
        
        // Handle different error scenarios
        if (!response.ok) {
            if (response.status === 401) {
                console.warn('Received 401 - authentication required or token expired');
                authManager.clearTokens();
                loggedInStatus = false;
                updateVisibility();
                showMessage('Session expired. Please log in again.', 'error');
                throw new Error('Authentication failed - please log in again');
            } else if (response.status >= 500) {
                showMessage('Server error. Please try again shortly.', 'error');
                throw new Error('Server is temporarily unavailable');
            } else if (response.status === 404) {
                throw new Error('Requested resource not found');
            } else {
                throw new Error(`Request failed with status: ${response.status}`);
            }
        }
        
        return response;
        
    } catch (error) {
        // Handle network errors (API down)
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            showMessage('Unable to connect to server. Please check your connection and try again shortly.', 'error');
            throw new Error('Network error - server may be down');
        }
        throw error;
    }
}

/******************************************************************************
    Log in/out functionality (Legacy compatibility)
    General
 ******************************************************************************/
let loggedInStatus = authManager.isAuthenticated;
console.log("Page load: User is " + (loggedInStatus ? "logged in" : "logged out"));

// Updated toggle function to use new authentication system
async function toggleLogin() {
    if (authManager.isAuthenticated) {
        await authManager.logout();
        loggedInStatus = false;
        updateVisibility();
        showMessage('Logged out successfully', 'info');
        console.log("User logged out");
    } else {
        showLoginModal();
    }
}

function updateVisibility() 
{
    // Use the new role-based visibility function
    updateVisibilityWithRoles();
}

/******************************************************************************
    1/2 Country and Extension Component Dropdown Population
 ******************************************************************************/
let currentPage = 1;
let rowsPerPage = 10;
let filteredData = [];

document.addEventListener("DOMContentLoaded", function () 
{
    updateVisibility();
    createLoginModal();

    // Populate the country dropdown
    const countryFilter = document.getElementById("countryFilter");
    const countries = [
        // European Union (EU)
        { name: "Belgium", code: "BE" },
        { name: "Bulgaria", code: "BG" },
        { name: "Czechia", code: "CZ" },
        { name: "Denmark", code: "DK" },
        { name: "Germany", code: "DE" },
        { name: "Estonia", code: "EE" },
        { name: "Ireland", code: "IE" },
        { name: "Greece", code: "EL" },
        { name: "Spain", code: "ES" },
        { name: "France", code: "FR" },
        { name: "Croatia", code: "HR" },
        { name: "Italy", code: "IT" },
        { name: "Cyprus", code: "CY" },
        { name: "Latvia", code: "LV" },
        { name: "Lithuania", code: "LT" },
        { name: "Luxembourg", code: "LU" },
        { name: "Hungary", code: "HU" },
        { name: "Malta", code: "MT" },
        { name: "Netherlands", code: "NL" },
        { name: "Austria", code: "AT" },
        { name: "Poland", code: "PL" },
        { name: "Portugal", code: "PT" },
        { name: "Romania", code: "RO" },
        { name: "Slovenia", code: "SI" },
        { name: "Slovakia", code: "SK" },
        { name: "Finland", code: "FI" },
        { name: "Sweden", code: "SE" },

        // European Free Trade Association (EFTA)
        { name: "Iceland", code: "IS" },
        { name: "Norway", code: "NO" },
        { name: "Liechtenstein", code: "LI" },
        { name: "Switzerland", code: "CH" }
    ];

    // Add the default "All Countries" option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All Countries";
    countryFilter.appendChild(defaultOption);

    // Add the countries as options
    countries.forEach(country => 
    {
        const option = document.createElement("option");
        option.value = country.code;
        option.textContent = `${country.name} (${country.code})`;
        countryFilter.appendChild(option);
    });

/******************************************************************************
    2/2 Country and Extension Component Dropdown Population
 ******************************************************************************/

    // Populate the extensionComponentFilter dropdown
    const extensionComponentFilter = document.getElementById("extensionComponentFilter");

    // Adding the default "All Components" option
    const defaultExtensionOption = document.createElement("option");
    defaultExtensionOption.value = "";
    defaultExtensionOption.textContent = "All Components";
    extensionComponentFilter.appendChild(defaultExtensionOption);    // Fetch Extension Components (public GET - no auth needed)
    async function fetchExtensionComponents() {
        try {
            const baseUrl = "https://registryservices-staging.azurewebsites.net/api/extensionmodels/headers";
            const response = await authenticatedFetch(`${baseUrl}?page=1&pageSize=12`, {
                method: 'GET' // Explicitly specify GET method for clarity
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("API Response:", data);

            // Return the items directly
            return data.items;
        } catch (error) {
            console.error("Error fetching Extension Components:", error);
            // Error message already handled by authenticatedFetch
            throw error;
        }
    }

    // Populate the dropdown with fetched data
    fetchExtensionComponents()
        .then(extensionComponents => {
            extensionComponents.forEach(component => {
                const option = document.createElement("option");
                option.value = component.id;
                option.textContent = `${component.id} ${component.name.trim()}`;
                extensionComponentFilter.appendChild(option);
            });
        })
        .catch(error => console.error("Error fetching Extension Components:", error));

/***********************************************************************
    API Data Loading for Specifications Table
    Replaces mockData.json with live API endpoint
 ******************************************************************************/

    // Fallback data for when API is unavailable
    let originalData = 
    [{
            "Name": "RetailConnect Billing Rules",
            "Purpose": "Groups invoice lines and adds settlement plans",
            "Type": "Extension",
            "Sector": "Retail Trade",
            "Country": "NL",
            "Implementation Date": "18/11/2024",
            "Preferred Syntax": "UBL",
            "Governing Entity": "Retail Invoice Group",
            "Extension Component": "urn:cen.eu:en16931:2025#conformant#urn:45614.com:22813",
            "Conformance Level": "Core Conformant",
            "View": "View"
    }];

    const rowsPerPageSelect = document.getElementById("rowsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const currentPageSpan = document.getElementById("currentPage");

    // Rows per page select
    rowsPerPageSelect.addEventListener("change", function () 
    {
        rowsPerPage = parseInt(this.value, 10);
        currentPage = 1;
        applyFilters();
    });

    // Previous Button
    prevPageButton.addEventListener("click", function () 
    {
        if (currentPage > 1) 
        {
            currentPage--;
            applyFilters();
        }
    });

    // Next Button
    nextPageButton.addEventListener("click", function () 
    {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) 
        {
            currentPage++;
            applyFilters();
        }
    });    // Fetch the data from API and populate the table
    async function loadSpecificationsData() {
        try {
            const response = await authenticatedFetch(
                'https://registryservices-staging.azurewebsites.net/api/specifications?PageNumber=1&PageSize=50',
                {
                    method: 'GET'
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const apiData = await response.json();
            console.log("API Response:", apiData);
            
            // Map API response to expected table format
            const mappedData = apiData.items.map(item => ({
                "Name": item.specificationName,
                "Purpose": item.purpose,
                "Type": item.specificationType,
                "Sector": item.sector,
                "Country": item.country,
                "Implementation Date": new Date(item.dateOfImplementation).toLocaleDateString('en-GB'),
                "Preferred Syntax": item.preferredSyntax,
                "Governing Entity": item.governingEntity,
                "Extension Component": item.specificationIdentifier, // Using identifier as extension component
                "Conformance Level": item.conformanceLevel,
                "View": "View"
            }));
            
            originalData = mappedData;
            filteredData = mappedData;
            populateTable(filteredData);
            
        } catch (error) {
            console.error("Error loading specifications data:", error);
            // Fallback to hardcoded data if API fails
            console.log("Falling back to hardcoded data");
            filteredData = originalData; // Use the hardcoded fallback data
            populateTable(filteredData);
        }
    }
    
    // Load specifications data
    loadSpecificationsData();

    // Add event listeners for the filters
    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.getElementById("typeFilter").addEventListener("change", applyFilters);
    document.getElementById("sectorFilter").addEventListener("change", applyFilters);
    document.getElementById("countryFilter").addEventListener("change", applyFilters);
    document.getElementById("extensionComponentFilter").addEventListener("change", applyFilters);

    // Populating the table
    function populateTable(data) 
    {
        const table = document.getElementById("myTable");
        table.innerHTML = "";

        if (data.length > 0) 
        {
            const headerRow = table.insertRow(0);
            const headers = Object.keys(data[0]).filter(header => header !== "IDs");

            headers.forEach(header => 
            {
                const th = document.createElement("th");
                th.textContent = header;
                headerRow.appendChild(th);
            });

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, data.length);

            for (let i = startIndex; i < endIndex; i++) 
            {
                const entry = data[i];
                const row = table.insertRow(-1);

                headers.forEach(header => 
                {
                    const cell = row.insertCell(-1);

                    if (header === "Sector") {
                        // Map sector codes to full names
                        const sectorMapping = {
                            "A": "Agriculture, Forestry and Fishing",
                            "B": "Mining and Quarrying",
                            "C": "Manufacturing",
                            "D": "Electricity, Gas, Steam and Air Conditioning Supply",
                            "E": "Water Supply; Sewerage, Waste Management and Remediation Activities",
                            "F": "Construction",
                            "G": "Wholesale and Retail Trade; Repair of Motor Vehicles and Motorcycles",
                            "H": "Transportation and Storage",
                            "I": "Accommodation and Food Service Activities",
                            "J": "Information and Communication",
                            "K": "Financial and Insurance Activities",
                            "L": "Real Estate Activities",
                            "M": "Professional, Scientific and Technical Activities",
                            "N": "Administrative and Support Service Activities",
                            "O": "Public Administration and Defence; Compulsory Social Security",
                            "P": "Education",
                            "Q": "Human Health and Social Work Activities",
                            "R": "Arts, Entertainment and Recreation",
                            "S": "Other Service Activities",
                            "T": "Activities of Households as Employers; Undifferentiated Goods- and Services-Producing Activities of Households for Own Use",
                            "U": "Activities of Extraterritorial Organisations and Bodies"
                        };

                        cell.textContent = sectorMapping[entry[header]] || entry[header];
                    } else if (header === "View") {
                        const button = document.createElement("button");

                        button.textContent = "View";
                        button.className = "view-button";
                        button.addEventListener("click", () => {
                            const queryParams = new URLSearchParams(entry).toString();
                            window.location.href = `viewSpecification.html?${queryParams}`;
                        });

                        cell.appendChild(button);
                    } else {
                        cell.textContent = entry[header];
                    }
                });
            }
        }

        const totalPages = Math.ceil(data.length / rowsPerPage);
        
        currentPageSpan.textContent = currentPage;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    // Apply the filters
    function applyFilters() 
    {
        const searchText = document.getElementById("searchInput").value.toLowerCase();
        const typeFilter = document.getElementById("typeFilter").value;
        const sectorFilter = document.getElementById("sectorFilter").value;
        const countryFilter = document.getElementById("countryFilter").value;
        const extensionComponentFilter = document.getElementById("extensionComponentFilter").value;

        // Filter the data
        filteredData = originalData.filter(entry => 
        {
            const matchesSearch = Object.values(entry).some
            (
                value =>
                value.toString().toLowerCase().includes(searchText)
            );

            const sector = entry.Sector || "Other Service Activities";
            const matchesSector = sectorFilter === "" || sector === sectorFilter;

            const matchesType = typeFilter === "" || entry.Type === typeFilter;
            const matchesCountry = countryFilter === "" || entry.Country === countryFilter;
            const matchesExtensionComponent =
                extensionComponentFilter === "" || entry["Extension Component"] === extensionComponentFilter;

            return matchesSearch && matchesType && matchesSector && matchesCountry && matchesExtensionComponent;
        });

        // Re-populate the table with the new filtered data
        populateTable(filteredData);
    }

    function handleSaveAndRedirect() {
        // First confirmation alert
        const confirmation = confirm("You are about to save your work and move to the core invoice model page, are you sure?");
        if (!confirmation) {
            return; // Exit if the user selects "No"
        }

        // Gather form data
        const form = document.getElementById('identifyingForm');
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Second confirmation alert showing saved data
        const approval = confirm("Data saved:\n\n" + Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n') + "\n\nApprove?");
        if (!approval) {
            return; // Exit if the user selects "Deny"
        }

        // Redirect if both confirmations are approved
        alert("Data successfully saved!");
        window.location.href = 'coreInvoiceModel.html'; // Redirect to Core Invoice Model page
    }

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
                            <input type="text" id="username" name="username" required style="
                                width: 100%;
                                padding: 8px;
                                margin-top: 5px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                            ">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label for="password">Password:</label>
                            <input type="password" id="password" name="password" required style="
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
            } catch (error) {
                showMessage(`Login failed: ${error.message}`, 'error');
            }        });
    }
});

// Simplified role checking for prototype
function getCurrentUser() {
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
    const coreInvoiceModel = document.querySelector("a[href='coreInvoiceModel.html']")?.parentElement;
    const extensionComponent = document.querySelector("a[href='ExtensionComponentDataModel.html']")?.parentElement;

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

// Example function to get specifications (public access)
async function getSpecifications(page = 1, pageSize = 10) {
    try {
        const response = await authenticatedFetch(`/api/specifications?page=${page}&pageSize=${pageSize}`, {
            method: 'GET'
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Failed to fetch specifications:', error);
        throw error;
    }
}

async function fetchCoreInvoiceModels() {
    try {
        // Construct the full URL for the GET request
        const apiUrl = `${AUTH_CONFIG.baseUrl}/coreinvoicemodels`; // Uses the base URL from AUTH_CONFIG

        console.log(`Attempting to fetch data from: ${apiUrl}`);

        // Make the GET request using authenticatedFetch
        const response = await authenticatedFetch(apiUrl, {
            method: 'GET' // Explicitly set method to GET
        });

        // Check if the response was successful
        if (!response.ok) {
            // authenticatedFetch already handles common errors (401, 500, network errors)
            // You can add specific handling here if needed for other status codes
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        // Parse the JSON response
        const data = await response.json();
        console.log('Fetched Core Invoice Models:', data);

        // Here you would typically process the data
        // For example, populate a table, update UI elements, etc.
        // As seen in coreInvoiceModel.js and javascript.js, you would iterate over 'data.items' if the API returns a paginated result.
        // Example: populateTableWithData(data.items);

        return data;

    } catch (error) {
        console.error('Error fetching core invoice models:', error.message);
        // showMessage is already available for user-friendly notifications
        // showMessage(`Could not load core invoice models: ${error.message}`, 'error');
    }
}

// You can call this function when your page loads or when a user action triggers it
document.addEventListener("DOMContentLoaded", function() {
    fetchCoreInvoiceModels();
});

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