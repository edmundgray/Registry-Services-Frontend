console.log('DEBUG: workflowSessionManager.js script loaded');

class WorkflowSessionManager {
    constructor() {
        console.log('DEBUG: WorkflowSessionManager constructor called');
        this.workflowState = null;
        this.currentStep = null;
        this.lastActivity = null;
        this.statusIndicator = null;
        this.statusUpdateInterval = null;
    }

    // Initialize workflow session management
    init(workflowType = 'specification-creation') {
        console.log('DEBUG: WorkflowSessionManager init called with type:', workflowType);
        
        this.workflowState = {
            type: workflowType,
            startTime: Date.now(),
            currentStep: this.getCurrentStep(),
            lastActivity: Date.now()
        };
        
        console.log('DEBUG: Workflow state initialized:', this.workflowState);
        
        // Monitor user activity
        this.monitorUserActivity();
        
        // Hook into auth manager events
        this.setupAuthEventListeners();
        
        // Add session status indicator
        this.addSessionStatusIndicator();
        
        console.log('Workflow session manager initialized for step', this.getCurrentStep());
    }

    getCurrentStep() {
        const currentPage = window.location.pathname.split('/').pop();
        console.log('DEBUG: getCurrentStep - current page:', currentPage);
        
        const stepMap = {
            'IdentifyingInformation.html': 1,
            'coreInvoiceModel.html': 2,
            'ExtensionComponentDataModel.html': 3,
            'additionalRequirements.html': 4,
            'specificationPreview.html': 5
        };
        
        const step = stepMap[currentPage] || 0;
        console.log('DEBUG: getCurrentStep - mapped to step:', step);
        return step;
    }

    // Monitor user activity to detect idle state
    monitorUserActivity() {
        console.log('DEBUG: Setting up activity monitoring');
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (this.workflowState) {
                    this.workflowState.lastActivity = Date.now();
                }
            }, { passive: true });
        });
    }

    // Setup auth event listeners
    setupAuthEventListeners() {
        console.log('DEBUG: Setting up auth event listeners');
        
        // Listen for token refresh events
        window.addEventListener('tokenRefreshed', () => {
            console.log('Token refreshed during workflow');
            this.updateSessionStatus();
        });
        
        // Listen for authentication failures
        window.addEventListener('authenticationFailed', () => {
            this.handleAuthFailure();
        });
    }

    // Add session status indicator
    addSessionStatusIndicator() {
        console.log('DEBUG: Adding session status indicator');
        
        try {
            this.statusIndicator = document.createElement('div');
            this.statusIndicator.id = 'sessionStatus';
            this.statusIndicator.style.cssText = `
                position: fixed; top: 10px; right: 10px; z-index: 1000;
                background: rgba(255,255,255,0.95); padding: 8px 12px;
                border-radius: 5px; font-size: 12px; color: #666;
                border: 1px solid #ddd; display: none;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            `;
            
            document.body.appendChild(this.statusIndicator);
            console.log('DEBUG: Session status indicator element created and added to DOM');
            
            // Update status every 30 seconds
            this.statusUpdateInterval = setInterval(() => {
                this.updateSessionStatus();
            }, 30000);
            
            // Initial update
            this.updateSessionStatus();
            
            console.log('Session status indicator added to page');
            
        } catch (error) {
            console.error('ERROR: Failed to add session status indicator:', error);
        }
    }

    updateSessionStatus() {
        if (!this.statusIndicator || !window.authManager) {
            console.log('DEBUG: updateSessionStatus - missing dependencies:', {
                statusIndicator: !!this.statusIndicator,
                authManager: !!window.authManager
            });
            return;
        }
        
        try {
            if (window.authManager.isTokenNearExpiry && window.authManager.isTokenNearExpiry(10)) {
                const timeLeft = Math.ceil((window.authManager.tokenExpiryTime - Date.now()) / (60 * 1000));
                console.log('Session warning: Token expires in', timeLeft, 'minutes');
                
                this.statusIndicator.innerHTML = `<i class="fa-solid fa-clock"></i> Session expires in ${timeLeft} min`;
                this.statusIndicator.style.background = '#fff3cd';
                this.statusIndicator.style.color = '#856404';
                this.statusIndicator.style.display = 'block';
                
                console.log('DEBUG: Session status indicator shown');
            } else {
                this.statusIndicator.style.display = 'none';
                // console.log('DEBUG: Session status indicator hidden (session healthy)');
            }
        } catch (error) {
            console.warn('Error updating session status:', error);
        }
    }

    // Handle authentication failure during workflow
    handleAuthFailure() {
        console.log('Authentication failed during workflow');
        this.showAuthFailureMessage();
    }

    showAuthFailureMessage() {
        console.log('DEBUG: Showing auth failure message');
        
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff3cd; color: #856404; padding: 20px; border: 1px solid #ffeaa7; 
            border-radius: 8px; z-index: 10002; max-width: 400px; text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        message.innerHTML = `
            <h4><i class="fa-solid fa-exclamation-triangle"></i> Session Expired</h4>
            <p>Your session has expired. Please save your work manually and log in again to continue.</p>
            <div style="margin-top: 15px;">
                <button onclick="window.authManager.showReauthenticationModal(); this.parentElement.parentElement.remove();" 
                        style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">
                    <i class="fa-solid fa-sign-in-alt"></i> Log In Again
                </button>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    Dismiss
                </button>
            </div>
        `;
        
        document.body.appendChild(message);
    }

    // Show save reminder
    showSaveReminder() {
        console.log('DEBUG: Showing save reminder');
        
        const reminder = document.createElement('div');
        reminder.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 1000;
            background: #17a2b8; color: white; padding: 15px 20px;
            border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            max-width: 300px;
        `;
        
        reminder.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <strong><i class="fa-solid fa-save"></i> Save Reminder</strong><br>
                    <small>Don't forget to save your work before continuing!</small>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">×</button>
            </div>
        `;
        
        document.body.appendChild(reminder);
        
        console.log('Save reminder displayed');
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (reminder.parentNode) {
                reminder.remove();
            }
        }, 5000);
    }

    // Get current workflow status for debugging
    getWorkflowStatus() {
        const timeActive = Date.now() - (this.workflowState?.startTime || 0);
        const timeSinceActivity = Date.now() - (this.workflowState?.lastActivity || 0);
        
        return {
            currentStep: this.getCurrentStep(),
            timeActive: Math.floor(timeActive / 1000),
            timeSinceActivity: Math.floor(timeSinceActivity / 1000),
            isTokenNearExpiry: window.authManager?.isTokenNearExpiry && window.authManager.isTokenNearExpiry(),
            isTokenExpired: window.authManager?.isTokenExpired && window.authManager.isTokenExpired()
        };
    }

    // Clean up when workflow is complete or abandoned
    cleanup() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
        
        if (this.statusIndicator && this.statusIndicator.parentNode) {
            this.statusIndicator.remove();
        }
        
        console.log('Workflow session manager cleaned up');
    }
}

// Initialize workflow session manager globally (DISABLED - token refresh endpoints not available)
console.log('DEBUG: WorkflowSessionManager creation disabled - token refresh endpoints not available');
// window.workflowSessionManager = new WorkflowSessionManager();
window.workflowSessionManager = {
    init: function() {
        console.log('DEBUG: WorkflowSessionManager.init() disabled - token refresh endpoints not available');
    },
    cleanup: function() {
        console.log('DEBUG: WorkflowSessionManager.cleanup() - no-op');
    }
};
console.log('DEBUG: Global workflowSessionManager stub created (disabled):', !!window.workflowSessionManager);
