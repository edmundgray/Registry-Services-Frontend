/******************************************************************************
    Log in/out functionality
    General
 ******************************************************************************/
let loggedInStatus = !!localStorage.getItem('userRole');
console.log("Page load: User is " + (loggedInStatus ? "logged in" : "logged out"));

function toggleLogin() 
{
    loggedInStatus = !loggedInStatus;
    if (loggedInStatus) {
        localStorage.setItem('userRole', 'admin'); // Set as admin for testing
    } else {
        localStorage.removeItem('userRole');
    }
    updateVisibility();
    
    // Refresh the table to update highlighting
    if (typeof filteredData !== 'undefined' && filteredData.length > 0) {
        populateTable(filteredData);
    }
    
    console.log("Button pressed: User is " + (loggedInStatus ? "logged in" : "logged out"));
}

function updateVisibility() 
{
    document.querySelectorAll(".protected").forEach(item => 
    {
        item.style.display = loggedInStatus ? "block" : "none";
    });

    document.getElementById("loginLogoutButton").innerText = loggedInStatus ? "Logout" : "Login";

    const coreInvoiceModel = document.querySelector("a[href='coreInvoiceModel.html']").parentElement;
    const extensionComponent = document.querySelector("a[href='ExtensionComponentDataModel.html']").parentElement;

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
let currentPage = 1;
let rowsPerPage = 10;
let filteredData = [];

document.addEventListener("DOMContentLoaded", function () 
{
    updateVisibility();

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

    // Comment out Extension Component filter - will be part of Advanced search instead
    /*
    // Populate the extensionComponentFilter dropdown
    const extensionComponentFilter = document.getElementById("extensionComponentFilter");

    // Adding the default "All Components" option
    const defaultExtensionOption = document.createElement("option");
    defaultExtensionOption.value = "";
    defaultExtensionOption.textContent = "All Components";
    extensionComponentFilter.appendChild(defaultExtensionOption);

    // Fetch Extension Components with a single request for all entries
    async function fetchExtensionComponents() {
        const baseUrl = "https://registryservices-staging.azurewebsites.net/api/extensionmodels/headers";
        const response = await fetch(`${baseUrl}?page=1&pageSize=12`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data);

        // Return the items directly
        return data.items;
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
    */

/***********************************************************************
    Original Data for the table
 ******************************************************************************/
    let originalData = [];
    let filteredData = [];

    const rowsPerPageSelect = document.getElementById("rowsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const firstPageButton = document.getElementById("firstPage");
    const lastPageButton = document.getElementById("lastPage");
    const pageNumbersDiv = document.getElementById("pageNumbers");

    // Rows per page select
    rowsPerPageSelect.addEventListener("change", function () 
    {
        rowsPerPage = parseInt(this.value, 10);
        currentPage = 1;
        applyFilters();
    });

    // First Page Button
    firstPageButton.addEventListener("click", function () 
    {
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
    });

    // Last Page Button
    lastPageButton.addEventListener("click", function () 
    {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        currentPage = totalPages;
        applyFilters();
    });    // Fetch the data and populate the table
    fetch("../JSON/mockData.json")
        .then(response => response.json())
        .then(data => 
        {
            originalData = data;
            filteredData = data;
            populateTable(filteredData);
        })
        .catch(error => console.error("Error loading JSON:", error));

    // Add event listeners for the filters
    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.getElementById("typeFilter").addEventListener("change", applyFilters);
    document.getElementById("sectorFilter").addEventListener("change", applyFilters);
    document.getElementById("countryFilter").addEventListener("change", applyFilters);
    // Comment out Extension Component filter - will be part of Advanced search instead
    // document.getElementById("extensionComponentFilter").addEventListener("change", applyFilters);    // Populating the table
    function populateTable(data) 
    {
        const table = document.getElementById("myTable");
        table.innerHTML = "";

        if (data.length > 0) 
        {
            const headerRow = table.insertRow(0);
            
            // Define the desired column order
            const columnOrder = [
                "Modified Date",
                "Name", 
                "Purpose", 
                "Implementation Date",
                "Type", 
                "Sector", 
                "Country", 
                "Preferred Syntax", 
                "Registry Status",
                "Governing Entity", 
                // "Extension Component", // Commented out - will be part of Advanced search instead
                "Conformance Level", 
                "View"
            ];

            // Filter headers to only include those that exist in data and are in our desired order
            const headers = columnOrder.filter(header => 
                data[0].hasOwnProperty(header) || header === "Modified Date"
            );

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
                  // Add styling for Submitted rows if user is logged in admin
                const userRole = localStorage.getItem('userRole');
                if (loggedInStatus && userRole === 'admin' && entry["Registry Status"] === "Submitted") {
                    row.style.backgroundColor = "#ffeb3b"; // Yellow highlight for submitted rows
                    row.style.fontWeight = "bold";
                }

                headers.forEach(header => 
                {
                    const cell = row.insertCell(-1);

                    if (header === "Modified Date") {
                        // Use Implementation Date as Modified Date for now
                        cell.textContent = entry["Implementation Date"] || "N/A";
                    } else if (header === "Sector") {
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
        }        const totalPages = Math.ceil(data.length / rowsPerPage);
        
        updatePaginationControls(totalPages);
    }    // Function to update pagination controls with numbered buttons
    function updatePaginationControls(totalPages) {
        console.log(`Updating pagination controls: currentPage=${currentPage}, totalPages=${totalPages}`);
        
        // Update navigation button states
        firstPageButton.disabled = currentPage === 1;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
        lastPageButton.disabled = currentPage === totalPages;

        // Update page info display
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo && filteredData.length > 0) {
            const start = (currentPage - 1) * rowsPerPage + 1;
            const end = Math.min(currentPage * rowsPerPage, filteredData.length);
            pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${start}-${end} of ${filteredData.length} items)`;
        }

        // Clear existing page numbers
        console.log('Clearing existing page numbers');
        pageNumbersDiv.innerHTML = '';

        if (totalPages <= 1) return;

        // Calculate which page numbers to show
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        // Adjust range if we're near the beginning or end
        if (currentPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        if (currentPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
        }

        // Add first page if not already shown
        if (startPage > 1) {
            addPageButton(1);
            if (startPage > 2) {
                addEllipsis();
            }
        }

        // Add page numbers in range
        for (let i = startPage; i <= endPage; i++) {
            addPageButton(i);
        }

        // Add last page if not already shown
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                addEllipsis();
            }
            addPageButton(totalPages);
        }
    }    // Function to add a page number button
    function addPageButton(pageNum) {
        const button = document.createElement('button');
        button.className = 'page-number';
        button.textContent = pageNum;
        
        console.log(`Adding page button ${pageNum}, current page is ${currentPage}`);
        
        if (pageNum === currentPage) {
            button.classList.add('active');
            console.log(`Added active class to page ${pageNum}`);
        }
        
        button.addEventListener('click', () => {
            console.log(`Page ${pageNum} clicked, changing from page ${currentPage}`);
            currentPage = pageNum;
            applyFilters();
        });
        
        pageNumbersDiv.appendChild(button);
    }// Function to add ellipsis
    function addEllipsis() {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-number ellipsis';
        ellipsis.textContent = '...';
        pageNumbersDiv.appendChild(ellipsis);
    }

    // Apply the filters
    function applyFilters() 
    {
        const searchText = document.getElementById("searchInput").value.toLowerCase();
        const typeFilter = document.getElementById("typeFilter").value;
        const sectorFilter = document.getElementById("sectorFilter").value;
        const countryFilter = document.getElementById("countryFilter").value;
        // Comment out Extension Component filter - will be part of Advanced search instead
        // const extensionComponentFilter = document.getElementById("extensionComponentFilter").value;

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
            // Comment out Extension Component filter - will be part of Advanced search instead
            // const matchesExtensionComponent =
            //     extensionComponentFilter === "" || entry["Extension Component"] === extensionComponentFilter;

            return matchesSearch && matchesType && matchesSector && matchesCountry;
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
}); // <-- End of DOMContentLoaded

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
        }
    });
}

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