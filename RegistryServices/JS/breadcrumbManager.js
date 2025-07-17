/**
 * Breadcrumb Manager - Handles dynamic breadcrumb navigation with workflow tracking
 * Uses sessionStorage for persistence across page navigation
 */

class BreadcrumbManager {
    constructor() {
        this.storageKey = 'breadcrumbContext';
        this.visitedStepsKey = 'workflowVisitedSteps';
        this.workflowSteps = {
            'IdentifyingInformation.html': { step: 1, name: 'Identifying Info', nickname: 'identify', total: 5 },
            'coreInvoiceModel.html': { step: 2, name: 'Core Invoice Model', nickname: 'core', total: 5 },
            'ExtensionComponentDataModel.html': { step: 3, name: 'Extension Component Data Model', nickname: 'extension', total: 5 },
            'additionalRequirements.html': { step: 4, name: 'Additional Requirements', nickname: 'additional', total: 5 },
            'specificationPreview.html': { step: 5, name: 'Specification Preview', nickname: 'preview', total: 5 }
        };
        
        // All workflow steps in order for navigation
        this.allWorkflowSteps = [
            'IdentifyingInformation.html',
            'coreInvoiceModel.html', 
            'ExtensionComponentDataModel.html',
            'additionalRequirements.html',
            'specificationPreview.html'
        ];
    }

    /**
     * Initialize breadcrumb system on page load
     */
    init() {
        console.log('BreadcrumbManager: init() called');
        this.renderBreadcrumb();
    }

    /**
     * Set breadcrumb context when navigating to a new page
     * @param {Object} context - Navigation context
     * @param {string} context.source - Source page/section (e.g., 'registry', 'mySpecs')
     * @param {string} context.action - Action type (e.g., 'view', 'edit', 'new')
     * @param {string} context.specId - Specification ID or identifier
     * @param {string} context.specIdentityId - Identity ID of the specification
     * @param {string} context.currentPage - Current page filename
     */
    setContext(context) {
        console.log('BreadcrumbManager: setContext() called with:', context);
        
        // Build complete context with defaults
        const completeContext = {
            source: context.source || this.inferSource(),
            action: context.action || this.inferAction(),
            specId: context.specId || this.getSpecIdFromStorage(),
            specIdentityId: context.specIdentityId || this.getIdentityIdFromStorage(),
            currentPage: context.currentPage || this.getCurrentPageName(),
            timestamp: Date.now()
        };

        console.log('BreadcrumbManager: Complete context built:', completeContext);

        // Build path using complete context
        completeContext.path = this.buildBreadcrumbPath(completeContext);
        console.log('BreadcrumbManager: Path built:', completeContext.path);

        sessionStorage.setItem(this.storageKey, JSON.stringify(completeContext));
        console.log('BreadcrumbManager: Context saved to sessionStorage');
        
        this.renderBreadcrumb();
    }

    /**
     * Update current context without changing the full breadcrumb path
     * @param {Object} updates - Partial context updates
     */
    updateContext(updates) {
        console.log('BreadcrumbManager: updateContext() called with:', updates);
        const existing = this.getContext();
        console.log('BreadcrumbManager: Existing context:', existing);
        
        if (existing) {
            const merged = { ...existing, ...updates, timestamp: Date.now() };
            console.log('BreadcrumbManager: Merged context:', merged);
            
            // Rebuild the path with the updated context
            merged.path = this.buildBreadcrumbPath(merged);
            console.log('BreadcrumbManager: Updated path:', merged.path);
            
            sessionStorage.setItem(this.storageKey, JSON.stringify(merged));
            this.renderBreadcrumb();
        } else {
            console.log('BreadcrumbManager: No existing context to update');
        }
    }

    /**
     * Get current breadcrumb context
     * @returns {Object|null} Current context or null if not set
     */
    getContext() {
        const stored = sessionStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : null;
    }

    /**
     * Clear breadcrumb context and visited steps
     */
    clearContext() {
        try {
            sessionStorage.removeItem(this.storageKey);
            this.clearVisitedSteps();
            console.log('BreadcrumbManager: Context and visited steps cleared');
            this.renderBreadcrumb();
        } catch (error) {
            console.error('BreadcrumbManager: Error clearing context:', error);
        }
    }

    /**
     * Build breadcrumb path based on context
     * @param {Object} context - Navigation context
     * @returns {Array} Array of breadcrumb items
     */
    buildBreadcrumbPath(context) {
        const path = [];
        const currentPage = context.currentPage || this.getCurrentPageName();
        const workflowInfo = this.workflowSteps[currentPage];
        
        if (context.source === 'govEntity') {
            path.push({ label: 'Gov Entity', page: 'governingEntityList.html', clickable: true, workflowStep: true, status: 'completed', fullName: 'Governing Entity List' });
            path.push({ label: 'View Entity', clickable: false, workflowStep: true, status: 'current', fullName: 'View Governing Entity' });
            return path;
        }

        // Add source
        if (context.source === 'registry') {
            path.push({ label: 'Registry', page: 'eInvoicingSpecificationRegistry.html', clickable: true });
        } else if (context.source === 'mySpecs') {
            path.push({ label: 'My Specs', page: 'mySpecifications.html', clickable: true });
        }

        // Check if this is a workflow page
        if (workflowInfo) {
            // Add action-based context
            if (context.action === 'new') {
                path.push({ label: 'New', clickable: false });
                // Add workflow steps
                path.push(...this.buildWorkflowSteps(context));
            } else if (context.action === 'edit' || context.action === 'view') {
                const actionLabel = context.action === 'edit' ? 'Edit Spec' : 'View Spec';
                path.push({ 
                    label: actionLabel, 
                    clickable: false,
                    specId: context.specIdentityId || context.specId
                });
                // Add workflow steps
                path.push(...this.buildWorkflowSteps(context));
            }
        } else {
            // Non-workflow page - use original logic
            if (context.action === 'new') {
                path.push({ label: 'New', page: currentPage, clickable: false });
            } else if (context.action === 'edit' || context.action === 'view') {
                const actionLabel = context.action === 'edit' ? 'Edit Spec' : 'View Spec';
                path.push({ 
                    label: actionLabel, 
                    page: currentPage, 
                    clickable: false,
                    specId: context.specIdentityId || context.specId
                });
            }
        }

        return path;
    }

    /**
     * Build workflow steps for breadcrumb
     * @param {Object} context - Navigation context
     * @returns {Array} Array of workflow step items
     */
    buildWorkflowSteps(context) {
        const currentPage = context.currentPage || this.getCurrentPageName();
        const visitedSteps = this.getVisitedSteps();
        const action = context.action || 'view';
        
        // Mark current step as visited
        this.markStepAsVisited(currentPage);
        
        const workflowSteps = [];
        
        for (const page of this.allWorkflowSteps) {
            const stepInfo = this.workflowSteps[page];
            const status = this.getStepStatus(page, currentPage, visitedSteps, action);
            
            workflowSteps.push({
                label: stepInfo.nickname,
                page: page,
                clickable: status !== 'current' && status !== 'disabled',
                workflowStep: true,
                status: status,
                stepNumber: stepInfo.step,
                fullName: stepInfo.name
            });
        }
        
        return workflowSteps;
    }

    /**
     * Render breadcrumb UI
     */
    renderBreadcrumb() {
        console.log('BreadcrumbManager: renderBreadcrumb() called');
        const container = document.getElementById('breadcrumbContainer');
        console.log('BreadcrumbManager: breadcrumbContainer found:', !!container);
        
        if (!container) {
            // Create breadcrumb container if it doesn't exist
            console.log('BreadcrumbManager: Creating breadcrumb container');
            this.createBreadcrumbContainer();
            return;
        }

        const context = this.getContext();
        console.log('BreadcrumbManager: Current context:', context);
        
        if (!context || !context.path || context.path.length === 0) {
            console.log('BreadcrumbManager: No context or empty path, hiding breadcrumbs');
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        const isMobile = this.isMobileView();
        const path = isMobile ? this.getMobilePath(context.path) : context.path;
        console.log('BreadcrumbManager: Rendering path:', path);

        container.innerHTML = this.generateBreadcrumbHTML(path, context);
        container.style.display = 'block';
        console.log('BreadcrumbManager: Breadcrumb rendered successfully');
    }

    /**
     * Create breadcrumb container above page title
     */
    createBreadcrumbContainer() {
        console.log('BreadcrumbManager: createBreadcrumbContainer() called');
        const pageContent = document.querySelector('.page-Content');
        console.log('BreadcrumbManager: pageContent found:', !!pageContent);
        
        if (!pageContent) {
            console.log('BreadcrumbManager: No .page-Content found, cannot create container');
            return;
        }

        const breadcrumbContainer = document.createElement('div');
        breadcrumbContainer.id = 'breadcrumbContainer';
        breadcrumbContainer.className = 'breadcrumb-container';
        
        console.log('BreadcrumbManager: Created breadcrumb container element');
        
        const firstChild = pageContent.firstElementChild;
        if (firstChild) {
            pageContent.insertBefore(breadcrumbContainer, firstChild);
            console.log('BreadcrumbManager: Inserted breadcrumb container before first child');
        } else {
            pageContent.appendChild(breadcrumbContainer);
            console.log('BreadcrumbManager: Appended breadcrumb container to page content');
        }

        // Re-render now that container exists
        console.log('BreadcrumbManager: Re-rendering breadcrumb after container creation');
        this.renderBreadcrumb();
    }

    /**
     * Generate breadcrumb HTML
     * @param {Array} path - Breadcrumb path items
     * @param {Object} context - Full context object
     * @returns {string} HTML string
     */
    generateBreadcrumbHTML(path, context) {
        if (!path || path.length === 0) return '';

        const breadcrumbItems = [];
        let workflowStepsHTML = '';
        
        // Process regular breadcrumb items and separate workflow steps
        const regularItems = path.filter(item => !item.workflowStep);
        const workflowItems = path.filter(item => item.workflowStep);
        
        // Generate regular breadcrumb items
        regularItems.forEach((item, index) => {
            const isLast = index === regularItems.length - 1 && workflowItems.length === 0;
            const displayLabel = this.getDisplayLabel(item);
            const hoverTitle = this.getHoverTitle(item, context);

            if (isLast || !item.clickable) {
                breadcrumbItems.push(`<span class="breadcrumb-current" title="${hoverTitle}">${displayLabel}</span>`);
            } else {
                breadcrumbItems.push(`<a href="#" class="breadcrumb-item" title="${hoverTitle}" data-page="${item.page}" data-spec-id="${item.specId || ''}">${displayLabel}</a>`);
            }
        });
        
        // Generate workflow steps if present
        if (workflowItems.length > 0) {
            const workflowStepsArray = workflowItems.map((item, index) => {
                const isLast = index === workflowItems.length - 1;
                const statusClass = `breadcrumb-step-${item.status}`;
                const hoverTitle = `${item.fullName} (Step ${item.stepNumber})`;
                
                if (item.clickable) {
                    return `<a href="#" class="breadcrumb-step ${statusClass}" title="${hoverTitle}" data-page="${item.page}" data-spec-id="${context.specId || ''}">${item.label}</a>`;
                } else {
                    return `<span class="breadcrumb-step ${statusClass}" title="${hoverTitle}">${item.label}</span>`;
                }
            });
            
            workflowStepsHTML = `<div class="breadcrumb-workflow-steps">${workflowStepsArray.join('<span class="breadcrumb-workflow-separator">›</span>')}</div>`;
        }
        
        // Combine regular breadcrumb with workflow steps
        let result = breadcrumbItems.join('<span class="breadcrumb-separator">></span>');
        if (workflowStepsHTML) {
            result += '<span class="breadcrumb-separator">></span>' + workflowStepsHTML;
        }
        
        return result;
    }

    /**
     * Get display label for breadcrumb item
     * @param {Object} item - Breadcrumb item
     * @returns {string} Display label
     */
    getDisplayLabel(item) {
        return item.label;
    }

    /**
     * Get hover title for breadcrumb item
     * @param {Object} item - Breadcrumb item
     * @param {Object} context - Full context
     * @returns {string} Hover title
     */
    getHoverTitle(item, context) {
        if (item.workflow && item.specId) {
            const specDisplay = context.specIdentityId || context.specId || 'Current Specification';
            return `${item.label.split(' (')[0]} "${specDisplay}" (${item.workflow})`;
        } else if (item.specId) {
            const specDisplay = context.specIdentityId || context.specId || 'Current Specification';
            return `${item.label} "${specDisplay}"`;
        }
        return item.label;
    }

    /**
     * Get mobile-friendly path (current + previous only)
     * @param {Array} fullPath - Full breadcrumb path
     * @returns {Array} Mobile path
     */
    getMobilePath(fullPath) {
        if (fullPath.length <= 2) return fullPath;
        return fullPath.slice(-2); // Last 2 items only
    }

    /**
     * Check if mobile view
     * @returns {boolean} True if mobile view
     */
    isMobileView() {
        return window.innerWidth <= 768;
    }

    /**
     * Get current page name from URL
     * @returns {string} Page filename
     */
    getCurrentPageName() {
        const path = window.location.pathname;
        return path.substring(path.lastIndexOf('/') + 1);
    }

    /**
     * Infer source from referrer or current context
     * @returns {string} Inferred source
     */
    inferSource() {
        const referrer = document.referrer;
        if (referrer.includes('eInvoicingSpecificationRegistry.html')) {
            return 'registry';
        } else if (referrer.includes('mySpecifications.html')) {
            return 'mySpecs';
        }
        return 'direct';
    }

    /**
     * Infer action from current page and context
     * @returns {string} Inferred action
     */
    inferAction() {
        const currentPage = this.getCurrentPageName();
        const isReadOnly = currentPage.includes('Read') || currentPage.includes('view') || currentPage.includes('Preview');
        
        // Check if this is a new specification workflow
        const selectedSpec = localStorage.getItem('selectedSpecification');
        if (!selectedSpec || selectedSpec === 'new') {
            return 'new';
        }
        
        return isReadOnly ? 'view' : 'edit';
    }

    /**
     * Get specification ID from localStorage
     * @returns {string|null} Specification ID
     */
    getSpecIdFromStorage() {
        return localStorage.getItem('selectedSpecification');
    }

    /**
     * Get identity ID from specification data
     * @returns {string|null} Identity ID
     */
    getIdentityIdFromStorage() {
        const specId = this.getSpecIdFromStorage();
        if (!specId) return null;

        // Check both storage locations
        const specifications = JSON.parse(localStorage.getItem('specifications')) || [];
        const mySpecifications = JSON.parse(localStorage.getItem('mySpecifications')) || [];

        let spec = specifications.find(s => s.specName === specId);
        if (!spec) {
            spec = mySpecifications.find(s => s.id === specId);
        }

        return spec ? (spec.identityID || spec.specName || spec.id) : specId;
    }

    /**
     * Handle breadcrumb click navigation
     * @param {Event} event - Click event
     */
    handleBreadcrumbClick(event) {
        event.preventDefault();
        
        const link = event.target.closest('.breadcrumb-item');
        if (!link) return;

        const targetPage = link.getAttribute('data-page');
        const specId = link.getAttribute('data-spec-id');

        // Check for unsaved changes
        if (this.hasUnsavedChanges()) {
            const proceed = confirm('You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.');
            if (!proceed) return;
        }

        // Navigate to target page
        if (specId && specId !== '') {
            localStorage.setItem('selectedSpecification', specId);
        }
        
        window.location.href = targetPage;
    }

    /**
     * Check if current page has unsaved changes
     * @returns {boolean} True if there are unsaved changes
     */
    hasUnsavedChanges() {
        // Add comprehensive debugging
        console.log('BreadcrumbManager: hasUnsavedChanges() called');
        
        // First, check if there's a global hasActualChanges function (more accurate)
        if (typeof window.hasActualChanges === 'function') {
            const actualChanges = window.hasActualChanges();
            console.log('BreadcrumbManager: hasActualChanges() returned:', actualChanges);
            return actualChanges;
        }
        
        // Fall back to checking isFormDirty for pages that don't have hasActualChanges
        const isFormDirtyValue = typeof window.isFormDirty !== 'undefined' && window.isFormDirty === true;
        console.log('BreadcrumbManager: hasActualChanges not available, isFormDirty:', window.isFormDirty, 'result:', isFormDirtyValue);
        return isFormDirtyValue;
    }

    /**
     * Initialize breadcrumb click handlers
     */
    initializeClickHandlers() {
        document.addEventListener('click', (event) => {
            if (event.target.matches('.breadcrumb-item') || event.target.closest('.breadcrumb-item')) {
                this.handleBreadcrumbClick(event);
            } else if (event.target.matches('.breadcrumb-step') || event.target.closest('.breadcrumb-step')) {
                this.handleWorkflowStepClick(event);
            }
        });

        // Handle window resize for mobile responsiveness
        window.addEventListener('resize', () => {
            this.renderBreadcrumb();
        });
    }

    /**
     * Handle workflow step click navigation
     * @param {Event} event - Click event
     */
    handleWorkflowStepClick(event) {
        event.preventDefault();
        
        const target = event.target.matches('.breadcrumb-step') ? event.target : event.target.closest('.breadcrumb-step');
        const targetPage = target.getAttribute('data-page');
        const specId = target.getAttribute('data-spec-id');
        
        console.log('BreadcrumbManager: Workflow step clicked:', targetPage);
        
        // Check if step is clickable (not disabled or current)
        if (target.classList.contains('breadcrumb-step-disabled') || 
            target.classList.contains('breadcrumb-step-current')) {
            console.log('BreadcrumbManager: Step is disabled or current, ignoring click');
            return;
        }
        
        if (!targetPage) {
            console.error('BreadcrumbManager: No target page specified for workflow step');
            return;
        }
        
        // Check for unsaved changes before navigation
        if (this.hasUnsavedChanges()) {
            const confirmNavigation = confirm(
                'You have unsaved changes. Do you want to leave this page? Your changes will be lost.'
            );
            if (!confirmNavigation) {
                console.log('BreadcrumbManager: Navigation cancelled due to unsaved changes');
                return;
            }
        }
        
        // Navigate to target page
        console.log('BreadcrumbManager: Navigating to workflow step:', targetPage);
        
        // Preserve specification context for workflow navigation
        if (specId) {
            localStorage.setItem('selectedSpecification', specId);
        }
        
        // Navigate to the target page
        window.location.href = targetPage;
    }

    /**
     * Mark a workflow step as visited/completed
     * @param {string} page - Page filename (e.g., 'IdentifyingInformation.html')
     */
    markStepAsVisited(page) {
        try {
            const visitedSteps = this.getVisitedSteps();
            if (!visitedSteps.includes(page)) {
                visitedSteps.push(page);
                sessionStorage.setItem(this.visitedStepsKey, JSON.stringify(visitedSteps));
                console.log('BreadcrumbManager: Marked step as visited:', page);
            }
        } catch (error) {
            console.error('BreadcrumbManager: Error marking step as visited:', error);
        }
    }

    /**
     * Get list of visited workflow steps
     * @returns {Array} Array of visited page filenames
     */
    getVisitedSteps() {
        try {
            const stored = sessionStorage.getItem(this.visitedStepsKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('BreadcrumbManager: Error getting visited steps:', error);
            return [];
        }
    }

    /**
     * Clear visited steps (useful when starting new workflow)
     */
    clearVisitedSteps() {
        try {
            sessionStorage.removeItem(this.visitedStepsKey);
            console.log('BreadcrumbManager: Cleared visited steps');
        } catch (error) {
            console.error('BreadcrumbManager: Error clearing visited steps:', error);
        }
    }

    /**
     * Determine step status for workflow breadcrumb
     * @param {string} page - Page filename
     * @param {string} currentPage - Current page filename
     * @param {Array} visitedSteps - Array of visited steps
     * @param {string} action - Current action (new/edit)
     * @returns {string} Step status: 'completed', 'current', 'future', 'disabled'
     */
    getStepStatus(page, currentPage, visitedSteps, action) {
        if (page === currentPage) {
            return 'current';
        }
        
        if (visitedSteps.includes(page)) {
            return 'completed';
        }
        
        const currentStepNum = this.workflowSteps[currentPage]?.step || 0;
        const stepNum = this.workflowSteps[page]?.step || 0;
        
        // Future steps
        if (stepNum > currentStepNum) {
            // In edit mode, future steps are clickable; in new mode, they're disabled
            return action === 'edit' ? 'future' : 'disabled';
        }
        
        // Past steps (not yet visited) - treat as future
        return action === 'edit' ? 'future' : 'disabled';
    }
}

// Create global instance
window.breadcrumbManager = new BreadcrumbManager();

// Auto-initialize click handlers when script loads
document.addEventListener('DOMContentLoaded', function() {
    window.breadcrumbManager.initializeClickHandlers();
});