/******************************************************************************
    This will load the JSON file and create a table with the data.
 ******************************************************************************/
document.addEventListener("DOMContentLoaded", function () 
{
    const editingSpecId = localStorage.getItem("selectedSpecification");
    let savedCoreIds = []; // This will hold the IDs of saved elements

    if (editingSpecId) {
        // We are in "edit" mode
        const specifications = JSON.parse(localStorage.getItem("specifications")) || [];
        const specToEdit = specifications.find(spec => spec.specName === editingSpecId);
        
        if (specToEdit && specToEdit.coreInvoiceModelIds) {
            // If the spec exists and has saved IDs, store them
            savedCoreIds = specToEdit.coreInvoiceModelIds;
        }
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

            // Assuming your backend API returns data in a structure similar to coreInvoiceModelElements.json,
            // or directly as an array of elements. If it's paginated, you might access apiData.items.
            // Adjust this line based on your actual API response structure.
            return Array.isArray(apiData) ? apiData : (apiData.items || []); // Assuming apiData is the array of elements or contains 'items' property

        } catch (error) {
            console.error("Error fetching Core Invoice Model data from API:", error);
            // Fallback to local JSON if API fails, or just display an error
            // For now, let's simply re-throw to be caught by the main DOMContentLoaded block
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load Core Invoice Model data. Please ensure you are logged in and the API is accessible.</td></tr>`;
            throw error;
        }
    }

    fetchCoreInvoiceModelsFromAPI()
        .then(data => {
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            const isReadOnly = window.isCoreInvoiceReadOnly === true;
            const nodeMap = {};

             tableBody.innerHTML = '';

            const elementsToDisplay = Array.isArray(data) ? data : (data.items || []);


            elementsToDisplay.forEach(item => {
                const normalizedId = item.id || item.ID; // Use 'id' or 'ID' as key
                nodeMap[normalizedId] = {
                    ID: normalizedId, // Store the normalized ID
                    Level: item.level || item.Level || 'N/A',
                    Cardinality: item.cardinality || item.Cardinality || 'N/A',
                    "Business Term": item.businessTerm || item.BusinessTerm || item['Business Term'] || 'N/A',
                    "Usage Note": item.semanticDescription || item.SemanticDescription || item['Semantic Description'] || 'N/A',
                    "Business Rules": item.businessRules || item.BusinessRules || item['Business Rules'] || 'N/A',
                    "Data Type": item.dataType || item.DataType || item['Data Type'] || 'N/A',
                    "Req ID": item.reqId || item.ReqID || item['Req ID'] || 'N/A',
                    "Parent ID": item.parentId || item.ParentID || item['Parent ID'] || null, // Store normalized Parent ID
                    "Type of Change": item.typeOfChange || item.TypeOfChange || item['Type of Change'] || 'N/A',
                    children: []
                };
            });

            const roots = [];

            elementsToDisplay.forEach(item => {
                const normalizedId = item.id || item.ID; // Get the ID of the current item (normalized)
                const mappedItem = nodeMap[normalizedId]; // Retrieve the already mapped and normalized item from nodeMap

                const parentId = mappedItem['Parent ID']; // Get the normalized Parent ID from the mapped item

                if (parentId && nodeMap[parentId]) { // Check if a normalized Parent ID exists and the parent is in nodeMap
                    nodeMap[parentId].children.push(mappedItem); // Push the mapped child item to its mapped parent's children array
                } else {
                    roots.push(mappedItem); // Add the mapped item to roots if no parent or parent not found
                }
            });

            // Recursive row creation
            function renderRowAndChildren(item, container, level = 0) 
            {
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
                    
                    //const checkboxCell = document.createElement("td");
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
                    // In read-only mode, only show the "Included in Spec" checkbox as read-only if it was checked
                    const checkboxCell = document.createElement("td");
                    checkboxCell.innerHTML = `<input type="checkbox" class="row-selector" data-id="${item.ID}" ${isChecked ? 'checked' : ''} disabled>`;
                    checkboxCell.className = "centered-cell";
                    tr.appendChild(checkboxCell);
                }

                // If this item has children, add the Show more button to the last cell
                const btnCell = document.createElement("td");
                tr.appendChild(btnCell);

                const immediateChildTrs = [];

                if (item.children.length > 0) 
                {
                    const showMoreBtn = document.createElement('button');
                    
                    showMoreBtn.className = 'show-more-btn';
                    showMoreBtn.textContent = 'Show more';
                    showMoreBtn.style.fontSize = '12px';
                    btnCell.appendChild(showMoreBtn);

                    item.children.forEach(child => {
                        const childTr = renderRowAndChildren(child, container, level + 1);
                        immediateChildTrs.push(childTr); // Store child TR for toggling
                    });
                    showMoreBtn.addEventListener('click', function () {
                        const isHidden = childTrs[0].style.display === 'none';
                        immediateChildTrs.forEach(childTr => childTr.style.display = isHidden ? '' : 'none');
                        this.textContent = isHidden ? 'Show less' : 'Show more';
                        this.blur();
                    });
                }

                container.appendChild(tr);
                return tr;
            }

            roots.forEach(root => renderRowAndChildren(root, tableBody));
        })
        .catch(error => {
            console.error("Error loading core invoice model data from API or JSON:", error);
            // Optionally, load from local JSON as a fallback here if needed
            // fetch("../JSON/coreInvoiceModelElements.json") ...
            // Or display a user-friendly error message on the page
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Failed to load Core Invoice Model data. Please try again later.</td></tr>`;
        });
});