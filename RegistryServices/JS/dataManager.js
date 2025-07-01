// JS/dataManager.js
// Centralized data management for Registry Services specification editing

class SpecificationDataManager {
    constructor() {
        this.currentMode = this.detectMode(); // 'create' or 'edit'
        this.currentSpecId = localStorage.getItem('specificationIdentityId');
        this.originalData = null;
        this.workingData = null;
        this.isDataLoaded = false;
    }

    detectMode() {
        const mode = localStorage.getItem('editMode');
        return mode === 'edit' ? 'edit' : 'create';
    }

    isEditMode() {
        return this.currentMode === 'edit';
    }

    isCreateMode() {
        return this.currentMode === 'create';
    }

    // API call to fetch specification data
    async loadSpecificationFromAPI(identityID) {
        try {
            const apiUrl = `${AUTH_CONFIG.baseUrl}/specifications/${identityID}?PageSize=1000`;
            console.log(`Loading specification from API: ${apiUrl}`);

            const response = await authenticatedFetch(apiUrl, {
                method: 'GET',
                forceAuth: true
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Specification with ID ${identityID} not found`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const apiData = await response.json();
            console.log('API Response for specification:', apiData);

            this.originalData = apiData;
            this.workingData = this.transformApiToFormData(apiData);
            this.isDataLoaded = true;

            return this.workingData;
        } catch (error) {
            console.error('Error loading specification from API:', error);
            throw error;
        }
    }

    // Transform API response to form-friendly structure
    transformApiToFormData(apiResponse) {
        return {
            // General Information fields
            specName: apiResponse.specificationName || '',
            governingEntity: apiResponse.governingEntity || '',
            contactInfo: apiResponse.contactInformation || '',
            sector: apiResponse.sector || '',
            subSector: apiResponse.subSector || '',
            country: apiResponse.country || '',
            purpose: apiResponse.purpose || '',
            
            // Technical Information fields
            specId: apiResponse.specificationIdentifier || '',
            specVersion: apiResponse.specificationVersion || '',
            implDate: this.formatDateForInput(apiResponse.dateOfImplementation),
            coreVersion: apiResponse.coreVersion || '',
            underlyingSpec: apiResponse.underlyingSpecificationIdentifier || '',
            sourceLink: apiResponse.specificationSourceLink || '',
            preferredSyntax: apiResponse.preferredSyntax || '',
            
            // Additional fields for other pages
            specificationType: apiResponse.specificationType || '',
            conformanceLevel: apiResponse.conformanceLevel || '',
            implementationStatus: apiResponse.implementationStatus || '',
            registrationStatus: apiResponse.registrationStatus || '',
            
            // Nested data for other pages
            coreInvoiceModelData: apiResponse.specificationCores?.items || [],
            extensionComponentData: apiResponse.specificationExtensionComponents?.items || [],
            
            // Metadata
            identityID: apiResponse.identityID,
            createdDate: apiResponse.createdDate,
            modifiedDate: apiResponse.modifiedDate
        };
    }

    // Transform form data back to API format
    transformFormToApiData(formData) {
        return {
            identityID: this.originalData?.identityID || 0,
            specificationIdentifier: formData.specId || '',
            specificationName: formData.specName || '',
            sector: formData.sector || '',
            specificationVersion: formData.specVersion || '',
            dateOfImplementation: this.formatDateForAPI(formData.implDate),
            country: formData.country || '',
            subSector: formData.subSector || '',
            purpose: formData.purpose || '',
            contactInformation: formData.contactInfo || '',
            governingEntity: formData.governingEntity || '',
            coreVersion: formData.coreVersion || '',
            specificationSourceLink: formData.sourceLink || '',
            underlyingSpecificationIdentifier: formData.underlyingSpec || '',
            preferredSyntax: formData.preferredSyntax || '',
            
            // Additional fields - preserve from original if available
            specificationType: this.originalData?.specificationType || formData.specificationType || '',
            conformanceLevel: this.originalData?.conformanceLevel || formData.conformanceLevel || '',
            implementationStatus: this.originalData?.implementationStatus || 'In Progress',
            registrationStatus: this.originalData?.registrationStatus || 'Draft',
            isCountrySpecification: this.originalData?.isCountrySpecification || true,
            
            // Nested data - preserve from working data if available
            specificationCores: this.workingData?.coreInvoiceModelData ? 
                this.formatCoreInvoiceModelForAPI(this.workingData.coreInvoiceModelData) :
                this.originalData?.specificationCores || { items: [] },
            
            specificationExtensionComponents: this.workingData?.extensionComponentData ? {
                items: this.workingData.extensionComponentData
            } : this.originalData?.specificationExtensionComponents || { items: [] }
        };
    }

    // Save specification to API
    async saveSpecificationToAPI(formData) {
        try {
            const apiData = this.transformFormToApiData(formData);
            const method = this.isEditMode() ? 'PUT' : 'POST';
            const url = this.isEditMode() 
                ? `${AUTH_CONFIG.baseUrl}/specifications/${this.currentSpecId}`
                : `${AUTH_CONFIG.baseUrl}/specifications`;

            console.log(`Saving specification via ${method} to: ${url}`);
            console.log('Data being sent:', apiData);

            const response = await authenticatedFetch(url, {
                method: method,
                body: JSON.stringify(apiData),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                // Try to get error details from response
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage += ` - ${JSON.stringify(errorData)}`;
                    } else {
                        const errorText = await response.text();
                        errorMessage += ` - ${errorText}`;
                    }
                } catch (parseError) {
                    console.warn('Could not parse error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Check if response has content before parsing JSON
            const contentType = response.headers.get('content-type');
            console.log('Response content-type:', contentType);
            
            let result;
            if (contentType && contentType.includes('application/json')) {
                // Check if response has content
                const responseText = await response.text();
                console.log('Response text:', responseText);
                
                if (responseText.trim() === '') {
                    console.log('Empty response received - handling as success without data');
                    result = {}; // Empty result for successful operations that return no data
                } else {
                    try {
                        result = JSON.parse(responseText);
                        console.log('Save response:', result);
                    } catch (jsonError) {
                        console.error('Failed to parse JSON response:', jsonError);
                        console.error('Response text was:', responseText);
                        throw new Error(`Invalid JSON response: ${jsonError.message}`);
                    }
                }
            } else {
                // Non-JSON response - might be successful but with different content type
                const responseText = await response.text();
                console.log('Non-JSON response received:', responseText);
                
                // Handle different scenarios based on status code
                if (response.status === 204) {
                    // No Content - successful operation with no response body
                    result = {};
                } else if (response.status >= 200 && response.status < 300) {
                    // Other successful status - try to extract meaningful info
                    result = { message: responseText || 'Operation completed successfully' };
                } else {
                    throw new Error(`Unexpected response type: ${contentType}, content: ${responseText}`);
                }
            }

            // Update our stored data only if we have meaningful data
            if (result && Object.keys(result).length > 0) {
                this.originalData = result;
                this.workingData = this.transformApiToFormData(result);
            } else {
                console.log('Empty result from API - preserving current working data');
                // Keep current working data if API returns empty response
                if (!this.workingData) {
                    this.workingData = this.transformFormToApiData(formData);
                }
            }

            // If this was a create operation, we now have an identityID
            if (this.isCreateMode() && result && result.identityID) {
                this.currentSpecId = result.identityID.toString();
                localStorage.setItem('specificationIdentityId', this.currentSpecId);
                localStorage.setItem('editMode', 'edit'); // Switch to edit mode
                this.currentMode = 'edit';
                console.log('Switched to edit mode with new ID:', this.currentSpecId);
            } else if (this.isCreateMode() && (!result || !result.identityID)) {
                console.warn('Create operation completed but no identityID returned in response');
                // Handle case where API doesn't return the new ID
                // You might want to generate a temporary ID or handle this differently
            }

            return result || { success: true };
        } catch (error) {
            console.error('Error saving specification to API:', error);
            throw error;
        }
    }

    // Helper method to format core invoice model data for API
    formatCoreInvoiceModelForAPI(coreInvoiceModelData) {
        if (!coreInvoiceModelData) {
            return { items: [] };
        }

        // Handle different data formats
        if (Array.isArray(coreInvoiceModelData)) {
            // If it's just an array of IDs
            return {
                items: coreInvoiceModelData.map(id => ({ id: id }))
            };
        } else if (coreInvoiceModelData.selectedIds && Array.isArray(coreInvoiceModelData.selectedIds)) {
            // If it's an object with selectedIds and typeOfChangeValues
            return {
                items: coreInvoiceModelData.selectedIds.map(id => ({
                    id: id,
                    typeOfChange: coreInvoiceModelData.typeOfChangeValues?.[id] || 'No change'
                }))
            };
        } else if (coreInvoiceModelData.items) {
            // If it's already in the API format
            return coreInvoiceModelData;
        }

        // Fallback
        return { items: [] };
    }

    // Utility functions
    formatDateForInput(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format for HTML date input
        } catch (e) {
            return '';
        }
    }

    formatDateForAPI(dateString) {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            return date.toISOString(); // Full ISO string for API
        } catch (e) {
            return null;
        }
    }

    // Save working data to localStorage for cross-page persistence
    saveWorkingDataToLocalStorage() {
        if (this.workingData) {
            localStorage.setItem('currentSpecificationData', JSON.stringify(this.workingData));
            localStorage.setItem('selectedSpecification', this.workingData.specName || 'New Specification');
        }
    }

    // Load working data from localStorage
    loadWorkingDataFromLocalStorage() {
        const stored = localStorage.getItem('currentSpecificationData');
        if (stored) {
            this.workingData = JSON.parse(stored);
            return this.workingData;
        }
        return null;
    }

    // Clear all editing state
    clearEditingState() {
        localStorage.removeItem('editMode');
        localStorage.removeItem('specificationIdentityId');
        localStorage.removeItem('selectedSpecification');
        localStorage.removeItem('currentSpecificationData');
        this.currentMode = 'create';
        this.currentSpecId = null;
        this.originalData = null;
        this.workingData = null;
        this.isDataLoaded = false;
    }

    // Initialize for editing an existing specification
    static initializeForEdit(identityID) {
        console.log('DEBUG: SpecificationDataManager.initializeForEdit called with ID:', identityID);
        console.log('DEBUG: SpecificationDataManager.initializeForEdit - ID type:', typeof identityID);
        
        localStorage.setItem('editMode', 'edit');
        localStorage.setItem('specificationIdentityId', identityID.toString());
        
        console.log('DEBUG: SpecificationDataManager.initializeForEdit - Stored values:');
        console.log('  - editMode:', localStorage.getItem('editMode'));
        console.log('  - specificationIdentityId:', localStorage.getItem('specificationIdentityId'));
        
        return new SpecificationDataManager();
    }

    // Initialize for creating a new specification
    static initializeForCreate() {
        localStorage.setItem('editMode', 'create');
        localStorage.removeItem('specificationIdentityId');
        return new SpecificationDataManager();
    }
}

// Make it globally available
window.SpecificationDataManager = SpecificationDataManager;
