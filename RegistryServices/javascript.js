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
let originalData = [];
let filteredData = [];

document.addEventListener("DOMContentLoaded", function () 
{
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIzIiwidW5pcXVlX25hbWUiOiJqb2huZG9lIiwicm9sZSI6IlVzZXIiLCJVc2VyR3JvdXBJZCI6IjEiLCJuYmYiOjE3NDg0MzUwNzksImV4cCI6MTc0ODQzODY3OSwiaWF0IjoxNzQ4NDM1MDc5LCJpc3MiOiJSZWdpc3RyeUFwaS1TdGFnaW5nIiwiYXVkIjoiUmVnaXN0cnlBcGlDbGllbnQtU3RhZ2luZyAifQ.OlNuw53Ff7pgEhuEjNXRmWgYK72ewHh06BBXJwGprT0"; // <-- PUT YOUR JWT TOKEN HERE

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

    // Fetch data from backend API
    fetch("https://registryservices-staging.azurewebsites.net/api/specifications?page=1&pageSize=100", {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error("Failed to fetch backend data!");
        return response.json();
    })
    .then(data => {
        // Adapt API fields to table format
        originalData = data.map(spec => ({
            "Name": spec.specificationName,
            "Purpose": spec.purpose,
            "Type": spec.specificationType,
            "Sector": spec.sector,
            "Country": spec.country,
            "Implementation Date": (spec.dateOfImplementation || "").slice(0, 10),
            "Preferred Syntax": spec.preferredSyntax,
            "Registry Status": spec.registrationStatus,
            "Governing Entity": spec.governingEntity,
            "Extension Component": spec.coreVersion || spec.extensionComponent || "",
            "Conformance Level": spec.conformanceLevel,
            "View": "View"
        }));
        filteredData = originalData;
        populateTable(filteredData);
    })
    .catch(error => console.error("Error loading backend data:", error));

    // Add event listeners for the filters
    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.getElementById("typeFilter").addEventListener("change", applyFilters);
    document.getElementById("sectorFilter").addEventListener("change", applyFilters);
    document.getElementById("countryFilter").addEventListener("change", applyFilters);
    document.getElementById("extensionComponentFilter").addEventListener("change", applyFilters);

    // Populating the table
    function populateTable(data) {
        const table = document.getElementById("myTable");
        table.innerHTML = "";

        if (data.length > 0) {
            const headerRow = table.insertRow(0);
            const headers = Object.keys(data[0]).filter(header => header !== "IDs");

            headers.forEach(header => {
                const th = document.createElement("th");
                th.textContent = header;
                headerRow.appendChild(th);
            });

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, data.length);

            for (let i = startIndex; i < endIndex; i++) {
                const entry = data[i];
                const row = table.insertRow(-1);

                headers.forEach(header => {
                    const cell = row.insertCell(-1);

                    if (header === "View") {
                        const button = document.createElement("button");
                        button.textContent = "View";
                        button.className = "view-button";
                        button.disabled = true; // stays non-functional
                        cell.appendChild(button);
                    } else {
                        cell.textContent = entry[header];
                    }
                });
            }
        }

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
