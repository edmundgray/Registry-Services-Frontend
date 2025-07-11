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
            const apiUrl = `${AUTH_CONFIG.baseUrl}/specifications/${identityID}`;

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
            governingEntity: apiResponse.governingEntity || '', // Read-only display field
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
            userGroupID: apiResponse.userGroupID || 0,
            isCountrySpecification: apiResponse.isCountrySpecification || true,
            
            // Nested data for other pages
            coreInvoiceModelData: apiResponse.specificationCores || [],
            extensionComponentData: apiResponse.specificationExtensionComponents || [],
            additionalRequirementsData: apiResponse.additionalRequirements || [],
            
            // Metadata
            identityID: apiResponse.identityID,
            createdDate: apiResponse.createdDate,
            modifiedDate: apiResponse.modifiedDate
        };
    }

    // Transform form data back to API format
    transformFormToApiData(formData) {
        // Get current user's group ID for new specifications
        const currentUser = getCurrentUser();
        
        // Get userGroupID with multiple fallback sources
        const getUserGroupID = () => {
            // Priority: current user from AuthManager -> localStorage -> default
            return currentUser.userGroupID || 
                   parseInt(localStorage.getItem('userGroupID')) || 
                   window.authManager?.userGroupID ||
                   1; // fallback to 1 if all else fails
        };
        
        // Get governing entity - for new specs, use user's group name
        const getGoverningEntity = () => {
            if (this.isEditMode() && this.originalData?.governingEntity) {
                // For edit mode, preserve original governing entity
                return this.originalData.governingEntity;
            } else {
                // For create mode or if no original governing entity, use user's group name
                return currentUser.groupName || 
                       localStorage.getItem('groupName') || 
                       window.authManager?.groupName || 
                       'Default Organization';
            }
        };
        
        let userGroupID;
        if (this.isEditMode()) {
            // For edit mode, preserve the original userGroupID from API if valid, otherwise use current user's
            userGroupID = (this.originalData?.userGroupID && this.originalData.userGroupID !== 0) 
                ? this.originalData.userGroupID 
                : getUserGroupID();
        } else {
            // For create mode, always use current user's group ID
            userGroupID = getUserGroupID();
        }
        
        const governingEntity = getGoverningEntity();
        
        console.log('DEBUG: transformFormToApiData - userGroupID logic:', {
            mode: this.currentMode,
            isEditMode: this.isEditMode(),
            originalUserGroupID: this.originalData?.userGroupID,
            originalGoverningEntity: this.originalData?.governingEntity,
            currentUserGroupID: currentUser.userGroupID,
            currentUserGroupName: currentUser.groupName,
            localStorageUserGroupID: localStorage.getItem('userGroupID'),
            localStorageGroupName: localStorage.getItem('groupName'),
            authManagerUserGroupID: window.authManager?.userGroupID,
            authManagerGroupName: window.authManager?.groupName,
            finalUserGroupID: userGroupID,
            finalGoverningEntity: governingEntity,
            currentUserData: currentUser,
            userGroupIDSources: {
                fromOriginalData: this.originalData?.userGroupID,
                fromCurrentUser: currentUser.userGroupID,
                fromLocalStorage: parseInt(localStorage.getItem('userGroupID')),
                fromAuthManager: window.authManager?.userGroupID,
                finalChoice: userGroupID
            },
            governingEntitySources: {
                fromOriginalData: this.originalData?.governingEntity,
                fromCurrentUser: currentUser.groupName,
                fromLocalStorage: localStorage.getItem('groupName'),
                fromAuthManager: window.authManager?.groupName,
                finalChoice: governingEntity
            },
            logicUsed: this.isEditMode() 
                ? (this.originalData?.userGroupID && this.originalData.userGroupID !== 0 ? 'Original API data' : 'Current user fallback')
                : 'Current user (create mode)'
        });
        
        // Validate userGroupID before proceeding
        if (!userGroupID || userGroupID === 0) {
            console.error('ERROR: Invalid userGroupID detected:', userGroupID);
            throw new Error(`Invalid userGroupID: ${userGroupID}. Cannot save specification without valid group ID.`);
        }

        //Determine Specification Type (CIUS or Extension)
        let specificationType;
        const hasExtensionComponents = this.workingData?.extensionComponentData && this.workingData.extensionComponentData.length > 0;
        const hasAdditionalRequirements = this.workingData?.additionalRequirementsData && this.workingData.additionalRequirementsData.length > 0;

        if (hasExtensionComponents || hasAdditionalRequirements) {
            specificationType = 'Extension';
        } else {
            specificationType = 'CIUS';
        }
        console.log(`DEBUG: Determined Specification Type: ${specificationType} (Extensions: ${hasExtensionComponents}, Additional: ${hasAdditionalRequirements})`);
        
        return {
            identityID: this.originalData?.identityID || 0,
            specificationIdentifier: formData.specId || '',
            specificationName: formData.specName || '',
            governingEntity: governingEntity,
            sector: formData.sector || '',
            subSector: formData.subSector || '',
            purpose: formData.purpose || '',
            specificationVersion: formData.specVersion || '',
            contactInformation: formData.contactInfo || '',
            dateOfImplementation: this.formatDateForAPI(formData.implDate),
            userGroupID: userGroupID,
            coreVersion: formData.coreVersion || '',
            specificationSourceLink: formData.sourceLink || '',
            country: formData.country || '',
            specificationType: specificationType,
            isCountrySpecification: this.originalData?.isCountrySpecification || true,
            underlyingSpecificationIdentifier: formData.underlyingSpec || '',
            preferredSyntax: formData.preferredSyntax || '',
            implementationStatus: this.originalData?.implementationStatus || 'In Progress',

            registrationStatus: this.workingData?.registrationStatus || this.originalData?.registrationStatus || 'In Progress',

            conformanceLevel: this.originalData?.conformanceLevel || formData.conformanceLevel || '',
            
            // Nested data - preserve from working data if available
            specificationCores: this.workingData?.coreInvoiceModelData ? 
                this.formatCoreInvoiceModelForAPI(this.workingData.coreInvoiceModelData) :
                this.originalData?.specificationCores || [],
            
            specificationExtensionComponents: this.workingData?.extensionComponentData ? 
                this.workingData.extensionComponentData :
                this.originalData?.specificationExtensionComponents || [],
                
            additionalRequirements: this.workingData?.additionalRequirementsData ?
                this.workingData.additionalRequirementsData :
                this.originalData?.additionalRequirements || []
        };
    }

    // Save specification to API
    async saveSpecificationToAPI(formData) {
        try {
            const apiData = this.transformFormToApiData(formData);
            
            // Validate userGroupID before sending to API
            if (!apiData.userGroupID || apiData.userGroupID === 0) {
                const currentUser = getCurrentUser(window.authManager);
                console.error('DEBUG: Invalid userGroupID detected:', {
                    apiDataUserGroupID: apiData.userGroupID,
                    currentUserGroupID: currentUser.userGroupID,
                    originalDataUserGroupID: this.originalData?.userGroupID,
                    isEditMode: this.isEditMode(),
                    authManagerState: {
                        isAuthenticated: window.authManager.isAuthenticated,
                        userGroupID: window.authManager.userGroupID,
                        username: window.authManager.username
                    }
                });
                
                throw new Error(`Invalid userGroupID (${apiData.userGroupID}). Please ensure you are properly logged in with a valid group assignment.`);
            }
            
            console.log('DEBUG: Saving specification with userGroupID:', apiData.userGroupID);
            
            const method = this.isEditMode() ? 'PUT' : 'POST';
            const url = this.isEditMode() 
                ? `${AUTH_CONFIG.baseUrl}/specifications/${this.currentSpecId}`
                : `${AUTH_CONFIG.baseUrl}/specifications`;

            const response = await authenticatedFetch(url, {
                method: method,
                body: JSON.stringify(apiData),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

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
            
            let result;
            if (contentType && contentType.includes('application/json')) {
                // Check if response has content
                const responseText = await response.text();
                
                if (responseText.trim() === '') {
                    result = {}; // Empty result for successful operations that return no data
                } else {
                    try {
                        result = JSON.parse(responseText);
                    } catch (jsonError) {
                        console.error('Failed to parse JSON response:', jsonError);
                        console.error('Response text was:', responseText);
                        throw new Error(`Invalid JSON response: ${jsonError.message}`);
                    }
                }
            } else {
                // Non-JSON response - might be successful but with different content type
                const responseText = await response.text();
                
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
            return [];
        }

        // Handle different data formats
        if (Array.isArray(coreInvoiceModelData)) {
            // If it's just an array of IDs
            return coreInvoiceModelData.map(id => ({ id: id }));
        } else if (coreInvoiceModelData.selectedIds && Array.isArray(coreInvoiceModelData.selectedIds)) {
            // If it's an object with selectedIds and typeOfChangeValues
            return coreInvoiceModelData.selectedIds.map(id => ({
                id: id,
                businessTermID: id,
                typeOfChange: coreInvoiceModelData.typeOfChangeValues?.[id] || 'No change',
                cardinality: coreInvoiceModelData.cardinalityMap?.[id] || '0..1'
            }));
        } else if (coreInvoiceModelData.items) {
            // If it's already in the old API format with items wrapper
            return coreInvoiceModelData.items;
        }

        // Fallback
        return [];
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
            // Remove PageSize parameter - pagination removed from API
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/coreElements`;
            
            const response = await authenticatedFetch(url, {
                method: 'GET',
                cache: 'no-cache'
            });

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

            // Parse response - handle new direct array response format
            const contentType = response.headers.get('content-type');
            let result = null;

            if (contentType && contentType.includes('application/json')) {
                const responseText = await response.text();
                if (responseText.trim()) {
                    const data = JSON.parse(responseText);
                    console.log('DEBUG: Loaded core elements from API (new schema):', data);
                    
                    // Handle new direct array response format
                    const coreElements = Array.isArray(data) ? data : [];
                    result = {
                        items: coreElements,
                        metadata: { totalCount: coreElements.length }
                    };
                } else {
                    result = { items: [], metadata: { totalCount: 0 } };
                }
            } else {
                result = { items: [], metadata: { totalCount: 0 } };
            }

            return this.transformCoreElementsFromAPI(result);

        } catch (error) {
            console.error('Error loading core elements from API:', error);
            throw error;
        }
    }

    transformCoreElementsFromAPI(apiData) {
        // Transform API response to local selection format
        console.log('DEBUG_RAW_API_DATA_RECEIVED_BY_TRANSFORM: Raw apiData.items:', apiData.items);
        const selectedIds = [];
        const typeOfChangeValues = {};
        const cardinalityMap = {};
        const usageNoteMap = {};
        const savedElements = []; // For deletion tracking
        
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
                    
                    
                        usageNoteMap[item.businessTermID] = item.usageNote;
                    
                }
                
                // IMPORTANT: Store the complete element with entityID for deletion
                savedElements.push({
                    entityID: item.entityID || item.id, // Ensure we have the deletion key
                    businessTermID: item.businessTermID,
                    typeOfChange: item.typeOfChange,
                    cardinality: item.cardinality,
                    usageNote: item.usageNote
                });
            });
        }
        
        console.log('DEBUG: Transform Core Elements - savedElements for deletion:', savedElements);
        
        return { 
            selectedIds, 
            typeOfChangeValues,
            cardinalityMap,
            usageNoteMap,
            // Store complete element objects for deletion (includes entityID)
            savedElements: savedElements,
            metadata: apiData.metadata || { totalCount: 0 }
        };
    }

    // Individual Core Element Delete Method
    async deleteCoreElement(specificationId, entityId) {
        try {
            console.log('DEBUG: Attempting to delete core element:', { specificationId, entityId });
            
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/coreElements/${entityId}`;
            console.log('DEBUG: Delete URL:', url);

            const response = await authenticatedFetch(url, {
                method: 'DELETE'
            });

            console.log('DEBUG: Delete response status:', response.status);

            // Only accept 204 - anything else is a failure
            if (response.status !== 204) {
                if (response.status === 403) {
                    throw new Error('Permission denied: You do not have permission to delete core elements');
                } else if (response.status === 404) {
                    throw new Error(`Core element ${entityId} not found - it may have already been deleted`);
                } else {
                    // Log response body for debugging
                    let responseText = '';
                    try {
                        responseText = await response.text();
                        console.log('DEBUG: Delete error response body:', responseText);
                    } catch (e) {
                        console.log('DEBUG: Could not read error response body');
                    }
                    throw new Error(`Delete failed: HTTP ${response.status} (expected 204). Response: ${responseText}`);
                }
            }

            console.log('DEBUG: Core element deleted successfully:', entityId);
            return { success: true, entityId: entityId };

        } catch (error) {
            console.error(`Error deleting core element ${entityId}:`, error);
            throw error;
        }
    }

    // Simplified Core Elements API Methods

    async addCoreElement(specificationId, elementData) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/coreElements`;

            const response = await authenticatedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(elementData)
            });

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

            return newElement || { ...elementData, success: true };

        } catch (error) {
            console.error('Error adding core element to API:', error);
            throw error;
        }
    }

    async saveCoreElementsSimplified(specificationId, coreElementsData) {
        try {
            if (!specificationId) {
                throw new Error('Specification ID is required');
            }

            const results = {
                deletedCount: 0,
                addedCount: 0
            };

            // Step 1: Delete previously saved elements (if any exist)
            const previouslySelectedElements = this.workingData?.coreInvoiceModelData?.savedElements || [];
            
            console.log('DEBUG: Elements to delete:', previouslySelectedElements.length);
            console.log('DEBUG: Sample element for deletion:', previouslySelectedElements[0]);
            
            if (previouslySelectedElements.length > 0) {
                for (const element of previouslySelectedElements) {
                    const entityId = element.entityID || element.id;
                    console.log('DEBUG: Processing delete for element:', { element, entityId });
                    
                    if (entityId) {
                        try {
                            await this.deleteCoreElement(specificationId, entityId);
                            results.deletedCount++;
                            console.log('DEBUG: Successfully deleted element:', entityId);
                        } catch (deleteError) {
                            console.error('DEBUG: Delete failed for element:', entityId, deleteError);
                            // Stop immediately on any deletion error
                            throw new Error(`Deletion failed for element ${entityId}: ${deleteError.message}`);
                        }
                    } else {
                        console.warn('DEBUG: Skipping delete - no entityID found for element:', element);
                    }
                }
            } else {
                console.log('DEBUG: No previously saved elements to delete');
            }

            // Step 2: Add new core elements
            if (coreElementsData.selectedIds && coreElementsData.selectedIds.length > 0) {
                console.log('DEBUG: Adding', coreElementsData.selectedIds.length, 'new elements');
                
                for (const businessTermID of coreElementsData.selectedIds) {
                    try {
                        // MODIFICATION START: Get usageNote directly from this.workingData
        // This ensures we're pulling from the state that was just saved to localStorage
        const usageNoteFromWorkingData = this.workingData?.coreInvoiceModelData?.usageNotesMap?.[businessTermID];
        // Ensure it's a string even if the value is null/undefined from map
        const finalUsageNote = (usageNoteFromWorkingData === undefined || usageNoteFromWorkingData === null) ? '' : usageNoteFromWorkingData;
        // MODIFICATION END
                        console.log(`DEBUG_ASSIGN_USAGE_NOTE: ID: ${businessTermID}, Value from coreElementsData param map: "${coreElementsData.usageNoteMap?.[businessTermID]}", Value from this.workingData: "${finalUsageNote}"`);

                        const elementData = {
                            businessTermID: businessTermID,
                            typeOfChange: coreElementsData.typeOfChangeValues?.[businessTermID] || 'No change',
                            cardinality: coreElementsData.cardinalityMap?.[businessTermID] || '0..1',
                            usageNote: finalUsageNote
                        };
                        
                        console.log('DEBUG_SEND_ELEMENT: Prepared elementData for sending:', elementData);
                        await this.addCoreElement(specificationId, elementData);
                        results.addedCount++;
                        
                    } catch (addError) {
                        console.error('DEBUG: Add failed for element:', businessTermID, addError);
                        throw new Error(`Failed to add element ${businessTermID}: ${addError.message}`);
                    }
                }
            } else {
                console.log('DEBUG: No new elements to add');
            }

            console.log('DEBUG: Save operation completed:', results);
            return results;

        } catch (error) {
            console.error('Error saving core elements:', error);
            throw error;
        }
    }

    // Extension Elements API Methods

    async addExtensionElement(specificationId, elementData) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/extensionElements`;

            const response = await authenticatedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(elementData)
            });

            if (!response.ok) {
                let errorMessage = `Failed to add extension element! status: ${response.status}`;
                let errorDetails = '';
                
                try {
                    const contentType = response.headers.get('content-type');
                    console.log('Add extension error response content-type:', contentType);
                    
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        console.log('Add extension error response JSON:', errorData);
                        errorDetails = JSON.stringify(errorData);
                        errorMessage += ` - ${errorDetails}`;
                    } else {
                        const errorText = await response.text();
                        console.log('Add extension error response text:', errorText);
                        errorDetails = errorText;  
                        errorMessage += ` - ${errorDetails}`;
                    }
                } catch (parseError) {
                    console.warn('Could not parse add extension element error response:', parseError);
                }
                
                console.error('POST add extension element failed:', errorMessage);
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

            return newElement || { ...elementData, success: true };

        } catch (error) {
            console.error('Error adding extension element to API:', error);
            throw error;
        }
    }

    async deleteExtensionElement(specificationId, entityId) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/extensionElements/${entityId}`;

            const response = await authenticatedFetch(url, {
                method: 'DELETE'
            });

            // Only accept 204 - anything else is a failure
            if (response.status !== 204) {
                if (response.status === 403) {
                    throw new Error('Permission denied: You do not have permission to delete extension elements');
                } else if (response.status === 404) {
                    throw new Error(`Extension element ${entityId} not found - it may have already been deleted`);
                } else {
                    throw new Error(`Delete failed: HTTP ${response.status} (expected 204)`);
                }
            }

            return { success: true, entityId: entityId };

        } catch (error) {
            console.error(`Error deleting extension element ${entityId}:`, error);
            throw error;
        }
    }

    async saveExtensionElementsSimplified(specificationId, extensionElementsData) {
        try {
            if (!specificationId) {
                throw new Error('Specification ID is required');
            }

            const results = {
                deletedCount: 0,
                addedCount: 0
            };

            // Step 1: Delete previously saved extension elements (if any exist)
            const previouslySelectedElements = this.workingData?.extensionComponentData?.savedElements || [];
            
            if (previouslySelectedElements.length > 0) {
                for (const element of previouslySelectedElements) {
                    if (element.entityID) {
                        try {
                            await this.deleteExtensionElement(specificationId, element.entityID);
                            results.deletedCount++;
                        } catch (deleteError) {
                            // Stop immediately on any deletion error
                            throw new Error(`Deletion failed for extension element ${element.entityID}: ${deleteError.message}`);
                        }
                    }
                }
            }

            // Step 2: Add new extension elements
            if (extensionElementsData && extensionElementsData.length > 0) {
                for (const extensionData of extensionElementsData) {
                    try {
                        await this.addExtensionElement(specificationId, extensionData);
                        results.addedCount++;
                    } catch (addError) {
                        throw new Error(`Failed to add extension element: ${addError.message}`);
                    }
                }
            }

            return results;

        } catch (error) {
            console.error('Error saving extension elements:', error);
            throw error;
        }
    }

    async loadExtensionElementsFromAPI(specificationId, pageSize = 1000) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/extensionElements`;
            
            const response = await authenticatedFetch(url, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`Failed to load extension elements: ${response.status}`);
            }

            const data = await response.json();
            console.log('DEBUG: Loaded extension elements from API:', data);
            
            // Handle new direct array response format
            const extensionElements = Array.isArray(data) ? data : [];
            
            return {
                items: extensionElements,
                metadata: { totalCount: extensionElements.length }
            };

        } catch (error) {
            console.error('Error loading extension elements from API:', error);
            throw error;
        }
    }

    transformExtensionElementsFromAPI(apiData, headers = []) {
        // Transform API response to component-grouped format
        const componentGroups = {};
        
        if (apiData.items && Array.isArray(apiData.items)) {
            apiData.items.forEach(element => {
                const componentId = element.extensionComponentID;
                if (!componentGroups[componentId]) {
                    // Resolve component name from headers
                    const header = headers.find(h => h.id === componentId);
                    const componentName = header ? header.name : componentId; // Fallback to ID if not found
                    
                    componentGroups[componentId] = {
                        extensionComponentID: componentId, // Keep original ID for API operations  
                        componentName: componentName, // Resolved name for UI display
                        selectedElements: []
                    };
                }
                
                // Add the businessTermID to selected elements
                if (element.businessTermID) {
                    componentGroups[componentId].selectedElements.push(element.businessTermID);
                }
            });
        }
        
        // Convert to array format and add savedElements for deletion tracking
        const result = Object.values(componentGroups);
        
        // Store complete element objects for deletion (includes entityID)
        result.savedElements = apiData.items || [];
        
        return result;
    }

    saveExtensionElementsToLocalStorage(extensionElementsData) {
        if (!this.workingData) {
            this.workingData = this.loadWorkingDataFromLocalStorage() || {};
        }
        
        // Preserve savedElements if they exist and the new data doesn't have them
        const existingSavedElements = this.workingData.extensionComponentData?.savedElements;
        if (existingSavedElements && extensionElementsData && !extensionElementsData.savedElements) {
            extensionElementsData.savedElements = existingSavedElements;
            console.log('DEBUG: Preserved extension savedElements:', existingSavedElements.length, 'elements');
        }
        
        this.workingData.extensionComponentData = extensionElementsData;
        this.saveWorkingDataToLocalStorage();
    }

    saveCoreElementsToLocalStorage(coreElementsData) {
        if (!this.workingData) {
            this.workingData = this.loadWorkingDataFromLocalStorage() || {};
        }
        
        // Preserve savedElements if they exist and the new data doesn't have them
        const existingSavedElements = this.workingData.coreInvoiceModelData?.savedElements;
        if (existingSavedElements && !coreElementsData.savedElements) {
            coreElementsData.savedElements = existingSavedElements;
            console.log('DEBUG: Preserved savedElements:', existingSavedElements.length, 'elements');
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

    // Additional Requirements API Methods

    async loadAdditionalRequirementsFromAPI(specificationId) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/additionalrequirements`;
            console.log('DEBUG: Loading additional requirements from API:', url);

            const response = await authenticatedFetch(url, {
                method: 'GET'
            });

            if (!response.ok) {
                let errorMessage = `Failed to load additional requirements! status: ${response.status}`;
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
                    console.warn('Could not parse additional requirements error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let result = [];

            if (contentType && contentType.includes('application/json')) {
                const responseText = await response.text();
                if (responseText.trim()) {
                    const data = JSON.parse(responseText);
                    console.log('DEBUG: Loaded additional requirements from API:', data);
                    result = Array.isArray(data) ? data : [];
                } else {
                    result = [];
                }
            }

            return result;

        } catch (error) {
            console.error('Error loading additional requirements from API:', error);
            throw error;
        }
    }

    async deleteAdditionalRequirement(specificationId, businessTermId) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/additionalrequirements/${businessTermId}`;
            console.log('DEBUG: Delete additional requirement URL:', url);

            const response = await authenticatedFetch(url, {
                method: 'DELETE'
            });

            console.log('DEBUG: Delete additional requirement response status:', response.status);

            // Only accept 204 - anything else is a failure
            if (response.status !== 204) {
                if (response.status === 403) {
                    throw new Error('Permission denied: You do not have permission to delete additional requirements');
                } else if (response.status === 404) {
                    throw new Error(`Additional requirement ${businessTermId} not found - it may have already been deleted`);
                } else {
                    // Log response body for debugging
                    let responseText = '';
                    try {
                        responseText = await response.text();
                        console.log('DEBUG: Delete additional requirement error response body:', responseText);
                    } catch (e) {
                        console.log('DEBUG: Could not read error response body');
                    }
                    throw new Error(`Delete failed: HTTP ${response.status} (expected 204). Response: ${responseText}`);
                }
            }

            console.log('DEBUG: Additional requirement deleted successfully:', businessTermId);
            return { success: true, businessTermId: businessTermId };

        } catch (error) {
            console.error(`Error deleting additional requirement ${businessTermId}:`, error);
            throw error;
        }
    }

    async addAdditionalRequirement(specificationId, requirementData) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/additionalrequirements`;
            console.log('DEBUG: Adding additional requirement to API:', url, requirementData);

            const response = await authenticatedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requirementData)
            });

            if (!response.ok) {
                let errorMessage = `Failed to add additional requirement! status: ${response.status}`;
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
                    console.warn('Could not parse additional requirement error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let result = {};

            if (contentType && contentType.includes('application/json')) {
                const responseText = await response.text();
                if (responseText.trim()) {
                    result = JSON.parse(responseText);
                    console.log('DEBUG: Additional requirement added successfully:', result);
                } else {
                    // Some APIs return empty body on successful POST
                    result = { success: true };
                }
            } else {
                result = { success: true };
            }

            return result;

        } catch (error) {
            console.error('Error adding additional requirement to API:', error);
            throw error;
        }
    }

    async saveAdditionalRequirementsToAPI(specificationId, requirementsData) {
        try {
            console.log('DEBUG: Saving additional requirements to API:', specificationId, requirementsData);

            // First, load existing requirements to get their IDs for deletion
            let existingRequirements = [];
            try {
                existingRequirements = await this.loadAdditionalRequirementsFromAPI(specificationId);
                console.log('DEBUG: Existing requirements to delete:', existingRequirements);
            } catch (error) {
                console.warn('Could not load existing requirements (may be none):', error);
            }

            // Delete all existing requirements
            for (const requirement of existingRequirements) {
                if (requirement.businessTermID) {
                    try {
                        await this.deleteAdditionalRequirement(specificationId, requirement.businessTermID);
                        console.log('DEBUG: Deleted existing requirement:', requirement.businessTermID);
                    } catch (error) {
                        console.warn('Error deleting existing requirement:', requirement.businessTermID, error);
                        // Continue with other deletions even if one fails
                    }
                }
            }

            // Add new requirements
            const results = [];
            for (const requirement of requirementsData) {
                // Transform table data to API schema
                const apiRequirement = {
                    businessTermID: requirement.ID || '',
                    businessTermName: requirement.BusinessTerm || '',
                    level: requirement.Level || '',
                    cardinality: requirement.Cardinality || '',
                    rowPos: 0,
                    semanticDescription: requirement.Description || '',
                    usageNote: '',
                    dataType: '',
                    businessRules: '',
                    typeOfChange: requirement.TypeOfChange || ''
                };

                try {
                    const result = await this.addAdditionalRequirement(specificationId, apiRequirement);
                    results.push(result);
                    console.log('DEBUG: Added new requirement:', apiRequirement, result);
                } catch (error) {
                    console.error('Error adding requirement:', apiRequirement, error);
                    throw error; // Stop on first failure to maintain data consistency
                }
            }

            console.log('DEBUG: All additional requirements saved successfully');
            return { success: true, results: results };

        } catch (error) {
            console.error('Error saving additional requirements to API:', error);
            throw error;
        }
    }

    // Initialize for creating a new specification
    static initializeForCreate() {
        localStorage.setItem('editMode', 'create');
        localStorage.removeItem('specificationIdentityId');
        return new SpecificationDataManager();
    }

    // Initialize for editing an existing specification
    static initializeForEdit(identityID) {
        localStorage.setItem('editMode', 'edit');
        localStorage.setItem('specificationIdentityId', identityID);
        return new SpecificationDataManager();
    }

    // Local Storage Methods for Working Data
    saveWorkingDataToLocalStorage() {
        try {
            if (this.workingData) {
                const key = `workingData_${this.currentSpecId || 'new'}`;
                localStorage.setItem(key, JSON.stringify(this.workingData));
                console.log('DEBUG: Working data saved to localStorage:', key);
            }
        } catch (error) {
            console.error('Error saving working data to localStorage:', error);
        }
    }

    loadWorkingDataFromLocalStorage() {
        try {
            const key = `workingData_${this.currentSpecId || 'new'}`;
            const savedData = localStorage.getItem(key);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                console.log('DEBUG: Working data loaded from localStorage:', key, parsedData);
                return parsedData;
            }
        } catch (error) {
            console.error('Error loading working data from localStorage:', error);
        }
        return null;
    }

    clearWorkingDataFromLocalStorage() {
        try {
            const key = `workingData_${this.currentSpecId || 'new'}`;
            localStorage.removeItem(key);
            console.log('DEBUG: Working data cleared from localStorage:', key);
        } catch (error) {
            console.error('Error clearing working data from localStorage:', error);
        }
    }

    clearEditingState() {
        try {
            // Clear localStorage data
            this.clearWorkingDataFromLocalStorage();
            
            // Reset internal state
            this.workingData = null;
            this.originalData = null;
            this.isDataLoaded = false;
            
            // Clear edit mode and specification ID
            localStorage.removeItem('editMode');
            localStorage.removeItem('specificationIdentityId');
            
            console.log('DEBUG: Editing state cleared');
        } catch (error) {
            console.error('Error clearing editing state:', error);
        }
    }

    // Additional Requirements API Methods
    async loadAdditionalRequirementsFromAPI(specificationId) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/additionalrequirements`;
            console.log('DEBUG: Loading additional requirements from API:', url);

            const response = await authenticatedFetch(url, {
                method: 'GET'
            });

            if (!response.ok) {
                let errorMessage = `Failed to load additional requirements! status: ${response.status}`;
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
                    console.warn('Could not parse additional requirements error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let result = [];

            if (contentType && contentType.includes('application/json')) {
                const responseText = await response.text();
                if (responseText.trim()) {
                    const data = JSON.parse(responseText);
                    console.log('DEBUG: Loaded additional requirements from API:', data);
                    result = Array.isArray(data) ? data : [];
                } else {
                    result = [];
                }
            }

            return result;

        } catch (error) {
            console.error('Error loading additional requirements from API:', error);
            throw error;
        }
    }

    async deleteAdditionalRequirement(specificationId, businessTermId) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/additionalrequirements/${businessTermId}`;
            console.log('DEBUG: Delete additional requirement URL:', url);

            const response = await authenticatedFetch(url, {
                method: 'DELETE'
            });

            console.log('DEBUG: Delete additional requirement response status:', response.status);

            // Only accept 204 - anything else is a failure
            if (response.status !== 204) {
                if (response.status === 403) {
                    throw new Error('Permission denied: You do not have permission to delete additional requirements');
                } else if (response.status === 404) {
                    throw new Error(`Additional requirement ${businessTermId} not found - it may have already been deleted`);
                } else {
                    // Log response body for debugging
                    let responseText = '';
                    try {
                        responseText = await response.text();
                        console.log('DEBUG: Delete additional requirement error response body:', responseText);
                    } catch (e) {
                        console.log('DEBUG: Could not read error response body');
                    }
                    throw new Error(`Delete failed: HTTP ${response.status} (expected 204). Response: ${responseText}`);
                }
            }

            console.log('DEBUG: Additional requirement deleted successfully:', businessTermId);
            return { success: true, businessTermId: businessTermId };

        } catch (error) {
            console.error(`Error deleting additional requirement ${businessTermId}:`, error);
            throw error;
        }
    }

    async addAdditionalRequirement(specificationId, requirementData) {
        try {
            const url = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}/additionalrequirements`;
            console.log('DEBUG: Adding additional requirement to API:', url, requirementData);

            const response = await authenticatedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requirementData)
            });

            if (!response.ok) {
                let errorMessage = `Failed to add additional requirement! status: ${response.status}`;
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
                    console.warn('Could not parse additional requirement error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let result = {};

            if (contentType && contentType.includes('application/json')) {
                const responseText = await response.text();
                if (responseText.trim()) {
                    result = JSON.parse(responseText);
                    console.log('DEBUG: Additional requirement added successfully:', result);
                } else {
                    // Some APIs return empty body on successful POST
                    result = { success: true };
                }
            } else {
                result = { success: true };
            }

            return result;

        } catch (error) {
            console.error('Error adding additional requirement to API:', error);
            throw error;
        }
    }

    async saveAdditionalRequirementsToAPI(specificationId, requirementsData) {
        try {
            console.log('DEBUG: Saving additional requirements to API:', specificationId, requirementsData);

            // First, load existing requirements to get their IDs for deletion
            let existingRequirements = [];
            try {
                existingRequirements = await this.loadAdditionalRequirementsFromAPI(specificationId);
                console.log('DEBUG: Existing requirements to delete:', existingRequirements);
            } catch (error) {
                console.warn('Could not load existing requirements (may be none):', error);
            }

            // Delete all existing requirements
            for (const requirement of existingRequirements) {
                if (requirement.businessTermID) {
                    try {
                        await this.deleteAdditionalRequirement(specificationId, requirement.businessTermID);
                        console.log('DEBUG: Deleted existing requirement:', requirement.businessTermID);
                    } catch (error) {
                        console.warn('Error deleting existing requirement:', requirement.businessTermID, error);
                        // Continue with other deletions even if one fails
                    }
                }
            }

            // Add new requirements
            const results = [];
            for (const requirement of requirementsData) {
                // Transform table data to API schema
                const apiRequirement = {
                    businessTermID: requirement.ID || '',
                    businessTermName: requirement.BusinessTerm || '',
                    level: requirement.Level || '',
                    cardinality: requirement.Cardinality || '',
                    rowPos: 0,
                    semanticDescription: requirement.Description || '',
                    usageNote: '',
                    dataType: '',
                    businessRules: '',
                    typeOfChange: requirement.TypeOfChange || ''
                };

                try {
                    const result = await this.addAdditionalRequirement(specificationId, apiRequirement);
                    results.push(result);
                    console.log('DEBUG: Added new requirement:', apiRequirement, result);
                } catch (error) {
                    console.error('Error adding requirement:', apiRequirement, error);
                    throw error; // Stop on first failure to maintain data consistency
                }
            }

            console.log('DEBUG: All additional requirements saved successfully');
            return { success: true, results: results };

        } catch (error) {
            console.error('Error saving additional requirements to API:', error);
            throw error;
        }
    }

    // Initialize for creating a new specification
    static initializeForCreate() {
        localStorage.setItem('editMode', 'create');
        localStorage.removeItem('specificationIdentityId');
        return new SpecificationDataManager();
    }

    // Initialize for editing an existing specification
    static initializeForEdit(identityID) {
        localStorage.setItem('editMode', 'edit');
        localStorage.setItem('specificationIdentityId', identityID);
        return new SpecificationDataManager();
    }

    // Local Storage Methods for Working Data
    saveWorkingDataToLocalStorage() {
        try {
            if (this.workingData) {
                const key = `workingData_${this.currentSpecId || 'new'}`;
                localStorage.setItem(key, JSON.stringify(this.workingData));
                console.log('DEBUG: Working data saved to localStorage:', key);
            }
        } catch (error) {
            console.error('Error saving working data to localStorage:', error);
        }
    }

    loadWorkingDataFromLocalStorage() {
        try {
            const key = `workingData_${this.currentSpecId || 'new'}`;
            const savedData = localStorage.getItem(key);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                console.log('DEBUG: Working data loaded from localStorage:', key, parsedData);
                return parsedData;
            }
        } catch (error) {
            console.error('Error loading working data from localStorage:', error);
        }
        return null;
    }

    clearWorkingDataFromLocalStorage() {
        try {
            const key = `workingData_${this.currentSpecId || 'new'}`;
            localStorage.removeItem(key);
            console.log('DEBUG: Working data cleared from localStorage:', key);
        } catch (error) {
            console.error('Error clearing working data from localStorage:', error);
        }
    }

    clearEditingState() {
        try {
            // Clear localStorage data
            this.clearWorkingDataFromLocalStorage();
            
            // Reset internal state
            this.workingData = null;
            this.originalData = null;
            this.isDataLoaded = false;
            
            // Clear edit mode and specification ID
            localStorage.removeItem('editMode');
            localStorage.removeItem('specificationIdentityId');
            
            console.log('DEBUG: Editing state cleared');
        } catch (error) {
            console.error('Error clearing editing state:', error);
        }
    }

    async updateSpecificationStatus(specificationId, newStatus) {
    try {
        // Load the current full specification data from the API.
        // This call also populates `this.originalData` with the PascalCase version.
        await this.loadSpecificationFromAPI(specificationId);
        
        // Ensure originalData is loaded and valid
        if (!this.originalData || this.originalData.identityID !== specificationId) {
            throw new Error(`Failed to load original data for specification ID: ${specificationId}`);
        }

        // Update ONLY the registration status
        this.originalData.registrationStatus = newStatus;

        // Send the back to the API for the PUT request.
        const apiUrl = `${AUTH_CONFIG.baseUrl}/specifications/${specificationId}`;
        const response = await authenticatedFetch(apiUrl, {
            method: 'PUT',
            // Send the complete, updated PascalCase object
            body: JSON.stringify(this.originalData), 
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            let errorMessage = `Failed to update status: HTTP ${response.status}`;
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
                console.warn('Could not parse error response for status update:', parseError);
            }
            throw new Error(errorMessage);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const responseText = await response.text();
            return responseText.trim() ? JSON.parse(responseText) : { success: true, message: 'Update successful (no content)' };
        } else {
            return { success: true, message: 'Update successful (non-JSON response)' };
        }
    } catch (error) {
        console.error('Error updating specification status:', error);
        throw error;
    }
}
    
}

// Make it globally available
window.SpecificationDataManager = SpecificationDataManager;
