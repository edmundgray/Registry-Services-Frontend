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
            // Handle date string to avoid timezone conversion issues
            // If the date string is already in YYYY-MM-DD format, use it directly
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                return dateString;
            }
            
            // For ISO datetime strings, extract just the date part to avoid timezone shifts
            if (dateString.includes('T')) {
                return dateString.split('T')[0];
            }
            
            // For other formats, parse carefully to avoid timezone issues
            const date = new Date(dateString + 'T00:00:00'); // Force local time interpretation
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.warn('Error formatting date for input:', e, 'dateString:', dateString);
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

    // Simplified Core Elements API Methods
    async loadCoreElementsFromAPI(specificationId, pageSize = 1000) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/coreElements?pageSize=${pageSize}`;
            
            console.log(`Loading core elements from: ${url}`);
            
            const response = await authenticatedFetch(url);

            console.log('Core elements response status:', response.status);

            if (!response.ok) {
                let errorMessage = `Failed to load core elements! status: ${response.status}`;
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
                    console.warn('Could not parse core elements error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let result = null;

            if (contentType && contentType.includes('application/json')) {
                const responseText = await response.text();
                if (responseText.trim()) {
                    result = JSON.parse(responseText);
                } else {
                    result = { items: [], metadata: { totalCount: 0 } };
                }
            } else {
                result = { items: [], metadata: { totalCount: 0 } };
            }

            console.log('Core elements loaded successfully:', result);
            return this.transformCoreElementsFromAPI(result);

        } catch (error) {
            console.error('Error loading core elements from API:', error);
            throw error;
        }
    }

    transformCoreElementsFromAPI(apiData) {
        // Transform API response to local selection format
        const selectedIds = [];
        const typeOfChangeValues = {};
        const cardinalityMap = {};
        const usageNoteMap = {};
        
        if (apiData.items && Array.isArray(apiData.items)) {
            apiData.items.forEach(item => {
                if (item.businessTermID) {
                    selectedIds.push(item.businessTermID);
                    
                    if (item.typeOfChange) {
                        typeOfChangeValues[item.businessTermID] = item.typeOfChange;
                    }
                    
                    if (item.cardinality) {
                        cardinalityMap[item.businessTermID] = item.cardinality;
                    }
                    
                    if (item.usageNote) {
                        usageNoteMap[item.businessTermID] = item.usageNote;
                    }
                }
            });
        }
        
        return { 
            selectedIds, 
            typeOfChangeValues,
            cardinalityMap,
            usageNoteMap,
            metadata: apiData.metadata || { totalCount: 0 }
        };
    }

    // Individual Core Element Delete Method
    async deleteCoreElement(specificationId, elementId) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/coreElements/${elementId}`;
            
            console.log(`Deleting individual core element: ${url}`);

            const response = await authenticatedFetch(url, {
                method: 'DELETE'
            });

            console.log('Delete individual core element response status:', response.status);
            console.log('Delete individual core element response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                let errorMessage = `Failed to delete core element ${elementId}! status: ${response.status}`;
                let errorDetails = '';
                
                try {
                    const contentType = response.headers.get('content-type');
                    console.log('Delete individual element error response content-type:', contentType);
                    
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        console.log('Delete individual element error response JSON:', errorData);
                        errorDetails = JSON.stringify(errorData);
                        errorMessage += ` - ${errorDetails}`;
                    } else {
                        const errorText = await response.text();
                        console.log('Delete individual element error response text:', errorText);
                        errorDetails = errorText;
                        errorMessage += ` - ${errorDetails}`;
                    }
                } catch (parseError) {
                    console.warn('Could not parse delete individual element error response:', parseError);
                }
                
                console.error('DELETE individual core element failed:', errorMessage);
                throw new Error(errorMessage);
            }

            console.log(`Individual core element ${elementId} deleted successfully`);
            return { success: true, status: response.status, elementId: elementId };

        } catch (error) {
            console.error(`Error deleting individual core element ${elementId} from API:`, error);
            throw error;
        }
    }

    // Simplified Core Elements API Methods
    async deleteCoreElementsForSpecification(specificationId) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/coreElements`;
            
            console.log(`Deleting all core elements for specification: ${url}`);
            
            const response = await authenticatedFetch(url, {
                method: 'DELETE'
            });

            console.log('Delete core elements response status:', response.status);
            console.log('Delete core elements response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                let errorMessage = `Failed to delete core elements! status: ${response.status}`;
                let errorDetails = '';
                
                try {
                    const contentType = response.headers.get('content-type');
                    console.log('Delete error response content-type:', contentType);
                    
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        console.log('Delete error response JSON:', errorData);
                        errorDetails = JSON.stringify(errorData);
                        errorMessage += ` - ${errorDetails}`;
                    } else {
                        const errorText = await response.text();
                        console.log('Delete error response text:', errorText);
                        errorDetails = errorText;
                        errorMessage += ` - ${errorDetails}`;
                    }
                } catch (parseError) {
                    console.warn('Could not parse delete core elements error response:', parseError);
                }
                
                console.error('DELETE core elements failed:', errorMessage);
                throw new Error(errorMessage);
            }

            console.log('All core elements deleted successfully');
            return { success: true, status: response.status };

        } catch (error) {
            console.error('Error deleting core elements from API:', error);
            throw error;
        }
    }

    async addCoreElement(specificationId, elementData) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/coreElements`;
            
            console.log(`Adding core element to: ${url}`, elementData);
            console.log('POST request headers will include auth headers from authenticatedFetch');

            const response = await authenticatedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(elementData)
            });

            console.log('Add core element response status:', response.status);
            console.log('Add core element response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                let errorMessage = `Failed to add core element! status: ${response.status}`;
                let errorDetails = '';
                
                try {
                    const contentType = response.headers.get('content-type');
                    console.log('Add error response content-type:', contentType);
                    
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        console.log('Add error response JSON:', errorData);
                        errorDetails = JSON.stringify(errorData);
                        errorMessage += ` - ${errorDetails}`;
                    } else {
                        const errorText = await response.text();
                        console.log('Add error response text:', errorText);
                        errorDetails = errorText;  
                        errorMessage += ` - ${errorDetails}`;
                    }
                } catch (parseError) {
                    console.warn('Could not parse add core element error response:', parseError);
                }
                
                console.error('POST add core element failed:', errorMessage);
                throw new Error(errorMessage);
            }

            // POST should return 201 with the new element
            let newElement = null;
            if (response.status === 201) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const responseText = await response.text();
                    if (responseText.trim()) {
                        newElement = JSON.parse(responseText);
                    }
                }
            }

            console.log('Core element added successfully:', newElement);
            return newElement || { ...elementData, success: true };

        } catch (error) {
            console.error('Error adding core element to API:', error);
            throw error;
        }
    }

    async saveCoreElementsSimplified(specificationId, coreElementsData) {
        try {
            console.log('Starting simplified core elements save');
            console.log('Specification ID:', specificationId);
            console.log('Core elements data:', coreElementsData);
            console.log('Current mode:', this.currentMode);
            console.log('Is edit mode:', this.isEditMode());

            // Verify the specification exists first
            console.log('Verifying specification exists...');
            try {
                const verifyUrl = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}`;
                const verifyResponse = await authenticatedFetch(verifyUrl, {
                    method: 'GET'
                });
                
                console.log('Specification verification response status:', verifyResponse.status);
                
                if (!verifyResponse.ok) {
                    if (verifyResponse.status === 404) {
                        throw new Error(`Specification with ID ${specificationId} not found in the system`);
                    } else {
                        throw new Error(`Failed to verify specification (status: ${verifyResponse.status})`);
                    }
                }
                
                const specData = await verifyResponse.json();
                console.log('Specification verified successfully:', {
                    id: specData.identityID,
                    name: specData.specificationName,
                    status: specData.registrationStatus
                });
                
            } catch (verifyError) {
                console.error('Specification verification failed:', verifyError);
                throw new Error(`Cannot save core elements: ${verifyError.message}`);
            }

            const results = {
                deleted: false,
                added: [],
                errors: [],
                skippedDelete: false
            };

            // Step 1: Handle existing core elements in edit mode
            if (this.isEditMode() && specificationId) {
                console.log('Edit mode: Attempting to delete existing core elements individually');
                
                // First, get existing core elements to see what needs to be deleted
                try {
                    const existingElements = await this.loadCoreElementsFromAPI(specificationId, 1000);
                    console.log('Found existing core elements:', existingElements);
                    
                    if (existingElements && existingElements.items && existingElements.items.length > 0) {
                        console.log(`Found ${existingElements.items.length} existing core elements to delete`);
                        
                        // Delete each existing core element individually
                        let deletedCount = 0;
                        const deleteErrors = [];
                        
                        for (const element of existingElements.items) {
                            const elementId = element.id || element.identityID || element.coreElementId;
                            
                            if (elementId) {
                                try {
                                    console.log(`Deleting core element ID: ${elementId}`);
                                    await this.deleteCoreElement(specificationId, elementId);
                                    deletedCount++;
                                    console.log(`Successfully deleted core element: ${elementId}`);
                                } catch (deleteError) {
                                    console.error(`Failed to delete core element ${elementId}:`, deleteError);
                                    deleteErrors.push({
                                        elementId: elementId,
                                        error: deleteError.message
                                    });
                                    
                                    // Continue deleting other elements even if one fails
                                    // Don't throw here, just collect errors
                                }
                            } else {
                                console.warn('Core element missing ID, cannot delete:', element);
                                deleteErrors.push({
                                    elementId: 'unknown',
                                    error: 'Element missing ID property'
                                });
                            }
                        }
                        
                        console.log(`Deletion completed: ${deletedCount} deleted, ${deleteErrors.length} errors`);
                        
                        if (deletedCount > 0) {
                            results.deleted = true;
                            results.deletedCount = deletedCount;
                        }
                        
                        if (deleteErrors.length > 0) {
                            results.deleteErrors = deleteErrors;
                            console.warn('Some core elements could not be deleted:', deleteErrors);
                            
                            // Only throw if ALL deletions failed
                            if (deletedCount === 0) {
                                throw new Error(`Failed to delete any existing core elements: ${deleteErrors.map(e => e.error).join(', ')}`);
                            }
                        }
                        
                    } else {
                        console.log('No existing core elements found to delete');
                    }
                    
                } catch (loadError) {
                    console.error('Could not load existing core elements for deletion:', loadError);
                    
                    // If we can't even load existing elements, proceed with caution
                    console.log('Proceeding with adding new core elements despite load error');
                    results.skippedDelete = true;
                    results.errors.push({
                        operation: 'load_for_delete',
                        error: loadError.message
                    });
                }
            }

            // Step 2: POST all currently selected core elements
            if (coreElementsData.selectedIds && coreElementsData.selectedIds.length > 0) {
                console.log(`Adding ${coreElementsData.selectedIds.length} core elements`);
                
                for (const businessTermID of coreElementsData.selectedIds) {
                    const typeOfChange = coreElementsData.typeOfChangeValues 
                        ? coreElementsData.typeOfChangeValues[businessTermID] || 'No change'
                        : 'No change';
                    
                    const cardinality = coreElementsData.cardinalityMap 
                        ? coreElementsData.cardinalityMap[businessTermID] || ''
                        : '';
                    
                    const usageNote = coreElementsData.usageNoteMap 
                        ? coreElementsData.usageNoteMap[businessTermID] || ''
                        : '';

                    const elementData = {
                        businessTermID: businessTermID,
                        cardinality: cardinality,
                        usageNote: usageNote,
                        typeOfChange: typeOfChange
                    };

                    console.log(`Attempting to add core element for businessTermID: ${businessTermID}`, elementData);

                    try {
                        const newElement = await this.addCoreElement(specificationId, elementData);
                        results.added.push(newElement);
                        console.log(`Successfully added core element: ${businessTermID}`);
                    } catch (addError) {
                        console.error(`Failed to add core element ${businessTermID}:`, addError);
                        
                        // Check if it's a 409 (conflict) error, which might mean element already exists
                        if (addError.message.includes('409')) {
                            console.log(`Core element ${businessTermID} may already exist (409 conflict), continuing...`);
                            results.errors.push({ 
                                operation: 'add', 
                                element: elementData, 
                                error: 'Element may already exist (409 conflict)',
                                severity: 'warning'
                            });
                            // Don't throw error for 409, just continue
                        } else {
                            results.errors.push({ 
                                operation: 'add', 
                                element: elementData, 
                                error: addError.message,
                                severity: 'error'
                            });
                            throw addError; // Stop on other types of errors
                        }
                    }
                }
            } else {
                console.log('No core elements to add');
            }

            console.log('Simplified core elements save completed successfully:', results);
            return results;

        } catch (error) {
            console.error('Error in simplified core elements save:', error);
            throw error;
        }
    }

    saveCoreElementsToLocalStorage(coreElementsData) {
        if (!this.workingData) {
            this.workingData = this.loadWorkingDataFromLocalStorage() || {};
        }
        
        this.workingData.coreInvoiceModelData = coreElementsData;
        this.saveWorkingDataToLocalStorage();
    }

    // Enhanced save method that handles core elements for new specifications
    async saveSpecificationWithCoreElements(formData) {
        try {
            // First save the specification
            const specResult = await this.saveSpecificationToAPI(formData);
            
            // If this was a create operation and we have core elements data, save them too
            if (this.isCreateMode() && this.currentSpecId && this.workingData?.coreInvoiceModelData) {
                console.log('New specification created, saving core elements');
                
                const coreElementsData = this.workingData.coreInvoiceModelData;
                if (coreElementsData.selectedIds && coreElementsData.selectedIds.length > 0) {
                    try {
                        const coreResults = await this.saveCoreElementsSimplified(
                            this.currentSpecId, 
                            coreElementsData
                        );
                        console.log('Core elements saved for new specification:', coreResults);
                    } catch (coreError) {
                        console.warn('Failed to save core elements for new specification:', coreError);
                        // Don't throw here - specification was saved successfully
                    }
                }
            }
            
            return specResult;
            
        } catch (error) {
            console.error('Error saving specification with core elements:', error);
            throw error;
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
