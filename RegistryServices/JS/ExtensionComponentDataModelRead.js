document.addEventListener("DOMContentLoaded", function () {
    console.log("ExtensionComponentDataModelRead.js: DOM Content Loaded");
    
    let extensionComponentElementsCache = {};
    let componentsContainer;

    function getNumericLevelFromDotNotation(levelStr) {
        if (!levelStr) return 0;
        if (levelStr.includes('+')) {
            return levelStr.split('+').length - 1;
        }
        const parts = levelStr.split('.');
        if (parts.length === 1 && !isNaN(parseInt(parts[0]))) {
            return 1; 
        }
        return parts.length > 0 ? parts.length : 0;
    }

    async function loadExtensionData() {
        try {
            const headersApiUrl = "https://registryservices-staging.azurewebsites.net/api/extensionmodels/headers";
            console.log(`Attempting to fetch Extension Component Headers from API: ${headersApiUrl}`);
            
            const headersResponse = await fetch(headersApiUrl, {
                method: 'GET'
            });

            if (!headersResponse.ok) {
                throw new Error(`HTTP error! status: ${headersResponse.status}`);
            }
            
            const headersData = await headersResponse.json();
            const availableComponents = headersData.items || headersData;
            console.log('Available Extension Component Headers:', availableComponents);

            // Clear existing sections and create one section
            componentsContainer.innerHTML = '';
            await addNewComponentSection('', [], availableComponents);
            
            console.log("ExtensionComponentDataModelRead.js: Extension data loaded successfully");
        } catch (error) {
            console.error("Error loading extension component data:", error);
            if (componentsContainer) {
                componentsContainer.innerHTML = `<p style="color: red;">Error: Could not load extension component data. Please check your connection and try again later.</p>`;
            }
        }
    }

    async function addNewComponentSection(preSelectedComponentId = '', preSelectedElementIds = [], availableComponents = null) {
        const sectionId = `section-${Date.now()}`;
        const section = document.createElement('div');
        section.className = 'component-section';
        section.id = sectionId;

        // If no available components provided, fetch them
        if (!availableComponents) {
            try {
                const headersApiUrl = "https://registryservices-staging.azurewebsites.net/api/extensionmodels/headers";
                const headersResponse = await fetch(headersApiUrl, { method: 'GET' });
                const headersData = await headersResponse.json();
                availableComponents = headersData.items || headersData;
            } catch (error) {
                console.error("Error fetching component headers for new section:", error);
                availableComponents = [];
            }
        }

        // Create dropdown options
        let options = '<option value="">Select an Extension Component</option>';
        availableComponents.forEach(comp => {
            const selected = comp.id === preSelectedComponentId ? 'selected' : '';
            options += `<option value="${comp.id}" ${selected}>${comp.name || comp.id}</option>`;
        });

        section.innerHTML = `
            <select class="component-select" onchange="handleComponentChange(this)">${options}</select>
            <p style="margin-top: 5px;">Select the required Extension Component and view its required elements</p>
            <table class="styled-table" style="width:100%;">
                <thead>
                    <tr>
                        <th>ID</th><th>Level</th><th>Cardinality</th><th>Business Term</th><th>Usage Note</th>
                        <th>Justification</th><th>Data Type</th><th>Type of Extension</th>
                        <th>Core Conformant /Rules broken</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="10" style="text-align:center;">Please select a component to view its elements.</td></tr>
                </tbody>
            </table>
        `;
        
        componentsContainer.appendChild(section);

        // If we have a valid pre-selected component, populate its table
        if (preSelectedComponentId && availableComponents.some(comp => comp.id === preSelectedComponentId)) {
            const selectElement = section.querySelector('.component-select');
            if (selectElement) {
                await populateComponentTable(selectElement, preSelectedElementIds);
            }
        }
    }

    // Function to handle component dropdown changes
    async function handleComponentChange(selectElement) {
        const selectedComponentId = selectElement.value;
        console.log('ExtensionComponentDataModelRead: Component changed to:', selectedComponentId);
        
        // Populate table for the selected component
        await populateComponentTable(selectElement, []);
    }

    // Function to populate component table with elements
    async function populateComponentTable(selectElement, selectedIds = []) {
        const selectedComponentId = selectElement.value;
        const tableBody = selectElement.closest('.component-section').querySelector('tbody');

        console.log('ExtensionComponentDataModelRead: populateComponentTable called with:', { selectedComponentId, selectedIds });

        if (!selectedComponentId) {
            tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Please select a component to view its elements.</td></tr>';
            return;
        }

        let componentElements = [];
        
        // Check cache first
        if (extensionComponentElementsCache[selectedComponentId]) {
            componentElements = extensionComponentElementsCache[selectedComponentId];
            console.log(`Loaded ${selectedComponentId} elements from cache.`);
        } else {
            // Fetch elements for the selected component using public endpoint
            const elementsApiUrl = `https://registryservices-staging.azurewebsites.net/api/extensionmodels/elements/${selectedComponentId}`;
            console.log(`Fetching elements for component: ${elementsApiUrl}`);
            
            try {
                const elementsResponse = await fetch(elementsApiUrl, {
                    method: 'GET'
                });
                
                if (!elementsResponse.ok) {
                    throw new Error(`HTTP error! status: ${elementsResponse.status}`);
                }
                
                const elementsData = await elementsResponse.json();
                componentElements = Array.isArray(elementsData) ? elementsData : (elementsData.items || []);
                extensionComponentElementsCache[selectedComponentId] = componentElements;
                console.log(`Fetched ${componentElements.length} elements for ${selectedComponentId}.`);
            } catch (error) {
                console.error(`Error fetching elements for component ${selectedComponentId}:`, error);
                tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load elements for this component. Please check your connection and try again.</td></tr>`;
                return;
            }
        }

        tableBody.innerHTML = ''; // Clear previous elements
        
        if (componentElements.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No elements found for this component.</td></tr>`;
            return;
        }

        const processedElements = componentElements.map(item => ({
            ...item,
            numericLevel: getNumericLevelFromDotNotation(item.level),
            children: []
        }));

        const roots = [];
        const parentTracker = {};

        processedElements.forEach(item => {
            const parent = parentTracker[item.numericLevel - 1];

            if (item.numericLevel === 1) {
                roots.push(item);
            } else if (parent) {
                parent.children.push(item);
            } else {
                roots.push(item);
            }
            parentTracker[item.numericLevel] = item;
        });

        function renderRowAndChildren(item, container) {
            const row = document.createElement('tr');
            
            function combineUsageNotes(usageNoteCore, usageNoteExtension, semanticDescription) {
                const notes = [usageNoteCore, usageNoteExtension, semanticDescription]
                    .filter(note => note && note.trim())
                    .map(note => note.trim());
                return notes.length > 0 ? notes.join(' | ') : 'N/A';
            }
            
            const isXG = (item.businessTermID || '').startsWith('XG');
            const isXT = (item.businessTermID || '').startsWith('XT');
            const isBG = (item.businessTermID || '').startsWith('BG');

            if (item.numericLevel > 1) { 
                row.classList.add('child-row');
            }
            if (isXG) {
                if (item.numericLevel === 1) {
                    row.classList.add('level-1-xg', 'parent-row');
                } else {
                    row.classList.add('level-2-xg');
                }
            } else if (isXT) {
                row.classList.add('level-xt');
            } else if (isBG) {
                if (item.numericLevel === 1) {
                    row.classList.add('level-1-bg', 'parent-row');
                } else {
                    row.classList.add('level-2-bg');
                }
            }

            if (item.children && item.children.length > 0) {
                row.classList.add('has-children-parent-row');
            }

            const mappedEl = {
                ID: item.businessTermID,
                Level: item.level || 'N/A',
                Cardinality: item.cardinality || 'N/A',
                "Business Term": item.businessTerm || 'N/A',
                "Usage Note": combineUsageNotes(item.usageNoteCore, item.usageNoteExtension, item.semanticDescription),
                Justification: item.justification || 'N/A',
                "Data Type": item.dataType || 'N/A',
                "Type of Extension": item.extensionType || 'N/A',
                "Core Conformant/Rules broken": item.conformanceType || 'N/A'
            };

            row.innerHTML = `
                <td>${mappedEl.ID}</td>
                <td>${mappedEl.Level}</td>
                <td>${mappedEl.Cardinality}</td>
                <td><i class="fa-solid fa-circle-question semantic-tooltip" title="${mappedEl['Usage Note']}"></i> ${mappedEl['Business Term']}</td>
                <td>${mappedEl['Usage Note']}</td>
                <td>${mappedEl.Justification}</td>
                <td>${mappedEl['Data Type']}</td>
                <td>${mappedEl['Type of Extension']}</td>
                <td>${mappedEl['Core Conformant/Rules broken']}</td>
                <td class="actions-cell"></td>
            `;
            
            container.appendChild(row);

            if (item.numericLevel > 1) {
                row.style.display = 'none';
            }

            const immediateChildTrs = [];

            if (item.children.length > 0) {
                const showMoreBtn = document.createElement('button');
                showMoreBtn.className = 'show-more-btn';
                showMoreBtn.textContent = 'Show more';
                showMoreBtn.style.fontSize = '12px';
                
                const buttonCell = row.querySelector('.actions-cell');
                if (buttonCell) {
                    buttonCell.appendChild(showMoreBtn);
                }

                item.children.forEach(child => {
                    const childTr = renderRowAndChildren(child, container);
                    immediateChildTrs.push(childTr);
                });
                
                showMoreBtn.addEventListener('click', function() {
                    const isHidden = immediateChildTrs[0].style.display === 'none';
                    immediateChildTrs.forEach(childTr => {
                        childTr.style.display = isHidden ? '' : 'none';
                    });
                    this.textContent = isHidden ? 'Show less' : 'Show more';
                    this.blur();
                });
            }

            return row;
        }
        
        roots.forEach(root => renderRowAndChildren(root, tableBody));

        console.log('ExtensionComponentDataModelRead: Table populated with', componentElements.length, 'elements');
    }

    // Function to apply read-only mode
    function applyReadOnlyMode() {
        // Hide/disable action buttons
        const addButton = document.getElementById('addAnotherComponentBtn');
        const saveButton = document.getElementById('saveBtn');
        const cancelButton = document.getElementById('cancelBtn');
        const nextStepButton = document.getElementById('nextStepBtn');
        
        if (addButton) addButton.style.display = 'none';
        if (saveButton) saveButton.style.display = 'none';
        if (cancelButton) cancelButton.style.display = 'none';
        if (nextStepButton) nextStepButton.style.display = 'none';
        
        // Hide any remove section buttons
        document.querySelectorAll('.remove-section-btn').forEach(btn => btn.style.display = 'none');
        
        console.log("ExtensionComponentDataModelRead.js: Read-only mode applied");
    }

    // Initialize the page
    componentsContainer = document.getElementById('components-container');
    
    // Load extension data
    loadExtensionData();
    
    // Apply read-only mode
    applyReadOnlyMode();
    
    // Update page title
    const titleElement = document.querySelector('.page-Content h1');
    if (titleElement) {
        titleElement.innerHTML = `<i class="fa-solid fa-trailer"></i> Extension Component Data Model <span style="color: #b22222; font-size: 0.6em; margin-left: 12px; vertical-align: middle;">(READ-ONLY)</span>`;
    }
    
    console.log("ExtensionComponentDataModelRead.js: Initialization complete");
    
    // Make handleComponentChange globally accessible
    window.handleComponentChange = handleComponentChange;
});