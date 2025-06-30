/******************************************************************************
    Registry Table Management for eInvoicingSpecificationRegistry.html
    Contains all table population, pagination, and filtering functionality
 ******************************************************************************/

// Global variables for registry table
let currentPage = 1;
let rowsPerPage = 10;
let filteredData = [];
let originalData = [];
let totalSpecifications = 0;

// API base URL
const API_BASE_URL = "https://registryservices-staging.azurewebsites.net/api";

/******************************************************************************
    Country Dropdown Population
 ******************************************************************************/
function populateCountryDropdown() {
    const countryFilter = document.getElementById("countryFilter");
    if (!countryFilter) return; // Exit if element doesn't exist on this page
    
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
    countries.forEach(country => {
        const option = document.createElement("option");
        option.value = country.code;
        option.textContent = `${country.name} (${country.code})`;
        countryFilter.appendChild(option);
    });
}

/******************************************************************************
    API Functions for fetching registry data
 ******************************************************************************/
// Fetch specifications from the API
async function fetchSpecifications() {
    try {
        console.log("Fetching specifications from API...");
        const response = await fetch(`${API_BASE_URL}/specifications?PageNumber=${currentPage}&PageSize=${rowsPerPage}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API Response:", data);
        
        // Handle the response structure
        if (data.items && Array.isArray(data.items)) {
            originalData = data.items;
            filteredData = data.items;

            // Check for total count in metadata first, then try other possible property names
            totalSpecifications = (data.metadata && data.metadata.totalCount) || 
                                  data.totalCount || data.TotalCount || data.total || data.Total || 
                                  data.count || data.Count || 0;
            console.log(`Loaded ${data.items.length} items, total: ${totalSpecifications}`);
            
            // If no total count in response, make a rough estimate based on current data
            if (totalSpecifications === 0 && data.items.length > 0) {
                totalSpecifications = Math.max(data.items.length, currentPage * rowsPerPage);
                console.log(`No total count found, estimated: ${totalSpecifications}`);
            }
        } else if (Array.isArray(data)) {
            // Handle case where response is directly an array
            originalData = data;
            filteredData = data;
            totalSpecifications = data.length;
            console.log(`Loaded ${data.length} items (direct array)`);
        } else {
            // Unexpected response format
            console.warn("Unexpected API response format:", data);
            originalData = [];
            filteredData = [];
            totalSpecifications = 0;
        }
        
        populateTable(filteredData);
    } catch (error) {
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
async function fetchSpecificationsWithFilters() {
    try {
        const searchText = document.getElementById("searchInput").value;
        const typeFilter = document.getElementById("typeFilter").value;
        const sectorFilter = document.getElementById("sectorFilter").value;
        const countryFilter = document.getElementById("countryFilter").value;
        
        // Build query parameters
        const params = new URLSearchParams({
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Filtered API Response:", data);
        
        // Handle the response structure
        if (data.items && Array.isArray(data.items)) {
            filteredData = data.items;
            // Check for total count in metadata first, then try other possible property names
            totalSpecifications = (data.metadata && data.metadata.totalCount) || 
                                  data.totalCount || data.TotalCount || data.total || data.Total || 
                                  data.count || data.Count || 0;
            console.log(`Filtered to ${data.items.length} items, total: ${totalSpecifications}`);
            
            // If no total count in response, make a rough estimate based on current data
            if (totalSpecifications === 0 && data.items.length > 0) {
                totalSpecifications = Math.max(data.items.length, currentPage * rowsPerPage);
                console.log(`No total count found, estimated: ${totalSpecifications}`);
            }
        } else if (Array.isArray(data)) {
            // Handle case where response is directly an array
            filteredData = data;
            totalSpecifications = data.length;
            console.log(`Filtered to ${data.length} items (direct array)`);
        } else {
            // Unexpected response format
            console.warn("Unexpected API response format:", data);
            filteredData = [];
            totalSpecifications = 0;
        }
        
        populateTable(filteredData);
    } catch (error) {
        console.error("Error fetching filtered specifications:", error);
        alert("Failed to filter specifications. Please try again.");
    }
}

/******************************************************************************
    Table Population Functions
 ******************************************************************************/
// Populating the table with registry data
function populateTable(data) {
    const table = document.getElementById("myTable");
    if (!table) return; // Exit if table doesn't exist on this page
    
    table.innerHTML = "";

    if (data.length > 0) {
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

        headers.forEach(header => {
            const th = document.createElement("th");
            th.textContent = header;
            headerRow.appendChild(th);
        });

        // For API data, we display all items in the current page data
        // since pagination is handled server-side
        for (let i = 0; i < data.length; i++) {
            const entry = data[i];
            const row = table.insertRow(-1);
            
            // Add styling for Submitted rows if user is logged in admin
            const userRole = localStorage.getItem('userRole');
            const registryStatus = getPropertyValue(entry, "Registry Status");
            if (typeof loggedInStatus !== 'undefined' && loggedInStatus && userRole === 'admin' && registryStatus === "Submitted") {
                row.style.backgroundColor = "#ffeb3b"; // Yellow highlight for submitted rows
                row.style.fontWeight = "bold";
            }

            headers.forEach(header => {
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
                        // Use identityID to navigate to viewSpecification.html
                        const identityID = entry.identityID;
                        
                        if (!identityID) {
                            console.error('No identityID found for specification:', entry);
                            alert('Error: Cannot view specification - missing ID');
                            return;
                        }
                        
                        console.log('Viewing specification with ID:', identityID);
                        
                        // Store the specification ID for the view page
                        localStorage.setItem('viewSpecificationId', identityID);
                        localStorage.setItem('selectedSpecification', identityID);
                        
                        // Set breadcrumb context for viewing from registry
                        if (window.breadcrumbManager) {
                            const context = {
                                source: 'registry',
                                action: 'view',
                                currentPage: 'viewSpecification.html',
                                specId: identityID,
                                specIdentityId: identityID
                            };
                            window.breadcrumbManager.setContext(context);
                        }
                        
                        // Navigate to the view specification page with the ID as a URL parameter
                        const viewUrl = `viewSpecification.html?id=${identityID}`;
                        console.log('DEBUG: Navigating to view page:', viewUrl);
                        
                        window.location.href = viewUrl;
                    });

                    cell.appendChild(button);
                } else {
                    const value = getPropertyValue(entry, header);
                    cell.textContent = value || "N/A";
                }
            });
        }
    } else {
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

/******************************************************************************
    Pagination Functions
 ******************************************************************************/
// Update the pagination controls with numbered buttons
function updatePaginationControls(totalPages) {
    console.log(`Updating pagination controls: currentPage=${currentPage}, totalPages=${totalPages}, totalSpecifications=${totalSpecifications}`);
    
    const firstPageButton = document.getElementById("firstPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const lastPageButton = document.getElementById("lastPage");
    const pageNumbersDiv = document.getElementById("pageNumbers");
    
    if (!firstPageButton || !prevPageButton || !nextPageButton || !lastPageButton || !pageNumbersDiv) {
        console.warn("Pagination controls not found on this page");
        return;
    }
    
    // Update navigation button states
    firstPageButton.disabled = currentPage === 1;
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    lastPageButton.disabled = currentPage === totalPages || totalPages === 0;

    // Update page info display
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo && totalSpecifications > 0) {
        const start = (currentPage - 1) * rowsPerPage + 1;
        const end = Math.min(currentPage * rowsPerPage, totalSpecifications);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${start}-${end} of ${totalSpecifications} items)`;
    } else if (pageInfo) {
        pageInfo.textContent = "No items found";
    }

    // Clear existing page numbers
    console.log('Clearing existing page numbers');
    pageNumbersDiv.innerHTML = '';

    // Always show page numbers, even if there's only 1 page
    if (totalPages === 0) return;

    // If only 1 page, just show "1"
    if (totalPages === 1) {
        addPageButton(1, pageNumbersDiv);
        return;
    }

    // Calculate which page numbers to show for multiple pages
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
        addPageButton(1, pageNumbersDiv);
        if (startPage > 2) {
            addEllipsis(pageNumbersDiv);
        }
    }

    // Add page numbers in range
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i, pageNumbersDiv);
    }

    // Add last page if not already shown
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis(pageNumbersDiv);
        }
        addPageButton(totalPages, pageNumbersDiv);
    }
}

// Function to add a page number button
function addPageButton(pageNum, pageNumbersDiv) {
    const button = document.createElement('button');
    button.className = 'page-number';
    button.textContent = pageNum;
    button.type = 'button';
    
    console.log(`Adding page button ${pageNum}, current page is ${currentPage}`);
    
    if (pageNum === currentPage) {
        button.classList.add('active');
        console.log(`Added active class to page ${pageNum}`);
    }
    
    button.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`Page ${pageNum} clicked, changing from page ${currentPage}`);
        
        if (pageNum !== currentPage) {
            currentPage = pageNum;
            console.log(`Current page changed to ${currentPage}, calling applyFilters`);
            applyFilters();
        }
    });
    
    pageNumbersDiv.appendChild(button);
}

// Function to add ellipsis
function addEllipsis(pageNumbersDiv) {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-number ellipsis';
    ellipsis.textContent = '...';
    pageNumbersDiv.appendChild(ellipsis);
}

// Fallback function to estimate total pages when API doesn't provide total count
function estimateTotalPages() {
    if (filteredData.length === 0) return 1;
    
    // If we got a full page of results, assume there might be more
    if (filteredData.length === rowsPerPage && currentPage === 1) {
        return Math.max(2, Math.ceil(filteredData.length * 1.5 / rowsPerPage));
    }
    
    // If we're not on the first page and got results, estimate based on current position
    if (currentPage > 1) {
        return Math.max(currentPage, Math.ceil((currentPage - 1) * rowsPerPage + filteredData.length) / rowsPerPage);
    }
    
    return Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
}

/******************************************************************************
    Filter and Event Handling Functions
 ******************************************************************************/
// Apply the filters - now uses API instead of client-side filtering
function applyFilters() {
    console.log(`Applying filters, fetching from API - Page: ${currentPage}, PageSize: ${rowsPerPage}`);
    
    // Show loading state (optional)
    const table = document.getElementById("myTable");
    if (table) {
        table.innerHTML = "<tr><td colspan='12' style='text-align: center; padding: 20px;'>Loading...</td></tr>";
    }
    
    fetchSpecificationsWithFilters();
}

// Setup pagination event listeners
function setupPaginationEventListeners() {
    const rowsPerPageSelect = document.getElementById("rowsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const firstPageButton = document.getElementById("firstPage");
    const lastPageButton = document.getElementById("lastPage");

    if (!rowsPerPageSelect || !prevPageButton || !nextPageButton || !firstPageButton || !lastPageButton) {
        console.warn("Some pagination controls not found on this page");
        return;
    }

    // Rows per page select
    rowsPerPageSelect.addEventListener("change", function () {
        rowsPerPage = parseInt(this.value, 10);
        currentPage = 1; // Reset to first page
        console.log(`Rows per page changed to ${rowsPerPage}, resetting to page 1`);
        applyFilters();
    });

    // First Page Button
    firstPageButton.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentPage !== 1) {
            currentPage = 1;
            console.log("First page clicked, moving to page 1");
            applyFilters();
        }
    });

    // Previous Button
    prevPageButton.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            console.log(`Previous page clicked, moving to page ${currentPage}`);
            applyFilters();
        }
    });

    // Next Button
    nextPageButton.addEventListener("click", function (e) {
        e.preventDefault();
        const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            console.log(`Next page clicked, moving to page ${currentPage}`);
            applyFilters();
        }
    });

    // Last Page Button
    lastPageButton.addEventListener("click", function (e) {
        e.preventDefault();
        const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
        if (currentPage !== totalPages && totalPages > 0) {
            currentPage = totalPages;
            console.log(`Last page clicked, moving to page ${currentPage}`);
            applyFilters();
        }
    });
}

// Setup filter event listeners
function setupFilterEventListeners() {
    // Add event listeners for the filters
    const searchInput = document.getElementById("searchInput");
    const typeFilter = document.getElementById("typeFilter");
    const sectorFilter = document.getElementById("sectorFilter");
    const countryFilter = document.getElementById("countryFilter");

    if (searchInput) {
        searchInput.addEventListener("input", debounce(applyFilters, 300));
    }
    if (typeFilter) {
        typeFilter.addEventListener("change", applyFilters);
    }
    if (sectorFilter) {
        sectorFilter.addEventListener("change", applyFilters);
    }
    if (countryFilter) {
        countryFilter.addEventListener("change", applyFilters);
    }
}

/******************************************************************************
    Initialization Function
 ******************************************************************************/
// Initialize registry table functionality
function initializeRegistryTable() {
    // Populate country dropdown
    populateCountryDropdown();
    
    // Setup event listeners
    setupPaginationEventListeners();
    setupFilterEventListeners();
    
    // Fetch initial data
    fetchSpecifications();
}

// Auto-initialize when DOM is loaded (only if we're on the registry page)
document.addEventListener("DOMContentLoaded", function() {
    // Check if we're on the registry page by looking for the table
    if (document.getElementById("myTable")) {
        console.log("Registry table detected, initializing...");
        initializeRegistryTable();
    }
});

// Export functions for global access if needed
window.registryTable = {
    initializeRegistryTable,
    populateTable,
    applyFilters,
    fetchSpecifications,
    fetchSpecificationsWithFilters
};
