// Change detection system using baseline comparison approach
// Note: Deprecated unsavedChanges flag replaced with hasActualChanges() pattern
let baselineData = null;
let dataManager = null;

/**************************************************************
    Initialize data manager and load saved data
 **************************************************************/
async function initializeDataManager() {
    try {
        console.log('AdditionalRequirements: Initializing data manager');
        
        dataManager = new SpecificationDataManager();
        console.log('AdditionalRequirements: Data manager initialized');
        console.log('AdditionalRequirements: Mode:', dataManager.currentMode);
        
        if (dataManager.isEditMode() && dataManager.currentSpecId) {
            console.log('AdditionalRequirements: Loading specification for editing. ID:', dataManager.currentSpecId);
            
            // Load data from API if not already loaded
            if (!dataManager.isDataLoaded) {
                await dataManager.loadSpecificationFromAPI(dataManager.currentSpecId);
            }
            
            // Load additional requirements from API
            try {
                console.log('AdditionalRequirements: Loading additional requirements from API...');
                const apiRequirements = await dataManager.loadAdditionalRequirementsFromAPI(dataManager.currentSpecId);
                console.log('AdditionalRequirements: Loaded from API:', apiRequirements);
                
                // Transform API data to table format
                const tableRequirements = apiRequirements.map(req => ({
                    ID: req.businessTermID || '',
                    Level: req.level || '',
                    Cardinality: req.cardinality || '',
                    BusinessTerm: req.businessTermName || '',
                    Description: req.semanticDescription || '',
                    TypeOfChange: req.typeOfChange || ''
                }));
                
                if (tableRequirements.length > 0) {
                    loadSavedRequirements(tableRequirements);
                }
                
                // Update working data with loaded requirements
                if (!dataManager.workingData) {
                    dataManager.workingData = dataManager.loadWorkingDataFromLocalStorage() || {};
                }
                dataManager.workingData.additionalRequirements = tableRequirements;
                
            } catch (error) {
                console.error('AdditionalRequirements: Error loading from API:', error);
                // Fall back to working data if API fails
                const workingData = dataManager.workingData || dataManager.loadWorkingDataFromLocalStorage();
                if (workingData && workingData.additionalRequirements) {
                    console.log('AdditionalRequirements: Falling back to working data');
                    loadSavedRequirements(workingData.additionalRequirements);
                }
            }
        } else {
            console.log('AdditionalRequirements: Creating new specification or missing spec ID');
            // For new specifications, check if there's any working data
            const workingData = dataManager.loadWorkingDataFromLocalStorage();
            if (workingData && workingData.additionalRequirements) {
                console.log('AdditionalRequirements: Found working additional requirements data');
                loadSavedRequirements(workingData.additionalRequirements);
            }
        }
        
        // Update title with specification name if available
        updatePageTitle();
        
    } catch (error) {
        console.error('AdditionalRequirements: Error initializing data manager:', error);
        throw error;
    }
}

/**************************************************************
    Update page title with specification name
 **************************************************************/
function updatePageTitle() {
    try {
        const titleElement = document.querySelector('.page-Content h1');
        if (titleElement && dataManager && dataManager.workingData && dataManager.workingData.specName) {
            titleElement.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Additional Requirements for: ${dataManager.workingData.specName}`;
        }
    } catch (error) {
        console.error('AdditionalRequirements: Error updating title:', error);
    }
}

/**************************************************************
    Load saved requirements into the table
 **************************************************************/
function loadSavedRequirements(savedRequirements) {
    try {
        console.log('AdditionalRequirements: Loading saved requirements:', savedRequirements);
        
        const tableBody = document.getElementById("additionalRequirementsTable").getElementsByTagName("tbody")[0];
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add saved requirements
        savedRequirements.forEach(req => {
            const newRow = tableBody.insertRow();
            newRow.innerHTML = `
                <td><input type="text" style="width: 100%;" placeholder="ID-X" value="${req.ID || ''}" /></td>
                <td><input type="text" style="width: 100%;" placeholder="+" value="${req.Level || ''}" /></td>
                <td><input type="text" style="width: 100%;" placeholder="1..1" value="${req.Cardinality || ''}" /></td>
                <td><input type="text" style="width: 100%;" placeholder="Name of Additional Requirement" value="${req.BusinessTerm || ''}" /></td>
                <td><textarea style="width: 100%; resize: vertical; min-height: 32px;" placeholder="Description of Additional Requirement">${req.Description || ''}</textarea></td>
                <td>
                    <select style="width: 100%; min-width: 220px;">
                        <option value="Add new information element" ${req.TypeOfChange === "Add new information element" ? "selected" : ""}>Add new information element</option>
                        <option value="Remove an optional element" ${req.TypeOfChange === "Remove an optional element" ? "selected" : ""}>Remove an optional element</option>
                        <option value="Make Semantic definition narrower" ${req.TypeOfChange === "Make Semantic definition narrower" ? "selected" : ""}>Make Semantic definition narrower</option>
                        <option value="Increase number of repetitions" ${req.TypeOfChange === "Increase number of repetitions" ? "selected" : ""}>Increase number of repetitions (e.g. x..1 to x..n)</option>
                        <option value="Decrease number of repetitions" ${req.TypeOfChange === "Decrease number of repetitions" ? "selected" : ""}>Decrease number of repetitions (e.g. x..n to x..1)</option>
                        <option value="Restrict values in an existing list" ${req.TypeOfChange === "Restrict values in an existing list" ? "selected" : ""}>Restrict values in an existing list</option>
                    </select>
                </td>
                <td><button onclick="deleteRow(this)">Delete</button></td>
            `;
            setUnsavedListeners(newRow);
        });
        
        // Reset change detection since we just loaded saved data
        // Set up baseline for change detection with a delay for DOM stability
        setTimeout(() => {
            updateBaselineData();
            setupChangeDetection();
        }, 100);
        
    } catch (error) {
        console.error('AdditionalRequirements: Error loading saved requirements:', error);
    }
}

/**************************************************************
    Set change detection listeners on input elements
 **************************************************************/
function setUnsavedListeners(row) 
{
    row.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => { 
            updateSaveButtonAppearance();
        });
        el.addEventListener('change', () => { 
            updateSaveButtonAppearance();
        });
    });
}

/**************************************************************
    Add a new row to the additional requirements table
 **************************************************************/
function addRow() 
{
    const table = document.getElementById("additionalRequirementsTable").getElementsByTagName("tbody")[0];
    const newRow = table.insertRow();
    newRow.innerHTML = `
        <td><input type="text" style="width: 100%;" placeholder="ID-X" /></td>
        <td><input type="text" style="width: 100%;" placeholder="+" /></td>
        <td><input type="text" style="width: 100%;" placeholder="1..1" /></td>
        <td><input type="text" style="width: 100%;" placeholder="Name of Additional Requirement" /></td>
        <td><textarea style="width: 100%; resize: vertical; min-height: 32px;" placeholder="Description of Additional Requirement"></textarea></td>
        <td>
            <select style="width: 100%; min-width: 220px;">
                <option value="Add new information element">Add new information element</option>
                <option value="Remove an optional element">Remove an optional element</option>
                <option value="Make Semantic definition narrower">Make Semantic definition narrower</option>
                <option value="Increase number of repetitions">Increase number of repetitions (e.g. x..1 to x..n)</option>
                <option value="Decrease number of repetitions">Decrease number of repetitions (e.g. x..n to x..1)</option>
                <option value="Restrict values in an existing list">Restrict values in an existing list</option>
            </select>
        </td>
        <td><button onclick="deleteRow(this)">Delete</button></td>
    `;
    setUnsavedListeners(newRow);
    updateSaveButtonAppearance();
}

/**************************************************************
    Delete a row from the additional requirements table
 **************************************************************/
function deleteRow(button) 
{
    const row = button.parentElement.parentElement;
    row.remove();
    updateSaveButtonAppearance();
}

/**************************************************************
    Save the additional requirements table data
 **************************************************************/
async function saveTable() 
{
    console.log('AdditionalRequirements: saveTable called');
    
    // Check if there are actual changes
    const changedFields = getChangedFields();
    
    if (changedFields.length === 0) {
        // Update save button appearance since there are no actual changes
        updateSaveButtonAppearance();
        
        // Show "no changes" modal
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
                        There are no unsaved changes to your additional requirements. The current data matches the last saved version.
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
        return;
    }

    return new Promise((resolve) => {
        // Show confirmation modal with change details
        showChangeConfirmationModal(changedFields, async () => {
            // User confirmed, proceed with save
            
            const table = document.getElementById("additionalRequirementsTable");
            const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");

            // If there are no rows, save empty array
            const data = [];

            for (let row of rows) 
            {
                const cells = row.getElementsByTagName("td");

                const rowData = 
                {
                    ID: cells[0].querySelector("input") ? cells[0].querySelector("input").value : "",
                    Level: cells[1].querySelector("input") ? cells[1].querySelector("input").value : "",
                    Cardinality: cells[2].querySelector("input") ? cells[2].querySelector("input").value : "",
                    BusinessTerm: cells[3].querySelector("input") ? cells[3].querySelector("input").value : "",
                    Description: cells[4].querySelector("textarea") ? cells[4].querySelector("textarea").value : "",
                    TypeOfChange: cells[5].querySelector("select") ? cells[5].querySelector("select").value : ""
                };

                // Only add rows that have at least some data
                if (rowData.ID || rowData.BusinessTerm || rowData.Description) {
                    data.push(rowData);
                }
            }

            console.log('AdditionalRequirements: Collected data:', data);

            if (!dataManager) {
                console.error('AdditionalRequirements: Data manager not initialized');
                alert("Error: Data manager not initialized.");
                resolve(false);
                return;
            }

            try {
                // Show loading indicator
                const saveButton = document.querySelector('button[onclick*="saveTable"]');
                const originalText = saveButton ? saveButton.textContent : '';
                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent = 'Saving...';
                }

                // Update the working data with additional requirements
                if (!dataManager.workingData) {
                    dataManager.workingData = dataManager.loadWorkingDataFromLocalStorage() || {};
                }
                
                dataManager.workingData.additionalRequirements = data;
                
                // Save to localStorage (working data)
                dataManager.saveWorkingDataToLocalStorage();
                
                // If in edit mode and we have a specification ID, save to API
                if (dataManager.isEditMode() && dataManager.currentSpecId) {
                    console.log('AdditionalRequirements: Saving to API...');
                    await dataManager.saveAdditionalRequirementsToAPI(dataManager.currentSpecId, data);
                    console.log('AdditionalRequirements: Successfully saved to API');
                }
                
                console.log('AdditionalRequirements: Additional requirements saved successfully');
                
                alert("Additional requirements saved successfully!");
                
                // Update baseline for change detection
                updateBaselineData();
                
                // Restore button state
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = originalText;
                }
                
                resolve(true);
                
            } catch (error) {
                console.error('AdditionalRequirements: Error saving:', error);
                
                // Restore button state
                const saveButton = document.querySelector('button[onclick*="saveTable"]');
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = originalText || 'Save';
                }
                
                // Show user-friendly error message
                let errorMessage = "Error saving additional requirements: ";
                if (error.message.includes('Permission denied')) {
                    errorMessage += "You don't have permission to modify this specification.";
                } else if (error.message.includes('HTTP 404')) {
                    errorMessage += "The specification was not found. It may have been deleted.";
                } else if (error.message.includes('HTTP 401')) {
                    errorMessage += "Your session has expired. Please log in again.";
                } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    errorMessage += "Network error. Please check your internet connection and try again.";
                } else {
                    errorMessage += error.message;
                }
                
                alert(errorMessage);
                resolve(false);
            }
        });
    });
}

/**************************************************************
    Cancel the action and navigate back
    If there are unsaved changes, prompt the user for confirmation
 **************************************************************/
function cancelAction() 
{
    console.log('AdditionalRequirements: cancelAction called');
    
    if (hasActualChanges()) 
    {
        if (!confirm("You have unsaved changes. Are you sure you want to leave?")) 
        {
            return;
        }
    }
    
    // Use the proper return page logic
    const returnPage = localStorage.getItem("returnToPage") || "mySpecifications.html";
    console.log('AdditionalRequirements: Returning to:', returnPage);
    window.location.href = returnPage;
}

/**************************************************************
    Navigate to the specification preview page
    Save data first, then navigate
 **************************************************************/
async function goToSpecificationPreview() 
{
    console.log('AdditionalRequirements: goToSpecificationPreview called');
    
    // Auto-save before proceeding
    try {
        await saveTable();
    } catch (error) {
        console.error('AdditionalRequirements: Error auto-saving before navigation:', error);
        // Let the user decide whether to continue or not
        if (!confirm("There was an error saving your changes. Do you want to continue anyway? Your changes may be lost.")) {
            return;
        }
    }
    
    // Update breadcrumb context for next page
    if (window.breadcrumbManager) {
        const context = window.breadcrumbManager.getContext();
        if (context) {
            context.currentPage = 'specificationPreview.html';
            window.breadcrumbManager.updateContext(context);
        }
    }
    
    window.location.href = "specificationPreview.html";
}

/**************************************************************
    Refresh additional requirements data from API
 **************************************************************/
async function refreshFromAPI() 
{
    console.log('AdditionalRequirements: refreshFromAPI called');
    
    if (!dataManager || !dataManager.isEditMode() || !dataManager.currentSpecId) {
        alert("Cannot refresh: Not in edit mode or no specification ID available.");
        return;
    }
    
    try {
        // Show loading indicator
        const refreshButton = document.querySelector('button[onclick="refreshFromAPI().catch(e => console.error(\'Refresh error:\', e))"]');
        const originalText = refreshButton ? refreshButton.textContent : '';
        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.textContent = 'Loading...';
        }
        
        console.log('AdditionalRequirements: Refreshing from API...');
        const apiRequirements = await dataManager.loadAdditionalRequirementsFromAPI(dataManager.currentSpecId);
        console.log('AdditionalRequirements: Refreshed from API:', apiRequirements);
        
        // Transform API data to table format
        const tableRequirements = apiRequirements.map(req => ({
            ID: req.businessTermID || '',
            Level: req.level || '',
            Cardinality: req.cardinality || '',
            BusinessTerm: req.businessTermName || '',
            Description: req.semanticDescription || '',
            TypeOfChange: req.typeOfChange || ''
        }));
        
        // Load into table
        loadSavedRequirements(tableRequirements);
        
        // Update working data
        if (!dataManager.workingData) {
            dataManager.workingData = dataManager.loadWorkingDataFromLocalStorage() || {};
        }
        dataManager.workingData.additionalRequirements = tableRequirements;
        dataManager.saveWorkingDataToLocalStorage();
        
        console.log('AdditionalRequirements: Successfully refreshed from API');
        alert("Additional requirements refreshed from server!");
        
        // Restore button state
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = originalText;
        }
        
    } catch (error) {
        console.error('AdditionalRequirements: Error refreshing from API:', error);
        
        // Restore button state
        const refreshButton = document.querySelector('button[onclick="refreshFromAPI().catch(e => console.error(\'Refresh error:\', e))"]');
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = originalText || 'Refresh';
        }
        
        // Show user-friendly error message
        let errorMessage = "Error refreshing data: ";
        if (error.message.includes('HTTP 404')) {
            errorMessage += "No additional requirements found for this specification.";
        } else if (error.message.includes('HTTP 401')) {
            errorMessage += "Your session has expired. Please log in again.";
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage += "Network error. Please check your internet connection and try again.";
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
    }
}

/**************************************************************
    Change Detection System
 **************************************************************/

// Collect current additional requirements from the table
function collectAdditionalRequirements() {
    const table = document.getElementById("additionalRequirementsTable");
    if (!table) {
        console.log('DEBUG: AdditionalRequirements - Table not found');
        return [];
    }
    
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
    const currentState = [];
    
    for (let row of rows) {
        const cells = row.getElementsByTagName("td");
        const rowData = {
            ID: cells[0].querySelector("input") ? cells[0].querySelector("input").value.trim() : "",
            Level: cells[1].querySelector("input") ? cells[1].querySelector("input").value.trim() : "",
            Cardinality: cells[2].querySelector("input") ? cells[2].querySelector("input").value.trim() : "",
            BusinessTerm: cells[3].querySelector("input") ? cells[3].querySelector("input").value.trim() : "",
            Description: cells[4].querySelector("textarea") ? cells[4].querySelector("textarea").value.trim() : "",
            TypeOfChange: cells[5].querySelector("select") ? cells[5].querySelector("select").value : ""
        };
        
        // Include all rows (even empty ones) to maintain position consistency
        currentState.push(rowData);
    }
    
    console.log('DEBUG: AdditionalRequirements - Collected current requirements:', currentState);
    return currentState;
}

// Check if there are actual changes compared to baseline data
function hasActualChanges() {
    console.log('DEBUG: AdditionalRequirements - hasActualChanges() called');
    
    try {
        const currentState = collectAdditionalRequirements();
        
        if (!baselineData) {
            console.log('DEBUG: AdditionalRequirements - No baseline data, checking if current state has any content');
            // If no baseline, consider it changed if there's any meaningful data
            const hasData = currentState.length > 0 && currentState.some(req => 
                req.ID || req.BusinessTerm || req.Description
            );
            console.log('DEBUG: AdditionalRequirements - Has data without baseline:', hasData);
            return hasData;
        }
        
        // Compare arrays length first
        if (currentState.length !== baselineData.length) {
            console.log('DEBUG: AdditionalRequirements - Length difference detected:', {
                current: currentState.length,
                baseline: baselineData.length
            });
            return true;
        }
        
        // Compare each row
        for (let i = 0; i < currentState.length; i++) {
            const current = currentState[i];
            const baseline = baselineData[i];
            
            if (!baseline || 
                current.ID !== baseline.ID ||
                current.Level !== baseline.Level ||
                current.Cardinality !== baseline.Cardinality ||
                current.BusinessTerm !== baseline.BusinessTerm ||
                current.Description !== baseline.Description ||
                current.TypeOfChange !== baseline.TypeOfChange) {
                console.log('DEBUG: AdditionalRequirements - Row difference detected at index:', i, {
                    current: current,
                    baseline: baseline
                });
                return true;
            }
        }
        
        console.log('DEBUG: AdditionalRequirements - No changes detected');
        return false;
    } catch (error) {
        console.error('DEBUG: AdditionalRequirements - Error in hasActualChanges():', error);
        return false;
    }
}

// Make hasActualChanges globally accessible for breadcrumb manager
window.hasActualChanges = hasActualChanges;

// Get detailed list of changes compared to baseline
function getChangedFields() {
    console.log('DEBUG: AdditionalRequirements - getChangedFields() called');
    
    try {
        const currentState = collectAdditionalRequirements();
        const changes = [];
        
        if (!baselineData) {
            if (currentState.length > 0) {
                const meaningfulRows = currentState.filter(req => req.ID || req.BusinessTerm || req.Description);
                if (meaningfulRows.length > 0) {
                    changes.push(`Added ${meaningfulRows.length} additional requirement(s)`);
                }
            }
            return changes;
        }
        
        // Check for added rows
        if (currentState.length > baselineData.length) {
            const addedCount = currentState.length - baselineData.length;
            changes.push(`Added ${addedCount} requirement(s)`);
        }
        
        // Check for removed rows
        if (currentState.length < baselineData.length) {
            const removedCount = baselineData.length - currentState.length;
            changes.push(`Removed ${removedCount} requirement(s)`);
        }
        
        // Check for modified rows
        const minLength = Math.min(currentState.length, baselineData.length);
        let modifiedCount = 0;
        
        for (let i = 0; i < minLength; i++) {
            const current = currentState[i];
            const baseline = baselineData[i];
            
            if (baseline && (
                current.ID !== baseline.ID ||
                current.Level !== baseline.Level ||
                current.Cardinality !== baseline.Cardinality ||
                current.BusinessTerm !== baseline.BusinessTerm ||
                current.Description !== baseline.Description ||
                current.TypeOfChange !== baseline.TypeOfChange)) {
                modifiedCount++;
            }
        }
        
        if (modifiedCount > 0) {
            changes.push(`Modified ${modifiedCount} requirement(s)`);
        }
        
        console.log('DEBUG: AdditionalRequirements - Changes detected:', changes);
        return changes;
    } catch (error) {
        console.error('DEBUG: AdditionalRequirements - Error in getChangedFields():', error);
        return [];
    }
}

// Update save button appearance based on dirty state
function updateSaveButtonAppearance() {
    const saveButton = document.querySelector('button[onclick*="saveTable"]');
    if (saveButton) {
        const isDirty = hasActualChanges();
        
        if (isDirty) {
            saveButton.style.background = '#28a745'; // Green when dirty
            saveButton.style.fontWeight = 'bold';
            saveButton.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.3)';
        } else {
            saveButton.style.background = '#6c757d'; // Gray when no changes
            saveButton.style.fontWeight = 'normal';
            saveButton.style.boxShadow = 'none';
        }
    }
}

// Show change confirmation modal
function showChangeConfirmationModal(changes, onConfirm) {
    const changesList = changes.map(change => `<li style="margin-bottom: 4px;">${change}</li>`).join('');
    
    const modalHtml = `
        <div id="changeConfirmModal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 1002; display: flex;
            align-items: center; justify-content: center;">
            <div style="
                background: white; border-radius: 8px; padding: 24px; max-width: 500px;
                width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 16px 0; color: #333;">
                    <i class="fa-solid fa-save" style="color: #28a745; margin-right: 8px;"></i>
                    Confirm Save Changes
                </h3>
                <p style="margin: 0 0 12px 0; color: #666;">
                    The following changes will be saved to your additional requirements:
                </p>
                <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #555;">
                    ${changesList}
                </ul>
                <div style="text-align: center; gap: 12px; display: flex; justify-content: center;">
                    <button id="confirmSaveBtn" style="
                        padding: 8px 16px; background: #28a745; color: white; border: none;
                        border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 8px;">
                        Save Changes
                    </button>
                    <button id="cancelSaveBtn" style="
                        padding: 8px 16px; background: #6c757d; color: white; border: none;
                        border-radius: 4px; cursor: pointer; font-size: 14px;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add event listeners
    document.getElementById('confirmSaveBtn').addEventListener('click', () => {
        document.getElementById('changeConfirmModal').remove();
        onConfirm();
    });
    
    document.getElementById('cancelSaveBtn').addEventListener('click', () => {
        document.getElementById('changeConfirmModal').remove();
    });
}

// Set up change detection listeners
function setupChangeDetection() {
    const table = document.getElementById("additionalRequirementsTable");
    if (table) {
        // Listen for all input changes in the table
        table.addEventListener('input', () => {
            updateSaveButtonAppearance();
        });
        
        table.addEventListener('change', () => {
            updateSaveButtonAppearance();
        });
    }
    
    // Initial button appearance update
    updateSaveButtonAppearance();
}

// Function to update baseline data after UI is populated or saved
function updateBaselineData() {
    try {
        const currentRequirements = collectAdditionalRequirements();
        baselineData = currentRequirements;
        console.log('DEBUG: AdditionalRequirements - Baseline data updated:', currentRequirements);
        console.log('DEBUG: AdditionalRequirements - Baseline requirements count:', currentRequirements.length);
        
        // Update save button appearance since baseline has changed
        updateSaveButtonAppearance();
    } catch (error) {
        console.error('DEBUG: AdditionalRequirements - Error updating baseline data:', error);
    }
}

/**************************************************************
    Initialize the additional requirements table and set listeners
    This function is called when the DOM content is fully loaded
 **************************************************************/
document.addEventListener("DOMContentLoaded", async function () 
{
    console.log('AdditionalRequirements: DOM loaded');
    
    try {
        // Initialize data manager first
        await initializeDataManager();
        
        const table = document.getElementById("additionalRequirementsTable");
        const firstRow = table.querySelector("tbody tr");

        if (firstRow) {
            setUnsavedListeners(firstRow);
        }
        
        // Set up change detection if no baseline data was set (new form)
        if (!baselineData) {
            setTimeout(() => {
                updateBaselineData();
                setupChangeDetection();
            }, 100);
        }
        
        console.log('AdditionalRequirements: Initialization complete');
        
    } catch (error) {
        console.error('AdditionalRequirements: Error during initialization:', error);
    }
});

// Add beforeunload warning for unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (hasActualChanges()) {
        e.preventDefault();
        e.returnValue = '';
    }
});