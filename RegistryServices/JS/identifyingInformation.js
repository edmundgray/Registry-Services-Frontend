/******************************************************************************
    Identifying Information Page Specific Functions
    Contains form handling and navigation logic for IdentifyingInformation.html
 ******************************************************************************/

/******************************************************************************
    Form Handling Functions
 ******************************************************************************/
function handleSaveAndRedirect() {
    // First confirmation alert
    const confirmation = confirm("You are about to save your work and move to the core invoice model page, are you sure?");
    if (!confirmation) {
        return; // Exit if the user selects "No"
    }

    // Gather form data
    const form = document.getElementById('identifyingForm');
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    // Second confirmation alert showing saved data
    const approval = confirm("Data saved:\n\n" + Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n') + "\n\nApprove?");
    if (!approval) {
        return; // Exit if the user selects "Deny"
    }

    // Redirect if both confirmations are approved
    alert("Data successfully saved!");
    
    // Update breadcrumb context for next page
    if (window.breadcrumbManager) {
        const context = window.breadcrumbManager.getContext();
        if (context) {
            context.currentPage = 'coreInvoiceModel.html';
            window.breadcrumbManager.updateContext(context);
        }
    }
    
    window.location.href = 'coreInvoiceModel.html';
}

/******************************************************************************
    Initialization Functions
 ******************************************************************************/
// Initialize identifying information page functionality
function initializeIdentifyingInformation() {
    console.log("Identifying Information page initialized");
    attachFormEventListeners(); // Attach listeners so Save button updates on change
    updateSaveButtonAppearance(); // Set initial color
    // Any additional initialization logic for the identifying information page can go here
    // For example: form validation setup, field population, etc.
}

// Auto-initialize when DOM is loaded (only if we're on the identifying information page)
document.addEventListener("DOMContentLoaded", function() {
    // Check if we're on the identifying information page by looking for the form
    if (document.getElementById("identifyingForm")) {
        console.log("Identifying Information form detected, initializing...");
        initializeIdentifyingInformation();
    }
});

function updateSaveButtonAppearance() {
    try {
        const saveButton = document.querySelector('button[onclick="handleSave()"]');
        const hasChanges = hasActualChanges();

        if (saveButton) {
            if (hasChanges) {
                saveButton.style.setProperty('background-color', '#28a745', 'important');
                saveButton.style.color = '#fff';
                saveButton.style.fontWeight = 'normal';
                
            } else {
                saveButton.style.setProperty('background-color', '#6c757d', 'important');
                saveButton.style.color = '#fff';
                saveButton.style.fontWeight = 'normal';
                saveButton.style.boxShadow = 'none';
            }
        }
    } catch (error) {
        console.error('DEBUG: IdentifyingInformation - Error in updateSaveButtonAppearance():', error);
    }
}

function attachFormEventListeners() {
    const form = document.getElementById('identifyingForm');
    if (!form) return;
    // Listen for changes on all inputs, selects, and textareas
    form.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', updateSaveButtonAppearance);
        el.addEventListener('change', updateSaveButtonAppearance);
    });
}

// Export functions for global access if needed
window.identifyingInformation = {
    handleSaveAndRedirect,
    initializeIdentifyingInformation
};
