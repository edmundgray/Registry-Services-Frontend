/******************************************************************************
    Registry Table Management for eInvoicingSpecificationRegistry.html
    Contains all table population, pagination, and filtering functionality
 ******************************************************************************/

// Global variables for registry table
let currentPage = 1;
let rowsPerPage = 10;
let visibleDataOnPage = [];
let originalData = [];
let filteredData = [];
let totalSpecifications = 0;

// API base URL
const API_BASE_URL = "https://registryservices-staging.azurewebsites.net/api";

// Global variable to track if we're in business term search mode
let isBusinessTermSearchActive = false;

/******************************************************************************
    Business Term Search Functions
 ******************************************************************************/
// Function to search specifications by Business Term ID
async function searchByBusinessTermId(businessTermId) {
    if (!businessTermId || businessTermId.trim() === '') {
        // If empty, reset to normal mode
        isBusinessTermSearchActive = false;
        clearAllFilters();
        await fetchSpecifications();
        return;
    }

    try {
        isBusinessTermSearchActive = true;
        const trimmedTermId = businessTermId.trim();
        
        console.log(`Searching for Business Term ID: ${trimmedTermId}`);
        
        // Show loading state
        showLoadingState();
        
        // Make three parallel API calls
        const [coreResults, extensionResults, additionalReqResults] = await Promise.all([
            fetchSpecificationsByBusinessTerm('CoreBusinessTermId', trimmedTermId),
            fetchSpecificationsByBusinessTerm('ExtensionBusinessTermId', trimmedTermId),
            fetchSpecificationsByBusinessTerm('AddReqBusinessTermID', trimmedTermId)
        ]);
        
        // Amalgamate results and remove duplicates
        const combinedResults = amalgamateResults(coreResults, extensionResults, additionalReqResults);
        
        // Update global data
        originalData = combinedResults;
        filteredData = combinedResults;
        totalSpecifications = combinedResults.length;
        
        // Reset pagination to first page
        currentPage = 1;
        
        // Calculate total pages for client-side pagination (since we have all results)
        const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
        
        // Populate the table with combined results
        populateTable(combinedResults);
        updatePaginationControls(totalPages);
        
        console.log(`Business Term search completed. Found ${combinedResults.length} specifications.`);
        
    } catch (error) {
        console.error("Error searching by Business Term ID:", error);
        alert("Failed to search by Business Term ID. Please try again.");
        
        // Reset to normal mode on error
        isBusinessTermSearchActive = false;
        originalData = [];
        filteredData = [];
        totalSpecifications = 0;
        populateTable([]);
        updatePaginationControls(0);
    }
}

// Function to fetch specifications by specific business term parameter
async function fetchSpecificationsByBusinessTerm(parameterName, businessTermId) {
    try {
        const params = new URLSearchParams({
            [parameterName]: businessTermId,
            PageNumber: currentPage.toString(),
            PageSize: '1000' // Use large page size to get all results
        });
        
        const url = `${API_BASE_URL}/specifications?${params.toString()}`;
        console.log(`Fetching from: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`${parameterName} API Response:`, data);
        
        // Extract items from response
        if (data.items && Array.isArray(data.items)) {
            return data.items;
        } else if (Array.isArray(data)) {
            return data;
        } else {
            console.warn(`Unexpected response format from ${parameterName}:`, data);
            return [];
        }
        
    } catch (error) {
        console.error(`Error fetching ${parameterName} results:`, error);
        return []; // Return empty array on error
    }
}

// Function to amalgamate results from three API calls and remove duplicates
function amalgamateResults(coreResults, extensionResults, additionalReqResults) {
    const allResults = [...coreResults, ...extensionResults, ...additionalReqResults];
    
    // Remove duplicates based on identityID
    const uniqueResults = [];
    const seenIds = new Set();
    
    for (const result of allResults) {
        const identityId = result.identityID;
        if (identityId && !seenIds.has(identityId)) {
            seenIds.add(identityId);
            uniqueResults.push(result);
        }
    }
    
    console.log(`Amalgamated results: ${allResults.length} total, ${uniqueResults.length} unique`);
    return uniqueResults;
}

// Function to show loading state
function showLoadingState() {
    const table = document.getElementById("myTable");
    if (!table) return;
    
    table.innerHTML = "";
    const loadingRow = table.insertRow(0);
    const loadingCell = loadingRow.insertCell(0);
    loadingCell.colSpan = 12; // Span all columns
    loadingCell.textContent = "Searching Business Term ID...";
    loadingCell.style.textAlign = "center";
    loadingCell.style.padding = "20px";
    loadingCell.style.fontStyle = "italic";
    loadingCell.style.color = "#666";
}

// Function to clear all filters
function clearAllFilters() {
    const searchInput = document.getElementById("searchInput");
    const typeFilter = document.getElementById("typeFilter");
    const sectorFilter = document.getElementById("sectorFilter");
    const countryFilter = document.getElementById("countryFilter");
    
    if (searchInput) searchInput.value = "";
    if (typeFilter) typeFilter.value = "";
    if (sectorFilter) sectorFilter.value = "";
    if (countryFilter) countryFilter.value = "";
}

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
        console.log("Fetching ALL specifications from API for client-side filtering...");
        // Fetch all data (or a very large page size) to filter client-side
        const response = await fetch(`${API_BASE_URL}/specifications?PageNumber=1&PageSize=10000`); // Increased PageSize

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response (full raw data):", data);

        let allApiData = [];
        if (data.items && Array.isArray(data.items)) {
            allApiData = data.items;
        } else if (Array.isArray(data)) {
            allApiData = data;
        } else {
            console.warn("Unexpected API response format for full fetch:", data);
        }

        // --- Proposed Change: Client-side filtering for 'Under Review' and 'Verified' statuses on ALL data ---
        originalData = allApiData.filter(spec => {
            const status = (spec.registrationStatus || '').toLowerCase();
            return status === 'under review' || status === 'verified';
        });
        // --- End Proposed Change ---
        
        totalSpecifications = originalData.length; // totalSpecifications now reflects the count of ALL filtered items

        console.log(`Fetched ${allApiData.length} raw items, filtered to ${originalData.length} (Under Review/Verified only)`);
        
        // Populate the table with the current page's slice of the filtered data
        populateTable(originalData); // populateTable now handles its own slicing
    } catch (error) {
        console.error("Error fetching specifications:", error);
        alert("Failed to load specifications from the server. Please check your connection and try again.");
        originalData = [];
        totalSpecifications = 0;
        populateTable(originalData); // Pass empty data for display
    }
}


// Function to fetch specifications with filters
async function fetchSpecificationsWithFilters() {
    try {
        const searchText = document.getElementById("searchInput").value;
        const typeFilter = document.getElementById("typeFilter").value;
        const sectorFilter = document.getElementById("sectorFilter").value;
        const countryFilter = document.getElementById("countryFilter").value;
        
        // Build query parameters for the API call (still fetching potentially large set)
        const params = new URLSearchParams({
            PageNumber: 1, // Always fetch from page 1 when applying new filters
            PageSize: 10000 // Increased PageSize
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
        console.log("Filtered API Response (raw):", data);
        
        let allApiData = [];
        if (data.items && Array.isArray(data.items)) {
            allApiData = data.items;
        } else if (Array.isArray(data)) {
            allApiData = data;
        } else {
            console.warn("Unexpected API response format for filtered fetch:", data);
        }

        // --- Proposed Change: Client-side filtering for 'Under Review' and 'Verified' statuses on ALL data ---
        originalData = allApiData.filter(spec => {
            const status = (spec.registrationStatus || '').toLowerCase();
            return status === 'under review' || status === 'verified';
        });
        // --- End Proposed Change ---

        totalSpecifications = originalData.length; // totalSpecifications now reflects the count of ALL filtered items

        console.log(`Fetched ${allApiData.length} raw items, filtered to ${originalData.length} (Under Review/Verified only)`);
        
        // Reset currentPage to 1 when filters are applied
        currentPage = 1;

        // Populate the table with the current page's slice of the filtered data
        populateTable(originalData); // populateTable now handles its own slicing
    } catch (error) {
        console.error("Error fetching filtered specifications:", error);
        alert("Failed to filter specifications. Please try again.");
        originalData = [];
        totalSpecifications = 0;
        populateTable(originalData); // Pass empty data for display
    }
}

/******************************************************************************
    Table Population Functions
 ******************************************************************************/
// Populating the table with registry data
function populateTable(allFilteredData) {
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
        for (let i = 0; i < displayData.length; i++) {
            const entry = displayData[i];
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

    // Now, calculate total pages based on the accurate totalSpecifications
    let totalPages = Math.ceil(totalSpecifications / rowsPerPage);
    
    // If totalSpecifications is 0, totalPages should be 0 or 1 if there's an active page.
    if (totalSpecifications === 0) {
        totalPages = 0; // No items, no pages
    } else if (totalPages === 0 && totalSpecifications > 0) { // Edge case: less than 1 page
        totalPages = 1;
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
            console.log(`Current page changed to ${currentPage}, calling populateTable with originalData`);
            if (isBusinessTermSearchActive) {
                populateTable(filteredData);
            } else {
                populateTable(originalData);
            }
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

/******************************************************************************
    Filter and Event Handling Functions
 ******************************************************************************/
// Apply the filters - now uses API instead of client-side filtering
function applyFilters() {
    console.log(`Applying filters, fetching from API - Page: ${currentPage}, PageSize: ${rowsPerPage}`);
    
    // If we're in business term search mode, don't apply other filters
    if (isBusinessTermSearchActive) {
        console.log("Business term search is active, ignoring other filters");
        return;
    }
    
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
        
        if (isBusinessTermSearchActive) {
            // For business term search, update the table directly
            const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
            populateTable(filteredData);
            updatePaginationControls(totalPages);
        } else {
            applyFilters();
        }
    });

    // First Page Button
    firstPageButton.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentPage !== 1) {
            currentPage = 1;
            console.log("First page clicked, moving to page 1");
            if (isBusinessTermSearchActive) {
                const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
                populateTable(filteredData);
                updatePaginationControls(totalPages);
            } else {
                applyFilters();
            }
        }
    });

    // Previous Button
    prevPageButton.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            console.log(`Previous page clicked, moving to page ${currentPage}`);
            if (isBusinessTermSearchActive) {
                const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
                populateTable(filteredData);
                updatePaginationControls(totalPages);
            } else {
                applyFilters();
            }
        }
    });

    // Next Button
    nextPageButton.addEventListener("click", function (e) {
        e.preventDefault();
        const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            console.log(`Next page clicked, moving to page ${currentPage}`);
            if (isBusinessTermSearchActive) {
                populateTable(filteredData);
                updatePaginationControls(totalPages);
            } else {
                applyFilters();
            }
        }
    });

    // Last Page Button
    lastPageButton.addEventListener("click", function (e) {
        e.preventDefault();
        const totalPages = Math.ceil(totalSpecifications / rowsPerPage);
        if (currentPage !== totalPages && totalPages > 0) {
            currentPage = totalPages;
            console.log(`Last page clicked, moving to page ${currentPage}`);
            if (isBusinessTermSearchActive) {
                populateTable(filteredData);
                updatePaginationControls(totalPages);
            } else {
                applyFilters();
            }
        }
    });
}

// Setup filter event listeners
function setupFilterEventListeners() {
    // Add event listeners for the filters
    const searchInput = document.getElementById("searchInput");
    const businessTermSearch = document.getElementById("businessTermSearch");
    const typeFilter = document.getElementById("typeFilter");
    const sectorFilter = document.getElementById("sectorFilter");
    const countryFilter = document.getElementById("countryFilter");

    if (searchInput) {
        searchInput.addEventListener("input", debounce(() => {
            // Clear business term search when using regular search
            if (businessTermSearch) businessTermSearch.value = "";
            isBusinessTermSearchActive = false;
            applyFilters();
        }, 300));
    }
    
    if (businessTermSearch) {
        businessTermSearch.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                // Clear other filters when using business term search
                clearAllFilters();
                searchByBusinessTermId(this.value);
            }
        });
        
        // Also clear business term search mode when the input is cleared
        businessTermSearch.addEventListener("input", function() {
            if (this.value.trim() === "") {
                isBusinessTermSearchActive = false;
                // Reset to normal view
                fetchSpecifications();
            }
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener("change", () => {
            // Clear business term search when using other filters
            if (businessTermSearch) businessTermSearch.value = "";
            isBusinessTermSearchActive = false;
            applyFilters();
        });
    }
    if (sectorFilter) {
        sectorFilter.addEventListener("change", () => {
            // Clear business term search when using other filters
            if (businessTermSearch) businessTermSearch.value = "";
            isBusinessTermSearchActive = false;
            applyFilters();
        });
    }
    if (countryFilter) {
        countryFilter.addEventListener("change", () => {
            // Clear business term search when using other filters
            if (businessTermSearch) businessTermSearch.value = "";
            isBusinessTermSearchActive = false;
            applyFilters();
        });
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

/******************************************************************************
    Helper Functions
 ******************************************************************************/
// Debounce function to limit how often a function can be called
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

// Helper function to safely get property value with API field mappings
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

// Export functions for global access if needed
window.registryTable = {
    initializeRegistryTable,
    populateTable,
    applyFilters,
    fetchSpecifications,
    fetchSpecificationsWithFilters,
    searchByBusinessTermId
};