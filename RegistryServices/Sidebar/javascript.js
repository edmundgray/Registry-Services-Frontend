// Track their logged in/out status
let loggedInStatus = true;

// Toggle the login status when clicking the login/logout button
function toggleLogin() 
{
    loggedInStatus = !loggedInStatus;
    updateVisibility();
}

// Show or hide protected items in the sidebar
function updateVisibility() 
{
    // Select every element that should only be visible when logged in
    document.querySelectorAll(".protected").forEach(item => 
    {
        item.style.display = loggedInStatus ? "block" : "none";
    });

    // Update login/logout button text "dynamically"
    document.getElementById("loginLogoutButton").innerText = loggedInStatus ? "Logout" : "Login";

/******************************************************************************
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