/******************************************************************************
    This will load the JSON file and create a table with the data.
 ******************************************************************************/
document.addEventListener("DOMContentLoaded", function () 
{
    fetch("../JSON/coreInvoiceModelElements.json")
        .then(response => response.json())
        .then(data =>
        {
            const tableBody = document.querySelector('#coreInvoiceTable tbody');
            const nodeMap = {};

            data.forEach(item => 
            {
                nodeMap[item.ID] = { ...item, children: [] };
            });

            const roots = [];

            data.forEach(item => 
            {
                if (item['Parent ID']) 
                {
                    if (nodeMap[item['Parent ID']]) 
                    {
                        nodeMap[item['Parent ID']].children.push(nodeMap[item.ID]);
                    }
                }
                else 
                {
                    roots.push(nodeMap[item.ID]);
                }
            });

            // Recursive row creation
            function createRow(item, level = 0) 
            {
                const tr = document.createElement('tr');

                tr.classList.add(level === 0 ? 'parent-row' : 'child-row');
                if (item.children.length > 0) tr.classList.add('has-children-parent-row');
                if (level > 0) tr.style.display = 'none';

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
                    <td class="centered-cell"><input type="checkbox"></td>
                    <td>
                        <select>
                            <option>Type of Change</option>
                            <option>Add</option>
                            <option>Remove</option>
                            <option>Modify</option>
                            <option>No Change</option>
                        </select>
                    </td>
                `;

                // If this item has children, add the Show more button to the last cell
                let showMoreBtn = null;
                let childTrs = [];

                if (item.children.length > 0) 
                {
                    showMoreBtn = document.createElement('button');
                    showMoreBtn.className = 'show-more-btn';
                    showMoreBtn.textContent = 'Show more';
                    showMoreBtn.style.fontSize = '12px';

                    tr.lastElementChild.appendChild(showMoreBtn);
                }

                tableBody.appendChild(tr);

                item.children.forEach(child => 
                {
                    const childTr = createRow(child, level + 1);
                    childTrs.push(childTr);
                });

                // Show/hide logic for children
                if (showMoreBtn) 
                {
                    showMoreBtn.addEventListener('click', function () 
                    {
                        if (!childTrs.length) return;

                        const isHidden = childTrs[0].style.display === 'none';

                        childTrs.forEach(tr => tr.style.display = isHidden ? '' : 'none');
                        this.textContent = isHidden ? 'Show less' : 'Show more';
                        this.blur();
                    });
                }

                return tr;
            }

            roots.forEach(root => createRow(root));
        })
        .catch(error => 
        {
            console.error("Error loading coreInvoiceModelElements.json:", error);
        });
});