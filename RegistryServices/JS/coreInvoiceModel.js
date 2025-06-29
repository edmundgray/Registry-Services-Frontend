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

            const response = await authenticatedFetch(apiUrl, {
                method: 'GET',
                forceAuth: true 
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
                    const isChecked = savedCoreIds.includes(item.ID);
                    includedCell.innerHTML = `<input type="checkbox" class="row-selector" data-id="${item.ID}" ${isChecked ? 'checked' : ''}>`;
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
                if (!isBT) {
                    if (item.NumericLevel === 3 && item.ID && item.ID.startsWith('BG')) {
                        tr.classList.add('level-3-bg');
                    } else if (item.NumericLevel === 2) {
                        if (item.ID && item.ID.startsWith('BG')) {
                            tr.classList.add('level-2-bg');
                        }
                    }
                    if (item.NumericLevel === 1 && item.ID && item.ID.startsWith('BG')) {
                        tr.classList.add('level-1-bg');
                    }
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

            roots.forEach(root => renderRowAndChildren(root, tableBody));        })
        .catch(error => {
            console.error("Error loading core invoice model data from API:", error);
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load Core Invoice Model data from API. Please check your connection and try again later.</td></tr>`;
        });
});