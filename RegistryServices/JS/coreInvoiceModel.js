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

            const response = await fetch(apiUrl, {
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
            const response = await authenticatedFetch(apiUrl, {
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
                BusinessRules: item.businessRules || item.BusinessRules || item['Business Rules'] || 'N/A',
                DataType: item.dataType || item.DataType || item['Data Type'] || 'N/A',
                ReqID: item.reqId || item.ReqID || item['Req ID'] || 'N/A',
                TypeOfChange: item.typeOfChange || item.TypeOfChange || 'No change',
                rowPos: item.rowPos, // Keep rowPos for sorting
                children: [] // Initialize children array for hierarchy
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

            // Helper function to find parent of an item in the hierarchy
            function findParentInHierarchy(childItem, allElements) {
                // Find the parent by looking for the item that contains this child in its children array
                for (const element of allElements) {
                    if (element.children && element.children.some(child => child.ID === childItem.ID)) {
                        return element;
                    }
                }
                return null;
            }

            // Function to get all mandatory children of a BG parent
            function getMandatoryChildren(bgParent, allElements) {
                const mandatoryChildren = [];
                if (bgParent.children) {
                    bgParent.children.forEach(child => {
                        if (child.Cardinality === '1..1' && child.LevelStr.startsWith('++')) {
                            mandatoryChildren.push(child.ID);
                        }
                        // Recursively check deeper children if needed
                        mandatoryChildren.push(...getMandatoryChildren(child, allElements));
                    });
                }
                return mandatoryChildren;
            }

            // Recursive row creation
            function renderRowAndChildren(item, container, level = 0) 
            {
                const tr = document.createElement('tr');
                // Only add parent-row or child-row if NOT a BT row
                const isBT = item.ID && item.ID.startsWith('BT');
                if (!isBT) {
                    tr.classList.add(item.NumericLevel === 1 ? 'parent-row' : 'child-row');
                } else {
                    // For BT rows, always use default row style (no child-row, no parent-row)
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
                    <td>${item.Cardinality || 'N/A'}</td>
                    <td>
                        <span class="semantic-tooltip" title="${item.SemanticDescription || ''}">
                            <i class="fa-solid fa-circle-question"></i>
                        </span>
                        ${item.BusinessTerm || 'N/A'}
                    </td>
                    <td>${item.UsageNote || 'N/A'}</td>
                    <td>${item.BusinessRules || 'N/A'}</td>
                    <td>${item.DataType || 'N/A'}</td>
                `;

                // Add the appropriate columns based on whether this is read-only or editable
                if (isReadOnly) {
                    // Read-only version: Add Actions cell (Show more button) as the last column
                    const btnCell = document.createElement("td");
                    tr.appendChild(btnCell);
                } else {
                    // Editable version: Add "Included in Spec" and "Type of Change" columns
                    const includedCell = document.createElement("td");
                    includedCell.className = "centered-cell";
                    
                    // Auto-check if cardinality is '1..1' and level is '+', or if previously saved
                    const shouldAutoCheck = (item.Cardinality === '1..1' && item.LevelStr === '+');
                    
                    // Also auto-check if this is a mandatory child of a BG parent
                    let isMandatoryChild = false;
                    if (item.Cardinality === '1..1' && item.LevelStr === '++') {
                        // Find parent in the hierarchy - look through processedElements for parent
                        const parentElement = findParentInHierarchy(item, processedElements);
                        if (parentElement && parentElement.ID && parentElement.ID.startsWith('BG') && 
                            parentElement.LevelStr === '+' && parentElement.Cardinality === '1..1') {
                            isMandatoryChild = true;
                        }
                    }
                    
                    const isChecked = savedCoreIds.includes(item.ID) || shouldAutoCheck || isMandatoryChild;
                    
                    includedCell.innerHTML = `<input type="checkbox" class="row-selector" data-id="${item.ID}" ${isChecked ? 'checked' : ''} ${isChecked && !isReadOnly ? 'disabled' : ''}>`;
                    tr.appendChild(includedCell);

                    const typeOfChangeCell = document.createElement("td");
                    const savedChangeType = savedTypeOfChange[item.ID] || item.TypeOfChange || 'No change';
                    typeOfChangeCell.innerHTML = `
                        <select class="type-of-change-dropdown" data-id="${item.ID}">
                            <option value="No change" ${savedChangeType === 'No change' ? 'selected' : ''}>No change</option>
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

                // Add color classes based on level and ID prefix, but never for BT rows
                // if (!isBT) {
                //     if (item.NumericLevel === 3 && item.ID && item.ID.startsWith('BG')) {
                //         tr.classList.add('level-3-bg');
                //     } else if (item.NumericLevel === 2) {
                //         if (item.ID && item.ID.startsWith('BG')) {
                //             tr.classList.add('level-2-bg');
                //         }
                //     }
                //     if (item.NumericLevel === 1 && item.ID && item.ID.startsWith('BG')) {
                //         tr.classList.add('level-1-bg');
                //     }
                // }

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
                    // Check only if not already checked or disabled (mandatory elements remain checked)
                    if (childCheckbox && !childCheckbox.checked) {
                        childCheckbox.checked = true;
                    }
                    // If the child is mandatory (1..1 and '++' level, or primary mandatory), disable it
                    const isMandatoryElement = (child.Cardinality === '1..1' && child.LevelStr === '+') ||
                                               (child.Cardinality === '1..1' && child.LevelStr.startsWith('++'));
                    if (isMandatoryElement && !window.isCoreInvoiceReadOnly) {
                        childCheckbox.disabled = true;
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
                    let parentItem = findParentInHierarchy(current, processedElements);

                    while (parentItem) {
                        const parentCheckbox = document.querySelector(`.row-selector[data-id="${parentItem.ID}"]`);
                        if (parentCheckbox && !parentCheckbox.checked) {
                            parentCheckbox.checked = true;
                        }
                        current = parentItem;
                        parentItem = findParentInHierarchy(current, processedElements);
                    }
                }
            };
            
            // Helper function to get all children (not just mandatory ones)
            function getAllChildren(parent) {
                const allChildren = [];
                if (parent.children) {
                    parent.children.forEach(child => {
                        allChildren.push(child.ID);
                        allChildren.push(...getAllChildren(child));
                    });
                }
                return allChildren;
            }
            
            // Auto-save mandatory selections (cardinality '1..1' and level '+') if in editable mode
            if (!isReadOnly) {
                const autoSelectedIds = [];
                
                // First, find primary mandatory items (level '+' with cardinality '1..1')
                processedElements.forEach(item => {
                    if (item.Cardinality === '1..1' && item.LevelStr === '+') {
                        autoSelectedIds.push(item.ID);
                        
                        // If this is a BG item, also auto-select its mandatory children
                        if (item.ID && item.ID.startsWith('BG')) {
                            const mandatoryChildren = getMandatoryChildren(item, processedElements);
                            autoSelectedIds.push(...mandatoryChildren);
                        }
                    }
                });
                
                // Merge auto-selected with previously saved selections
                const allSelectedIds = [...new Set([...savedCoreIds, ...autoSelectedIds])];
                
                // Update localStorage if there are new auto-selections
                if (autoSelectedIds.length > 0 && editingSpecId) {
                    const specifications = JSON.parse(localStorage.getItem("mySpecifications")) || [];
                    const specIndex = specifications.findIndex(spec => spec.id === editingSpecId);
                    if (specIndex > -1) {
                        specifications[specIndex].coreInvoiceModelIds = allSelectedIds;
                        localStorage.setItem('mySpecifications', JSON.stringify(specifications));
                    }
                }
            }        })
        .catch(error => {
            console.error("Error loading core invoice model data from API:", error);
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load Core Invoice Model data from API. Please check your connection and try again later.</td></tr>`;
        });

    // Note: Save functions are now handled in coreInvoiceModel.html
    // This file only handles table population and UI interactions
    console.log("CoreInvoiceModel.js: Table population and UI setup complete");

});