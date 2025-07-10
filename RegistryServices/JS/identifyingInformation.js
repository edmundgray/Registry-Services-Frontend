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

/******************************************************************************
    Session and Auth Handling (moved from HTML)
 ******************************************************************************/
// Create a global authManager instance and enhanced authenticatedFetch
window.authManager = new AuthManager();

async function authenticatedFetch(url, options = {}) {
    try {
        const headers = { ...(options.headers || {}), ...window.authManager.getAuthHeaders() };
        let response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            handleSessionExpiry();
            throw new Error('Session expired');
        }
        return response;
    } catch (error) {
        console.error('Authenticated fetch error:', error);
        throw error;
    }
}

function handleSessionExpiry() {
    console.log('DEBUG: handleSessionExpiry called - starting comprehensive cleanup');
    cleanupSessionNotifications();
    if (window.authManager) window.authManager.clearTokenTimers();
    if (window.workflowSessionManager && window.workflowSessionManager.cleanup) window.workflowSessionManager.cleanup();
    preserveWorkflowData();
    if (window.authManager) {
        window.authManager.isAuthenticated = false;
        window.authManager.accessToken = null;
        window.authManager.warningShown = false;
    }
    const existingNotifications = document.querySelectorAll('.session-expiry-notification, .modal, #sessionStatus, #sessionWarningModal, #reauthModal');
    existingNotifications.forEach(notification => notification.remove());
    showSessionExpiryModal();
    console.log('DEBUG: handleSessionExpiry completed');
}

function showSessionExpiryModal() {
    const existingModal = document.getElementById('sessionExpiryModal');
    if (existingModal) existingModal.remove();
    const modalHtml = `
        <div id="sessionExpiryModal" class="session-expiry-notification" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10001; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 450px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center;">
                <div style="width: 60px; height: 60px; background: #ffc107; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-exclamation-triangle" style="color: white; font-size: 24px;"></i>
                </div>
                <h3 style="margin: 0 0 16px 0; color: #333;">Session Expired</h3>
                <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">Your session has expired for security reasons. Your work has been saved locally and will be restored when you log back in.</p>
                <p style="margin: 0 0 25px 0; color: #999; font-size: 14px;">Redirecting to login page in <span id="countdown">3</span> seconds...</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="redirectToLogin()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">Login Now</button>
                    <button onclick="closeSessionModal()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Stay Here</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    let countdown = 3;
    const countdownElement = document.getElementById('countdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) countdownElement.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            redirectToLogin();
        }
    }, 1000);
    window.sessionCountdownInterval = countdownInterval;
}

function redirectToLogin() {
    if (window.sessionCountdownInterval) {
        clearInterval(window.sessionCountdownInterval);
        window.sessionCountdownInterval = null;
    }
    const modal = document.getElementById('sessionExpiryModal');
    if (modal) modal.remove();
    window.location.href = '../index.html';
}

function closeSessionModal() {
    if (window.sessionCountdownInterval) {
        clearInterval(window.sessionCountdownInterval);
        window.sessionCountdownInterval = null;
    }
    const modal = document.getElementById('sessionExpiryModal');
    if (modal) modal.remove();
}

function preserveWorkflowData() {
    const selectedSpec = sessionStorage.getItem('selectedSpecification');
    const workingData = sessionStorage.getItem('workingData_identifyingInformation');
    const breadcrumbContext = sessionStorage.getItem('breadcrumbContext');
    if (selectedSpec) localStorage.setItem('preserved_selectedSpecification', selectedSpec);
    if (workingData) localStorage.setItem('preserved_workingData_identifyingInformation', workingData);
    if (breadcrumbContext) localStorage.setItem('preserved_breadcrumbContext', breadcrumbContext);
    localStorage.setItem('workflowDataPreserved', 'true');
    localStorage.setItem('preservedFromPage', 'identifyingInformation');
}

/******************************************************************************
    Cleanup Functions (moved from HTML)
 ******************************************************************************/
function cleanupSessionNotifications() {
    let removedCount = 0;
    const existingNotifications = document.querySelectorAll('.session-expiry-notification');
    existingNotifications.forEach(notification => { notification.remove(); removedCount++; });
    const modalIds = ['sessionExpiryModal', 'sessionWarningModal', 'workflowRecoveryModal'];
    modalIds.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) { modal.remove(); removedCount++; }
    });
    const notificationClasses = ['notification', 'notification.info', 'notification.warning', 'notification.error', 'notification.success'];
    notificationClasses.forEach(className => {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => { element.remove(); removedCount++; });
    });
    const sessionSelectors = [
        '[id*="session"]', '[id*="Session"]', '[class*="session"]', '[class*="expiry"]', '[class*="warning"]'
    ];
    sessionSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => { element.remove(); removedCount++; });
    });
    if (window.sessionCountdownInterval) {
        clearInterval(window.sessionCountdownInterval);
        window.sessionCountdownInterval = null;
        removedCount++;
    }
    if (window.sessionWarningTimeout) {
        clearTimeout(window.sessionWarningTimeout);
        window.sessionWarningTimeout = null;
        removedCount++;
    }
    if (removedCount > 0) {
        console.log(`Session cleanup completed - removed ${removedCount} elements/timers`);
    }
}

function forceCleanupAllSessionElements() {
    console.log('FORCE CLEANUP: Starting aggressive session element removal...');
    const allElements = document.querySelectorAll('*');
    const removedElements = [];
    allElements.forEach(element => {
        const text = element.textContent.toLowerCase();
        const classList = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        const style = element.style.cssText.toLowerCase();
        if (text.includes('session') || text.includes('expired') || text.includes('expiry') || text.includes('login') || text.includes('redirecting') || classList.includes('notification') || classList.includes('session') || id.includes('session') || id.includes('notification') || id.includes('modal') || (style.includes('position: fixed') && style.includes('z-index: 1000'))) {
            if (!element.closest('.page-Content') && !element.closest('#sidebarContainer') && !element.closest('#breadcrumbContainer') && element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE' && element.tagName !== 'LINK') {
                removedElements.push({ tag: element.tagName, class: element.className, id: element.id, text: element.textContent.substring(0, 100) });
                element.remove();
            }
        }
    });
    for (let i = 1; i < 10000; i++) {
        clearInterval(i);
        clearTimeout(i);
    }
    console.log('FORCE CLEANUP: Removed elements:', removedElements);
    console.log('FORCE CLEANUP: Cleared all intervals and timeouts');
    return removedElements;
}
window.forceCleanupAllSessionElements = forceCleanupAllSessionElements;

/******************************************************************************
    Initialization (moved from HTML)
 ******************************************************************************/
document.addEventListener('DOMContentLoaded', function() {
    cleanupSessionNotifications();
    setInterval(() => { cleanupSessionNotifications(); }, 10000);
    setTimeout(async () => {
        try {
            window.authManager.init();
            // window.workflowSessionManager?.init('specification-creation'); // Uncomment if needed
            window.sidebarManager.initializeSidebar(window.authManager);
            window.breadcrumbManager.init();
            const existingContext = window.breadcrumbManager.getContext();
            if (existingContext && existingContext.timestamp && (Date.now() - existingContext.timestamp) < 5000) {
                existingContext.currentPage = 'IdentifyingInformation.html';
                window.breadcrumbManager.updateContext(existingContext);
            } else {
                const editMode = localStorage.getItem('editMode');
                const specificationIdentityId = localStorage.getItem('specificationIdentityId');
                const context = {
                    currentPage: 'IdentifyingInformation.html',
                    action: editMode === 'edit' ? 'edit' : 'new',
                    source: 'mySpecs'
                };
                if (specificationIdentityId) {
                    context.specId = specificationIdentityId;
                    context.specIdentityId = specificationIdentityId;
                }
                const referrer = document.referrer;
                if (referrer.includes('eInvoicingSpecificationRegistry.html')) context.source = 'registry';
                else if (referrer.includes('mySpecifications.html')) context.source = 'mySpecs';
                window.breadcrumbManager.setContext(context);
            }
            await initializeDataManager();
            attachFormEventListeners();
        } catch (error) {
            console.error('DEBUG: Error during page initialization:', error);
        }
    }, 50);
});
