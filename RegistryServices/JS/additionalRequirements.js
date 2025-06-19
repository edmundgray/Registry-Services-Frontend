let unsavedChanges = false;

/**************************************************************
    Set unsaved changes listeners on input elements
 **************************************************************/
function setUnsavedListeners(row) 
{
    row.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => { unsavedChanges = true; });
        el.addEventListener('change', () => { unsavedChanges = true; });
    });
}

/**************************************************************
    Add a new row to the additional requirements table
 **************************************************************/
function addRow() 
{
    const table = document.getElementById("additionalRequirementsTable").getElementsByTagName("tbody")[0];
    const newRow = table.insertRow();
    newRow.innerHTML = `
        <td><input type="text" style="width: 100%;" placeholder="BT-1" /></td>
        <td><input type="text" style="width: 100%;" placeholder="+" /></td>
        <td><input type="text" style="width: 100%;" placeholder="1..1" /></td>
        <td><input type="text" style="width: 100%;" placeholder="Invoice Number" /></td>
        <td><textarea style="width: 100%; resize: vertical; min-height: 32px;" placeholder="A unique identification for the invoice"></textarea></td>
        <td>
            <select style="width: 100%; min-width: 220px;">
                <option value="Add new information element">Add new information element</option>
                <option value="Remove an optional element">Remove an optional element</option>
                <option value="Make Semantic definition narrower">Make Semantic definition narrower</option>
                <option value="Increase number of repetitions">Increase number of repetitions (e.g. x..1 to x..n)</option>
                <option value="Decrease number of repetitions">Decrease number of repetitions (e.g. x..n to x..1)</option>
                <option value="Restrict values in an existing list">Restrict values in an existing list</option>
            </select>
        </td>
        <td><button onclick="deleteRow(this)">Delete</button></td>
    `;
    setUnsavedListeners(newRow);
    unsavedChanges = true;
}

/**************************************************************
    Delete a row from the additional requirements table
 **************************************************************/
function deleteRow(button) 
{
    const row = button.parentElement.parentElement;
    row.remove();
    unsavedChanges = true;
}

/**************************************************************
    Save the additional requirements table data
 **************************************************************/
function saveTable() 
{
    const table = document.getElementById("additionalRequirementsTable");
    const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");

    // If there are no rows, nothing to save
    if (rows.length === 0) 
    {
        alert("No entries to save.");
        return;
    }

    // If no changes have been made, notify the user
    if (!unsavedChanges) 
    {
        alert("No changes to save.");
        return;
    }

    const data = [];

    for (let row of rows) 
    {
        const cells = row.getElementsByTagName("td");

        const rowData = 
        {
            ID: cells[0].querySelector("input") ? cells[0].querySelector("input").value : "",
            Level: cells[1].querySelector("input") ? cells[1].querySelector("input").value : "",
            Cardinality: cells[2].querySelector("input") ? cells[2].querySelector("input").value : "",
            BusinessTerm: cells[3].querySelector("input") ? cells[3].querySelector("input").value : "",
            Description: cells[4].querySelector("textarea") ? cells[4].querySelector("textarea").value : "",
            TypeOfChange: cells[5].querySelector("select") ? cells[5].querySelector("select").value : ""
        };

        data.push(rowData);
    }

    const editingSpecName = localStorage.getItem("selectedSpecification");
    if (!editingSpecName) {
        alert("Error: No specification selected. Cannot save additional requirements.");
        return;
    }

    let specifications = JSON.parse(localStorage.getItem("specifications") || "[]");
    const specIndex = specifications.findIndex(spec => spec.Name === editingSpecName);

    if (specIndex > -1) {
        specifications[specIndex].additionalRequirements = data;
        localStorage.setItem('specifications', JSON.stringify(specifications));
        alert("Additional requirements saved successfully!");
        unsavedChanges = false;
    } else {
        alert("Error: Could not find the specification to save to.");
    }
    // --- END NEW LOGIC ---

    unsavedChanges = false;
}

/**************************************************************
    Cancel the action and navigate back to the specification registry
    If there are unsaved changes, prompt the user for confirmation
 **************************************************************/
function cancelAction() 
{
    if (unsavedChanges || document.getElementById("additionalRequirementsTable").getElementsByTagName("tbody")[0].getElementsByTagName("tr").length === 0) 
    {
        if (!confirm("You have unsaved changes. Are you sure you want to leave?")) 
        {
            return;
        }
    }
    
    window.location.href = "eInvoicingSpecificationRegistry.html";
}

/**************************************************************
    Navigate to the specification preview page
    If there are unsaved changes, prompt the user for confirmation
 **************************************************************/
function goToSpecificationPreview() 
{
    if (unsavedChanges) 
    {
        if (!confirm("You have unsaved changes. Are you sure you want to leave?")) 
        {
            return;
        }
    }

    window.location.href = "specificationPreview.html";
}

/**************************************************************
    Initialize the additional requirements table and set listeners
    This function is called when the DOM content is fully loaded
 **************************************************************/
document.addEventListener("DOMContentLoaded", function () 
{
    const tableBody = document.getElementById("additionalRequirementsTable").getElementsByTagName("tbody")[0];
    const editingSpecName = localStorage.getItem("selectedSpecification");

    if (editingSpecName) {
        const specifications = JSON.parse(localStorage.getItem("specifications") || "[]");
        const specToEdit = specifications.find(spec => spec.Name === editingSpecName);

        if (specToEdit && specToEdit.additionalRequirements && specToEdit.additionalRequirements.length > 0) {
            tableBody.innerHTML = ''; // Clear existing empty row if populated
            specToEdit.additionalRequirements.forEach(rowData => {
                const newRow = tableBody.insertRow();
                newRow.innerHTML = `
                    <td><input type="text" style="width: 100%;" value="${rowData.ID || ''}" /></td>
                    <td><input type="text" style="width: 100%;" value="${rowData.Level || ''}" /></td>
                    <td><input type="text" style="width: 100%;" value="${rowData.Cardinality || ''}" /></td>
                    <td><input type="text" style="width: 100%;" value="${rowData.BusinessTerm || ''}" /></td>
                    <td><textarea style="width: 100%; resize: vertical; min-height: 32px;">${rowData.Description || ''}</textarea></td>
                    <td>
                        <select style="width: 100%; min-width: 220px;">
                            <option value="Add new information element" ${rowData.TypeOfChange === "Add new information element" ? 'selected' : ''}>Add new information element</option>
                            <option value="Remove an optional element" ${rowData.TypeOfChange === "Remove an optional element" ? 'selected' : ''}>Remove an optional element</option>
                            <option value="Make Semantic definition narrower" ${rowData.TypeOfChange === "Make Semantic definition narrower" ? 'selected' : ''}>Make Semantic definition narrower</option>
                            <option value="Increase number of repetitions" ${rowData.TypeOfChange === "Increase number of repetitions" ? 'selected' : ''}>Increase number of repetitions (e.g. x..1 to x..n)</option>
                            <option value="Decrease number of repetitions" ${rowData.TypeOfChange === "Decrease number of repetitions" ? 'selected' : ''}>Decrease number of repetitions (e.g. x..n to x..1)</option>
                            <option value="Restrict values in an existing list" ${rowData.TypeOfChange === "Restrict values in an existing list" ? 'selected' : ''}>Restrict values in an existing list</option>
                        </select>
                    </td>
                    <td><button onclick="deleteRow(this)">Delete</button></td>
                `;
                setUnsavedListeners(newRow); // Re-attach listeners for loaded rows
            });
        } else if (tableBody.getElementsByTagName("tr").length === 0 || tableBody.rows[0].cells[0].textContent.trim() === "") {
             // If no existing data, but the initial row is empty placeholder, remove it.
            tableBody.innerHTML = '';
            addRow(); // Add one initial empty row for new input
            unsavedChanges = false;
        }
    } else {
        // If not in editing mode (new spec), ensure one empty row exists initially
        if (tableBody.getElementsByTagName("tr").length === 0 || tableBody.rows[0].cells[0].textContent.trim() === "") {
            tableBody.innerHTML = '';
            addRow(); // Add one initial empty row
            unsavedChanges = false;
        }
    }
});