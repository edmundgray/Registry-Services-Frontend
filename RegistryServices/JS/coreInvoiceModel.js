document.addEventListener("DOMContentLoaded", function () {
    console.log("CoreInvoiceModel.js: DOM Content Loaded");
    console.log("CoreInvoiceModel.js: Read-only mode:", window.isCoreInvoiceReadOnly);
    
    const editingSpecId = localStorage.getItem("selectedSpecification");
    console.log("CoreInvoiceModel.js: Editing spec ID:", editingSpecId);
    
    let savedCoreIds = [];
    let savedTypeOfChange = {};

    if (editingSpecId) {
        const specifications = JSON.parse(localStorage.getItem("mySpecifications")) || [];
        const specToEdit = specifications.find(spec => spec.id === editingSpecId);
        if (specToEdit && specToEdit.coreInvoiceModelIds) {
            savedCoreIds = specToEdit.coreInvoiceModelIds;
        }
        if (specToEdit && specToEdit.coreInvoiceModelTypeOfChange) {
            savedTypeOfChange = specToEdit.coreInvoiceModelTypeOfChange;
        }
        console.log("CoreInvoiceModel.js: Saved core IDs:", savedCoreIds);
        console.log("CoreInvoiceModel.js: Saved type of change:", savedTypeOfChange);
    }

    async function fetchCoreInvoiceModelsFromAPI() {
        try {
            const apiUrl = `${AUTH_CONFIG.baseUrl}/coreinvoicemodels?pageSize=250`; // Use backend base URL
            console.log(`Attempting to fetch Core Invoice Models from API: ${apiUrl}`);

            // Use centralized authentication for API calls
            const response = await window.authManager.authenticatedFetch(apiUrl, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const apiData = await response.json();
            console.log('API Response for Core Invoice Models:', apiData);

            return Array.isArray(apiData) ? apiData : (apiData.items || []);
        } catch (error) {
            console.error("Error fetching Core Invoice Model data from API:", error);
            throw error;
        }
    }

    /******************************************************************************
        Core Invoice Model API Functions (moved from javascript.js)
     ******************************************************************************/
    async function fetchCoreInvoiceModels() {
        try {
            // Construct the full URL for the GET request
            const apiUrl = `${AUTH_CONFIG.baseUrl}/coreinvoicemodels`; // Uses the base URL from AUTH_CONFIG

            console.log(`Attempting to fetch data from: ${apiUrl}`);

            // Make the GET request using authenticatedFetch
            // Use centralized authentication for API calls
            const response = await window.authManager.authenticatedFetch(apiUrl, {
                method: 'GET'
            });

            // Check if the response was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse the JSON response
            const data = await response.json();
            console.log('Core Invoice Models API Response:', data);
            
            return Array.isArray(data) ? data : (data.items || []);

        } catch (error) {
            console.error('Error fetching Core Invoice Models:', error);
            throw error;
        }
    }

    fetchCoreInvoiceModelsFromAPI()
        .then(data => {
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            const isReadOnly = window.isCoreInvoiceReadOnly === true;
            

             tableBody.innerHTML = '';

            const elementsToDisplay = Array.isArray(data) ? data : (data.items || []);

            // --- NEW HIERARCHY BUILDING LOGIC BASED ON 'level' ---
            // Function to convert level string to numeric (e.g., "+" -> 1, "++" -> 2)
            function getNumericLevel(levelStr) {
                return (levelStr || '').split('+').length - 1;
            }

            // Map and normalize elements, adding numeric level and preparing for hierarchy
            const processedElements = elementsToDisplay.map(item => ({
                ID: item.id || item.ID || 'N/A',
                BusinessTerm: item.businessTerm || item.BusinessTerm || item['Business Term'] || 'N/A',
                LevelStr: item.level || item.Level || 'N/A', // Keep original level string
                NumericLevel: getNumericLevel(item.level || item.Level), // New numeric level for comparison
                Cardinality: item.cardinality || item.Cardinality || '1..1',
                SemanticDescription: item.semanticDescription || item.SemanticDescription || item['Semantic Description'] || 'N/A',
                UsageNote: item.usageNote || item.UsageNote || item['Usage Note'] || 'N/A',
                BusinessRules: item.coreBusinessRules || item.businessRules || item.BusinessRules || item['Business Rules'] || 'N/A',
                DataType: item.coreDataType || item.dataType || item.DataType || item['Data Type'] || 'N/A',
                ReqID: item.reqId || item.ReqID || item['Req ID'] || 'N/A',
                TypeOfChange: item.typeOfChange || item.TypeOfChange || 'No change',
                rowPos: item.rowPos, // Keep rowPos for sorting
                children: [], // Initialize children array for hierarchy
                parent: null
            }));

            // Sort elements by rowPos to ensure correct processing order for hierarchy building
            processedElements.sort((a, b) => a.rowPos - b.rowPos);

            const roots = [];
            // parentTracker stores the last encountered parent item object at each numeric level
            const parentTracker = {};

            processedElements.forEach(item => {
                const currentLevel = item.NumericLevel;
                const directParent = parentTracker[currentLevel - 1]; // Find the parent at one level up

                if (currentLevel === 1) { // Level 1 items are always roots
                    roots.push(item);
                } else if (directParent) {
                    directParent.children.push(item);
                    item.parent = directParent; // Set parent reference for the item
                } else {
                    // This case handles items with level > 1 but no direct parent at level-1
                    // This might indicate an issue with data, or they are also roots.
                    // For now, add them as roots if no parent is found.
                    roots.push(item);
                }

                // Update parentTracker: This item is now the last parent seen at its level
                parentTracker[currentLevel] = item;

                // Clear trackers for deeper levels, as they are no longer relevant
                // (e.g., if we just processed a level 2 item, any previous level 3+ parents are done)
                for (let i = currentLevel + 1; i <= 5; i++) { // Assuming max level is reasonable, e.g., 5
                    delete parentTracker[i];
                }
            });
            // --- END NEW HIERARCHY BUILDING LOGIC ---

            

            /**
             * NEW: Recursively checks if an element is mandatory based on its cardinality
             * and the cardinality of its entire parent chain.
             * @param {object} item - The element to check.
             * @returns {boolean} - True if the element is mandatory, false otherwise.
             */
            function isElementMandatory(item) {
                // Rule 1: The element itself must have a cardinality starting with '1'.
                if (!item.Cardinality || !item.Cardinality.startsWith('1')) {
                    return false;
                }

                // Rule 2: If it's a level 1 element and its cardinality starts with '1', it is mandatory.
                if (item.NumericLevel === 1) {
                    return true;
                }

                // Rule 3: If it's a nested element, its parent must also be mandatory.
                if (item.parent) {
                    return isElementMandatory(item.parent);
                }
                
                // If it's not a level 1 element and has no parent, it's not part of a valid mandatory chain.
                return false;
            }

            // Recursive row creation
            function renderRowAndChildren(item, container, level = 0) 
            {
                const tr = document.createElement('tr');
                // Only add parent-row or child-row if NOT a BT row
                const isBT = item.ID && item.ID.startsWith('BT');
                if (!isBT) {
                    tr.classList.add(item.NumericLevel === 1 ? 'parent-row' : 'child-row');
                }

                if (item.children.length > 0 && !isBT) tr.classList.add('has-children-parent-row');
                // Hide all child rows (level > 1) by default, regardless of BT/BG
                if (item.NumericLevel > 1) tr.style.display = 'none';

                if (item.ID && item.ID.startsWith('BG')) {
                    if (item.NumericLevel === 1) {
                        tr.classList.add('level-1-bg');
                    } else if (item.NumericLevel === 2) {
                        tr.classList.add('level-2-bg');
                    } else if (item.NumericLevel === 3) {
                        tr.classList.add('level-3-bg');
                    }
                }
                
                // Only include columns that match the table header
                tr.innerHTML = `
                    <td>${item.ID || 'N/A'}</td>
                    <td>${item.LevelStr || 'N/A'}</td>
                    <td>
                        <input type="text" class="cardinality-input" data-id="${item.ID}" value="${item.Cardinality || ''}">
                    </td>
                    <td>
                    <i class="fa-solid fa-circle-question semantic-tooltip" title="${item.SemanticDescription || ''}"></i>
                    ${item.BusinessTerm || 'N/A'}
                    </td>
                    <td>
                        <textarea class="usage-note-textarea" data-id="${item.ID}" style="min-height: 32px; resize: vertical; ">${item.UsageNote || ''}</textarea>
                    </td>
                    <td>${item.BusinessRules || 'N/A'}</td>
                    <td>${item.DataType || 'N/A'}</td>
                `;

                
                const currentTextarea = tr.querySelector(`textarea.usage-note-textarea[data-id="${item.ID}"]`);
                if (currentTextarea) {
                    currentTextarea.value = item.UsageNote || '';
                    currentTextarea.addEventListener('input', () => {
                        updateSaveButtonAppearance();
                    });
                }

                // Add the appropriate columns based on whether this is read-only or editable
                if (isReadOnly) {
                    // Read-only version: Add Actions cell (Show more button) as the last column
                    const btnCell = document.createElement("td");
                    tr.appendChild(btnCell);
                } else {
                    // Editable version: Add "Included in Spec" and "Type of Change" columns
                    const includedCell = document.createElement("td");
                    includedCell.className = "centered-cell";
                    
                    const isMandatory = isElementMandatory(item);
                    const isChecked = savedCoreIds.includes(item.ID) || isMandatory;
                    const isDisabled = isMandatory && !isReadOnly;

                    includedCell.innerHTML = `<input type="checkbox" class="row-selector" data-id="${item.ID}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>`;
                    tr.appendChild(includedCell);

                    const typeOfChangeCell = document.createElement("td");
                    const savedChangeType = savedTypeOfChange[item.ID] || item.TypeOfChange || 'No change';
                    typeOfChangeCell.innerHTML = `
                        <select class="type-of-change-dropdown" data-id="${item.ID}">
                            <option value="No change" ${savedChangeType === 'No change' ? 'selected' : ''}>No change</option>
                            <option value="Make an optional element mandatory" ${savedChangeType === 'Make an optional element mandatory' ? 'selected' : ''}>Make an optional element mandatory</option>
                            <option value="Make definition narrower" ${savedChangeType === 'Make definition narrower' ? 'selected' : ''}>Make definition narrower</option>
                            <option value="Decrease number of repetitions" ${savedChangeType === 'Decrease number of repetitions' ? 'selected' : ''}>Decrease number of repetitions</option>
                            <option value="Restrict values in an existing list" ${savedChangeType === 'Restrict values in an existing list' ? 'selected' : ''}>Restrict values in an existing list</option>
                        </select>
                    `;
                    tr.appendChild(typeOfChangeCell);

                    // Add Actions cell (Show more button) as the last column
                    const btnCell = document.createElement("td");
                    tr.appendChild(btnCell);
                }

                

                // Append the parent row first
                container.appendChild(tr);

                const immediateChildTrs = [];

                if (item.children.length > 0) 
                {
                    const showMoreBtn = document.createElement('button');
                    showMoreBtn.className = 'show-more-btn';
                    showMoreBtn.textContent = 'Show more';
                    showMoreBtn.style.fontSize = '12px';
                    
                    // Find the correct button cell (last cell in the row)
                    const cells = tr.querySelectorAll('td');
                    const buttonCell = cells[cells.length - 1];
                    buttonCell.appendChild(showMoreBtn);

                    item.children.forEach(child => {
                        const childTr = renderRowAndChildren(child, container, level + 1);
                        immediateChildTrs.push(childTr); // Store child TR for toggling
                    });
                    showMoreBtn.addEventListener('click', function () {
                        const isHidden = immediateChildTrs[0].style.display === 'none';
                        immediateChildTrs.forEach(childTr => childTr.style.display = isHidden ? '' : 'none');
                        this.textContent = isHidden ? 'Show less' : 'Show more';
                        this.blur();
                    });
                }

                return tr;
            }

            roots.forEach(root => renderRowAndChildren(root, tableBody));
            
            // Make hierarchy data globally accessible for cascading logic
            window.coreInvoiceHierarchy = processedElements;

            const checkChildrenRecursive = (currentElement) => {
                currentElement.children.forEach(child => {
                    const childCheckbox = document.querySelector(`.row-selector[data-id="${child.ID}"]`);
                    if (childCheckbox && !childCheckbox.checked) {
                        childCheckbox.checked = true;
                    }
                    if (isElementMandatory(child) && !window.isCoreInvoiceReadOnly) {
                        if (childCheckbox) childCheckbox.disabled = true;
                    }
                    if (child.children.length > 0) {
                        checkChildrenRecursive(child);
                    }
                });
            };

            const uncheckChildrenRecursive = (currentElement) => {
                currentElement.children.forEach(child => {
                    const childCheckbox = document.querySelector(`.row-selector[data-id="${child.ID}"]`);
                    // Only uncheck if not disabled (i.e., not mandatory auto-selected)
                    if (childCheckbox && childCheckbox.checked && !childCheckbox.disabled) {
                        childCheckbox.checked = false;
                    }
                    if (child.children.length > 0) {
                        uncheckChildrenRecursive(child);
                    }
                });
            };

            const findParentInHierarchy = (childItem) => {
                return childItem.parent;
            };

            window.handleCascadingSelection = function(changedCheckbox) {
                const itemId = changedCheckbox.getAttribute('data-id');
                const isChecked = changedCheckbox.checked;
                const item = processedElements.find(el => el.ID === itemId);
                if (!item) return;

                // A. Handle Parent (BG) selection -> cascading down
                if (item.ID.startsWith('BG')) {
                    if (isChecked) {
                        checkChildrenRecursive(item);
                    } else {
                        uncheckChildrenRecursive(item);
                    }
                }

                // B. Handle Child (BT or BG) selection -> cascading up
                if (isChecked) {
                    let current = item;
                    let parentItem = findParentInHierarchy(current);

                    while (parentItem) {
                        const parentCheckbox = document.querySelector(`.row-selector[data-id="${parentItem.ID}"]`);
                        if (parentCheckbox && !parentCheckbox.checked) {
                            parentCheckbox.checked = true;
                        }
                        current = parentItem;
                        parentItem = findParentInHierarchy(current);
                    }
                }
            };
            
            })
        .catch(error => {
            console.error("Error loading core invoice model data from API:", error);
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load Core Invoice Model data from API. Please check your connection and try again later.</td></tr>`;
        });

    console.log("CoreInvoiceModel.js: Table population and UI setup complete");

});