# Complete JWT Authentication System Manual for Developers

## Table of Contents
1. [System Overview](#system-overview)
2. [Quick Start Guide](#quick-start-guide)
3. [System Architecture](#system-architecture)
4. [Core Components](#core-components)
5. [Authentication Flow](#authentication-flow)
6. [Access Control System](#access-control-system)
7. [API Integration](#api-integration)
8. [UI Integration](#ui-integration)
9. [Error Handling](#error-handling)
10. [Session Management](#session-management)
11. [Code Examples](#code-examples)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)
14. [Testing Guide](#testing-guide)
15. [Future Enhancements](#future-enhancements)

---

## System Overview

### What is JWT Authentication?
JWT (JSON Web Token) is a secure way to transmit information between parties. In our system:
- **Tokens contain user information** (ID, username, role, expiration)
- **Tokens are signed** to prevent tampering
- **Tokens expire** for security (1 hour in our prototype)
- **No server session storage** needed

### Our Authentication System Features
✅ **Three Access Levels**: Guest, User, Admin  
✅ **Method-Based Security**: GET requests are public, POST/PUT/DELETE require login  
✅ **Automatic Token Validation**: Checks expiration and shows warnings  
✅ **User-Friendly Error Messages**: Clear feedback for all error scenarios  
✅ **Session Management**: 1-hour sessions with 5-minute expiration warnings  
✅ **Role-Based UI**: Elements show/hide based on user permissions  

---

## Quick Start Guide

### For Beginners: Getting Started in 5 Minutes

1. **Demo Login** (for testing):
   ```javascript
   // Call this function to test login
   demoLogin(); // Uses Admin/Password123
   ```

2. **Check if user is logged in**:
   ```javascript
   if (isLoggedIn()) {
       console.log("User is authenticated");
   }
   ```

3. **Make an API call**:
   ```javascript
   // GET requests work without login
   const data = await authenticatedFetch('/api/specifications', { method: 'GET' });
   
   // POST requests require login
   const result = await authenticatedFetch('/api/specifications', {
       method: 'POST',
       body: JSON.stringify({ name: 'My Spec' })
   });
   ```

4. **Control UI visibility**:
   ```html
   <!-- Only shows when user is logged in -->
   <button class="user-only">Save Data</button>
   
   <!-- Only shows for admins -->
   <button class="admin-only">Delete All</button>
   ```

---

## System Architecture

### File Structure
```
RegistryServices/
├── JS/
│   └── javascript.js          # Main authentication system
├── HTML/
│   └── *.html                 # Pages using authentication
└── JSON/
    └── mockData.json          # Test data
```

### Main Components
```
AuthManager Class
├── Token Management (store, validate, clear)
├── Login/Logout (API communication)
├── Session Monitoring (expiration warnings)
└── User State (role, permissions)

Authentication Functions
├── demoLogin() - Quick test login
├── loginUser() - Generic login
├── toggleLogin() - UI login/logout
└── authenticatedFetch() - Secure API calls

Access Control Functions
├── getCurrentUser() - Get user info
├── getAccessLevel() - Get permission level
├── canAccess() - Check permissions
└── updateVisibilityWithRoles() - Update UI

UI Helper Functions
├── showMessage() - User notifications
├── updateUserStatus() - Status display
├── createLoginModal() - Login popup
└── Session monitoring - Background checks
```

---

## Core Components

### 1. AuthManager Class
This is the heart of our authentication system.

```javascript
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.userRole = null;
        this.userID = null;
        this.username = null;
        this.accessToken = null;
        this.init();
    }
}
```

**Key Methods:**
- `init()` - Loads tokens from storage on page load
- `login(username, password)` - Authenticates with API
- `logout()` - Clears all tokens and state
- `validateTokens()` - Checks if tokens are still valid
- `getAuthHeaders()` - Returns headers for API calls

### 2. Configuration Object
```javascript
const AUTH_CONFIG = {
    baseUrl: 'https://registryservices-staging.azurewebsites.net/api',
    endpoints: {
        login: '/auth/login'
    },
    tokenKeys: {
        access: 'access_token'
    },
    session: {
        duration: 60 * 60 * 1000,      // 1 hour
        warningTime: 5 * 60 * 1000     // 5 minutes warning
    }
};
```

### 3. Global Instance
```javascript
const authManager = new AuthManager();
```
This creates one authentication manager for the entire application.

---

## Authentication Flow

### 1. Page Load Process
```
Page Loads
    ↓
AuthManager.init()
    ↓
Check localStorage for tokens
    ↓
If tokens exist → Validate them
    ↓
If valid → Set authenticated state
    ↓
Update UI visibility
```

### 2. Login Process
```
User clicks Login
    ↓
Show login modal
    ↓
User enters credentials
    ↓
Call authManager.login()
    ↓
Send POST to /api/auth/login
    ↓
If successful → Store tokens
    ↓
Update UI and show success message
```

### 3. API Request Process
```
User action triggers API call
    ↓
authenticatedFetch() checks method
    ↓
If GET → Send without auth headers
If POST/PUT/DELETE → Check authentication
    ↓
If not authenticated → Show error
If authenticated → Add auth headers
    ↓
Send request and handle response
```

---

## Access Control System

### Access Levels
1. **Guest** (not logged in)
   - Can view public data (GET requests)
   - Cannot create, edit, or delete

2. **User** (logged in)
   - Can view public data
   - Can create and edit their own data
   - Cannot delete or access admin functions

3. **Admin** (logged in with admin role)
   - Full access to all functions
   - Can delete data
   - Can access admin-only features

### Permission Checking Functions

```javascript
// Check current user info
const user = getCurrentUser();
console.log(user.role); // 'Guest', 'User', or 'Admin'

// Check access levels
if (canAccess('admin')) {
    // Only admins can access this
}

if (canAccess('user')) {
    // Logged-in users can access this
}

// Convenience functions
if (isAdmin()) {
    // Admin-only code
}

if (isLoggedIn()) {
    // Any authenticated user
}

// Specific permission checks
if (canCreateOrEdit()) {
    // Can create or edit content
}

if (canDelete()) {
    // Can delete content (admin only)
}
```

### CSS Classes for UI Control

Add these classes to HTML elements to control visibility:

```html
<!-- Visible only to logged-in users -->
<div class="user-only">
    <button>Save My Work</button>
</div>

<!-- Visible only to admins -->
<div class="admin-only">
    <button>Delete All Data</button>
</div>

<!-- Visible only to authenticated users (legacy) -->
<div class="protected">
    <button>Edit</button>
</div>

<!-- Visible only when user can create/edit -->
<div class="create-edit-only">
    <button>Create New</button>
</div>

<!-- Visible only when user can delete -->
<div class="delete-only">
    <button>Delete</button>
</div>
```

---

## API Integration

### The authenticatedFetch Function
This replaces the standard `fetch()` function and handles authentication automatically.

```javascript
// Basic usage - GET request (public)
const response = await authenticatedFetch('/api/specifications');
const data = await response.json();

// POST request (requires login)
const response = await authenticatedFetch('/api/specifications', {
    method: 'POST',
    body: JSON.stringify({
        name: 'My Specification',
        type: 'Extension'
    })
});

// PUT request with custom headers
const response = await authenticatedFetch('/api/specifications/123', {
    method: 'PUT',
    headers: {
        'Custom-Header': 'value'
    },
    body: JSON.stringify(updatedData)
});
```

### Method-Based Security Rules
- **GET**: Always allowed (public data access)
- **POST, PUT, DELETE, PATCH**: Require authentication

### API Response Handling
The system automatically handles these scenarios:

| Status Code | What Happens | User Sees |
|-------------|--------------|-----------|
| 200-299 | Success | Request completes normally |
| 401 | Unauthorized | "Session expired. Please log in again." |
| 404 | Not Found | "Requested resource not found" |
| 500+ | Server Error | "Server error. Please try again shortly." |
| Network Error | Connection Failed | "Unable to connect to server..." |

---

## UI Integration

### Login Modal
The system automatically creates a login modal when needed:

```javascript
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}
```

### User Status Display
Add this to your HTML to show current user info:

```html
<div id="userStatus" style="display: none; font-size: 12px; color: #666;"></div>
```

The system automatically updates this to show: "Logged in as: John (Admin)"

### Login/Logout Button
Update your existing login button:

```html
<button id="loginLogoutButton" onclick="toggleLogin()">Login</button>
```

The button text automatically changes to "Login" or "Logout" based on user state.

### Updating Page Visibility
Call this function whenever authentication state changes:

```javascript
updateVisibility(); // Updates all UI elements based on current user permissions
```

---

## Error Handling

### User-Friendly Messages
The system shows appropriate messages for different scenarios:

```javascript
// Success messages (green)
showMessage('Login successful!', 'success');

// Error messages (red)
showMessage('Login failed: Invalid credentials', 'error');

// Info messages (blue)
showMessage('Your session will expire in 3 minutes', 'info');
```

### Common Error Scenarios

1. **Login Failed**:
   ```
   User sees: "Login failed: Invalid credentials"
   Developer sees: Detailed error in console
   ```

2. **Session Expired**:
   ```
   User sees: "Session expired. Please log in again."
   System: Automatically clears tokens and updates UI
   ```

3. **Server Down**:
   ```
   User sees: "Unable to connect to server. Please check your connection..."
   System: Continues to work with cached data where possible
   ```

4. **Permission Denied**:
   ```
   User sees: "Please log in to perform this action"
   System: Shows login modal automatically
   ```

### Error Recovery
The system automatically handles these recovery scenarios:

- **Token Expired**: Clears tokens, shows login modal
- **Network Error**: Shows retry message, maintains state
- **Server Error**: Shows temporary error message
- **Invalid Token**: Clears all auth data, resets to guest state

---

## Session Management

### Session Duration
- **Token Lifetime**: 1 hour (set by server)
- **Warning Time**: 5 minutes before expiration
- **Check Interval**: Every 5 minutes

### Session Monitoring
```javascript
// Automatic session monitoring starts when page loads
function startSessionMonitoring() {
    setInterval(() => {
        if (authManager.isAuthenticated) {
            authManager.validateTokens();
        }
    }, 5 * 60 * 1000); // Check every 5 minutes
}
```

### Session Events
1. **5 Minutes Before Expiration**: Warning message shown
2. **1 Minute Before Expiration**: Final warning
3. **Token Expired**: Automatic logout, clear tokens, show login prompt

### Session Persistence
Tokens are stored in localStorage and survive:
- ✅ Page refreshes
- ✅ New browser tabs
- ✅ Browser restart
- ❌ Incognito/private browsing (by design)

---

## Code Examples

### Example 1: Basic Login Flow
```javascript
// HTML button
<button onclick="loginUser('Admin', 'Password123')">Login as Admin</button>

// JavaScript
async function handleLogin() {
    try {
        const result = await loginUser('Admin', 'Password123');
        console.log('Login successful:', result);
        // UI automatically updates
    } catch (error) {
        console.error('Login failed:', error.message);
        // Error message already shown to user
    }
}
```

### Example 2: Creating New Data
```javascript
async function saveSpecification() {
    const specData = {
        name: 'My New Specification',
        type: 'Extension',
        sector: 'Manufacturing'
    };
    
    try {
        const result = await createSpecification(specData);
        console.log('Specification saved:', result);
    } catch (error) {
        console.error('Save failed:', error);
    }
}
```

### Example 3: Conditional UI Elements
```html
<!-- Show different content based on user role -->
<div class="admin-only">
    <h2>Admin Dashboard</h2>
    <button onclick="deleteAllData()">Delete All</button>
</div>

<div class="user-only">
    <h2>My Specifications</h2>
    <button onclick="createNew()">Create New</button>
</div>

<div class="guest-content">
    <h2>Public Specifications</h2>
    <p>Please log in to create specifications</p>
</div>
```

### Example 4: API Call with Error Handling
```javascript
async function loadUserData() {
    try {
        // This will show appropriate error messages automatically
        const response = await authenticatedFetch('/api/user/data');
        const userData = await response.json();
        
        // Update UI with user data
        displayUserData(userData);
        
    } catch (error) {
        // Error already shown to user, just log for debugging
        console.error('Failed to load user data:', error);
        
        // Optionally show fallback content
        showFallbackData();
    }
}
```

### Example 5: Role-Based Function Execution
```javascript
function handleDeleteRequest(itemId) {
    if (!canDelete()) {
        showMessage('You do not have permission to delete items', 'error');
        return;
    }
    
    // Confirm deletion
    if (confirm('Are you sure you want to delete this item?')) {
        deleteItem(itemId);
    }
}

async function deleteItem(itemId) {
    try {
        await authenticatedFetch(`/api/items/${itemId}`, {
            method: 'DELETE'
        });
        showMessage('Item deleted successfully', 'success');
        refreshItemList();
    } catch (error) {
        // Error message already shown by authenticatedFetch
        console.error('Delete failed:', error);
    }
}
```

---

## Best Practices

### Security Best Practices
1. **Never log tokens** in production
   ```javascript
   // ❌ Don't do this
   console.log('Token:', authManager.accessToken);
   
   // ✅ Do this instead
   console.log('User authenticated:', authManager.isAuthenticated);
   ```

2. **Always use authenticatedFetch** for API calls
   ```javascript
   // ❌ Don't use raw fetch for API calls
   fetch('/api/data');
   
   // ✅ Use authenticatedFetch
   authenticatedFetch('/api/data');
   ```

3. **Check permissions before actions**
   ```javascript
   // ✅ Always check permissions first
   if (canAccess('admin')) {
       performAdminAction();
   }
   ```

### Code Organization Best Practices
1. **Group related functions together**
2. **Use descriptive function names**
3. **Add comments for complex logic**
4. **Keep functions small and focused**

### UI/UX Best Practices
1. **Always show loading states**
   ```javascript
   showMessage('Saving...', 'info');
   await saveData();
   showMessage('Saved successfully!', 'success');
   ```

2. **Provide clear error messages**
3. **Use consistent styling for different message types**
4. **Show user status clearly**

### Development Best Practices
1. **Test with different user roles**
2. **Test network error scenarios**
3. **Test token expiration**
4. **Use browser dev tools to monitor network requests**

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Login button doesn't work"
**Check:**
- Is `toggleLogin()` function called on click?
- Are there any JavaScript errors in console?
- Is the login modal created properly?

**Solution:**
```javascript
// Make sure this is called after DOM loads
document.addEventListener("DOMContentLoaded", function() {
    createLoginModal();
});
```

#### 2. "User stays logged out after page refresh"
**Check:**
- Are tokens being saved to localStorage?
- Is `authManager.init()` being called on page load?

**Solution:**
```javascript
// Check localStorage in browser dev tools
console.log(localStorage.getItem('access_token'));

// Make sure init is called
const authManager = new AuthManager(); // This calls init()
```

#### 3. "API calls fail with 'Not authenticated'"
**Check:**
- Is the user actually logged in?
- Are auth headers being added?
- Is the token expired?

**Solution:**
```javascript
// Debug authentication state
console.log('Is authenticated:', authManager.isAuthenticated);
console.log('Auth headers:', authManager.getAuthHeaders());
```

#### 4. "UI elements don't hide/show correctly"
**Check:**
- Is `updateVisibility()` being called after login/logout?
- Are the correct CSS classes applied?

**Solution:**
```javascript
// Call after any auth state change
updateVisibility();

// Check if elements have correct classes
document.querySelectorAll('.user-only').forEach(el => {
    console.log('User-only element:', el);
});
```

#### 5. "Session expires without warning"
**Check:**
- Is session monitoring started?
- Are there any errors in the validation function?

**Solution:**
```javascript
// Make sure this is called
startSessionMonitoring();

// Check token expiration manually
if (authManager.accessToken) {
    const payload = authManager.parseJWT(authManager.accessToken);
    console.log('Token expires at:', new Date(payload.exp * 1000));
}
```

### Debug Commands
Use these in browser console for debugging:

```javascript
// Check current authentication state
console.log('Auth state:', {
    isAuthenticated: authManager.isAuthenticated,
    userRole: authManager.userRole,
    username: authManager.username
});

// Check stored tokens
console.log('Stored tokens:', {
    accessToken: localStorage.getItem('access_token'),
    userRole: localStorage.getItem('userRole')
});

// Test permissions
console.log('Permissions:', {
    isLoggedIn: isLoggedIn(),
    isAdmin: isAdmin(),
    canCreateEdit: canCreateOrEdit(),
    canDelete: canDelete()
});

// Force logout (for testing)
authManager.logout();
updateVisibility();

// Force demo login (for testing)
demoLogin();
```

---

## Testing Guide

### Manual Testing Checklist

#### Login/Logout Testing
- [ ] Can log in with valid credentials
- [ ] Cannot log in with invalid credentials
- [ ] Login button changes to "Logout" after login
- [ ] User status displays correctly
- [ ] Logout clears all data and updates UI

#### Permission Testing
- [ ] Guest users can view public data
- [ ] Guest users cannot access protected features
- [ ] Logged-in users can access user features
- [ ] Only admins can access admin features
- [ ] UI elements show/hide based on user role

#### Session Testing
- [ ] Session persists across page refreshes
- [ ] Warning appears 5 minutes before expiration
- [ ] Session expires after 1 hour
- [ ] Expired session redirects to login

#### Error Handling Testing
- [ ] Network errors show appropriate messages
- [ ] Server errors show appropriate messages
- [ ] Invalid credentials show error message
- [ ] Expired tokens are handled gracefully

#### API Testing
- [ ] GET requests work without authentication
- [ ] POST/PUT/DELETE requests require authentication
- [ ] Authenticated requests include proper headers
- [ ] Failed requests show error messages

### Testing with Browser Dev Tools

1. **Network Tab**: Monitor API requests and responses
2. **Console Tab**: Check for JavaScript errors
3. **Application Tab**: Inspect localStorage for tokens
4. **Elements Tab**: Verify CSS classes are applied correctly

### Testing Different Scenarios

```javascript
// Test as different user types
await loginUser('Admin', 'Password123');    // Admin user
await loginUser('User', 'Password123');     // Regular user
authManager.logout();                       // Guest user

// Test API endpoints
await authenticatedFetch('/api/specifications', { method: 'GET' });    // Should work
await authenticatedFetch('/api/specifications', { method: 'POST' });   // Needs auth

// Test token expiration (modify token)
localStorage.setItem('access_token', 'expired.token.here');
authManager.validateTokens(); // Should clear token and logout
```

---

## Future Enhancements

### Short-term Improvements (Next Sprint)
1. **User Registration**
   - Add registration endpoint
   - Create registration form
   - Email verification

2. **Password Reset**
   - Forgot password link
   - Email-based reset
   - New password form

3. **Remember Me**
   - Longer session option
   - Persistent login checkbox

### Medium-term Improvements (Next Release)
1. **Advanced Session Management**
   - Refresh tokens
   - Sliding session extension
   - Multiple device management

2. **Enhanced Security**
   - Rate limiting
   - CAPTCHA for failed logins
   - Security headers

3. **Better Error Handling**
   - Retry mechanisms
   - Offline support
   - Better error categorization

### Long-term Improvements (Future Versions)
1. **Single Sign-On (SSO)**
   - OAuth integration
   - SAML support
   - Active Directory integration

2. **Advanced User Management**
   - User profiles
   - Role management UI
   - Audit logging

3. **Performance Optimization**
   - Token caching strategies
   - Lazy loading
   - Background refresh

### API Enhancements Needed
1. **Logout Endpoint**: `/api/auth/logout`
2. **Refresh Token Endpoint**: `/api/auth/refresh`
3. **User Registration**: `/api/auth/register`
4. **Password Reset**: `/api/auth/reset-password`

---

## Conclusion

This JWT authentication system provides a solid foundation for your application with:

✅ **Security**: Proper token handling and validation  
✅ **Usability**: Clear error messages and intuitive flow  
✅ **Maintainability**: Well-organized, documented code  
✅ **Scalability**: Easy to extend with new features  

### Key Takeaways for Developers

1. **Authentication is not just login/logout** - it's about managing user state throughout the application
2. **Always handle errors gracefully** - users should never see technical error messages
3. **Security and usability must be balanced** - make it secure but not frustrating
4. **Test thoroughly** - authentication bugs affect the entire application
5. **Document everything** - other developers (including future you) will thank you

### Getting Help

If you run into issues:
1. Check the browser console for errors
2. Use the debug commands provided in this manual
3. Test with the demo login first
4. Verify your API endpoints are working
5. Ask senior developers for code review

Remember: Authentication is critical functionality. When in doubt, ask for help rather than guessing!

---

*This manual covers the JWT authentication system as implemented in `javascript.js`. Keep this document updated as the system evolves.*
