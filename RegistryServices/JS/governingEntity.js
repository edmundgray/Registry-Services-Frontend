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
        this.authManager = window.authManager || null;
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

    reloadGoverningEntitiesData() {
        console.log('GoverningEntityList: Reloading table data due to authentication state change.');
        this.loadData(); // Re-run the data loading process
    }
    
    async loadData() {
        console.log('GoverningEntityList: Loading governing entity data...');
        
        if(!this.authManager) {
            console.error('GoverningEntityList: AuthManager not initialized');
            this.displayErrorMessage('Authentication system not ready');
            return;
        }

        if (!canAccess(this.authManager, 'admin')) {
            console.warn('GoverningEntityList: User does not have admin access. Cannot fetch user groups.');
            this.displayErrorMessage('You must be logged in as an Admin to view Governing Entities. Please log in first.', true);
            if(this.tableBody) {
                this.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#b22222;">${canAccess(this.authManager, 'user') ? 'You do not have administrative privileges to view this data.' : 'Please log in as an Admin to view Governing Entities.'}</td></tr>`;
            }
            return;
        }
        try {
            const apiUrl = `${AUTH_CONFIG.baseUrl}/usergroups`;
            console.log(`GoverningEntityList: Fetching data from: ${apiUrl}`);

            const response = await authenticatedFetch(apiUrl, {
                method: 'GET',
                forceAuth: true
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
            }

            const apiData = await response.json();
            console.log('GoverningEntityList: User Group API Response:', apiData);

            // Process API data to match table columns
            this.originalData = (Array.isArray(apiData) ? apiData : (apiData.items || [])).map(item => {
                const totalSpecs = (item.numberInProgress || 0) + (item.numberSubmitted || 0) + (item.numberUnderReview || 0) + (item.numberVerified || 0);
                return {
                    "Created": item.createdDate ? new Date(item.createdDate).toLocaleDateString('en-GB') : 'N/A', // Format date
                    "GoverningEntity": item.groupName || 'N/A',
                    "No. of Users": item.numberUsers || 0,
                    "No. of In Progress Specifications": item.numberInProgress || 0,
                    "No. of Submitted Specifications": item.numberSubmitted || 0,
                    "No. of Under Review Specifications": item.numberUnderReview || 0,
                    "No. of Verified Specifications": item.numberVerified || 0,
                    "Total Specifications": totalSpecs, // Calculated field
                    "userGroupId": item.userGroupId // Store ID for potential view page use
                };
            });
            this.filteredData = this.originalData;
            this.populateTable(this.filteredData);
            this.displayErrorMessage('', false); // Hide any previous error messages

        } catch (error) {
            console.error('GoverningEntityList: Failed to load data:', error);
            let userMessage = 'Failed to load Governing Entities from the server. Please check your connection and try again.';
            if (error.message.includes('403')) {
                userMessage = 'Access Denied: You do not have permission to view Governing Entities. Please ensure you are logged in as an Admin.';
            } else if (error.message.includes('401')) {
                 userMessage = 'Authentication Required: Your session may have expired. Please log in as an Admin to view Governing Entities.';
                 showLoginForm(); // Prompt for login
            }
            this.displayErrorMessage(userMessage);
            if (this.tableBody) {
                this.tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#b22222;">${userMessage}</td></tr>`;
            }
        }
    }

    displayErrorMessage(message, isWarning = false) {
        let errorDiv = document.getElementById('governingEntityErrorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'governingEntityErrorMessage';
            errorDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid #f5c6cb; font-weight: bold;';
            const pageContent = document.querySelector('.page-Content');
            if (pageContent) {
                pageContent.insertBefore(errorDiv, pageContent.firstChild);
            }
        }
        if (message) {
            errorDiv.innerHTML = `<i class="fa-solid fa-exclamation-triangle" style="margin-right: 10px; font-size: 18px;"></i> ${message}`;
            errorDiv.style.display = 'block';
            if (isWarning) {
                 errorDiv.style.backgroundColor = '#fff3cd'; // Yellow for warnings
                 errorDiv.style.borderColor = '#ffeeba';
                 errorDiv.style.color = '#856404';
            } else {
                 errorDiv.style.backgroundColor = '#f8d7da'; // Red for errors
                 errorDiv.style.borderColor = '#f5c6cb';
                 errorDiv.style.color = '#721c24';
            }
        } else {
            errorDiv.style.display = 'none';
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
            
            // Create URLSearchParams for view page
            const params = new URLSearchParams({
                id: entry.userGroupId || entry.GoverningEntity,
                Created: entry["Created"],
                GoverningEntity: entry["GoverningEntity"],
                NoOfUsers: entry["No. of Users"],
                NoOfSpecifications: entry["Total Specifications"],
                InProgress: entry["No. of In Progress Specifications"],
                Submitted: entry["No. of Submitted Specifications"],
                UnderReview: entry["No. of Under Review Specifications"],
                Verified: entry["No. of Verified Specifications"]
            }).toString();

            row.innerHTML = `
                <td>${entry["Created"]}</td>
                <td>${entry["GoverningEntity"]}</td>
                <td>${entry["No. of Users"]}</td>
                <td>${entry["No. of In Progress Specifications"]}</td>
                <td>${entry["No. of Submitted Specifications"]}</td>
                <td>${entry["No. of Under Review Specifications"]}</td>
                <td>${entry["No. of Verified Specifications"]}</td>
                <td>${entry["Total Specifications"]}</td>
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
            this.waitingApprovalTable.rows[0].cells[0].colSpan === 7) {
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
                "Created": dateStr,
                "GoverningEntity": cells[0].value,
                "No. of Users": cells[1].value,
                "No. of In Progress Specifications": "0",
                "No. of Submitted Specifications": "0",
                "No. of Under Review Specifications": "0",
                "No. of Verified Specifications": "0",
                "Total Specifications": "0"
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

    initializeView() {
        console.log('GoverningEntityView: Setting up view...');
        
        // Parse URL parameters
        this.parseUrlParameters();
        
        // Set up the view
        this.setupEntityTitle();
        this.setupEntityDetails();
        this.setupSpecificationsTable();
        this.populateSpecificationsTable();
        this.setupUsersTable();
        this.setupAdminFunctionality();
    }

    parseUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        this.entity = {
            Created: params.get("Created") || "",
            GoverningEntity: params.get("GoverningEntity") || "",
            NoOfUsers: params.get("NoOfUsers") || "",
            NoOfSpecifications: params.get("NoOfSpecifications") || "",
            InProgress: params.get("In Progress") || "",
            Submitted: params.get("Submitted") || "",
            UnderReview: params.get("Under Review") || "",
            Verified: params.get("Verified") || "",
            userGroupId: params.get("id") || ""
        };
        
        console.log('GoverningEntityView: Parsed entity data:', this.entity);
    }

    setupEntityTitle() {
        const titleElement = document.getElementById("entityTitle");
        if (titleElement) {
            titleElement.innerHTML = `<i class="fa-solid fa-building"></i> Viewing ${this.entity.GoverningEntity} Governing Entity`;
        }
    }

    setupEntityDetails() {
        const entityDetailsElement = document.getElementById("entityDetails");
        if (!entityDetailsElement) return;

        const entityTable = `
            <table class="styled-table" style="max-width:900px;">
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
                        <td>${this.entity.Created}</td>
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
            <table class="styled-table governing-entity-spec-table" id="specificationsTable" style="font-size:13px; margin-top: 0;">
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
        
    }

    async populateSpecificationsTable() {
        if (!isAdmin(window.authManager)) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Access denied: You must be an Admin to view all specifications for entities.</td></tr>`;
        console.warn('GoverningEntityView: Non-admin user attempted to fetch all specifications.');
        return; // Important: This stops the function execution if not an Admin.
        }

        const tbody = document.querySelector('#specificationsTable tbody');
        if (!tbody) return;

        console.log('GoverningEntityView: Populating specifications table...');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading specifications...</td></tr>'; // Loading message

        // Get specifications from SpecificationDataManager
        let specifications = [];
        
        try {
            
            const apiUrl = `${AUTH_CONFIG.baseUrl}/specifications/all?PageSize=1000`; // Fetch all for filtering
            console.log(`GoverningEntityView: Fetching specifications from: ${apiUrl}`);
            const response = await authenticatedFetch(apiUrl, { method: 'GET', forceAuth: true });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const apiData = await response.json();
            specifications = Array.isArray(apiData) ? apiData : (apiData.items || []);
            console.log('GoverningEntityView: Fetched specifications:', specifications.length);

            const entitySpecs = specifications.filter(spec =>
                spec.governingEntity === this.entity.GoverningEntity
            );
            console.log('GoverningEntityView: Filtered specifications for this entity:', entitySpecs.length);

            tbody.innerHTML = '';
            if (entitySpecs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;font-style:italic;">No specifications found for this Governing Entity.</td></tr>`;
                return;
            }
        
            entitySpecs.forEach(spec => {
                const tr = document.createElement('tr');

                // Determine action button based on status (assuming "In Progress" allows edit, others view)
                let actionButtonHtml = '';
                // Check implementationStatus or registrationStatus for "In Progress"
                if (spec.implementationStatus === 'In Progress' || spec.registrationStatus === 'Draft' || spec.registrationStatus === 'In Progress') {
                    // Use the global editSpecification function from javascript.js
                    actionButtonHtml = `<button class="view-button" onclick="editSpecification(${spec.identityID})">Edit</button>`;
                } else {
                    // Use the global viewSpecification function from javascript.js
                    actionButtonHtml = `<button class="view-button" onclick="viewSpecification(${spec.identityID})">View</button>`;
                }

                // Style submitted rows if their registrationStatus is 'Submitted' or 'Published'
                if (spec.registrationStatus === 'Submitted' || spec.registrationStatus === 'Published') {
                    tr.classList.add("submitted-row");
                }

                // Populate cells based on the updated header structure and data properties
                tr.innerHTML = `
                    <td>${spec.modifiedDate ? new Date(spec.modifiedDate).toLocaleDateString() : (spec.createdDate ? new Date(spec.createdDate).toLocaleDateString() : 'N/A')}</td>
                    <td>${spec.specificationName || 'N/A'}</td>
                    <td>${spec.purpose || 'N/A'}</td>
                    <td>${spec.dateOfImplementation ? new Date(spec.dateOfImplementation).toLocaleDateString() : 'N/A'}</td>
                    <td>${spec.specificationType || 'N/A'}</td>
                    <td>${spec.sector || 'N/A'}</td>
                    <td>${spec.country || 'N/A'}</td>
                    <td>${spec.registrationStatus || 'N/A'}</td>
                    <td>${actionButtonHtml}</td>
                `;
                tbody.appendChild(tr);
            });

            console.log('GoverningEntityView: Specifications table populated with', entitySpecs.length, 'specifications');

        } catch (error) {
            console.error('GoverningEntityView: Error fetching or populating specifications:', error);
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Failed to load specifications. Please try again.</td></tr>`;
        }
    }


    startEdit(identityID) {
        console.log('GoverningEntityView: Calling global editSpecification for ID:', identityID);
        if (window.editSpecification) {
            window.editSpecification(identityID); // Assuming editSpecification now takes identityID directly
        } else {
            console.error('Global editSpecification function not found!');
            alert("Cannot edit: Edit functionality not available.");
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
        
        let userRole = "User";
        if (window.authManager && window.authManager.userRole) {
            userRole = window.authManager.userRole;
        }

        console.log('GoverningEntityView: Current user role:', userRole);

        const adminContainerElement = document.getElementById("adminNewSpecContainer");
        if (adminContainerElement && userRole.toLowerCase() === "admin") {
            adminContainerElement.innerHTML = `
                <button class="view-button" id="newSpecBtn" style="background-color: #28a745; margin-left: 10px;">New Specification</button>
            `;
            
            const newSpecBtn = document.getElementById("newSpecBtn");
            if (newSpecBtn) {
                newSpecBtn.onclick = () => this.startNewSpecification();
            }
        }
    }

    startNewSpecification() {
        console.log('GoverningEntityView: Starting new specification for entity:', this.entity.GoverningEntity);
        
        try {
            // Use SpecificationDataManager if available
            if (window.createNewSpecification) {
                localStorage.setItem("newSpecGoverningEntity", this.entity.GoverningEntity);
                window.createNewSpecification();
            } else {
                console.error('GoverningEntityView: Error starting new specification:', error);
                alert("Error starting new specification: " + error.message);
            }
            
            window.location.href = "IdentifyingInformation.html";
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
