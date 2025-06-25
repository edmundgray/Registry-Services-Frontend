document.addEventListener("DOMContentLoaded", function () {
    const editingSpecId = localStorage.getItem("selectedSpecification");
    let savedCoreIds = [];

    if (editingSpecId) {
        const specifications = JSON.parse(localStorage.getItem("specifications")) || [];
        const specToEdit = specifications.find(spec => spec.specName === editingSpecId);
        if (specToEdit && specToEdit.coreInvoiceModelIds) {
            savedCoreIds = specToEdit.coreInvoiceModelIds;
        }
    }

    async function fetchCoreInvoiceModelsFromAPI() {
        try {
            const apiUrl = `${AUTH_CONFIG.baseUrl}/coreinvoicemodels`;
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

    function fetchCoreInvoiceModelsFromLocalJSON() {
        return fetch("../JSON/coreInvoiceModelElements.json")
            .then(response => response.json())
            .catch(error => {
                console.error("Error loading coreInvoiceModelElements.json:", error);
                throw error;
            });
    }

    function normalizeElements(elements) {
        const nodeMap = {};
        elements.forEach(item => {
            const normalizedId = item.id || item.ID;
            nodeMap[normalizedId] = {
                ID: normalizedId,
                Level: item.level || item.Level || 'N/A',
                Cardinality: item.cardinality || item.Cardinality || 'N/A',
                "Business Term": item.businessTerm || item.BusinessTerm || item['Business Term'] || 'N/A',
                "Semantic Description": item.semanticDescription || item.SemanticDescription || item['Semantic Description'] || 'N/A',
                "Usage Note": item.usageNote || item.UsageNote || item['Usage Note'] || 'N/A',
                "Business Rules": item.businessRules || item.BusinessRules || item['Business Rules'] || 'N/A',
                "Data Type": item.dataType || item.DataType || item['Data Type'] || 'N/A',
                "Req ID": item.reqId || item.ReqID || item['Req ID'] || 'N/A',
                "Parent ID": item.parentId || item.ParentID || item['Parent ID'] || null,
                "Type of Change": item.typeOfChange || item.TypeOfChange || item['Type of Change'] || 'N/A',
                children: []
            };
        });
        return nodeMap;
    }

    function buildTree(elements, nodeMap) {
        const roots = [];
        elements.forEach(item => {
            const normalizedId = item.id || item.ID;
            const mappedItem = nodeMap[normalizedId];
            const parentId = mappedItem['Parent ID'];
            if (parentId && nodeMap[parentId]) {
                nodeMap[parentId].children.push(mappedItem);
            } else {
                roots.push(mappedItem);
            }
        });
        return roots;
    }

    function renderTable(elementsToDisplay) {
        const tableBody = document.querySelector('#coreInvoiceTable tbody');
        const isReadOnly = window.isCoreInvoiceReadOnly === true;
        tableBody.innerHTML = '';

        const nodeMap = normalizeElements(elementsToDisplay);
        const roots = buildTree(elementsToDisplay, nodeMap);

        function createRow(item, level = 0) {
            const tr = document.createElement('tr');
            tr.classList.add(level === 0 ? 'parent-row' : 'child-row');
            if (item.children.length > 0) tr.classList.add('has-children-parent-row');
            if (level > 0) tr.style.display = 'none';

            const isMandatory = item.Cardinality === '1..1';
            const isChecked = savedCoreIds.includes(item.ID) || isMandatory;

            tr.innerHTML = `
                <td>${item.ID || 'N/A'}</td>
                <td>${item.Level || 'N/A'}</td>
                <td>${item.Cardinality || 'N/A'}</td>
                <td>
                    <span class="semantic-tooltip" title="${item['Semantic Description'] || ''}">
                        <i class="fa-solid fa-circle-question"></i>
                    </span>
                    ${item['Business Term'] || 'N/A'}
                </td>
                <td>${item['Usage Note'] || 'N/A'}</td>
                <td>${item['Business Rules'] || 'N/A'}</td>
                <td>${item['Data Type'] || 'N/A'}</td>
            `;

            if (!isReadOnly) {
                const checkboxCell = document.createElement("td");
                checkboxCell.innerHTML = `<input type="checkbox" class="row-selector" data-id="${item.ID}" ${isMandatory || isChecked ? 'checked' : ''} ${isMandatory ? 'disabled' : ''}>`;
                tr.appendChild(checkboxCell);

                const selectCell = document.createElement("td");
                selectCell.innerHTML = `
                    <select class="type-of-change-select">
                        <option>Type of Change</option>
                        <option>Add</option>
                        <option>Remove</option>
                        <option>Modify</option>
                        <option selected>No Change</option>
                    </select>`;
                tr.appendChild(selectCell);
            } else {
                const checkboxCell = document.createElement("td");
                checkboxCell.innerHTML = `<input type="checkbox" class="row-selector" data-id="${item.ID}" ${isChecked ? 'checked' : ''} disabled>`;
                checkboxCell.className = "centered-cell";
                tr.appendChild(checkboxCell);
            }

            const btnCell = document.createElement("td");
            tr.appendChild(btnCell);

            let childTrs = [];
            if (item.children.length > 0) {
                const showMoreBtn = document.createElement('button');
                showMoreBtn.className = 'show-more-btn';
                showMoreBtn.textContent = 'Show more';
                showMoreBtn.style.fontSize = '12px';
                btnCell.appendChild(showMoreBtn);

                childTrs = item.children.map(child => createRow(child, level + 1));

                showMoreBtn.addEventListener('click', function () {
                    const isHidden = childTrs[0].style.display === 'none';
                    childTrs.forEach(tr => tr.style.display = isHidden ? '' : 'none');
                    this.textContent = isHidden ? 'Show less' : 'Show more';
                    this.blur();
                });
            }

            tableBody.appendChild(tr);
            item.children.forEach(child => createRow(child, level + 1));
            return tr;
        }

        roots.forEach(root => createRow(root));
    }

    // Try API, fallback to local JSON
    fetchCoreInvoiceModelsFromAPI()
        .then(renderTable)
        .catch(() => {
            fetchCoreInvoiceModelsFromLocalJSON()
                .then(renderTable)
                .catch(() => {
                    const tableBody = document.querySelector('#coreInvoiceTable tbody');
                    tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load Core Invoice Model data. Please try again later.</td></tr>`;
                });
        });
});