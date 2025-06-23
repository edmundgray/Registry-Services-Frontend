# 🚀 Quick Start Card - Authentication System

## 🔑 Login Credentials (Demo)
- **Username**: `Admin`
- **Password**: `Password123`

## 👥 User Types
- **Guest** (no login) → View public data only
- **User** (logged in) → Create and edit
- **Admin** (admin role) → Everything + delete

## 🏷️ CSS Classes for HTML
```html
<div class="user-only">Shows when logged in</div>
<div class="admin-only">Shows to admins only</div>
<button class="create-edit-only">Create/Edit Button</button>
<button class="delete-only">Delete Button</button>
```

## 📡 Essential JavaScript Functions

### Check User Status
```javascript
getCurrentUser()          // Get user info
isLoggedIn()             // true/false
isAdmin()                // true/false
getAccessLevel()         // "guest", "user", or "admin"
```

### API Calls
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

## 🛠️ Common Patterns

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
