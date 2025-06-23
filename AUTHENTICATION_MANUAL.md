# Authentication System Manual for Junior Developers

## 📖 Table of Contents
1. [Overview](#overview)
2. [How Authentication Works](#how-authentication-works)
3. [User Access Levels](#user-access-levels)
4. [HTML Integration](#html-integration)
5. [JavaScript API Functions](#javascript-api-functions)
6. [Error Handling](#error-handling)
7. [Session Management](#session-management)
8. [Common Tasks](#common-tasks)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This e-invoicing registry application uses **JWT-based authentication** with three access levels. It's designed as a prototype with simple, secure authentication patterns.

### Key Concepts:
- **JWT (JSON Web Token)**: A secure token that proves user identity
- **Role-based Access**: Different users see different features
- **Method-based Security**: GET requests are public, POST/PUT/DELETE require login

---

## 🔐 How Authentication Works

### Authentication Flow:
```
1. User enters username/password
2. System sends credentials to API
3. API returns JWT token + user info
4. Token stored in browser localStorage
5. Token included in protected API calls
6. Token expires after 1 hour
```

### What Happens Behind the Scenes:
```javascript
// When user logs in
const result = await authManager.login('Admin', 'Password123');
// → Calls: POST /api/auth/login
// → Receives: { token: "jwt...", userID: 1, username: "admin", role: "Admin" }
// → Stores token in localStorage
```

---

## 👥 User Access Levels

### 🚫 Guest (Not Logged In)
- **Can access**: Public data (GET requests)
- **Cannot access**: Create, edit, or delete anything
- **Examples**: View specification lists, search public data

### 👤 User (Logged In)
- **Can access**: Everything guests can + create/edit own data
- **Cannot access**: Delete operations, admin functions
- **Examples**: Create new specifications, edit own content

### 👑 Admin (Admin Role)
- **Can access**: Everything + delete operations + admin functions
- **Examples**: Delete specifications, manage users, system settings

### Access Hierarchy:
```
Admin > User > Guest
  ↓     ↓     ↓
 All   Most  Some
```

---

## 🏗️ HTML Integration

### CSS Classes for Automatic Visibility

Add these classes to HTML elements to control visibility:

```html
<!-- Always visible (public) -->
<div>
    <h1>eInvoicing Registry</h1>
    <p>Welcome! Browse our public specifications.</p>
</div>

<!-- Only visible when logged in -->
<button class="user-only">Create New Specification</button>
<div class="protected">Your saved drafts</div>

<!-- Only visible to admins -->
<button class="admin-only">Admin Panel</button>
<button class="delete-only">Delete</button>

<!-- Specific create/edit operations -->
<button class="create-edit-only">Save Changes</button>
```

### Required HTML Elements

Your HTML should include these elements:

```html
<!-- Login/Logout Button -->
<button id="loginLogoutButton" onclick="toggleLogin()">Login</button>

<!-- User Status Display (optional) -->
<div id="userStatus" style="display: none; font-size: 12px; color: #666;"></div>

<!-- Navigation elements (will be styled based on login) -->
<nav>
    <a href="coreInvoiceModel.html">Core Invoice Model</a>
    <a href="ExtensionComponentDataModel.html">Extension Components</a>
</nav>
```

---

## 🛠️ JavaScript API Functions

### 🔑 Authentication Functions

#### Check User Status
```javascript
// Get current user information
const user = getCurrentUser();
console.log(user);
// Returns: { id: 1, username: "admin", role: "Admin", isAuthenticated: true }

// Quick access level check
const level = getAccessLevel(); // Returns: "admin", "user", or "guest"

// Permission checks
if (isLoggedIn()) {
    // User is logged in
}

if (isAdmin()) {
    // User is admin
}

if (canAccess('admin')) {
    // User can access admin features
}
```

#### Manual Login/Logout
```javascript
// Login programmatically
try {
    await loginUser('Admin', 'Password123');
    console.log('Login successful');
} catch (error) {
    console.log('Login failed:', error.message);
}

// Logout
await authManager.logout();
```

### 📡 API Calls

#### The Smart Fetch Function
Use `authenticatedFetch()` for all API calls - it handles authentication automatically:

```javascript
// GET requests (public) - no login required
const response = await authenticatedFetch('/api/specifications', {
    method: 'GET'
});

// POST requests (protected) - login required
const response = await authenticatedFetch('/api/specifications', {
    method: 'POST',
    body: JSON.stringify({
        specificationName: "My New Spec",
        sector: "Finance"
    })
});
```

#### Pre-built Helper Functions

```javascript
// Get specifications (public)
const specs = await getSpecifications(1, 10); // page 1, 10 items

// Create specification (requires login)
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

try {
    const result = await createSpecification(newSpec);
    console.log('Created:', result);
} catch (error) {
    // Error already shown to user
    console.log('Failed to create specification');
}
```

### 🎛️ Permission Checking

```javascript
// Check if user can perform actions
if (canCreateOrEdit()) {
    // Show create/edit buttons
    document.getElementById('createButton').style.display = 'block';
}

if (canDelete()) {
    // Show delete buttons
    document.getElementById('deleteButton').style.display = 'block';
}

// More granular checks
if (canAccess('admin')) {
    // Admin-only features
}

if (canAccess('user')) {
    // User+ features (includes admin)
}
```

---

## ⚠️ Error Handling

### Automatic Error Messages

The system shows user-friendly messages automatically:

```javascript
// Network errors
"Unable to connect to server. Please check your connection and try again shortly."

// Server errors
"Server error. Please try again shortly."

// Authentication errors
"Session expired. Please log in again."

// Permission errors
"Please log in to perform this action"
```

### Custom Error Handling

```javascript
try {
    const result = await createSpecification(data);
    // Success - automatic success message shown
} catch (error) {
    // Error message already shown to user
    // Add any custom logic here
    console.log('Operation failed');
}
```

### Manual Messages

```javascript
// Show custom messages
showMessage('Operation completed successfully!', 'success');
showMessage('Warning: Please check your input', 'info');
showMessage('Error: Something went wrong', 'error');
```

---

## ⏰ Session Management

### How Sessions Work

1. **Login**: Session starts, lasts 1 hour
2. **Activity**: Every 5 minutes, system checks if token is still valid
3. **Warning**: 5 minutes before expiration, user gets warning
4. **Expiration**: Token expires, user automatically logged out

### Session Warnings

```javascript
// User sees these messages automatically:
"Your session will expire in 3 minute(s). Please save your work."
"Your session has expired. Please log in again."
```

### Manual Session Control

```javascript
// Check if session is valid
if (authManager.isAuthenticated) {
    // Session is active
}

// Force session validation
authManager.validateTokens();
```

---

## 📋 Common Tasks

### 1. Adding a Protected Feature

```html
<!-- In your HTML -->
<button class="user-only" onclick="createNewItem()">Create New</button>
```

```javascript
// In your JavaScript
async function createNewItem() {
    if (!isLoggedIn()) {
        showMessage('Please log in first', 'error');
        return;
    }
    
    try {
        const result = await authenticatedFetch('/api/items', {
            method: 'POST',
            body: JSON.stringify({ name: 'New Item' })
        });
        // Success message shown automatically
    } catch (error) {
        // Error message shown automatically
    }
}
```

### 2. Creating Admin-Only Features

```html
<!-- Only admins can see this -->
<div class="admin-only">
    <h3>Admin Panel</h3>
    <button onclick="deleteAllItems()">Delete All</button>
</div>
```

```javascript
async function deleteAllItems() {
    if (!isAdmin()) {
        showMessage('Admin access required', 'error');
        return;
    }
    
    if (confirm('Are you sure? This cannot be undone.')) {
        // Proceed with deletion
        await authenticatedFetch('/api/admin/items', { method: 'DELETE' });
    }
}
```

### 3. Handling Form Submissions

```javascript
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Check permissions
    if (!canCreateOrEdit()) {
        showMessage('Please log in to save data', 'error');
        showLoginModal();
        return;
    }
    
    // Get form data
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    try {
        await authenticatedFetch('/api/save', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        // Success message shown automatically
    } catch (error) {
        // Error message shown automatically
    }
}
```

### 4. Dynamic Content Based on User Role

```javascript
function updatePageContent() {
    const user = getCurrentUser();
    
    if (user.isAuthenticated) {
        document.getElementById('welcomeMessage').textContent = 
            `Welcome back, ${user.username}!`;
        
        if (isAdmin()) {
            document.getElementById('adminStats').style.display = 'block';
        }
    } else {
        document.getElementById('welcomeMessage').textContent = 
            'Welcome! Please log in to access all features.';
    }
}

// Call this when page loads and when login status changes
document.addEventListener('DOMContentLoaded', updatePageContent);
```

---

## 🧪 Testing Guide

### Manual Testing Steps

1. **Test Public Access**:
   - Open page without logging in
   - Verify public content is visible
   - Verify protected content is hidden
   - Try GET API calls (should work)
   - Try POST API calls (should show login prompt)

2. **Test User Login**:
   - Login with: Username: `Admin`, Password: `Password123`
   - Verify welcome message appears
   - Verify protected content becomes visible
   - Try POST API calls (should work)

3. **Test Session Expiration**:
   - Login and wait (or manually expire token)
   - Try a protected action
   - Verify session expired message appears

4. **Test Admin Features**:
   - Login as Admin
   - Verify admin-only content is visible
   - Test delete operations

### Console Testing Commands

```javascript
// Check current status
getCurrentUser()
getAccessLevel()

// Test login
await demoLogin()

// Test permissions
canAccess('admin')
canCreateOrEdit()
canDelete()

// Test API calls
await getSpecifications()
await createSpecification({...})
```

### Browser Developer Tools

1. **Check localStorage**:
   - Open DevTools → Application → Local Storage
   - Look for: `access_token`, `userRole`, `username`

2. **Network Tab**:
   - Watch API calls
   - Check for `Authorization: Bearer <token>` headers

3. **Console**:
   - Run test commands above
   - Check for authentication logs

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Please log in to perform this action"
**Cause**: Trying to do POST/PUT/DELETE without being logged in
**Solution**: Login first, then try again

#### 2. "Session expired. Please log in again"
**Cause**: JWT token expired (after 1 hour)
**Solution**: Login again - this is normal behavior

#### 3. Protected content not showing after login
**Cause**: `updateVisibility()` not called
**Solution**: 
```javascript
// Call this after login
updateVisibility();
```

#### 4. API calls failing with network errors
**Cause**: Server is down or network issues
**Solution**: Check server status, try again later

#### 5. Login modal not appearing
**Cause**: Modal not created or JavaScript errors
**Solution**: Check browser console for errors, ensure `createLoginModal()` is called

### Debug Commands

```javascript
// Check authentication state
console.log('Auth state:', {
    isAuthenticated: authManager.isAuthenticated,
    userRole: authManager.userRole,
    username: authManager.username,
    hasToken: !!authManager.accessToken
});

// Check token validity
if (authManager.accessToken) {
    const payload = authManager.parseJWT(authManager.accessToken);
    console.log('Token expires at:', new Date(payload.exp * 1000));
    console.log('Time left:', Math.floor((payload.exp * 1000 - Date.now()) / 60000), 'minutes');
}

// Force visibility update
updateVisibility();

// Test API endpoint
authenticatedFetch('/api/test', { method: 'GET' })
    .then(r => r.json())
    .then(console.log)
    .catch(console.error);
```

### When to Ask for Help

🚨 **Contact senior developer if:**
- Server returns 500 errors consistently
- Authentication endpoint is down
- JWT tokens are malformed
- Need to add new user roles
- Need to implement new security features

✅ **You can handle:**
- User login/logout issues
- Session expiration
- Permission checking
- UI visibility problems
- Form submission authentication

---

## 📚 Quick Reference

### Essential Functions
```javascript
// User info
getCurrentUser()          // Get user details
getAccessLevel()          // Get "admin", "user", or "guest"
isLoggedIn()             // Boolean: is user logged in?
isAdmin()                // Boolean: is user admin?

// Permissions
canAccess(level)         // Can user access this level?
canCreateOrEdit()        // Can user create/edit?
canDelete()              // Can user delete?

// API calls
authenticatedFetch(url, options)  // Smart fetch with auth
getSpecifications(page, size)     // Get specs (public)
createSpecification(data)         // Create spec (protected)

// UI
updateVisibility()       // Update UI based on login status
showMessage(msg, type)   // Show user message
toggleLogin()            // Show login modal or logout
```

### CSS Classes
```css
.user-only          /* Visible when logged in */
.admin-only         /* Visible to admins only */
.protected          /* Visible when logged in (legacy) */
.create-edit-only   /* Visible when can create/edit */
.delete-only        /* Visible when can delete */
```

### HTML Elements
```html
<button id="loginLogoutButton">Login</button>
<div id="userStatus"></div>
<div id="loginModal"></div>
```

---

## 🎓 Learning Path for Junior Developers

### Week 1: Understanding
- [ ] Read this manual completely
- [ ] Understand JWT concept
- [ ] Learn about localStorage
- [ ] Practice with browser DevTools

### Week 2: Basic Implementation
- [ ] Add CSS classes to HTML elements
- [ ] Use permission checking functions
- [ ] Test login/logout functionality
- [ ] Handle basic form submissions

### Week 3: API Integration
- [ ] Use `authenticatedFetch()` for API calls
- [ ] Implement error handling
- [ ] Create protected features
- [ ] Test with different user roles

### Week 4: Advanced Features
- [ ] Create admin-only functionality
- [ ] Handle session expiration gracefully
- [ ] Implement complex UI logic
- [ ] Debug authentication issues

### Resources for Further Learning
- [JWT.io](https://jwt.io/) - Learn about JWT tokens
- [MDN Web Docs - localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN Web Docs - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

*This authentication system is designed for prototype use. For production deployment, additional security measures will be implemented.*
