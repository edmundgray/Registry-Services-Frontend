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

    loadData() {
        console.log('GoverningEntityList: Loading governing entity data...');
        
        // Load data from JSON file
        fetch("../JSON/mockGoverningEntities.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('GoverningEntityList: Data loaded successfully:', data);
                this.originalData = data;
                this.filteredData = data;
                this.populateTable(this.filteredData);
            })
            .catch(error => {
                console.error('GoverningEntityList: Failed to load data:', error);
                if (this.tableBody) {
                    this.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;font-style:italic;">Failed to load data</td></tr>`;
                }
            });
    }

    populateTable(data) {
        console.log('GoverningEntityList: Populating table with data:', data);
        
        if (!this.tableBody) return;

        this.tableBody.innerHTML = "";
        
        if (data.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
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
                Created: entry["Created"],
                GoverningEntity: entry["GoverningEntity"],
                NoOfUsers: entry["No. of Users"],
                NoOfSpecifications: entry["No. of Specifications"],
                InProgress: entry["In Progress"]
            }).toString();

            row.innerHTML = `
                <td>${entry["Created"]}</td>
                <td>${entry["GoverningEntity"]}</td>
                <td>${entry["No. of Users"]}</td>
                <td>${entry["No. of Specifications"]}</td>
                <td>${entry["In Progress"]}</td>
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
                "No. of Specifications": "0",
                "In Progress": "0"
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
            NoOfSpecifications: params.get("No. Of Specifications") || "",
            InProgress: params.get("In Progress") || ""
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
        
        // Check user role using AuthManager if available
        if (isAdmin(window.authManager)) { // Uses the global isAdmin function from javascript.js/authManager.js
            const adminContainerElement = document.getElementById("adminNewSpecContainer");
            if (adminContainerElement) {
                adminContainerElement.innerHTML = `
                    <button class="view-button" id="newSpecBtn">New Specification</button>
                `;
                
                const newSpecBtn = document.getElementById("newSpecBtn");
                if (newSpecBtn) {
                    newSpecBtn.onclick = () => this.startNewSpecification();
                }
            }
        } else {
             console.log('GoverningEntityView: User is not Admin, hiding New Specification button.');
            const adminContainerElement = document.getElementById("adminNewSpecContainer");
            if (adminContainerElement) {
                adminContainerElement.innerHTML = ''; // Clear the container if not admin
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
