# 🚀 Quick Start Card - Registry Services Frontend

## 🏗️ New Modular Architecture

The application now uses a **modular JavaScript architecture** with:
- **Centralized Data Management** via `SpecificationDataManager`
- **Page-specific modules** for better maintainability
- **Consistent authentication** across all pages

## 🔑 Login Credentials (Demo)
- **Username**: `Admin`
- **Password**: `Password123`

## 👥 User Types
- **Guest** (no login) → View public data only
- **User** (logged in) → Create and edit
- **Admin** (admin role) → Everything + delete

## 📡 Essential JavaScript Functions

### Data Management (New!)
```javascript
// Initialize data manager
const dataManager = new SpecificationDataManager();

// Check edit mode
dataManager.isEditMode()

// Load specification
await dataManager.loadSpecificationFromAPI(specId)

// Save working data
dataManager.workingData = yourData;
dataManager.saveWorkingDataToLocalStorage();

// Get all specifications
await dataManager.getAllSpecifications()
```

### Authentication (Updated)
```javascript
getCurrentUser()          // Get user info
isLoggedIn()             // true/false
isAdmin()                // true/false
getAccessLevel()         // "guest", "user", or "admin"
```

### API Calls (Enhanced)
```javascript
// Public API call (no login needed)
await authenticatedFetch('/api/data', { method: 'GET' })

// Protected API call (login required)
await authenticatedFetch('/api/data', { 
    method: 'POST', 
    body: JSON.stringify(data) 
})
```

### Create New Specification
```javascript
const newSpec = {
    "specificationIdentifier": "urn:SPEC",
    "specificationName": "My Invoice Spec",
    "sector": "Finance",
    "purpose": "Digitise existing Invoicing",
    "specificationVersion": "1.0",
    "governingEntity": "My Company",
    "contactInformation": "John Doe",
    "dateOfImplementation": "2025-06-28T00:00:00",
    "country": "IE",
    "specificationType": "Extension",
    "preferredSyntax": "UBL"
};

await createSpecification(newSpec);
```

## 🛠️ New Page Modules

### Registry Page
```javascript
// Using registryTable.js module
await loadRegistryData();        // Load specifications
searchSpecifications(query);     // Search functionality
filterByStatus(status);         // Filter specifications
```

### Specification Workflow
```javascript
// Each page uses centralized data management
await initializeDataManager();   // Initialize on page load
handleSave();                   // Save to working data
saveAndGoToNextStep();          // Save and navigate
```

### Governing Entities
```javascript
// Using governingEntity.js module
await loadGoverningEntities();   // Load entities
await loadEntityDetails(id);     // Load specific entity
```

## 🔧 Required HTML Setup

### Modern Page Structure
```html
<!-- Required scripts in order -->
<script src="../JS/auth/authManager.js"></script>
<script>
    window.authManager = new AuthManager();
    function authenticatedFetch(url, options = {}) {
        const headers = {...(options.headers || {}), ...window.authManager.getAuthHeaders()};
        return fetch(url, {...options, headers});
    }
</script>
<script src="../JS/javascript.js"></script>
<script src="../JS/dataManager.js"></script>
<script src="../JS/yourPageModule.js"></script>
```

### CSS Classes (Still Supported)
```html
<div class="user-only">Shows when logged in</div>
<div class="admin-only">Shows to admins only</div>
<button class="create-edit-only">Create/Edit Button</button>
<button class="delete-only">Delete Button</button>
```

### Protected Form Submission
```javascript
async function handleSubmit(event) {
    event.preventDefault();
    
    if (!isLoggedIn()) {
        showMessage('Please log in first', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    await authenticatedFetch('/api/save', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}
```

### Permission-Based UI
```javascript
function updateUI() {
    if (canCreateOrEdit()) {
        document.getElementById('createBtn').style.display = 'block';
    }
    
    if (canDelete()) {
        document.getElementById('deleteBtn').style.display = 'block';
    }
}
```

## ⚠️ Error Messages (Automatic)
- **Network Down**: "Unable to connect to server. Please try again shortly."
- **Session Expired**: "Session expired. Please log in again."
- **No Permission**: "Please log in to perform this action"

## 🧪 Testing Console Commands
```javascript
// Test login
await demoLogin()

// Check permissions
getCurrentUser()
canAccess('admin')

// Test API
await getSpecifications()
```

## 📋 Required HTML Elements
```html
<button id="loginLogoutButton" onclick="toggleLogin()">Login</button>
<div id="userStatus" style="display: none;"></div>
```

## 🔧 Quick Debug
```javascript
// Check auth state
console.log('Auth:', {
    authenticated: authManager.isAuthenticated,
    role: authManager.userRole,
    username: authManager.username
});

// Force UI update
updateVisibility();
```

---

📖 **Full Manual**: See `AUTHENTICATION_MANUAL.md` for complete documentation
