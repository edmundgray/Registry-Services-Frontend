/**
 * Governing Entity Management Module
 * Handles governing entity list and view functionality
 */

// Governing Entity List functionality
class GoverningEntityList {
    constructor() {
        this.originalData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.rowsPerPage = 10;
        this.tableBody = null;
        this.waitingApprovalTable = null;
        this.init();
    }

    init() {
        console.log('GoverningEntityList: Initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    initializeElements() {
        console.log('GoverningEntityList: Setting up elements and event listeners...');
        
        // Get references to elements
        this.tableBody = document.querySelector("#governingEntitiesTable tbody");
        this.waitingApprovalTable = document.getElementById("waitingApprovalTable")?.getElementsByTagName("tbody")[0];
        this.rowsPerPageSelect = document.getElementById("rowsPerPage");
        this.prevPageButton = document.getElementById("prevPage");
        this.nextPageButton = document.getElementById("nextPage");
        this.currentPageSpan = document.getElementById("currentPage");
        this.addEntityBtn = document.getElementById("addEntityBtn");

        if (!this.tableBody) {
            console.error('GoverningEntityList: Required table elements not found');
            return;
        }

        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        console.log('GoverningEntityList: Setting up event listeners...');
        
        // Pagination controls
        if (this.rowsPerPageSelect) {
            this.rowsPerPageSelect.addEventListener("change", () => {
                this.rowsPerPage = parseInt(this.rowsPerPageSelect.value, 10);
                this.currentPage = 1;
                this.populateTable(this.filteredData);
            });
        }

        if (this.prevPageButton) {
            this.prevPageButton.addEventListener("click", () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.populateTable(this.filteredData);
                }
            });
        }

        if (this.nextPageButton) {
            this.nextPageButton.addEventListener("click", () => {
                const totalPages = Math.ceil(this.filteredData.length / this.rowsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.populateTable(this.filteredData);
                }
            });
        }

        // Add new entity functionality
        if (this.addEntityBtn) {
            this.addEntityBtn.addEventListener("click", () => this.addNewEntity());
        }
    }

    async loadData() {
        console.log('GoverningEntityList: Loading governing entity data...');
        
        // Check if user is an Admin
        if (typeof isAdmin === 'function' && !isAdmin(window.authManager)) {
            console.warn('GoverningEntityList: User is not an Admin. Cannot fetch user group data.');
            if (this.tableBody) {
                this.tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;font-style:italic;color:red;">You must be logged in as an Admin to view governing entities.</td></tr>`;
            }
            return;
        }

        try {
            const apiUrl = `${AUTH_CONFIG.baseUrl}/usergroups`;
            console.log(`GoverningEntityList: Attempting to fetch from API: ${apiUrl}`);

            // Use centralized authenticatedFetch for admin-only endpoint
            const response = await window.authManager.authenticatedFetch(apiUrl, {
                method: 'GET',
                forceAuth: true // Ensure authentication headers are sent
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('GoverningEntityList: Data loaded successfully from API:', data);
            
            this.originalData = data;
            this.filteredData = data;
            this.populateTable(this.filteredData);
        } catch (error) {
            console.error('GoverningEntityList: Failed to load data from API:', error);
            if (this.tableBody) {
                this.tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;font-style:italic;color:red;">Failed to load governing entities: ${error.message}</td></tr>`;
            }
        }
    }

    populateTable(data) {
        console.log('GoverningEntityList: Populating table with data:', data);
        
        if (!this.tableBody) return;

        this.tableBody.innerHTML = "";
        
        if (data.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 9;
            cell.style.textAlign = "center";
            cell.style.fontStyle = "italic";
            cell.textContent = "No governing entities found.";
            row.appendChild(cell);
            this.tableBody.appendChild(row);
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = Math.min(startIndex + this.rowsPerPage, data.length);

        for (let i = startIndex; i < endIndex; i++) {
            const entry = data[i];
            const row = document.createElement("tr");
            
            const totalSpecifications = 
                (entry.numberInProgress || 0) + 
                (entry.numberSubmitted || 0) + 
                (entry.numberUnderReview || 0) + 
                (entry.numberVerified || 0);

            // Create URLSearchParams for view page
            const params = new URLSearchParams({
                id: entry.userGroupID
            }).toString();

            row.innerHTML = `
                <td>${entry.createdDate ? new Date(entry.createdDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                <td>${entry.groupName || 'N/A'}</td>
                <td>${entry.numberUsers || '0'}</td>
                <td>${entry.numberInProgress || '0'}</td>
                <td>${entry.numberSubmitted || '0'}</td>
                <td>${entry.numberUnderReview || '0'}</td>
                <td>${entry.numberVerified || '0'}</td>
                <td>${totalSpecifications}</td>
                <td>
                    <button class="view-button" onclick="window.location.href='governingEntityView.html?${params}'">View</button>
                </td>
            `;
            this.tableBody.appendChild(row);
        }

        // Update pagination controls
        this.updatePaginationControls(data.length);
    }

    updatePaginationControls(totalItems) {
        const totalPages = Math.ceil(totalItems / this.rowsPerPage);

        if (this.currentPageSpan) {
            this.currentPageSpan.textContent = this.currentPage;
        }
        
        if (this.prevPageButton) {
            this.prevPageButton.disabled = this.currentPage === 1;
        }
        
        if (this.nextPageButton) {
            this.nextPageButton.disabled = this.currentPage === totalPages || totalPages === 0;
        }
    }

    addNewEntity() {
        console.log('GoverningEntityList: Adding new entity...');
        
        if (!this.waitingApprovalTable) {
            console.error('GoverningEntityList: Waiting approval table not found');
            return;
        }

        // Remove "No pending entities" row if present
        if (this.waitingApprovalTable.rows.length === 1 && 
            this.waitingApprovalTable.rows[0].cells[0].colSpan === 4) {
            this.waitingApprovalTable.innerHTML = "";
        }

        // Create new row
        const row = this.waitingApprovalTable.insertRow();
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB');

        row.innerHTML = `
            <td>${dateStr}</td>
            <td><input type="text" value="New Governing Entity" style="width: 180px;" /></td>
            <td><input type="text" value="" style="width: 120px;" /></td>
            <td>
                <button class="view-button approve-btn">Approve</button>
            </td>
            <td>
                <button class="view-button deny-btn" style="background:#dc3545;">Deny</button>
            </td>
        `;

        // Set up approve button
        row.querySelector('.approve-btn').addEventListener('click', () => {
            const confirmApprove = confirm("Approve this entry? This will move it to the main table.");
            if (!confirmApprove) return;

            // Get values from inputs
            const cells = row.querySelectorAll('input');
            const newEntry = {
                "createdDate": now.toISOString(), // Use ISO string for consistency
                "usergroupName": cells[0].value,
                "numberUsers": parseInt(cells[1].value) || 0, // Assume 2nd input is for users, parse as int
                "numberSpecifications": 0, // New entries start with 0
                "numberInProgress": 0,
                "numberSubmitted": 0,
                "numberUnderReview": 0,
                "numberVerified": 0,
                "userGroupID": Date.now()
            };

            // Remove from waiting approval table
            row.remove();

            // Add to main table data
            this.originalData.unshift(newEntry);
            this.filteredData = this.originalData;
            this.populateTable(this.filteredData);

            // Restore placeholder if needed
            this.checkAndRestoreWaitingPlaceholder();
        });

        // Set up deny button
        row.querySelector('.deny-btn').addEventListener('click', () => {
            const confirmDeny = confirm("Are you sure you want to deny and remove this entry?");
            if (!confirmDeny) return;
            
            alert("This entry has been denied and removed.");
            row.remove();
            this.checkAndRestoreWaitingPlaceholder();
        });
    }

    checkAndRestoreWaitingPlaceholder() {
        if (this.waitingApprovalTable && this.waitingApprovalTable.rows.length === 0) {
            const emptyRow = this.waitingApprovalTable.insertRow();
            emptyRow.innerHTML = `<td colspan="7" style="text-align: center; font-style: italic;">No pending entities</td>`;
        }
    }
}

// Governing Entity View functionality
class GoverningEntityView {
    constructor() {
        this.entity = {};
        this.userGroupId = null; // Will be set from URL parameters
        this.init();
    }

    init() {
        console.log('GoverningEntityView: Initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeView());
        } else {
            this.initializeView();
        }
    }

    async initializeView() {
        console.log('GoverningEntityView: Setting up view...');
        
        // Parse URL parameters
        this.parseUrlParameters();
        
        if (!this.userGroupId) {
            console.error('GoverningEntityView: No userGroupID found in URL parameters.');
            // Display an error or redirect
            document.querySelector('.page-Content').innerHTML = `
                <h1>Error</h1>
                <p>No Governing Entity ID provided. Please navigate from the Governing Entities list.</p>
                <button onclick="window.location.href='governingEntityList.html'">Return to List</button>
            `;
            return;
        }

        try {
            await this.loadEntityDetails();
        } catch (error) {
            console.error('GoverningEntityView: Failed to load entity details:', error);
            document.querySelector('.page-Content').innerHTML = `
                <h1>Error</h1>
                <p>Failed to load details for this Governing Entity: ${error.message}</p>
                <button onclick="window.location.href='governingEntityList.html'">Return to List</button>
            `;
            return;
        }
        // Set up the view
        this.setupEntityTitle();
        this.setupEntityDetails();
        this.setupSpecificationsTable();
        this.setupUsersTable();
        this.setupAdminFunctionality();
    }

    parseUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        this.userGroupId = parseInt(params.get("id"), 10);
        
        console.log('GoverningEntityView: Parsed entity data:', this.userGroupId);
    }

    async loadEntityDetails() {
        console.log(`GoverningEntityView: Fetching details for user group ID: ${this.userGroupId}`);
        try {
            const apiUrl = `${AUTH_CONFIG.baseUrl}/usergroups/${this.userGroupId}`;
            const response = await window.authManager.authenticatedFetch(apiUrl, { method: 'GET', forceAuth: true });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Governing Entity with ID ${this.userGroupId} not found.`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.entity = await response.json(); // Store the full entity data
            console.log('GoverningEntityView: Entity details loaded:', this.entity);
        } catch (error) {
            console.error('GoverningEntityView: Error loading entity details:', error);
            throw error; // Re-throw to be caught by initializeView
        }
    }

    setupEntityTitle() {
        const titleElement = document.getElementById("entityTitle");
        if (titleElement && this.entity.groupName) {
            titleElement.innerHTML = `<i class="fa-solid fa-building"></i> Viewing ${this.entity.groupName} Governing Entity`;
        }
    }

    setupEntityDetails() {
        const entityDetailsElement = document.getElementById("entityDetails");
        if (!entityDetailsElement) return;

        const entityTable = `
            <table class="styled-table" style="max-width:900px; margin-top: 0;">
                <thead>
                    <tr>
                        <th>Created</th>
                        <th>Sector</th>
                        <th>Country</th>
                        <th>Primary Contact Name</th>
                        <th>Primary Contact Information</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${this.entity.createdDate ? new Date(this.entity.createdDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        `;
        entityDetailsElement.innerHTML = entityTable;
    }

    setupSpecificationsTable() {
        const specificationsSectionElement = document.getElementById("specificationsSection");
        if (!specificationsSectionElement) return;

        const specificationsTable = `
        <h2 style="margin: 0;font-size:20px;">Specifications</h2>
            <table class="styled-table" id="specificationsTable" style="font-size:13px; margin-top: 10;">
                <thead>
                    <tr>
                        <th>Created/Modified</th>
                        <th>Name</th>
                        <th>Purpose</th>
                        <th>Implementation Date</th>
                        <th>Type</th>
                        <th>Sector</th>
                        <th>Country</th>
                        <th>Registry Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        specificationsSectionElement.innerHTML = specificationsTable;
        
        this.populateSpecificationsTable();
    }

    async populateSpecificationsTable() {
        const tbody = document.querySelector('#specificationsTable tbody');
        if (!tbody) return;

        console.log('GoverningEntityView: Populating specifications table...');

        // Get specifications from SpecificationDataManager
        let specifications = [];
        const currentUser = getCurrentUser(window.authManager);
        
        if (!currentUser.isAuthenticated) {
            console.warn('GoverningEntityView: User not authenticated. Cannot fetch user-specific specifications.');
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;font-style:italic;color:red;">Please log in to view user-specific specifications.</td></tr>`;
            return;
        }

        try {
            if (!this.userGroupId) {
            console.error('GoverningEntityView: userGroupId is not set, cannot fetch specifications.');
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;font-style:italic;color:red;">Cannot load specifications: Governing Entity ID missing.</td></tr>`;
            return;
            }
            const apiUrl = `${AUTH_CONFIG.baseUrl}/specifications/by-user-group?PageSize=1000`; // Assuming PageSize is a parameter
            console.log(`GoverningEntityView: Attempting to fetch specifications from API: ${apiUrl}`);

            const response = await window.authManager.authenticatedFetch(apiUrl, {
                method: 'GET',
                forceAuth: true 
            });

            if (!response.ok) {
            // Check if response is 404 (not found for the user group) or other error
            if (response.status === 404) {
                // Handle 404 specifically as a case for no specifications found for this group
                console.log(`No specifications found for user group ID: ${this.userGroupId}`);
                specifications = []; // Explicitly set to empty to proceed to "No specs found" message
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            } else {
                const apiData = await response.json();
                // Ensure data.items is handled if the API returns a paginated object
                specifications = Array.isArray(apiData) ? apiData : (apiData.items || []);
                console.log('GoverningEntityView: Specifications loaded from API:', specifications);
            }
            } catch (error) {
            console.error('GoverningEntityView: Failed to load specifications from API:', error);
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;font-style:italic;color:red;">Failed to load specifications: ${error.message}</td></tr>`;
            return;
            }

            

        const entitySpecs = specifications.filter(spec => spec.userGroupID === this.userGroupId);

        tbody.innerHTML = '';
        
        if (entitySpecs.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 9;
            cell.style.textAlign = "center";
            cell.style.fontStyle = "italic";
            cell.textContent = `No specifications found for ${this.entity.groupName}.`;
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }    

        entitySpecs.forEach(spec => {
            const tr = document.createElement('tr');
            
            // Determine action button based on status
            let actionButtonHtml = '';

            const currentStatus = spec.implementationStatus || spec.registrationStatus;

            if (currentStatus === 'In Progress' || currentStatus === 'Draft') {
            actionButtonHtml = `<button class="view-button" onclick="editSpecification(${spec.identityID})">Edit</button>`;
            } else { // Covers 'Submitted', 'Under Review', 'Verified', 'Published' etc.
                actionButtonHtml = `<button class="view-button" onclick="viewSpecification(${spec.identityID})">View</button>`;
            }

            if (currentStatus === 'Submitted' || currentStatus === 'Published') {
                tr.classList.add("submitted-row");
            }

            tr.innerHTML = `
                <td>${spec.modifiedDate ? new Date(spec.modifiedDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                <td>${spec.specificationName || ''}</td>
                <td>${spec.purpose || ''}</td>
                <td>${spec.dateOfImplementation ? new Date(spec.dateOfImplementation).toLocaleDateString('en-GB') : 'N/A'}</td>
                <td>${spec.specificationType || ''}</td>
                <td>${spec.sector || ''}</td>
                <td>${spec.country || ''}</td>
                <td>${spec.registrationStatus || spec.implementationStatus || ''}</td>
                <td>${actionButtonHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        console.log('GoverningEntityView: Specifications table populated with', entitySpecs.length, 'specifications');
    }

    startEdit(specName, specParams) {
        console.log('GoverningEntityView: Starting edit for specification:', specIdentityID);
        
        try {
            // Use the global editSpecification function for consistency
            if (window.editSpecification) {
                window.editSpecification(specName, specParams);
            } else {
                // Fallback to SpecificationDataManager if available
                if (window.SpecificationDataManager) {
                    window.SpecificationDataManager.setWorkingData({
                        specName: specName,
                        mode: 'edit'
                    });
                    console.log('GoverningEntityView: Set working data for edit mode');
                } else {
                    // Final fallback to localStorage
                    localStorage.setItem("selectedSpecification", specName);
                    localStorage.setItem("editSpecData", specParams);
                }
                
                window.location.href = "IdentifyingInformation.html";
            }
        } catch (error) {
            console.error('GoverningEntityView: Error starting edit:', error);
            alert("Cannot edit: Error starting edit mode.");
        }
    }

    setupUsersTable() {
        const usersSectionElement = document.getElementById("usersSection");
        if (!usersSectionElement) return;

        const usersTable = `
            <h2 style="margin:24px 0 8px 0;font-size:20px;">Users</h2>
            <table class="styled-table" style="font-size:13px;max-width:900px;">
                <thead>
                    <tr>
                        <th>Joined</th>
                        <th>Name</th>
                        <th>Contact Information</th>
                        <th>Contributor</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        usersSectionElement.innerHTML = usersTable;
    }

    setupAdminFunctionality() {
        console.log('GoverningEntityView: Setting up admin functionality...');
        
        if (typeof isAdmin === 'function' && isAdmin(window.authManager)) {
        const adminContainerElement = document.getElementById("adminNewSpecContainer");
        if (adminContainerElement) {
            // Add a class for styling
            adminContainerElement.innerHTML = `
                <button class="view-button" id="newSpecBtn" style="float: right; margin-bottom: 10px;">New Specification</button>
                <div style="clear: both;"></div> `;

            const newSpecBtn = document.getElementById("newSpecBtn");
            if (newSpecBtn) {
                newSpecBtn.onclick = () => this.startNewSpecification();
            }
        }
        } else {
            console.log('GoverningEntityView: User is not an Admin, hiding admin functionality.');
            const adminContainerElement = document.getElementById("adminNewSpecContainer");
            if (adminContainerElement) {
                adminContainerElement.style.display = 'none'; // Hide the container if not admin
            }
        }
    }

    startNewSpecification() {
        console.log('GoverningEntityView: Starting new specification for entity:', this.entity.groupName);
        
        try {
            // Use SpecificationDataManager if available
            if (window.SpecificationDataManager && typeof window.createNewSpecification === 'function') {
                const dataManager = new SpecificationDataManager();
                 dataManager.clearEditingState(); 
                 dataManager.workingData = { governingEntity: this.entity.groupName }; // Use groupName
                 dataManager.saveWorkingDataToLocalStorage();

                window.createNewSpecification(); 
                
            } else {
                console.error('GoverningEntityView: Required functions for new specification not found.');
                alert("Error starting new specification.");
            }
        } catch (error) {
            console.error('GoverningEntityView: Error starting new specification:', error);
            alert("Error starting new specification.");
        }
    }
}

// Initialize based on current page
function initializeGoverningEntityPage() {
    const currentPage = window.location.pathname.toLowerCase();
    
    if (currentPage.includes('governingentitylist.html')) {
        console.log('Initializing Governing Entity List page...');
        window.governingEntityList = new GoverningEntityList();
    } else if (currentPage.includes('governingentityview.html')) {
        console.log('Initializing Governing Entity View page...');
        window.governingEntityView = new GoverningEntityView();
    }
}

// Auto-initialize when script loads
initializeGoverningEntityPage();
