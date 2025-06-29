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
        const coreInvoiceModelIds = this.currentSpecification.coreInvoiceModelIds || [];
        
        if (coreInvoiceModelIds.length > 0) {
            // Try to fetch the core invoice model elements to get full details
            try {
                // This would typically be loaded from the data manager or API
                console.log('SpecificationPreview: Core invoice model IDs:', coreInvoiceModelIds);
                
                // For now, display the IDs - in a full implementation, you'd fetch the full element details
                coreInvoiceModelIds.forEach(id => {
                    const row = coreInvoiceTableBody.insertRow();
                    row.insertCell().textContent = id;
                    row.insertCell().textContent = 'Core Element'; // Placeholder
                    row.insertCell().textContent = 'Required'; // Placeholder
                });
                
            } catch (error) {
                console.error('SpecificationPreview: Error loading core invoice elements:', error);
                const row = coreInvoiceTableBody.insertRow();
                row.insertCell(0).colSpan = 3;
                row.cells[0].textContent = "Error loading core invoice elements.";
                row.cells[0].style.textAlign = "center";
                row.cells[0].style.color = "red";
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
        
        const extensionTableBody = document.getElementById("previewExtensionTableBody");
        if (!extensionTableBody) return;
        
        extensionTableBody.innerHTML = ''; // Clear placeholders

        // Get extension component data from the specification
        const extensionComponentData = this.currentSpecification.extensionComponentData || [];
        
        if (extensionComponentData.length > 0) {
            console.log('SpecificationPreview: Extension component data:', extensionComponentData);
            
            extensionComponentData.forEach(component => {
                if (component.selectedElements && component.selectedElements.length > 0) {
                    component.selectedElements.forEach(elementId => {
                        const row = extensionTableBody.insertRow();
                        row.insertCell().textContent = elementId;
                        row.insertCell().textContent = component.componentName;
                        row.insertCell().textContent = 'Extension'; // Placeholder
                    });
                }
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
        
        if (additionalRequirements.length > 0) {
            console.log('SpecificationPreview: Additional requirements:', additionalRequirements);
            
            additionalRequirements.forEach(req => {
                const row = additionalRequirementsTableBody.insertRow();
                row.insertCell().textContent = req.ID || '';
                row.insertCell().textContent = req.BusinessTerm || '';
                row.insertCell().textContent = req.TypeOfChange || 'N/A';
            });
        } else {
            const row = additionalRequirementsTableBody.insertRow();
            row.insertCell(0).colSpan = 3;
            row.cells[0].textContent = "No Additional Requirements added.";
            row.cells[0].style.textAlign = "center";
        }
    }

    async submitSpecification() {
        console.log('SpecificationPreview: Submitting specification...');
        
        if (!this.currentSpecification) {
            alert("Error: No specification selected to submit.");
            return;
        }

        try {
            // Update the specification status using the data manager
            if (this.dataManager) {
                console.log('SpecificationPreview: Using data manager to submit specification');
                
                // Update the registry status
                if (!this.dataManager.workingData) {
                    this.dataManager.workingData = this.currentSpecification;
                }
                
                this.dataManager.workingData.registryStatus = "Submitted";
                this.dataManager.workingData["Registry Status"] = "Submitted"; // For backward compatibility
                
                // Save the updated specification
                if (this.dataManager.isEditMode()) {
                    // For edit mode, update the existing specification
                    await this.dataManager.saveSpecificationData();
                } else {
                    // For new specifications, add to the specifications list
                    await this.dataManager.saveNewSpecification();
                }
                
                console.log('SpecificationPreview: Specification submitted successfully via data manager');
                
            } else {
                // Fallback to old localStorage method
                console.log('SpecificationPreview: Using localStorage fallback to submit specification');
                
                const selectedSpecName = localStorage.getItem("selectedSpecification");
                let specifications = JSON.parse(localStorage.getItem("specifications") || "[]");
                const specIndex = specifications.findIndex(spec => spec.specName === selectedSpecName);

                if (specIndex > -1) {
                    specifications[specIndex]["Registry Status"] = "Submitted";
                    localStorage.setItem('specifications', JSON.stringify(specifications));
                } else {
                    // Add new specification to the list
                    this.currentSpecification["Registry Status"] = "Submitted";
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
        
        const confirmed = confirm("Are you sure you want to cancel and return to My Specifications? This will not delete the specification, but it will remain in its current saved state.");
        
        if (confirmed) {
            this.cleanupAndRedirect();
        }
    }

    cleanupAndRedirect() {
        console.log('SpecificationPreview: Cleaning up and redirecting...');
        
        try {
            // Clean up data manager state if available
            if (this.dataManager) {
                this.dataManager.clearWorkingData();
            }
            
            // Clean up old localStorage items for backward compatibility
            localStorage.removeItem("selectedSpecification");
            localStorage.removeItem("editSpecData");
            
            // Determine return page
            const returnPage = localStorage.getItem("returnToPage") || "mySpecifications.html";
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
function submitSpecificationPreview() {
    if (window.specificationPreview) {
        window.specificationPreview.submitSpecification();
    } else {
        console.error('SpecificationPreview: Preview instance not found');
    }
}

function cancelSpecificationPreview() {
    if (window.specificationPreview) {
        window.specificationPreview.cancelPreview();
    } else {
        console.error('SpecificationPreview: Preview instance not found');
    }
}

// Initialize when script loads
console.log('SpecificationPreview: Initializing specification preview module...');
window.specificationPreview = new SpecificationPreview();
