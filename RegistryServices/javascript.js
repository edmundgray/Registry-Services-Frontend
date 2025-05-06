/******************************************************************************
    Log in/out functionality
    General
 ******************************************************************************/
let loggedInStatus = true;

function toggleLogin() 
{
    loggedInStatus = !loggedInStatus;
    updateVisibility();
}

function updateVisibility() 
{
    document.querySelectorAll(".protected").forEach(item => 
    {
        item.style.display = loggedInStatus ? "block" : "none";
    });

    document.getElementById("loginLogoutButton").innerText = loggedInStatus ? "Logout" : "Login";

/******************************************************************************
    Log in/out functionality 
    For the Core Invoice Model & Extension Component Data Model specifically
 ******************************************************************************/
    // Select the two and ensure their 'child-element' class is removed when logged out and restored when logged in
    const coreInvoiceModel = document.querySelector("li:nth-of-type(6)");
    const extensionComponent = document.querySelector("li:nth-of-type(7)");
    
    if (coreInvoiceModel && extensionComponent) 
    {
        if (loggedInStatus)
        {
            coreInvoiceModel.classList.add("child-element");
            extensionComponent.classList.add("child-element");
        } 
        else 
        {
            coreInvoiceModel.classList.remove("child-element");
            extensionComponent.classList.remove("child-element");
        }
    }
}

/******************************************************************************
    For the List
 ******************************************************************************/
let currentPage = 1;
let rowsPerPage = 10;

document.addEventListener("DOMContentLoaded", function () 
{
    let originalData = 
    [{
            "Name": "RetailConnect Billing Rules",
            "Purpose": "Groups invoice lines and adds settlement plans",
            "Type": "Extension",
            "Sector": "Other Service Activities",
            "Country": "NL",
            "Implementation Date": "2024-11-18",
            "Preferred Syntax": "UBL",
            "Governing Entity": "Retail Invoice Group",
            "Extension Component": "Grouping Invoice Lines by Sublines & Settlement Plans",
            "Conformance Level": "Party Core Conformant",
            "View": "View"
    }];

    const rowsPerPageSelect = document.getElementById("rowsPerPage");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const currentPageSpan = document.getElementById("currentPage");

    // Rows per page select
    rowsPerPageSelect.addEventListener("change", function () 
    {
        rowsPerPage = parseInt(this.value, 10);
        currentPage = 1;
        applyFilters();
    });

    // Previous Button
    prevPageButton.addEventListener("click", function () 
    {
        if (currentPage > 1) 
        {
            currentPage--;
            applyFilters();
        }
    });

    // Next Button
    nextPageButton.addEventListener("click", function () 
    {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) 
        {
            currentPage++;
            applyFilters();
        }
    });

    // Fetch the data and populate the table
    fetch("mockData.json")
        .then(response => response.json())
        .then(data => 
        {
            originalData = data;
            populateTable(data);
        })
        .catch(error => console.error("Error loading JSON:", error));

    // Add event listeners for the filters
    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.getElementById("typeFilter").addEventListener("change", applyFilters);
    document.getElementById("sectorFilter").addEventListener("change", applyFilters);
    document.getElementById("countryFilter").addEventListener("change", applyFilters);
    document.getElementById("extensionComponentFilter").addEventListener("change", applyFilters);

    // Populating the table
    function populateTable(data) {
        const table = document.getElementById("myTable");
        // Don't forget to clear the table before populating it
        table.innerHTML = "";

        // Dynamically create the header row based on the keys of the first object in the data array
        if (data.length > 0) 
        {
            const headerRow = table.insertRow(0);
            const headers = Object.keys(data[0]);

            headers.forEach(header => 
            {
                const th = document.createElement("th");
                th.textContent = header;
                headerRow.appendChild(th);
            });

            // Calculating the start and end indices for the current page
            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, data.length);

            // Populating the table rows with data for the current page
            for (let i = startIndex; i < endIndex; i++) 
            {
                const entry = data[i];
                const row = table.insertRow(-1);

                headers.forEach(header => 
                {
                    const cell = row.insertCell(-1);

                    if (header === "View") 
                    {
                        const button = document.createElement("button");

                        button.textContent = "View";
                        button.className = "view-button";
                        button.addEventListener("click", () => 
                        {
                            alert(JSON.stringify(entry, null, 2));
                        });

                        cell.appendChild(button);
                    }
                    else 
                    {
                        cell.textContent = entry[header];
                    }
                });
            }
        }

        // Update the pagination controls
        const totalPages = Math.ceil(data.length / rowsPerPage);
        currentPageSpan.textContent = currentPage;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    }

    // Apply the filters
    function applyFilters() 
    {
        const searchText = document.getElementById("searchInput").value.toLowerCase();
        const typeFilter = document.getElementById("typeFilter").value;
        const sectorFilter = document.getElementById("sectorFilter").value;
        const countryFilter = document.getElementById("countryFilter").value;
        const extensionComponentFilter = document.getElementById("extensionComponentFilter").value;

        // Filter the data
        filteredData = originalData.filter(entry => 
        {
            const matchesSearch = Object.values(entry).some
            (
                value =>
                value.toString().toLowerCase().includes(searchText)
            );

            const sector = entry.Sector || "Other Service Activities";
            const matchesSector = sectorFilter === "" || sector === sectorFilter;

            const matchesType = typeFilter === "" || entry.Type === typeFilter;
            const matchesCountry = countryFilter === "" || entry.Country === countryFilter;
            const matchesExtensionComponent =
                extensionComponentFilter === "" || entry["Extension Component"] === extensionComponentFilter;

            return matchesSearch && matchesType && matchesSector && matchesCountry && matchesExtensionComponent;
        });

        // Re-populate the table with the new filtered data
        populateTable(filteredData);
    }
});