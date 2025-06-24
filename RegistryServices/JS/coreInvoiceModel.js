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

    fetch("../JSON/coreInvoiceModelElements.json")
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            const isReadOnly = window.isCoreInvoiceReadOnly === true;
            const nodeMap = {};

            data.forEach(item => {
                nodeMap[item.ID] = { ...item, children: [] };
            });

            const roots = [];

            data.forEach(item => {
                if (item['Parent ID'] && nodeMap[item['Parent ID']]) {
                    nodeMap[item['Parent ID']].children.push(nodeMap[item.ID]);
                } else {
                    roots.push(nodeMap[item.ID]);
                }
            });

            function createRow(item, level = 0) {
                const tr = document.createElement('tr');
                tr.classList.add(level === 0 ? 'parent-row' : 'child-row');
                if (item.children.length > 0) tr.classList.add('has-children-parent-row');
                if (level > 0) tr.style.display = 'none';

                const isMandatory = item.Cardinality === '1..1';
                const isChecked = savedCoreIds.includes(item.ID) || isMandatory;

                tr.innerHTML = `
                    <td>${item.ID}</td>
                    <td>${item.Level}</td>
                    <td>${item.Cardinality}</td>
                    <td>
                        <span class="semantic-tooltip" title="${item['Semantic Description'] || ''}">
                            <i class="fa-solid fa-circle-question"></i>
                        </span>
                        ${item['Business Term']}
                    </td>
                    <td>${item['Usage Note']}</td>
                    <td>${item['Business Rules']}</td>
                    <td>${item['Data Type']}</td>
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
                }

                // Always add final cell for Show more (even in read-only)
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
        })
        .catch(error => {
            console.error("Error loading coreInvoiceModelElements.json:", error);
        });
});
