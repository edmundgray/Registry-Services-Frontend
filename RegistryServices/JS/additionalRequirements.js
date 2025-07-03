let unsavedChanges = false;
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
        
        // Reset unsaved changes flag since we just loaded saved data
        unsavedChanges = false;
        
    } catch (error) {
        console.error('AdditionalRequirements: Error loading saved requirements:', error);
    }
}

/**************************************************************
    Set unsaved changes listeners on input elements
 **************************************************************/
function setUnsavedListeners(row) 
{
    row.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => { unsavedChanges = true; });
        el.addEventListener('change', () => { unsavedChanges = true; });
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
    unsavedChanges = true;
}

/**************************************************************
    Delete a row from the additional requirements table
 **************************************************************/
function deleteRow(button) 
{
    const row = button.parentElement.parentElement;
    row.remove();
    unsavedChanges = true;
}

/**************************************************************
    Save the additional requirements table data
 **************************************************************/
async function saveTable() 
{
    console.log('AdditionalRequirements: saveTable called');
    
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
        return;
    }

    try {
        // Show loading indicator
        const saveButton = document.querySelector('button[onclick="saveTable()"]');
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
        unsavedChanges = false;
        
        // Restore button state
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = originalText;
        }
        
    } catch (error) {
        console.error('AdditionalRequirements: Error saving:', error);
        
        // Restore button state
        const saveButton = document.querySelector('button[onclick="saveTable()"]');
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
    }
}

/**************************************************************
    Cancel the action and navigate back
    If there are unsaved changes, prompt the user for confirmation
 **************************************************************/
function cancelAction() 
{
    console.log('AdditionalRequirements: cancelAction called');
    
    if (unsavedChanges) 
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
        
        // Reset unsaved changes flag
        unsavedChanges = false;
        
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
        
        console.log('AdditionalRequirements: Initialization complete');
        
    } catch (error) {
        console.error('AdditionalRequirements: Error during initialization:', error);
    }
});