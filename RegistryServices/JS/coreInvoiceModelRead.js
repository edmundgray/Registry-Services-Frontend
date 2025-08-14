document.addEventListener("DOMContentLoaded", function () {
    console.log("coreInvoiceModelRead.js: DOM Content Loaded");
    
    async function fetchCoreInvoiceModelsFromAPI() {
        try {
            const apiUrl = "https://registryservices-staging.azurewebsites.net/api/coreinvoicemodels";
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

    fetchCoreInvoiceModelsFromAPI()
        .then(data => {
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            tableBody.innerHTML = '';

            const elementsToDisplay = Array.isArray(data) ? data : (data.items || []);

            // Function to convert level string to numeric (e.g., "+" -> 1, "++" -> 2)
            function getNumericLevel(levelStr) {
                return (levelStr || '').split('+').length - 1;
            }

            // Map and normalize elements, adding numeric level and preparing for hierarchy
            const processedElements = elementsToDisplay.map(item => ({
                ID: item.id || item.ID || 'N/A',
                BusinessTerm: item.businessTerm || item.BusinessTerm || item['Business Term'] || 'N/A',
                LevelStr: item.level || item.Level || 'N/A',
                NumericLevel: getNumericLevel(item.level || item.Level),
                Cardinality: item.cardinality || item.Cardinality || '1..1',
                SemanticDescription: item.semanticDescription || item.SemanticDescription || item['Semantic Description'] || 'N/A',
                UsageNote: item.usageNote || item.UsageNote || item['Usage Note'] || 'N/A',
                BusinessRules: item.businessRules || item.BusinessRules || item['Business Rules'] || 'N/A',
                DataType: item.dataType || item.DataType || item['Data Type'] || 'N/A',
                ReqID: item.reqId || item.ReqID || item['Req ID'] || 'N/A',
                TypeOfChange: item.typeOfChange || item.TypeOfChange || 'No change',
                rowPos: item.rowPos,
                children: []
            // SPDX-FileCopyrightText: 2025 CEN - European Committee for Standardization
            // SPDX-License-Identifier: EUPL-1.2
            }));

            // Sort elements by rowPos to ensure correct processing order for hierarchy building
            processedElements.sort((a, b) => a.rowPos - b.rowPos);

            const roots = [];
            // parentTracker stores the last encountered parent item object at each numeric level
            const parentTracker = {};

            processedElements.forEach(item => {
                const currentLevel = item.NumericLevel;
                const directParent = parentTracker[currentLevel - 1];

                if (currentLevel === 1) {
                    roots.push(item);
                } else if (directParent) {
                    directParent.children.push(item);
                } else {
                    roots.push(item);
                }

                parentTracker[currentLevel] = item;

                // Clear trackers for deeper levels
                for (let i = currentLevel + 1; i <= 5; i++) {
                    delete parentTracker[i];
                }
            });

            // Recursive row creation
            function renderRowAndChildren(item, container, level = 0) {
                const tr = document.createElement('tr');
                const isBT = item.ID && item.ID.startsWith('BT');
                
                if (!isBT) {
                    tr.classList.add(item.NumericLevel === 1 ? 'parent-row' : 'child-row');
                }
                
                if (item.children.length > 0 && !isBT) {
                    tr.classList.add('has-children-parent-row');
                }
                
                // Hide all child rows (level > 1) by default
                if (item.NumericLevel > 1) {
                    tr.style.display = 'none';
                }

                if (item.ID && item.ID.startsWith('BG')) {
                    if (item.NumericLevel === 1) {
                        tr.classList.add('level-1-bg');
                    } else if (item.NumericLevel === 2) {
                        tr.classList.add('level-2-bg');
                    } else if (item.NumericLevel === 3) {
                        tr.classList.add('level-3-bg');
                    }
                }
                
                // Create table row with all columns including Actions
                tr.innerHTML = `
                    <td>${item.ID || 'N/A'}</td>
                    <td>${item.LevelStr || 'N/A'}</td>
                    <td>${item.Cardinality || 'N/A'}</td>
                    <td>
                    <i class="fa-solid fa-circle-question semantic-tooltip" title="${item.SemanticDescription || ''}"></i>
                    ${item.BusinessTerm || 'N/A'}
                    </td>
                    <td>${item.UsageNote || 'N/A'}</td>
                    <td>${item.BusinessRules || 'N/A'}</td>
                    <td>${item.DataType || 'N/A'}</td>
                `;

                // Add Actions cell as the last column
                const btnCell = document.createElement("td");
                tr.appendChild(btnCell);

                // Append the parent row first
                container.appendChild(tr);

                const immediateChildTrs = [];

                if (item.children.length > 0) {
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
                        immediateChildTrs.push(childTr);
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
            
            console.log("coreInvoiceModelRead.js: Table population complete");
        })
        .catch(error => {
            console.error("Error loading core invoice model data from API:", error);
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Failed to load Core Invoice Model data from API. Please check your connection and try again later.</td></tr>`;
        });
});
