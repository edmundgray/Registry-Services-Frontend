// --- Authenticated Fetch and Session Expiry Logic ---
window.authManager = new AuthManager();

async function authenticatedFetch(url, options = {}) {
    try {
        const headers = { ...(options.headers || {}), ...window.authManager.getAuthHeaders() };
        let response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            const refreshed = await window.authManager.refreshToken();
            if (refreshed) {
                const newHeaders = { ...(options.headers || {}), ...window.authManager.getAuthHeaders() };
                response = await fetch(url, { ...options, headers: newHeaders });
                if (response.status === 401 || response.status === 403) {
                    handleSessionExpiry();
                    throw new Error('Session expired');
                }
            } else {
                handleSessionExpiry();
                throw new Error('Session expired');
            }
        }
        return response;
    } catch (error) {
        console.error('Authenticated fetch error:', error);
        throw error;
    }
}

function handleSessionExpiry() {
    preserveWorkflowData();
    window.authManager.clearAuthData();
    showNotification('Your session has expired. You will be redirected to the login page in 3 seconds.', 'warning');
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 3000);
}

function preserveWorkflowData() {
    const selectedSpec = sessionStorage.getItem('selectedSpecification');
    const workingData = sessionStorage.getItem('workingData_extensionComponents');
    const breadcrumbContext = sessionStorage.getItem('breadcrumbContext');
    if (selectedSpec) localStorage.setItem('preserved_selectedSpecification', selectedSpec);
    if (workingData) localStorage.setItem('preserved_workingData_extensionComponents', workingData);
    if (breadcrumbContext) localStorage.setItem('preserved_breadcrumbContext', breadcrumbContext);
    localStorage.setItem('workflowDataPreserved', 'true');
    localStorage.setItem('preservedFromPage', 'ExtensionComponentDataModel');
}

// --- Main Data Model Logic ---
// Note: isFormDirty is deprecated in favor of hasActualChanges()
// let isFormDirty = false;
let dataManager = null;
// Cache for storing fetched extension component elements to avoid re-fetching
let extensionComponentElementsCache = {}; // Changed from extensionComponentData
let extensionComponentHeadersCache = null; // Cache for component headers
let componentsContainer;
let extensionComponents = []; // Array to store extension components
let componentTable; // Reference to the component table DOM element
let editingComponentIndex = null; // Track which component is being edited
let isEditing = false; // Track editing state

// Initialize data manager
function getNumericLevelFromDotNotation(levelStr) {
    if (!levelStr) return 0;
    if (levelStr.includes('+')) {
    return levelStr.split('+').length - 1;
    }
    const parts = levelStr.split('.');
    if (parts.length === 1 && !isNaN(parseInt(parts[0]))) {
    return 1; 
    }
    return parts.length > 0 ? parts.length : 0;
}

async function initializeDataManager() {
    try {
        console.log('DEBUG: ExtensionComponentDataModel - Initializing data manager');
        console.log('DEBUG: ExtensionComponentDataModel - LocalStorage state:');
        console.log('  - editMode:', localStorage.getItem('editMode'));
        console.log('  - specificationIdentityId:', localStorage.getItem('specificationIdentityId'));
        
        dataManager = new SpecificationDataManager();
        console.log('DEBUG: ExtensionComponentDataModel - Data manager initialized');
        console.log('DEBUG: ExtensionComponentDataModel - Mode:', dataManager.currentMode);
        console.log('DEBUG: ExtensionComponentDataModel - isEditMode():', dataManager.isEditMode());
        console.log('DEBUG: ExtensionComponentDataModel - currentSpecId:', dataManager.currentSpecId);
        
        // Validate that we have a specification ID (required for Step 3)
        if (!dataManager.currentSpecId) {
            console.error('DEBUG: ExtensionComponentDataModel - No specification ID found');
            throw new Error('No specification ID found. Please complete Step 1 (Identifying Information) first.');
        }
        
        // Load saved extension elements from API
        let savedExtensions = [];
        try {
            console.log('DEBUG: Loading extension elements from API for spec:', dataManager.currentSpecId);
            const apiResponse = await dataManager.loadExtensionElementsFromAPI(dataManager.currentSpecId);
            console.log('DEBUG: API Response for extension elements:', apiResponse);
            
            // Load headers if not already cached
            if (!extensionComponentHeadersCache) {
                console.log('DEBUG: Loading extension component headers for transformation');
                const headersApiUrl = `${AUTH_CONFIG.baseUrl}/extensionmodels/headers`;
                const headersResponse = await authenticatedFetch(headersApiUrl, {
                    method: 'GET',
                    forceAuth: true
                });
                if (headersResponse.ok) {
                    extensionComponentHeadersCache = await headersResponse.json();
                    console.log('DEBUG: Cached extension component headers:', extensionComponentHeadersCache);
                } else {
                    console.warn('DEBUG: Failed to load headers, using empty array');
                    extensionComponentHeadersCache = [];
                }
            }
            
            // Transform API data to component-grouped format with resolved names
            savedExtensions = dataManager.transformExtensionElementsFromAPI(apiResponse, extensionComponentHeadersCache);
            console.log('DEBUG: Transformed extension data with resolved names:', savedExtensions);
            
            // Store the savedElements for deletion tracking in dataManager
            if (!dataManager.workingData) {
                dataManager.workingData = {};
            }
            if (!dataManager.workingData.extensionComponentData) {
                dataManager.workingData.extensionComponentData = {};
            }
            dataManager.workingData.extensionComponentData.savedElements = apiResponse.items || [];
            
        } catch (error) {
            console.error('Error loading extension elements from API:', error);
            // Continue with empty array if loading fails
            savedExtensions = [];
        }
        
        console.log('DEBUG: ExtensionComponentDataModel - Returning saved extensions:', savedExtensions);
        return savedExtensions;
        
    } catch (error) {
        console.error('DEBUG: ExtensionComponentDataModel - Error initializing data manager:', error);
        throw error;
    }
}

// Make functions globally accessible
window.addNewComponentSection = addNewComponentSection;
window.handleComponentChange = handleComponentChange;
window.updateComponentSections = updateComponentSections;
window.updateBaselineData = updateBaselineData;
window.handleSave = handleSave;
window.handleCancel = handleCancel;
window.saveAndGoToNextStep = saveAndGoToNextStep;

// Load data from sessionStorage/localStorage if available
function loadExtensionComponents() {
    const stored = sessionStorage.getItem('workingData_extensionComponents') || localStorage.getItem('preserved_workingData_extensionComponents');
    if (stored) {
        try {
            extensionComponents = JSON.parse(stored);
        } catch (e) {
            extensionComponents = [];
        }
    } else {
        extensionComponents = [];
    }
}

function saveExtensionComponents() {
    sessionStorage.setItem('workingData_extensionComponents', JSON.stringify(extensionComponents));
}

function renderComponentTable() {
    if (!componentTable) return;
    componentTable.innerHTML = '';
    extensionComponents.forEach((component, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${component.name}</td>
            <td>${component.type}</td>
            <td>${component.description}</td>
            <td>
                <button type="button" onclick="editComponent(${idx})">Edit</button>
                <button type="button" onclick="deleteComponent(${idx})">Delete</button>
            </td>
        `;
        componentTable.appendChild(row);
    });
}

function resetForm() {
    // Only reset form if the form elements exist (they may not exist on this page)
    const nameInput = document.querySelector('input[name="name"]');
    const typeInput = document.querySelector('input[name="type"]');
    const descriptionInput = document.querySelector('textarea[name="description"]');
    const saveComponentBtn = document.querySelector('button[onclick*="Add Component"]');
    const cancelEditBtn = document.querySelector('button[onclick*="cancelEdit"]');
    
    if (nameInput) nameInput.value = '';
    if (typeInput) typeInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (saveComponentBtn) saveComponentBtn.textContent = 'Add Component';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    
    editingComponentIndex = null;
    isEditing = false;
}

function populateForm(component) {
    const nameInput = document.querySelector('input[name="name"]');
    const typeInput = document.querySelector('input[name="type"]');
    const descriptionInput = document.querySelector('textarea[name="description"]');
    
    if (nameInput) nameInput.value = component.name;
    if (typeInput) typeInput.value = component.type;
    if (descriptionInput) descriptionInput.value = component.description;
}

// Event Handlers
window.editComponent = function(idx) {
    editingComponentIndex = idx;
    isEditing = true;
    populateForm(extensionComponents[idx]);
    saveComponentBtn.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'inline-block';
};

window.deleteComponent = function(idx) {
    if (confirm('Are you sure you want to delete this component?')) {
        extensionComponents.splice(idx, 1);
        saveExtensionComponents();
        renderComponentTable();
        showNotification('Component deleted.', 'success');
        resetForm();
    }
};

// Get DOM elements safely
const addComponentBtn = document.querySelector('#addComponentBtn');
const saveComponentBtn = document.querySelector('#saveComponentBtn');
const cancelEditBtn = document.querySelector('#cancelEditBtn');
const componentForm = document.querySelector('#componentForm');

if (addComponentBtn) {
    addComponentBtn.addEventListener('click', function() {
        resetForm();
        if (componentForm) componentForm.style.display = 'block';
    });
}

if (saveComponentBtn) {
    saveComponentBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const nameInput = document.querySelector('input[name="name"]');
        const typeInput = document.querySelector('input[name="type"]');
        const descriptionInput = document.querySelector('textarea[name="description"]');
        
        if (!nameInput || !typeInput) return;
        
        const name = nameInput.value.trim();
        const type = typeInput.value.trim();
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        if (!name || !type) {
            showNotification('Name and Type are required.', 'warning');
            return;
        }
        const componentData = { name, type, description };
        if (isEditing && editingComponentIndex !== null) {
            extensionComponents[editingComponentIndex] = componentData;
            showNotification('Component updated.', 'success');
        } else {
            extensionComponents.push(componentData);
            showNotification('Component added.', 'success');
        }
        saveExtensionComponents();
        renderComponentTable();
        resetForm();
        const componentForm = document.querySelector('#componentForm');
        if (componentForm) componentForm.style.display = 'none';
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', function(e) {
        e.preventDefault();
        resetForm();
        if (componentForm) componentForm.style.display = 'none';
    });
}

// Combined DOMContentLoaded initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM element references
    componentTable = document.querySelector('#componentTable tbody');
    componentsContainer = document.querySelector('#components-container');
    
    // Initialize auth and session management
    window.authManager.init();
    if (window.WorkflowSessionManager) {
        window.sessionManager = new WorkflowSessionManager('extensionComponentDataModel');
        window.sessionManager.init();
    }
    window.sidebarManager.initializeSidebar(window.authManager);
    window.breadcrumbManager.init();
    
    // Set breadcrumb context
    const editingSpecId = localStorage.getItem("selectedSpecification");
    if (editingSpecId) {
        const context = {
            currentPage: 'ExtensionComponentDataModel.html',
            specId: editingSpecId,
            action: editingSpecId === 'new' ? 'new' : 'edit'
        };
        const existingContext = window.breadcrumbManager.getContext();
        context.source = (existingContext && existingContext.source) ? existingContext.source : 'mySpecs';
        window.breadcrumbManager.setContext(context);
    }
    
    // Load extension component data and render - this is the main content loader
    loadExtensionData(); // This function populates the main content
    
    // Initialize simple extension components tracking (for any legacy form-based functionality)
    loadExtensionComponents();
    renderComponentTable();
    resetForm();
    
    // If workflow data was preserved, restore it
    if (localStorage.getItem('workflowDataPreserved') === 'true' && localStorage.getItem('preservedFromPage') === 'ExtensionComponentDataModel') {
        const preserved = localStorage.getItem('preserved_workingData_extensionComponents');
        if (preserved) {
            try {
                extensionComponents = JSON.parse(preserved);
                saveExtensionComponents();
                localStorage.removeItem('preserved_workingData_extensionComponents');
            } catch (e) {}
        }
        localStorage.removeItem('workflowDataPreserved');
        localStorage.removeItem('preservedFromPage');
    }
});

async function loadExtensionData() {
    try {
        // Initialize data manager and load saved extensions from API
        const savedExtensions = await initializeDataManager();
        
        // Use cached headers or fetch them if not available
        let availableComponents = extensionComponentHeadersCache;
        if (!availableComponents) {
            const headersApiUrl = `${AUTH_CONFIG.baseUrl}/extensionmodels/headers`;
            console.log(`Attempting to fetch Extension Component Headers from API: ${headersApiUrl}`);
            const headersResponse = await authenticatedFetch(headersApiUrl, {
                method: 'GET',
                forceAuth: true
            });

            if (!headersResponse.ok) {
                throw new Error(`HTTP error! status: ${headersResponse.status}`);
            }
            availableComponents = await headersResponse.json();
            // Cache for future use
            extensionComponentHeadersCache = availableComponents;
        }
        console.log('Available Extension Component Headers:', availableComponents);
        console.log('DEBUG: First component structure:', availableComponents[0]);
        console.log('DEBUG: Available component IDs:', availableComponents.map(comp => comp.id));

        // Clear existing sections
        componentsContainer.innerHTML = '';

        if (savedExtensions && savedExtensions.length > 0) {
            console.log('DEBUG: ExtensionComponentDataModel - Loading saved extensions:', savedExtensions);
            
            // For each saved extension, add a section and populate its table
            for (const savedExt of savedExtensions) {
                console.log('DEBUG: Processing saved extension with extensionComponentID:', JSON.stringify(savedExt.extensionComponentID));
                // Trim whitespace from extensionComponentID to handle data inconsistencies
                const trimmedComponentId = (savedExt.extensionComponentID || '').trim();
                console.log('DEBUG: Trimmed extensionComponentID:', JSON.stringify(trimmedComponentId));
                // Use extensionComponentID for dropdown selection, but display componentName
                await addNewComponentSection(trimmedComponentId, savedExt.selectedElements, availableComponents);
            }
            console.log('DEBUG: Restored', savedExtensions.length, 'saved extension components');
            
            // Set baseline data after sections are loaded with longer delay to ensure DOM is fully updated
            setTimeout(() => {
                console.log('DEBUG: ExtensionComponentDataModel - About to update baseline data after loading all sections');
                updateBaselineData();
            }, 300);
        } else {
            // If no saved extensions, create one empty section
            console.log('DEBUG: No saved extensions, creating empty section');
            await addNewComponentSection('', [], availableComponents);
            
            // Set empty baseline data for new form
            dataManager.extensionComponentsData = {
                selectedElements: [],
                componentAssignments: []
            };
            console.log('DEBUG: ExtensionComponentDataModel - Empty baseline data initialized');
        }

    } catch (error) {
        console.error("Error loading extension component data:", error);
        if (componentsContainer) {
            if (error.message.includes('No specification ID found')) {
                componentsContainer.innerHTML = `
                    <div style="color: red; padding: 20px; border: 1px solid red; background-color: #ffe6e6; margin: 20px 0;">
                        <h3>Missing Specification ID</h3>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>This is Step 3 of the specification creation process. You must first complete:</p>
                        <ol>
                            <li><strong>Step 1:</strong> Identifying Information (to create the specification)</li>
                            <li><strong>Step 2:</strong> Core Invoice Model</li>
                            <li><strong>Step 3:</strong> Extension Component Data Model (current step)</li>
                        </ol>
                        <button onclick="window.location.href='IdentifyingInformation.html'" class="view-button" style="margin-top: 10px;">
                            Go to Step 1 - Identifying Information
                        </button>
                    </div>`;
            } else {
                componentsContainer.innerHTML = `<p style="color: red;">Error: Could not load extension component data. ${error.message}</p>`;
            }
        }
    }
}

// addNewComponentSection now takes an optional preSelectedComponentId, preSelectedElementIds, and availableComponents
async function addNewComponentSection(preSelectedComponentId = '', preSelectedElementIds = [], availableComponents = null) {
    console.log('DEBUG: addNewComponentSection called with:', { 
        preSelectedComponentId: JSON.stringify(preSelectedComponentId), 
        preSelectedElementIds: preSelectedElementIds?.length || 0,
        availableComponentsCount: availableComponents?.length || 0 
    });
    
    const sectionId = `section-${Date.now()}`;
    const section = document.createElement('div');
    section.className = 'component-section';
    section.id = sectionId;

    // If no available components provided, use cached headers or fetch them
    if (!availableComponents) {
        if (extensionComponentHeadersCache) {
            availableComponents = extensionComponentHeadersCache;
        } else {
            try {
                const headersApiUrl = `${AUTH_CONFIG.baseUrl}/extensionmodels/headers`;
                const headersResponse = await authenticatedFetch(headersApiUrl, { method: 'GET', forceAuth: true });
                availableComponents = await headersResponse.json();
                extensionComponentHeadersCache = availableComponents; // Cache for future use
            } catch (error) {
                console.error("Error re-fetching component headers for new section:", error);
                availableComponents = [];
            }
        }
    }

    // Check if the preSelected component is available (trim whitespace for comparison)
    const trimmedPreSelectedId = (preSelectedComponentId || '').trim();
    const isComponentAvailable = !trimmedPreSelectedId || availableComponents.some(comp => comp.id === trimmedPreSelectedId);
    
    let dropdownHtml;
    if (trimmedPreSelectedId && !isComponentAvailable) {
        // Component not available - show error message instead of dropdown
        // Try to get the component name for a better error message
        const componentName = trimmedPreSelectedId; // Fallback to ID since component is not available
        dropdownHtml = `
            <div style="color: red; background-color: #ffe6e6; border: 1px solid red; padding: 10px; border-radius: 4px;">
                <strong>⚠️ Component Not Available</strong><br>
                Extension Component "${componentName}" (ID: ${trimmedPreSelectedId}) is no longer available in the system.<br>
                <small>This component may have been removed or you may not have access to it.</small>
            </div>`;
    } else {
        // Normal dropdown
        let options = '<option value="">Select an Extension Component</option>';
        availableComponents.forEach(comp => {
            const selected = comp.id === trimmedPreSelectedId ? 'selected' : '';
            options += `<option value="${comp.id}" ${selected}>${comp.name || comp.id}</option>`;
        });
        dropdownHtml = `<select class="component-select" onchange="handleComponentChange(this)">${options}</select>`;
    }

    section.innerHTML = `
        ${dropdownHtml}
        <p style="margin-top: 5px;">Select the required Extension Component and tick the box for all required elements</p>
        <table class="styled-table" style="width:100%;">
            <thead>
                <tr>
                    <th>ID</th><th>Level</th><th>Cardinality</th><th>Business Term</th><th>Usage Note</th>
                    <th>Justification</th><th>Data Type</th><th>Type of Extension</th>
                    <th>Core Conformant /Rules broken</th><th>Included in Spec</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="10" style="text-align:center;">
                    ${isComponentAvailable ? 'Please select a component from the dropdown.' : 'Component not available - cannot load elements.'}
                </td></tr>
            </tbody>
        </table>
        <button onclick="document.getElementById('${sectionId}').remove(); updateComponentSections(); updateBaselineData();" class="view-button" style="margin-top: 10px; background: #dc3545;">Remove Selection</button>
    `;
    componentsContainer.appendChild(section);

    // If we have a valid pre-selected component, populate its table
    if (trimmedPreSelectedId && isComponentAvailable) {
        const selectElement = section.querySelector('.component-select');
        if (selectElement) {
            await populateComponentTable(selectElement, preSelectedElementIds);
        }
    }
}

// Function to handle removing sections and ensuring at least one remains
function updateComponentSections() {
    const sections = document.querySelectorAll('.component-section');
    if (sections.length === 0) {
        addNewComponentSection(); // Add a new empty section if all are removed
    }
}

// Function to handle component dropdown changes and restore previously selected elements
async function handleComponentChange(selectElement) {
    const selectedComponentId = selectElement.value;
    
    // Get previously selected element IDs for this component from baseline data
    const previouslySelectedIds = [];
    if (dataManager && dataManager.extensionComponentsData && dataManager.extensionComponentsData.selectedElements) {
        dataManager.extensionComponentsData.selectedElements.forEach(selectedElement => {
            const [componentId, businessTermId] = selectedElement.split(':');
            if (componentId === selectedComponentId) {
                previouslySelectedIds.push(businessTermId);
            }
        });
    }
    
    console.log('DEBUG: handleComponentChange - Component:', selectedComponentId, 'Previously selected IDs:', previouslySelectedIds);
    
    // Populate table with previously selected elements restored
    await populateComponentTable(selectElement, previouslySelectedIds);
}

// populateComponentTable now fetches elements for the selected component and restores selections
async function populateComponentTable(selectElement, selectedIds = []) {
    const selectedComponentId = selectElement.value;
    const tableBody = selectElement.closest('.component-section').querySelector('tbody');

    console.log('DEBUG: populateComponentTable called with:', { selectedComponentId, selectedIds });

    if (!selectedComponentId) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Please select a component.</td></tr>';
        return;
    }

    let componentElements = [];
    // Check cache first
    if (extensionComponentElementsCache[selectedComponentId]) {
        componentElements = extensionComponentElementsCache[selectedComponentId];
        console.log(`Loaded ${selectedComponentId} elements from cache.`);
    } else {
        // Fetch elements for the selected component
        const elementsApiUrl = `${AUTH_CONFIG.baseUrl}/extensionmodels/elements/${selectedComponentId}`;
        console.log(`Fetching elements for component: ${elementsApiUrl}`);
        try {
            const elementsResponse = await authenticatedFetch(elementsApiUrl, {
                method: 'GET',
                forceAuth: true
            });
            if (!elementsResponse.ok) {
                throw new Error(`HTTP error! status: ${elementsResponse.status}`);
            }
            const elementsData = await elementsResponse.json();
            componentElements = Array.isArray(elementsData) ? elementsData : (elementsData.items || []);
            extensionComponentElementsCache[selectedComponentId] = componentElements;
            console.log(`Fetched ${componentElements.length} elements for ${selectedComponentId}.`);
        } catch (error) {
            console.error(`Error fetching elements for component ${selectedComponentId}:`, error);
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load elements for this component.</td></tr>`;
            return;
        }
    }

    tableBody.innerHTML = ''; // Clear previous elements
    if (componentElements.length === 0) {
         tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No elements found for this component.</td></tr>`;
         return;
    }

    componentElements.forEach(el => {
        const row = document.createElement('tr');
        
        // Helper function to combine usage notes
        function combineUsageNotes(usageNoteCore, usageNoteExtension, semanticDescription) {
            const notes = [usageNoteCore, usageNoteExtension, semanticDescription]
                .filter(note => note && note.trim())
                .map(note => note.trim());
            return notes.length > 0 ? notes.join(' | ') : 'N/A';
        }
        
        // Map properties from API response with proper businessTermID extraction
        const businessTermID = el.businessTermID;
        const isChecked = selectedIds.includes(businessTermID);
        
        console.log('DEBUG: Processing element:', { 
            businessTermID, 
            isChecked, 
            selectedIds,
            element: el 
        });

        const isXG = businessTermID.startsWith('XG');
        const isXT = businessTermID.startsWith('XT');
        const isBG = businessTermID.startsWith('BG'); // Check for BG
        const numericLevel = getNumericLevelFromDotNotation(el.level || '');
        
        if (isXG) {
            if (numericLevel === 1) { // Interpretation of 'LEVEL 1 parent' for XG
                row.classList.add('level-1-xg');
            } else if (numericLevel === 2 || numericLevel === 3) { // Interpretation of 'LEVEL 2 or 3 parent' for XG
                row.classList.add('level-2-xg'); // Assuming level-3-xg is same as level-2-xg for now
            }
            // XG elements are typically parents or nested within an XG hierarchy,
            // apply parent/child classes if they have children or are part of a structure
            // (You may need to enhance this based on actual XG data structure if it has nesting)
            if (numericLevel === 1) { // Assuming level 1 XG is a main parent
                row.classList.add('parent-row');
            } else if (numericLevel > 1) { // Assuming other levels are children
                row.classList.add('child-row');
            }

        } else if (isXT) {
            row.classList.add('level-xt');
            // XT elements are typically not parents themselves, but are children.
            // Apply child-row if their level implies nesting.
            if (numericLevel > 0) { // If it has any level, it's a child of something
                row.classList.add('child-row');
            }
        } else if (isBG) { // Apply green coloring for BG elements
            if (numericLevel === 1) { // Dark green for LEVEL 1 BG parents
                row.classList.add('level-1-bg');
                row.classList.add('parent-row'); // Add parent-row for level 1 BG
            } else if (numericLevel === 2 || numericLevel === 3) { // Medium green for LEVEL 2 or 3 BG parents
                row.classList.add('level-2-bg'); // Use level-2-bg for both 2 and 3
                row.classList.add('child-row'); // Add child-row for nested BG elements
            }
            // If it's a BG element but not a recognized parent level, it will fall through to default table styling
        }

        const mappedEl = {
            ID: businessTermID,
            Level: el.level || 'N/A',
            Cardinality: el.cardinality || 'N/A',
            "Business Term": el.businessTerm || 'N/A',
            "Usage Note": combineUsageNotes(el.usageNoteCore, el.usageNoteExtension, el.semanticDescription),
            Justification: el.justification || 'N/A',
            "Data Type": el.dataType || 'N/A',
            "Type of Extension": el.extensionType || 'N/A',
            "Core Conformant/Rules broken": el.conformanceType || 'N/A'
        };

        row.innerHTML = `
            <td>${mappedEl.ID}</td><td>${mappedEl.Level}</td><td>${mappedEl.Cardinality}</td>
            <td>${mappedEl['Business Term']}<i class="fa-solid fa-circle-question" title="${mappedEl['Usage Note']}"></i></td>
            <td>${mappedEl['Usage Note']}</td><td>${mappedEl.Justification}</td><td>${mappedEl['Data Type']}</td>
            <td>${mappedEl['Type of Extension']}</td><td>${mappedEl['Core Conformant/Rules broken']}</td>
            <td style="text-align:center;"><input type="checkbox" class="element-selector" data-id="${businessTermID}"></td>
        `;
        tableBody.appendChild(row);
        
        // Set the checked property programmatically (not just the attribute)
        const addedCheckbox = row.querySelector('.element-selector');
        if (addedCheckbox && isChecked) {
            addedCheckbox.checked = true;
            console.log(`DEBUG: Checkbox for ${businessTermID} set to checked`);
        }
    });
    
    console.log('DEBUG: Table populated with', componentElements.length, 'elements,', selectedIds.filter(id => componentElements.some(el => el.businessTermID === id)).length, 'pre-selected');
    
    // Update baseline data after elements are applied with a short delay for DOM stability
    setTimeout(() => {
        updateBaselineData();
    }, 50);
}

// Enhanced change detection functions
function hasActualChanges() {
    console.log('DEBUG: ExtensionComponentDataModel - hasActualChanges() called');
    
    if (!dataManager || !dataManager.extensionComponentsData) {
        console.log('DEBUG: ExtensionComponentDataModel - No baseline data available');
        console.log('DEBUG: ExtensionComponentDataModel - dataManager exists:', !!dataManager);
        console.log('DEBUG: ExtensionComponentDataModel - dataManager.extensionComponentsData exists:', !!(dataManager && dataManager.extensionComponentsData));
        return true; // If no baseline data, assume changes exist
    }
    
    const currentData = collectExtensionComponentSelections();
    const originalData = dataManager.extensionComponentsData;
    
    console.log('DEBUG: ExtensionComponentDataModel - Current data:', currentData);
    console.log('DEBUG: ExtensionComponentDataModel - Baseline data:', originalData);
    console.log('DEBUG: ExtensionComponentDataModel - Baseline selectedElements count:', originalData.selectedElements ? originalData.selectedElements.length : 'N/A');
    
    // Compare number of selected elements
    if (currentData.selectedElements.length !== originalData.selectedElements.length) {
        console.log('DEBUG: ExtensionComponentDataModel - Different number of selected elements:', currentData.selectedElements.length, 'vs', originalData.selectedElements.length);
        return true;
    }
    
    // Check if same elements are selected
    const currentSet = new Set(currentData.selectedElements);
    const originalSet = new Set(originalData.selectedElements);
    for (const element of currentSet) {
        if (!originalSet.has(element)) {
            console.log('Change detected: New extension component selected:', element);
            return true;
        }
    }
    for (const element of originalSet) {
        if (!currentSet.has(element)) {
            console.log('Change detected: Extension component deselected:', element);
            return true;
        }
    }
    
    // Compare component assignments (extension component selections)
    if (originalData.componentAssignments && currentData.componentAssignments) {
        const originalComponents = JSON.stringify(originalData.componentAssignments);
        const currentComponents = JSON.stringify(currentData.componentAssignments);
        if (originalComponents !== currentComponents) {
            console.log('DEBUG: ExtensionComponentDataModel - Change detected in component assignments');
            return true;
        }
    } else if (!originalData.componentAssignments && currentData.componentAssignments.length > 0) {
        console.log('DEBUG: ExtensionComponentDataModel - Change detected: new component assignments added');
        return true;
    } else if (originalData.componentAssignments && currentData.componentAssignments.length === 0) {
        console.log('DEBUG: ExtensionComponentDataModel - Change detected: component assignments removed');
        return true;
    }
    
    console.log('DEBUG: ExtensionComponentDataModel - No changes detected, returning false');
    return false;
}

// Function to collect current extension component selections
function collectExtensionComponentSelections() {
    const selectedElements = [];
    const componentAssignments = [];
    
    document.querySelectorAll('.component-section').forEach((section, sectionIndex) => {
        const componentSelect = section.querySelector('.component-select');
        if (!componentSelect) {
            console.warn('Component select not found in section', sectionIndex);
            return; // Skip this section if component select is not found
        }
        
        const extensionComponentID = componentSelect.value;
        
        if (extensionComponentID) {
            // Track which extension component is selected for this section
            componentAssignments.push(extensionComponentID);
            
            // Collect selected elements for this component
            const checkedBoxes = section.querySelectorAll('.element-selector:checked');
            
            checkedBoxes.forEach((checkbox) => {
                const businessTermID = checkbox.getAttribute('data-id');
                if (businessTermID) {
                    const elementId = `${extensionComponentID}:${businessTermID}`;
                    selectedElements.push(elementId);
                }
            });
        }
    });
    
    console.log('DEBUG: collectExtensionComponentSelections() - Collected:', {
        selectedElementsCount: selectedElements.length,
        componentAssignmentsCount: componentAssignments.length,
        selectedElements: selectedElements
    });
    
    return {
        selectedElements,
        componentAssignments
    };
}

// Function to update baseline data after UI is populated
function updateBaselineData() {
    try {
        const currentSelections = collectExtensionComponentSelections();
        dataManager.extensionComponentsData = currentSelections;
        console.log('DEBUG: ExtensionComponentDataModel - Baseline data updated after UI population:', currentSelections);
        console.log('DEBUG: ExtensionComponentDataModel - Baseline selectedElements count:', currentSelections.selectedElements.length);
        console.log('DEBUG: ExtensionComponentDataModel - Baseline componentAssignments count:', currentSelections.componentAssignments.length);
        
        // Update save button appearance since baseline has changed
        updateSaveButtonAppearance();
    } catch (error) {
        console.error('DEBUG: ExtensionComponentDataModel - Error updating baseline data:', error);
    }
}

// Legacy function for backward compatibility
function getSelectedExtensionComponentIds() {
    const selections = collectExtensionComponentSelections();
    return selections.selectedElements;
}

// Make hasActualChanges globally accessible for breadcrumb manager
window.hasActualChanges = hasActualChanges;

function getChangedFields() {
    if (!dataManager || !dataManager.extensionComponentsData) return [];
    
    const currentData = collectExtensionComponentSelections();
    const originalData = dataManager.extensionComponentsData;
    const changedFields = [];
    
    // Check for selection changes
    const currentSet = new Set(currentData.selectedElements);
    const originalSet = new Set(originalData.selectedElements || []);
    
    // New selections
    for (const element of currentSet) {
        if (!originalSet.has(element)) {
            const [componentId, elementId] = element.split(':');
            changedFields.push({
                field: element,
                displayName: `Extension Component ${componentId}: Element ${elementId}`,
                oldValue: 'Not selected',
                newValue: 'Selected'
            });
        }
    }
    
    // Removed selections
    for (const element of originalSet) {
        if (!currentSet.has(element)) {
            const [componentId, elementId] = element.split(':');
            changedFields.push({
                field: element,
                displayName: `Extension Component ${componentId}: Element ${elementId}`,
                oldValue: 'Selected',
                newValue: 'Not selected'
            });
        }
    }
    
    // Check for component assignment changes
    const originalComponents = originalData.componentAssignments || [];
    const currentComponents = currentData.componentAssignments || [];
    
    // Find added components
    const originalComponentSet = new Set(originalComponents);
    const currentComponentSet = new Set(currentComponents);
    
    for (const component of currentComponentSet) {
        if (!originalComponentSet.has(component)) {
            changedFields.push({
                field: `component_${component}`,
                displayName: `Extension Component Assignment`,
                oldValue: 'Not assigned',
                newValue: component
            });
        }
    }
    
    // Find removed components
    for (const component of originalComponentSet) {
        if (!currentComponentSet.has(component)) {
            changedFields.push({
                field: `component_${component}`,
                displayName: `Extension Component Assignment`,
                oldValue: component,
                newValue: 'Not assigned'
            });
        }
    }
    
    return changedFields;
}

function updateSaveButtonAppearance() {
    const saveButton = document.querySelector('button[onclick="handleSave()"]');
    const hasChanges = hasActualChanges();
    
    if (saveButton) {
        if (hasChanges) {
            saveButton.style.background = '#28a745'; // Green when changes exist
            saveButton.style.fontWeight = 'bold';
            saveButton.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.3)';
        } else {
            saveButton.style.background = '#6c757d'; // Gray when no changes
            saveButton.style.fontWeight = 'normal';
            saveButton.style.boxShadow = 'none';
        }
    }
}

async function handleSave(showAlert = true, allowNavigationWithoutChanges = false) {
    console.log('DEBUG: ExtensionComponentDataModel - handleSave called');
    
    // Validate that we have a specification ID
    if (!dataManager) {
        console.error('DEBUG: ExtensionComponentDataModel - Data manager not initialized');
        alert("Error: Data manager not initialized.");
        return false;
    }

    if (!dataManager.currentSpecId) {
        console.error('DEBUG: ExtensionComponentDataModel - No specification ID available');
        alert("Error: No specification ID found. Please ensure the specification was created in Step 1 (Identifying Information).");
        return false;
    }

    // Check if there are actual changes
    const changedFields = getChangedFields();
    
    if (changedFields.length === 0) {
        // If this is for navigation and no changes are detected, allow proceeding
        if (allowNavigationWithoutChanges) {
            console.log('DEBUG: ExtensionComponentDataModel - No changes detected, but allowing navigation');
            return true;
        }
        
        // Update save button appearance since no actual changes exist
        updateSaveButtonAppearance();
        
        // Show "no changes" modal only for direct save attempts
        const modalHtml = `
            <div id="noChangesModal" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 1002; display: flex;
                align-items: center; justify-content: center;">
                <div style="
                    background: white; border-radius: 8px; padding: 24px; max-width: 400px;
                    width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <h3 style="margin: 0 0 16px 0; color: #333;">
                        <i class="fa-solid fa-info-circle" style="color: #17a2b8; margin-right: 8px;"></i>
                        No Changes Detected
                    </h3>
                    <p style="margin: 0 0 20px 0; color: #666;">
                        There are no unsaved changes to your extension component selections. The current selections match the last saved version.
                    </p>
                    <div style="text-align: center;">
                        <button onclick="document.getElementById('noChangesModal').remove()" style="
                            padding: 8px 16px; background: #17a2b8; color: white; border: none;
                            border-radius: 4px; cursor: pointer; font-size: 14px;">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        return false;
    }

    // Save directly without confirmation modal
    console.log('DEBUG: ExtensionComponentDataModel - Proceeding with save operation');
    
    // Collect extension elements data for API submission
    const apiExtensionElements = [];
    
    document.querySelectorAll('.component-section').forEach(section => {
        const extensionComponentID = section.querySelector('.component-select').value;
        if (extensionComponentID) {
            section.querySelectorAll('.element-selector:checked').forEach(checkbox => {
                const businessTermID = checkbox.getAttribute('data-id');
                
                // Get the element data from the table row
                const row = checkbox.closest('tr');
                const cells = row.querySelectorAll('td');
                
                // Extract data based on table column positions
                // Columns: ID, Level, Cardinality, Business Term, Usage Note, Justification, Data Type, Type of Extension, Core Conformant, Checkbox
                const elementApiData = {
                    extensionComponentID: extensionComponentID,
                    businessTermID: businessTermID,
                    cardinality: cells[2]?.textContent?.trim() || '',
                    usageNote: cells[4]?.textContent?.trim() || '',
                    justification: cells[5]?.textContent?.trim() || '',
                    typeOfExtension: cells[7]?.textContent?.trim() || '' // This maps to extensionType in the response but API still expects typeOfExtension
                };
                
                apiExtensionElements.push(elementApiData);
            });
        }
    });

    console.log('DEBUG: ExtensionComponentDataModel - API extension elements:', apiExtensionElements);
    console.log('DEBUG: ExtensionComponentDataModel - Saving to API with spec ID:', dataManager.currentSpecId);

    try {
        // Save extension elements to API
        const apiResults = await dataManager.saveExtensionElementsSimplified(
            dataManager.currentSpecId, 
            apiExtensionElements
        );
        
        console.log('DEBUG: ExtensionComponentDataModel - API save results:', apiResults);
        
        if (showAlert) {
            if (apiExtensionElements.length > 0) {
                alert(`Extension components saved successfully!\nDeleted: ${apiResults.deletedCount}, Added: ${apiResults.addedCount}`);
            } else {
                alert(`Extension components cleared successfully!\nDeleted: ${apiResults.deletedCount}`);
            }
        }
        
        // Update baseline data after successful save to prevent "unsaved changes" warnings
        updateBaselineData();
        console.log('DEBUG: ExtensionComponentDataModel - Baseline updated after successful save');
        
        updateSaveButtonAppearance();
        return true; // Return success status
        
    } catch (error) {
        console.error('DEBUG: ExtensionComponentDataModel - API save error:', error);
        alert("Error saving extension components to server: " + error.message);
        return false; // Return failure status
    }
}

function handleCancel() {
    if (hasActualChanges() && !confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        return;
    }
    
    // Use the proper return page logic
    const returnPage = localStorage.getItem("returnToPage") || "mySpecifications.html";
    console.log('DEBUG: ExtensionComponentDataModel - Returning to:', returnPage);
    window.location.href = returnPage;
}

async function saveAndGoToNextStep() {
    const saveSuccessful = await handleSave(false, true); // Don't show alert, allow navigation without changes
    if (saveSuccessful) {
        window.location.href = 'additionalRequirements.html';
    }
    // If save failed, handleSave() will show the error and we stay on current page
}

function checkForWorkflowRecovery() {
    const workflowDataPreserved = localStorage.getItem('workflowDataPreserved');
    const preservedFromPage = localStorage.getItem('preservedFromPage');
    
    if (workflowDataPreserved === 'true' && preservedFromPage === 'ExtensionComponentDataModel') {
        const preservedSpec = localStorage.getItem('preserved_selectedSpecification');
        const preservedWorkingData = localStorage.getItem('preserved_workingData_extensionComponents');
        const preservedBreadcrumb = localStorage.getItem('preserved_breadcrumbContext');
        
        showNotification(
            'Your previous session expired, but your workflow data has been preserved. Would you like to restore it?',
            'info',
            [
                {
                    text: 'Restore',
                    action: () => {
                        if (preservedSpec) {
                            sessionStorage.setItem('selectedSpecification', preservedSpec);
                        }
                        if (preservedWorkingData) {
                            sessionStorage.setItem('workingData_extensionComponents', preservedWorkingData);
                        }
                        if (preservedBreadcrumb) {
                            sessionStorage.setItem('breadcrumbContext', preservedBreadcrumb);
                        }
                        
                        // Clear preserved data
                        localStorage.removeItem('workflowDataPreserved');
                        localStorage.removeItem('preservedFromPage');
                        localStorage.removeItem('preserved_selectedSpecification');
                        localStorage.removeItem('preserved_workingData_extensionComponents');
                        localStorage.removeItem('preserved_breadcrumbContext');
                        
                        showNotification('Workflow data restored successfully!', 'success');
                        
                        // Reload the page to apply restored data
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    }
                },
                {
                    text: 'Start Fresh',
                    action: () => {
                        // Clear preserved data
                        localStorage.removeItem('workflowDataPreserved');
                        localStorage.removeItem('preservedFromPage');
                        localStorage.removeItem('preserved_selectedSpecification');
                        localStorage.removeItem('preserved_workingData_extensionComponents');
                        localStorage.removeItem('preserved_breadcrumbContext');
                        
                        showNotification('Starting with a fresh session.', 'info');
                    }
                }
            ]
        );
    }
}

function setupSessionWarning() {
    // Set up 5-minute session warning
    const sessionWarningTime = 5 * 60 * 1000; // 5 minutes
    
    setTimeout(() => {
        if (window.authManager && window.authManager.isAuthenticated) {
            showNotification(
                'Your session will expire soon. Save your work to avoid losing changes.',
                'warning'
            );
        }
    }, sessionWarningTime);
}

// Utility function for notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000; 
        padding: 15px; border-radius: 5px; color: white; font-weight: bold;
        background-color: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : type === 'error' ? '#dc3545' : '#17a2b8'};
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// --- Global Function Exports for HTML onclick handlers ---
window.saveAndGoToNextStep = saveAndGoToNextStep;
window.addNewComponentSection = addNewComponentSection;
window.handleSave = handleSave;
window.handleCancel = handleCancel;
