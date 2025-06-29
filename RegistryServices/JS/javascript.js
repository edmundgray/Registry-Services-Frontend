/******************************************************************************
    Log in/out functionality
    General
 ******************************************************************************/
let loggedInStatus = !!localStorage.getItem('userRole');
console.log("Page load: User is " + (loggedInStatus ? "logged in" : "logged out"));

function toggleLogin() 
{
    loggedInStatus = !loggedInStatus;
    if (loggedInStatus) 
    {
        localStorage.setItem('userRole', 'admin');
    } 
    else 
    {
        localStorage.removeItem('userRole');
    }
    updateVisibility();
    
    if (typeof filteredData !== 'undefined' && filteredData.length > 0) 
    {
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

    const coreInvoiceModel = document.querySelector("a[href='coreInvoiceModelRead.html']").parentElement;
    const extensionComponent = document.querySelector("a[href='ExtensionComponentDataModelRead.html']").parentElement;

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
    const countries = 
    [
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

/******************************************************************************
    API Functions for fetching data from backend
 ******************************************************************************/  
    // API base URL
    const API_BASE_URL = "https://registryservices-staging.azurewebsites.net/api";
    
    // Store total count for pagination
    let totalSpecifications = 0;
    
    // Fetch specifications from the API
    async function fetchSpecifications() 
    {
        try 
        {
            console.log("Fetching specifications from API...");
            const response = await fetch(`${API_BASE_URL}/specifications?PageNumber=${currentPage}&PageSize=${rowsPerPage}`);
            
            if (!response.ok) 
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API Response:", data);
            
            // Handle the response structure
            if (data.items && Array.isArray(data.items)) 
            {
                originalData = data.items;
                filteredData = data.items;

                // Check for total count in metadata first, then try other possible property names
                totalSpecifications = (data.metadata && data.metadata.totalCount) || 
                                      data.totalCount || data.TotalCount || data.total || data.Total || 
                                      data.count || data.Count || 0;
                console.log(`Loaded ${data.items.length} items, total: ${totalSpecifications}`);
                
                // If no total count in response, make a rough estimate based on current data
                if (totalSpecifications === 0 && data.items.length > 0) 
                {
                    totalSpecifications = Math.max(data.items.length, currentPage * rowsPerPage);
                    console.log(`No total count found, estimated: ${totalSpecifications}`);
                }
            } 
            else if (Array.isArray(data)) 
            {
                // Handle case where response is directly an array
                originalData = data;
                filteredData = data;
                totalSpecifications = data.length;
                console.log(`Loaded ${data.length} items (direct array)`);
            } 
            else 
            {
                // Unexpected response format
                console.warn("Unexpected API response format:", data);
                originalData = [];
                filteredData = [];
                totalSpecifications = 0;
            }
            
            populateTable(filteredData);
        }
        catch (error) 
        {
            console.error("Error fetching specifications:", error);
            alert("Failed to load specifications from the server. Please check your connection and try again.");
            // Fallback to empty data
            originalData = [];
            filteredData = [];
            totalSpecifications = 0;
            populateTable(filteredData);
        }
    }
    
    // Function to fetch specifications with filters
    async function fetchSpecificationsWithFilters() 
    {
        try 
        {
            const searchText = document.getElementById("searchInput").value;
            const typeFilter = document.getElementById("typeFilter").value;
            const sectorFilter = document.getElementById("sectorFilter").value;
            const countryFilter = document.getElementById("countryFilter").value;
            
            // Build query parameters
            const params = new URLSearchParams
            ({
                PageNumber: currentPage.toString(),
                PageSize: rowsPerPage.toString()
            });
            
            if (searchText.trim()) params.append('SearchTerm', searchText.trim());
            if (typeFilter) params.append('SpecificationType', typeFilter);
            if (sectorFilter) params.append('Sector', sectorFilter);
            if (countryFilter) params.append('Country', countryFilter);
            
            const url = `${API_BASE_URL}/specifications?${params.toString()}`;
            console.log("Fetching with URL:", url);
            
            const response = await fetch(url);
            
            if (!response.ok) 
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Filtered API Response:", data);
            
            // Handle the response structure
            if (data.items && Array.isArray(data.items)) 
            {
                filteredData = data.items;
                // Check for total count in metadata first, then try other possible property names
                totalSpecifications = (data.metadata && data.metadata.totalCount) || 
                                      data.totalCount || data.TotalCount || data.total || data.Total || 
                                      data.count || data.Count || 0;
                console.log(`Filtered to ${data.items.length} items, total: ${totalSpecifications}`);
                
                // If no total count in response, make a rough estimate based on current data
                if (totalSpecifications === 0 && data.items.length > 0) 
                {
                    totalSpecifications = Math.max(data.items.length, currentPage * rowsPerPage);
                    console.log(`No total count found, estimated: ${totalSpecifications}`);
                }
            } 
            else if (Array.isArray(data)) 
            {
                // Handle case where response is directly an array
                filteredData = data;
                totalSpecifications = data.length;
                console.log(`Filtered to ${data.length} items (direct array)`);
            } 
            else 
            {
                // Unexpected response format
                console.warn("Unexpected API response format:", data);
                filteredData = [];
                totalSpecifications = 0;
            }
            
            populateTable(filteredData);
        } 
        catch (error) 
        {
            console.error("Error fetching filtered specifications:", error);
            alert("Failed to filter specifications. Please try again.");
        }
    }

/******************************************************************************
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
        currentPage = 1; // Reset to first page
        console.log(`Rows per page changed to ${rowsPerPage}, resetting to page 1`);
        applyFilters();
    });

    // First Page Button
    firstPageButton.addEventListener("click", function (e) 
    {
        e.preventDefault();
        if (currentPage !== 1) {
            currentPage = 1;
            console.log("First page clicked, moving to page 1");
            applyFilters();
        }
    });

    // Previous Button
    prevPageButton.addEventListener("click", function (e) 
    {
        e.preventDefault();
        if (currentPage > 1) 
        {
            currentPage--;
            console.log(`Previous page clicked, moving to page ${currentPage}`);
            applyFilters();
        }
    });

    // Next Button
    nextPageButton.addEventListener("click", function (e) 
    {
        e.preventDefault();
        const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
        if (currentPage < totalPages) 
        {
            currentPage++;
            console.log(`Next page clicked, moving to page ${currentPage}`);
            applyFilters();
        }
    });

    // Last Page Button
    lastPageButton.addEventListener("click", function (e) 
    {
        e.preventDefault();
        const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
        if (currentPage !== totalPages && totalPages > 0) {
            currentPage = totalPages;
            console.log(`Last page clicked, moving to page ${currentPage}`);
            applyFilters();
        }
    });

    // Fetch the data from API and populate the table
    fetchSpecifications();

    // Add event listeners for the filters
    document.getElementById("searchInput").addEventListener("input", debounce(applyFilters, 300));
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
            
            // Define the desired column order with exact mappings to match the required layout
            const columnOrder = [
                "Created/Modified Date",
                "Name", 
                "Purpose", 
                "Implementation Date",
                "Type", 
                "Sector", 
                "Country", 
                "Preferred Syntax", 
                "Registry Status",
                "Governing Entity", 
                "Conformance Level", 
                "View"
            ];

            // Always include all columns since we want to show them even if empty
            const headers = columnOrder;

            headers.forEach(header => 
            {
                const th = document.createElement("th");
                th.textContent = header;
                headerRow.appendChild(th);
            });

            // For API data, we display all items in the current page data
            // since pagination is handled server-side
            for (let i = 0; i < data.length; i++) 
            {
                const entry = data[i];
                const row = table.insertRow(-1);
                  // Add styling for Submitted rows if user is logged in admin
                const userRole = localStorage.getItem('userRole');
                const registryStatus = getPropertyValue(entry, "Registry Status");
                if (loggedInStatus && userRole === 'admin' && registryStatus === "Submitted") {
                    row.style.backgroundColor = "#ffeb3b"; // Yellow highlight for submitted rows
                    row.style.fontWeight = "bold";
                }

                headers.forEach(header => 
                {
                    const cell = row.insertCell(-1);

                    if (header === "Created/Modified Date") {
                        // Format the created/modified date to show only the date part
                        const createdDate = getPropertyValue(entry, header);
                        if (createdDate) {
                            // Extract just the date part (YYYY-MM-DD) if it's in ISO format
                            const dateOnly = createdDate.includes('T') ? createdDate.split('T')[0] : createdDate;
                            cell.textContent = dateOnly;
                        } else {
                            cell.textContent = "N/A";
                        }
                    } else if (header === "Implementation Date") {
                        // Format the implementation date to show only the date part
                        const implDate = getPropertyValue(entry, header);
                        if (implDate) {
                            // Extract just the date part (YYYY-MM-DD) if it's in ISO format
                            const dateOnly = implDate.includes('T') ? implDate.split('T')[0] : implDate;
                            cell.textContent = dateOnly;
                        } else {
                            cell.textContent = "N/A";
                        }
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

                        const sectorValue = getPropertyValue(entry, header);
                        cell.textContent = sectorMapping[sectorValue] || sectorValue || "N/A";
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
                        const value = getPropertyValue(entry, header);
                        cell.textContent = value || "N/A";
                    }
                });
            }
        } 
        else 
        {
            // Show "No data" message when there are no results
            const noDataRow = table.insertRow(0);
            const noDataCell = noDataRow.insertCell(0);
            noDataCell.colSpan = 12; // Span all columns
            noDataCell.style.textAlign = "center";
            noDataCell.style.padding = "20px";
            noDataCell.style.fontStyle = "italic";
            noDataCell.style.color = "#666";
            noDataCell.textContent = "No specifications found matching your criteria.";
        }

        // Calculate total pages based on API total count, not current data length
        let totalPages = Math.ceil(totalSpecifications / rowsPerPage);
        
        // If totalSpecifications is 0 or unreliable, use estimation
        if (totalSpecifications === 0 || totalPages === 0) {
            totalPages = estimateTotalPages();
            console.log(`Using estimated totalPages: ${totalPages}`);
        }
        
        console.log(`Calculated totalPages: ${totalPages} (totalSpecifications: ${totalSpecifications}, rowsPerPage: ${rowsPerPage})`);
        
        updatePaginationControls(totalPages);
    }
    
    // Update the pagination controls with numbered buttons
    function updatePaginationControls(totalPages) 
    {
        console.log(`Updating pagination controls: currentPage=${currentPage}, totalPages=${totalPages}, totalSpecifications=${totalSpecifications}`);
        
        // Update navigation button states
        firstPageButton.disabled = currentPage === 1;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
        lastPageButton.disabled = currentPage === totalPages || totalPages === 0;

        // Update page info display
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo && totalSpecifications > 0) 
        {
            const start = (currentPage - 1) * rowsPerPage + 1;
            const end = Math.min(currentPage * rowsPerPage, totalSpecifications);
            pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${start}-${end} of ${totalSpecifications} items)`;
        } 
        else if (pageInfo) 
        {
            pageInfo.textContent = "No items found";
        }

        // Clear existing page numbers
        console.log('Clearing existing page numbers');
        pageNumbersDiv.innerHTML = '';

        // Always show page numbers, even if there's only 1 page
        if (totalPages === 0) return;

        // If only 1 page, just show "1"
        if (totalPages === 1) 
        {
            addPageButton(1);
            return;
        }

        // Calculate which page numbers to show for multiple pages
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        // Adjust range if we're near the beginning or end
        if (currentPage <= 3) 
        {
            endPage = Math.min(5, totalPages);
        }
        if (currentPage >= totalPages - 2) 
        {
            startPage = Math.max(1, totalPages - 4);
        }

        // Add first page if not already shown
        if (startPage > 1) 
        {
            addPageButton(1);
            if (startPage > 2) 
            {
                addEllipsis();
            }
        }

        // Add page numbers in range
        for (let i = startPage; i <= endPage; i++) 
        {
            addPageButton(i);
        }

        // Add last page if not already shown
        if (endPage < totalPages) 
        {
            if (endPage < totalPages - 1) 
            {
                addEllipsis();
            }
            addPageButton(totalPages);
        }
    }
    
    // Function to add a page number button
    function addPageButton(pageNum) 
    {
        const button = document.createElement('button');
        button.className = 'page-number';
        button.textContent = pageNum;
        button.type = 'button';
        
        console.log(`Adding page button ${pageNum}, current page is ${currentPage}`);
        
        if (pageNum === currentPage) 
        {
            button.classList.add('active');
            console.log(`Added active class to page ${pageNum}`);
        }
        
        button.addEventListener('click', (e) => 
        {
            e.preventDefault();
            console.log(`Page ${pageNum} clicked, changing from page ${currentPage}`);
            
            if (pageNum !== currentPage) 
            {
                currentPage = pageNum;
                console.log(`Current page changed to ${currentPage}, calling applyFilters`);
                applyFilters();
            }
        });
        
        pageNumbersDiv.appendChild(button);
    }
    
    // Function to add ellipsis
    function addEllipsis() 
    {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-number ellipsis';
        ellipsis.textContent = '...';
        pageNumbersDiv.appendChild(ellipsis);
    }

    // Apply the filters - now uses API instead of client-side filtering
    function applyFilters() 
    {
        console.log(`Applying filters, fetching from API - Page: ${currentPage}, PageSize: ${rowsPerPage}`);
        
        // Show loading state (optional)
        const table = document.getElementById("myTable");
        if (table) {
            table.innerHTML = "<tr><td colspan='12' style='text-align: center; padding: 20px;'>Loading...</td></tr>";
        }
        
        fetchSpecificationsWithFilters();
    }

    function handleSaveAndRedirect()
    {
        // First confirmation alert
        const confirmation = confirm("You are about to save your work and move to the core invoice model page, are you sure?");
        if (!confirmation) 
        {
            return; // Exit if the user selects "No"
        }

        // Gather form data
        const form = document.getElementById('identifyingForm');
        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => 
        {
            data[key] = value;
        });

        // Second confirmation alert showing saved data
        const approval = confirm("Data saved:\n\n" + Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n') + "\n\nApprove?");
        if (!approval) 
        {
            return; // Exit if the user selects "Deny"
        }

        // Redirect if both confirmations are approved
        alert("Data successfully saved!");
        window.location.href = 'coreInvoiceModel.html';
    }
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
}    // Helper function to safely get property value with API field mappings
    function getPropertyValue(obj, displayName) {
        // Map display names to API field names
        const fieldMappings = {
            "Created/Modified Date": "modifiedDate", // Use modifiedDate from API response
            "Name": "specificationName",
            "Purpose": "purpose", 
            "Type": "specificationType",
            "Sector": "sector",
            "Country": "country",
            "Implementation Date": "dateOfImplementation",
            "Preferred Syntax": "preferredSyntax",
            "Registry Status": "registrationStatus",
            "Governing Entity": "governingEntity",
            "Conformance Level": "conformanceLevel"
        };
        
        // Get the actual API field name
        const apiFieldName = fieldMappings[displayName];
        
        // If it's Extension Component, return empty string for now
        if (displayName === "Extension Component") {
            return "";
        }
        
        // Try the mapped field name first
        if (apiFieldName && obj.hasOwnProperty(apiFieldName)) {
            return obj[apiFieldName];
        }
        
        // Fallback: try the display name directly
        if (obj.hasOwnProperty(displayName)) {
            return obj[displayName];
        }
        
        // Try lowercase version
        const lowerName = displayName.toLowerCase();
        for (const key in obj) {
            if (key.toLowerCase() === lowerName) {
                return obj[key];
            }
        }
        
        // Return empty string if not found
        return "";
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
}    // Add event listener for New Specification button
    const newSpecificationButton = document.getElementById("newSpecificationButton");
    if (newSpecificationButton) {
        newSpecificationButton.addEventListener("click", function() {
            if (loggedInStatus) {
                window.location.href = "IdentifyingInformation.html";
            } else {
                alert("Please log in to create a new specification.");
            }
        });
    }

// Fallback function to estimate total pages when API doesn't provide total count
    function estimateTotalPages() {
        // If we have data but no total count, make educated guesses
        if (filteredData.length === rowsPerPage) {
            // If we got exactly rowsPerPage items, there might be more pages
            return Math.max(2, currentPage + 1);
        } else if (filteredData.length < rowsPerPage && currentPage === 1) {
            // If we got less than rowsPerPage on first page, this is probably the only page
            return 1;
        } else if (filteredData.length < rowsPerPage && currentPage > 1) {
            // If we got less than rowsPerPage on a later page, this is probably the last page
            return currentPage;
        } else if (filteredData.length === 0) {
            return 0;
        }
        // Default fallback
        return Math.max(1, currentPage);
    }