// SPDX-FileCopyrightText: 2025 CEN - European Committee for Standardization
// SPDX-License-Identifier: EUPL-1.2
/**
 * Specification Preview Module
 * Handles specification preview functionality with centralized data management
 */

class SpecificationPreview {
    constructor() {
        this.dataManager = null;
        this.currentSpecification = null;
        this.init();
    }

    init() {
        console.log('SpecificationPreview: Initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializePreview());
        } else {
            this.initializePreview();
        }
    }

    async initializePreview() {
        console.log('SpecificationPreview: Setting up preview...');
        
        try {
            // Initialize data manager
            await this.initializeDataManager();
            
            // Update title and populate preview tables
            this.updateTitle();
            await this.populatePreviewTables();
            
          
            
        } catch (error) {
            console.error('SpecificationPreview: Error during initialization:', error);
            alert('Error loading specification preview: ' + error.message);
        }
    }

    async initializeDataManager() {
        try {
            console.log('SpecificationPreview: Initializing data manager');
            
            this.dataManager = new SpecificationDataManager();
            console.log('SpecificationPreview: Data manager initialized');
            console.log('SpecificationPreview: Mode:', this.dataManager.currentMode);
            
            if (this.dataManager.isEditMode() && this.dataManager.currentSpecId) {
                console.log('SpecificationPreview: Loading specification for preview. ID:', this.dataManager.currentSpecId);
                
                // Load data from API if not already loaded
                if (!this.dataManager.isDataLoaded) {
                    await this.dataManager.loadSpecificationFromAPI(this.dataManager.currentSpecId);
                }
                
                // Get the working data
                this.currentSpecification = this.dataManager.workingData || this.dataManager.loadWorkingDataFromLocalStorage();
                // After loading the main specification, explicitly load core elements
                // since they are not embedded in the main /specifications/{id} API response.
                try {
                    console.log('SpecificationPreview: Explicitly loading core elements from API for preview.');
                    const coreElementsLoaded = await this.dataManager.loadCoreElementsFromAPI(this.dataManager.currentSpecId);

                    // Attach the loaded core elements data to the current specification object
                    // The structure from loadCoreElementsFromAPI (selectedIds, typeOfChangeValues etc.) is what populateCoreInvoiceTable expects.
                    if (this.currentSpecification) {
                        this.currentSpecification.coreInvoiceModelData = coreElementsLoaded;
                        console.log('SpecificationPreview: Attached loaded core elements to currentSpecification:', coreElementsLoaded.selectedIds.length, 'elements.');
                    } else {
                        console.warn('SpecificationPreview: currentSpecification is null, cannot attach core elements.');
                    }
                } catch (coreLoadError) {
                    console.error('SpecificationPreview: Error explicitly loading core elements for preview:', coreLoadError);
                    // Set to empty to prevent errors down the line if load fails
                    if (this.currentSpecification) {
                        this.currentSpecification.coreInvoiceModelData = { selectedIds: [], typeOfChangeValues: {} };
                    }
                }

                // Explicitly load additional requirements from API for preview
                try {
                    console.log('SpecificationPreview: Explicitly loading additional requirements from API for preview.');
                    const additionalRequirementsLoaded = await this.dataManager.loadAdditionalRequirementsFromAPI(this.dataManager.currentSpecId);

                    // Attach the loaded additional requirements data to the current specification object
                    if (this.currentSpecification) {
                        this.currentSpecification.additionalRequirements = additionalRequirementsLoaded;
                        console.log('SpecificationPreview: Attached loaded additional requirements to currentSpecification:', additionalRequirementsLoaded.length, 'elements.');
                        console.log('SpecificationPreview: Sample loaded additional requirements:', additionalRequirementsLoaded.slice(0, 3)); // Log first 3 for inspection
                    } else {
                        console.warn('SpecificationPreview: currentSpecification is null, cannot attach additional requirements.');
                    }
                } catch (additionalReqsError) {
                    console.error('SpecificationPreview: Error explicitly loading additional requirements for preview:', additionalReqsError);
                    // Set to empty to prevent errors down the line if load fails
                    if (this.currentSpecification) {
                        this.currentSpecification.additionalRequirements = [];
                    }
                }
                console.log('SpecificationPreview: Working data loaded:', this.currentSpecification);
                
            } else {
                console.log('SpecificationPreview: Loading working data for new specification');
                // For new specifications, get working data
                this.currentSpecification = this.dataManager.loadWorkingDataFromLocalStorage();
                console.log('SpecificationPreview: Working data loaded:', this.currentSpecification);
            }
            
            if (!this.currentSpecification) {
                // Fallback to old localStorage method for backward compatibility
                console.log('SpecificationPreview: Falling back to old localStorage method');
                const selectedSpecName = localStorage.getItem("selectedSpecification");
                if (selectedSpecName) {
                    const specifications = JSON.parse(localStorage.getItem("specifications") || "[]");
                    this.currentSpecification = specifications.find(spec => spec.specName === selectedSpecName);
                    console.log('SpecificationPreview: Found specification via localStorage fallback:', this.currentSpecification);
                }
            }
            
            if (!this.currentSpecification) {
                throw new Error('No specification found for preview');
            }
            
        } catch (error) {
            console.error('SpecificationPreview: Error initializing data manager:', error);
            throw error;
        }
    }

    updateTitle() {
        const titleElement = document.querySelector('.page-Content h1');
        if (titleElement && this.currentSpecification && this.currentSpecification.specName) {
            titleElement.innerHTML += ` for: ${this.currentSpecification.specName}`;
        }
    }

    async populatePreviewTables() {
        console.log('SpecificationPreview: Populating preview tables...');
        
        if (!this.currentSpecification) {
            console.error('SpecificationPreview: No specification data available');
            return;
        }

        try {
            // Populate Core Invoice Model Table
            await this.populateCoreInvoiceTable();
            
            // Populate Extension Component Table
            await this.populateExtensionComponentTable();
            
            // Populate Additional Requirements Table
            await this.populateAdditionalRequirementsTable();
            
        } catch (error) {
            console.error('SpecificationPreview: Error populating tables:', error);
        }
    }

    async populateCoreInvoiceTable() {
        console.log('SpecificationPreview: Populating Core Invoice Model table...');
        
        const coreInvoiceTableBody = document.getElementById("previewCoreInvoiceTableBody");
        if (!coreInvoiceTableBody) return;
        
        coreInvoiceTableBody.innerHTML = ''; // Clear placeholders

        // Get core invoice model data from the specification
        
        
        const selectedCoreIds = this.currentSpecification.coreInvoiceModelData?.selectedIds || [];
        const typeOfChangeValues = this.currentSpecification.coreInvoiceModelData?.typeOfChangeValues || {};
        console.log('SpecificationPreview: DEBUG - Content of coreInvoiceModelData (forcing expansion):'); console.log('  Selected Core IDs (array):', selectedCoreIds); console.log('  Selected Core IDs count:', selectedCoreIds.length); console.log('  Type of Change Values (object):', typeOfChangeValues);

        if (selectedCoreIds.length > 0) {
            console.log('SpecificationPreview: Core invoice model elements found:', selectedCoreIds.length);
            // Try to fetch the core invoice model elements to get full details
            try {
                
                
                const coreApiUrl = `${AUTH_CONFIG.baseUrl}/coreinvoicemodels`;
                console.log('SpecificationPreview: Fetching all core invoice models from API for detailed info:', coreApiUrl);

                const response = await authenticatedFetch(coreApiUrl, { method: 'GET' });
                if (!response.ok) throw new Error('Failed to fetch core invoice models for preview');
                const apiData = await response.json();
                const allCoreElements = Array.isArray(apiData) ? apiData : (apiData.items || []);

                console.log('SpecificationPreview: All core elements fetched from API:', allCoreElements.length, 'elements.');

                // For now, display the IDs - in a full implementation, you'd fetch the full element details
                selectedCoreIds.forEach(id => {
                    const row = coreInvoiceTableBody.insertRow();
                    const elementDetails = allCoreElements.find(el => el.id === id || el.ID === id || el.businessTermID === id);

                    const businessTerm = elementDetails?.businessTerm || elementDetails?.BusinessTerm || `Unknown Term for ${id}`;
                    const typeOfChange = typeOfChangeValues[id] || 'No change'; 

                    row.insertCell().textContent = id;
                    row.insertCell().textContent = businessTerm; // Placeholder
                    row.insertCell().textContent = typeOfChange; // Placeholder
                });
                
            } catch (error) {
                console.error('SpecificationPreview: Error loading core invoice elements:', error);
                const row = coreInvoiceTableBody.insertRow();
                row.insertCell(0).colSpan = 3;
                row.cells[0].textContent = "Error loading core invoice elements.";
                row.cells[0].style.textAlign = "center";
                row.cells[0].style.color = "red";

                selectedCoreIds.forEach(id => {
                const row = coreInvoiceTableBody.insertRow();
                const typeOfChange = typeOfChangeValues[id] || 'No change';
                row.insertCell().textContent = id;
                row.insertCell().textContent = 'Unknown Term'; 
                row.insertCell().textContent = typeOfChange;
                });
            }
        } else {
            const row = coreInvoiceTableBody.insertRow();
            row.insertCell(0).colSpan = 3;
            row.cells[0].textContent = "No Core Invoice Model elements selected.";
            row.cells[0].style.textAlign = "center";
        }
    }

    async populateExtensionComponentTable() {
        console.log('SpecificationPreview: Populating Extension Component table...');
        
        const extensionTableBody = document.getElementById("previewExtensionComponentTableBody");
        if (!extensionTableBody) return;
        
        extensionTableBody.innerHTML = ''; // Clear placeholders

        // Get extension component data from the specification
        const extensionComponentData = this.currentSpecification.extensionComponentData || [];
        
        if (extensionComponentData.length > 0) {
            console.log('SpecificationPreview: Extension component data found:', extensionComponentData.length, 'elements.');
            console.log('SpecificationPreview: Sample extension element data (first item):', extensionComponentData[0]);

            extensionComponentData.forEach(element => { // CORRECT: Iterate directly over 'element'
                const row = extensionTableBody.insertRow();

                // Extract data from the element object
                const id = element.businessTermID || element.ID || 'N/A'; // Use businessTermID or ID
                const businessTerm = element.extBusinessTerm || element.BusinessTerm || 'N/A'; // Use extBusinessTerm for display
                const extensionComponent = element.extensionComponentID || element.Component || 'N/A'; // Use extensionComponentID for component name

                row.insertCell().textContent = id;
                row.insertCell().textContent = businessTerm;
                row.insertCell().textContent = extensionComponent; // Use the actual component identifier
            });
        } else {
            const row = extensionTableBody.insertRow();
            row.insertCell(0).colSpan = 3;
            row.cells[0].textContent = "No Extension Components added.";
            row.cells[0].style.textAlign = "center";
        }
    }

    async populateAdditionalRequirementsTable() {
        console.log('SpecificationPreview: Populating Additional Requirements table...');
        
        const additionalRequirementsTableBody = document.getElementById("previewAdditionalRequirementsTableBody");
        if (!additionalRequirementsTableBody) return;
        
        additionalRequirementsTableBody.innerHTML = ''; // Clear placeholders

        // Get additional requirements data from the specification
        const additionalRequirements = this.currentSpecification.additionalRequirements || [];
        console.log('SpecificationPreview: DEBUG - Data received by populateAdditionalRequirementsTable:', additionalRequirements); if (additionalRequirements.length > 0) { console.log('SpecificationPreview: DEBUG - First additional requirement item:', additionalRequirements[0]); } 
        
        if (additionalRequirements.length > 0) {
            console.log('SpecificationPreview: Additional requirements:', additionalRequirements);
            
            additionalRequirements.forEach(req => {
                const row = additionalRequirementsTableBody.insertRow();
                row.insertCell().textContent = req.businessTermID || '';
                row.insertCell().textContent = req.businessTermName || '';
                row.insertCell().textContent = req.typeOfChange || 'N/A';
            });
        } else {
            const row = additionalRequirementsTableBody.insertRow();
            row.insertCell(0).colSpan = 3;
            row.cells[0].textContent = "No Additional Requirements added.";
            row.cells[0].style.textAlign = "center";
        }
    }

    populateRegistryStatusDropdown() {
        const dropdown = document.getElementById("registryStatusDropdown");
        if (dropdown && this.currentSpecification && (this.currentSpecification.registrationStatus || this.currentSpecification.implementationStatus)) {
            const currentStatus = this.currentSpecification.registrationStatus || this.currentSpecification.implementationStatus;
            dropdown.value = currentStatus;
            console.log(`DEBUG: Preview Registry Status dropdown populated with: ${currentStatus}`);
        } else if (dropdown) {
            dropdown.value = ""; 
            console.log('DEBUG: No status found for preview dropdown, setting to empty.');
        }
    }

    setupRegistryStatusUpdateListener() {
        const updateButton = document.getElementById("updateStatusButton");
        const dropdown = document.getElementById("registryStatusDropdown");

        if (updateButton && dropdown && this.currentSpecification && this.currentSpecification.identityID) {
            updateButton.onclick = async () => {
                const newStatus = dropdown.value;
                if (!newStatus) {
                    alert("Please select a status to update.");
                    return;
                }
                if (newStatus === this.currentSpecification.registrationStatus) {
                    alert("Status is already set to " + newStatus + ". No update needed.");
                    return;
                }

                if (!confirm(`Are you sure you want to change the Registry Status to "${newStatus}"?`)) {
                    return;
                }

                try {
                    
                    updateButton.textContent = 'Updating...';
                    updateButton.disabled = true;

                    
                    await this.dataManager.updateSpecificationStatus(this.currentSpecification.identityID, newStatus);

                    alert(`Registry Status for "${this.currentSpecification.specName}" updated to "${newStatus}" successfully!`);
                    
                    this.currentSpecification.registrationStatus = newStatus;
                    this.populateRegistryStatusDropdown(); 
                    
                } catch (error) {
                    console.error('Error updating Registry Status:', error);
                    alert('Failed to update Registry Status: ' + error.message);
                } finally {
                    
                    updateButton.textContent = 'Update Status';
                    updateButton.disabled = false;
                }
            };
            console.log('DEBUG: Preview Registry Status update listener attached.');
        } else {
            console.warn('DEBUG: Could not set up Preview Registry Status update listener (elements or spec.identityID missing).');
        }
    }

    async initializePreview() {
        console.log('SpecificationPreview: Setting up preview...');
        
        try {
            // Initialize data manager
            await this.initializeDataManager();
            
            // Update title and populate preview tables
            this.updateTitle();
            await this.populatePreviewTables();
            
          

            // NEW: Populate the dropdown and set up its listener
            this.populateRegistryStatusDropdown();
            this.setupRegistryStatusUpdateListener();
            
        } catch (error) {
            console.error('SpecificationPreview: Error during initialization:', error);
            alert('Error loading specification preview: ' + error.message);
        }
    }


    async submitSpecification() {
        console.log('SpecificationPreview: Submitting specification...');
        
        if (!this.currentSpecification) {
            alert("Error: No specification selected to submit.");
            return;
        }

        // Show submission confirmation modal
        return new Promise((resolve) => {
            this.showSubmissionConfirmationModal(() => {
                this.performSubmission().then(resolve).catch(resolve);
            });
        });
    }

    showSubmissionConfirmationModal(onConfirm) {
        const modalHtml = `
            <div id="submitConfirmModal" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 1002; display: flex;
                align-items: center; justify-content: center;">
                <div style="
                    background: white; border-radius: 8px; padding: 24px; max-width: 500px;
                    width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <h3 style="margin: 0 0 16px 0; color: #333;">
                        <i class="fa-solid fa-paper-plane" style="color: #28a745; margin-right: 8px;"></i>
                        Confirm Specification Submission
                    </h3>
                    <p style="margin: 0 0 12px 0; color: #666;">
                        You are about to submit the specification "<strong>${this.currentSpecification.specName}</strong>" to the registry.
                    </p>
                    <p style="margin: 0 0 20px 0; color: #666;">
                        Once submitted, this specification will be processed by the registry administrators. Are you sure you want to proceed?
                    </p>
                    <div style="text-align: center; gap: 12px; display: flex; justify-content: center;">
                        <button id="confirmSubmitBtn" style="
                            padding: 8px 16px; background: #28a745; color: white; border: none;
                            border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 8px;">
                            Submit Specification
                        </button>
                        <button id="cancelSubmitBtn" style="
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
        document.getElementById('confirmSubmitBtn').addEventListener('click', () => {
            document.getElementById('submitConfirmModal').remove();
            onConfirm();
        });
        
        document.getElementById('cancelSubmitBtn').addEventListener('click', () => {
            document.getElementById('submitConfirmModal').remove();
        });
    }

    async performSubmission() {

        try {
            // Update the specification status using the data manager
            if (this.dataManager) {
                console.log('SpecificationPreview: Using data manager to submit specification');
                
                // Update the registry status
                if (!this.dataManager.workingData) {
                    this.dataManager.workingData = this.currentSpecification;
                }
                
                // Update the registration status in working data
                this.dataManager.workingData.registrationStatus = "Submitted";
                this.dataManager.workingData["Registry Status"] = "Submitted"; // For backward compatibility
                
                // Also update the current specification object
                this.currentSpecification.registrationStatus = "Submitted";
                this.currentSpecification["Registry Status"] = "Submitted";
                
                console.log('SpecificationPreview: DEBUG - Registration Status set to "Submitted" in workingData:', this.dataManager.workingData.registrationStatus);
                console.log('SpecificationPreview: DEBUG - Mode:', this.dataManager.isEditMode() ? 'Edit' : 'Create');
                
                // Save the updated specification using the working data as form data
                // The saveSpecificationToAPI method will handle the transformation
                const formData = this.dataManager.workingData;
                await this.dataManager.saveSpecificationToAPI(formData);
                
                console.log('SpecificationPreview: Specification submitted successfully via data manager');
                
            } else {
                // Fallback to old localStorage method
                console.log('SpecificationPreview: Using localStorage fallback to submit specification');
                
                const selectedSpecName = localStorage.getItem("selectedSpecification");
                let specifications = JSON.parse(localStorage.getItem("specifications") || "[]");
                const specIndex = specifications.findIndex(spec => spec.specName === selectedSpecName);

                if (specIndex > -1) {
                    specifications[specIndex]["Registry Status"] = "Submitted";
                    specifications[specIndex].registrationStatus = "Submitted"; // Ensure both field names are updated
                    localStorage.setItem('specifications', JSON.stringify(specifications));
                } else {
                    // Add new specification to the list
                    this.currentSpecification["Registry Status"] = "Submitted";
                    this.currentSpecification.registrationStatus = "Submitted"; // Ensure both field names are updated
                    specifications.push(this.currentSpecification);
                    localStorage.setItem('specifications', JSON.stringify(specifications));
                }
            }
            
            alert(`Specification '${this.currentSpecification.specName}' submitted successfully!`);
            
            // Clean up and redirect
            this.cleanupAndRedirect();
            
        } catch (error) {
            console.error('SpecificationPreview: Error submitting specification:', error);
            alert("Error submitting specification: " + error.message);
        }
    }

    cancelPreview() {
        console.log('SpecificationPreview: Canceling preview...');
        
        const confirmed = confirm("Are you sure you want to cancel and return to the previous page? The specification will remain in its current saved state.");
        
        if (confirmed) {
            this.cleanupAndRedirect();
        }
    }

    cleanupAndRedirect() {
        console.log('SpecificationPreview: Cleaning up and redirecting...');
        
        try {
            // Clean up data manager state if available
            if (this.dataManager) {
                this.dataManager.clearEditingState();
            }
            
            // Clean up old localStorage items for backward compatibility
            localStorage.removeItem("selectedSpecification");
            localStorage.removeItem("editSpecData");
            
            // Determine return page
            let returnPage = "mySpecifications.html"; // Default return page
            if (window.breadcrumbManager) {
                const context = window.breadcrumbManager.getContext();
                if (context && context.source) {
                     console.log('SpecificationPreview: Using breadcrumb source for redirection:', context.source);
                     const sourceMap = {
                        'mySpecs': 'mySpecifications.html',
                        'registry': 'eInvoicingSpecificationRegistry.html',
                        'govEntity': 'governingEntityList.html'
                    };
                    if (sourceMap[context.source]) {
                        returnPage = sourceMap[context.source];
                    } else {
                        console.warn('SpecificationPreview: Unknown breadcrumb source:', context.source);
                    }

                } else {
                    console.warn('SpecificationPreview: Breadcrumb context or source not found, using default fallback.');
                }
                window.breadcrumbManager.clearContext();
            }
            
            localStorage.removeItem("returnToPage");
            console.log('SpecificationPreview: Redirecting to:', returnPage);
            window.location.href = returnPage;
            
        } catch (error) {
            console.error('SpecificationPreview: Error during cleanup:', error);
            // Still redirect even if cleanup fails
            window.location.href = "mySpecifications.html";
        }
    }

   
}

// Global functions for backward compatibility


// Initialize when script loads
console.log('SpecificationPreview: Initializing specification preview module...');
window.specificationPreview = new SpecificationPreview();
