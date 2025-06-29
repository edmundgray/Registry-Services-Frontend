# Frequently Asked Questions - Registry Services Frontend

## Common Questions from Developers

### Q1: What's the difference between the old and new architecture?

**A:** The application has been completely refactored from inline JavaScript to a modular architecture:

**Old Architecture:**
```html
<script>
  // Hundreds of lines of inline JavaScript
  function saveData() { localStorage.setItem(...) }
  function loadData() { return JSON.parse(localStorage.getItem(...)) }
</script>
```

**New Architecture:**
```html
<script src="../JS/auth/authManager.js"></script>
<script src="../JS/dataManager.js"></script>
<script src="../JS/pageSpecificModule.js"></script>
```

### Q2: How do I use the new SpecificationDataManager?

**A:** The SpecificationDataManager is the central hub for all data operations:

```javascript
// Initialize (do this first in every page)
const dataManager = new SpecificationDataManager();

// Check if editing existing specification
if (dataManager.isEditMode()) {
    console.log('Editing specification ID:', dataManager.currentSpecId);
    await dataManager.loadSpecificationFromAPI(dataManager.currentSpecId);
}

// Save working data (replaces direct localStorage usage)
dataManager.workingData = { specName: 'My Spec', status: 'draft' };
dataManager.saveWorkingDataToLocalStorage();

// Load working data
const workingData = dataManager.loadWorkingDataFromLocalStorage();
```

### Q3: What exactly is happening when I call `authenticatedFetch()`?

**A:** The `authenticatedFetch()` function is a wrapper around the browser's built-in `fetch()` function. Here's what it does step by step:

1. **Checks the HTTP method** - If it's GET, it just sends the request normally
2. **For POST/PUT/DELETE** - It checks if you're logged in
3. **If not logged in** - Shows an error and stops the request
4. **If logged in** - Adds the authorization header with your JWT token
5. **Sends the request** and handles any authentication errors

```javascript
// What you write:
const response = await authenticatedFetch('/api/data', { method: 'POST' });

// What actually happens behind the scenes:
// 1. Check if POST/PUT/DELETE -> Yes, it's POST
// 2. Check if logged in -> authManager.isAuthenticated
// 3. Add headers -> Authorization: Bearer your-jwt-token
// 4. Send request with authentication
```

---

### Q4: What is "working data" and how does it work?

**A:** Working data is a key concept in the new architecture that allows data to persist across multiple pages during specification creation/editing:

**The Problem It Solves:**
```
User starts on IdentifyingInformation.html → enters data
Navigates to CoreInvoiceModel.html → enters more data  
Navigates to ExtensionComponentDataModel.html → enters more data
If they go back or refresh, data should still be there
```

**How It Works:**
```javascript
// Each page saves its data to working data
dataManager.workingData = {
    // Data from IdentifyingInformation page
    specName: "My Invoice Spec",
    sector: "Finance",
    
    // Data from CoreInvoiceModel page  
    coreInvoiceData: [...selected elements...],
    
    // Data from ExtensionComponentDataModel page
    extensionComponentData: [...selected components...]
};

// Automatically persisted to localStorage
dataManager.saveWorkingDataToLocalStorage();
```

**Key Benefits:**
- **Cross-page persistence**: Data survives page navigation and browser refresh
- **Edit mode support**: Existing specifications can be loaded and modified
- **Consistent API**: All pages use the same data management methods
- **Automatic cleanup**: Working data is cleared after successful submission

### Q5: Why do some functions have `async` and `await`?

**A:** These are for handling asynchronous operations (things that take time, like network requests).

```javascript
// ❌ This won't work - fetch returns a Promise
function getData() {
    const response = fetch('/api/data');
    const data = response.json(); // This will fail!
    return data;
}

// ✅ This works - we wait for each step to complete
async function getData() {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
}
```

**Rule of thumb:** If a function calls another `async` function or uses `fetch()`, it should probably be `async` too.

---

### Q3: How do I know what my user's role is?

**A:** Use the `getCurrentUser()` function:

```javascript
const user = getCurrentUser();
console.log(user);
// Output: { role: 'Admin', username: 'John', userID: 123, isAuthenticated: true }

// Or use convenience functions:
if (isAdmin()) {
    console.log('User is an admin');
}

if (isLoggedIn()) {
    console.log('User is logged in');
}
```

---

### Q4: What's the difference between all these permission functions?

Here's a quick reference:

| Function | Returns | When to Use |
|----------|---------|-------------|
| `isLoggedIn()` | true/false | Check if anyone is logged in |
| `isAdmin()` | true/false | Check if current user is admin |
| `canAccess('admin')` | true/false | Check for admin permissions |
| `canAccess('user')` | true/false | Check for user permissions |
| `canCreateOrEdit()` | true/false | Check if can create/edit content |
| `canDelete()` | true/false | Check if can delete (admin only) |

---

### Q5: When should I use the CSS classes vs JavaScript checks?

**CSS Classes** (for static UI elements):
```html
<!-- Use when the element should always be hidden/shown based on role -->
<button class="admin-only">Delete All Data</button>
<div class="user-only">Welcome back!</div>
```

**JavaScript Checks** (for dynamic behavior):
```javascript
// Use when you need to do something based on permissions
function handleButtonClick() {
    if (!canDelete()) {
        showMessage('You cannot delete this', 'error');
        return;
    }
    
    // Proceed with deletion
    deleteItem();
}
```

---

### Q6: Why does my session expire? Can I make it longer?

**A:** Sessions expire for security. Currently set to 1 hour. To change it:

1. **Frontend timing** (in `AUTH_CONFIG`):
```javascript
const AUTH_CONFIG = {
    session: {
        duration: 60 * 60 * 1000,      // 1 hour in milliseconds
        warningTime: 5 * 60 * 1000     // 5 minute warning
    }
};
```

2. **Backend token expiration** - This is set by the server when creating the JWT token. You'll need to modify the backend API.

**Note:** The frontend timing should match the backend token expiration time.

---

### Q7: How do I test if my API calls are working?

**A:** Use browser developer tools:

1. **Open Dev Tools** (F12)
2. **Go to Network tab**
3. **Refresh page and perform actions**
4. **Look for your API calls**

Check these things:
- **Request Headers**: Should include `Authorization: Bearer ...` for protected endpoints
- **Status Code**: 200 = success, 401 = not authorized, 500 = server error
- **Response Body**: Contains the data you expect

```javascript
// You can also add debug logging:
async function debugApiCall() {
    console.log('Making API call...');
    console.log('User authenticated:', isLoggedIn());
    
    const response = await authenticatedFetch('/api/test');
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
}
```

---

### Q8: What happens if the server is down?

**A:** The system gracefully handles server issues:

1. **Network errors** show user-friendly messages
2. **Cached data** continues to work where possible
3. **Authentication state** is preserved locally
4. **Automatic retry** on next user action

```javascript
// The system shows: "Unable to connect to server. Please check your connection..."
// Instead of: "TypeError: Failed to fetch"
```

---

### Q9: How do I add a new page that requires authentication?

**A:** Follow these steps:

1. **Include the authentication script**:
```html
<script src="../JS/javascript.js"></script>
```

2. **Add the login modal container**:
```html
<div id="loginModal" style="display:none;">
    <!-- Modal content will be created automatically -->
</div>
```

3. **Add user status display**:
```html
<div id="userStatus" style="display: none;"></div>
```

4. **Add login/logout button**:
```html
<button id="loginLogoutButton" onclick="toggleLogin()">Login</button>
```

5. **Initialize on page load**:
```javascript
document.addEventListener("DOMContentLoaded", function() {
    createLoginModal();
    updateVisibility();
    startSessionMonitoring();
});
```

6. **Use CSS classes for role-based content**:
```html
<div class="user-only">
    <h2>Protected Content</h2>
</div>
```

---

### Q10: How do I debug authentication issues?

**A:** Use these debug commands in the browser console:

```javascript
// Check current state
console.log('Auth Manager State:', {
    isAuthenticated: authManager.isAuthenticated,
    userRole: authManager.userRole,
    username: authManager.username
});

// Check stored data
console.log('LocalStorage:', {
    token: localStorage.getItem('access_token'),
    role: localStorage.getItem('userRole'),
    username: localStorage.getItem('username')
});

// Test permissions
console.log('Permissions:', {
    isLoggedIn: isLoggedIn(),
    isAdmin: isAdmin(),
    canCreateEdit: canCreateOrEdit(),
    canDelete: canDelete()
});

// Force re-validation
authManager.validateTokens();
updateVisibility();
```

---

### Q11: What if I want to customize the login modal?

**A:** The modal is created dynamically. You can modify the `createLoginModal()` function:

```javascript
function createLoginModal() {
    // Find this function in javascript.js and modify:
    // - Change styling
    // - Add new fields
    // - Modify layout
    // - Add custom validation
}
```

Or create your own modal and call the authentication functions directly:

```javascript
// Your custom login function
async function myCustomLogin() {
    const username = document.getElementById('myUsernameField').value;
    const password = document.getElementById('myPasswordField').value;
    
    try {
        await authManager.login(username, password);
        // Handle success
        closeMyCustomModal();
    } catch (error) {
        // Handle error
        showMyCustomError(error.message);
    }
}
```

---

### Q12: Can I use this system with different backend APIs?

**A:** Yes! Modify the `AUTH_CONFIG` object:

```javascript
const AUTH_CONFIG = {
    baseUrl: 'https://your-api-server.com/api',  // Change this
    endpoints: {
        login: '/auth/login'                      // And this if needed
    },
    // ... rest of config
};
```

You may also need to modify the login function if your API returns different data structure.

---

### Q13: How do I handle user registration?

**A:** Currently, the system only handles login. To add registration:

1. **Add a registration endpoint** to your API
2. **Create a registration form** (similar to login modal)
3. **Add a registration function**:

```javascript
async function registerUser(username, password, email) {
    const response = await fetch(`${AUTH_CONFIG.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email })
    });
    
    if (!response.ok) {
        throw new Error('Registration failed');
    }
    
    // Optionally auto-login after registration
    return await authManager.login(username, password);
}
```

---

### Q14: What security considerations should I know about?

**A:** Key security points:

1. **Never log tokens** in production:
```javascript
// ❌ Don't do this in production
console.log('Token:', authManager.accessToken);
```

2. **Always validate on backend** - frontend security is just for UX
3. **Use HTTPS** in production
4. **Keep tokens short-lived** (1 hour is good)
5. **Clear tokens on logout**
6. **Validate token expiration**

**Remember:** Frontend authentication is primarily for user experience. Real security happens on the backend!

---

### Q15: How do I extend this system for more complex roles?

**A:** Currently supports Guest/User/Admin. To add more roles:

1. **Modify the `canAccess()` function**:
```javascript
function canAccess(requiredLevel) {
    const user = getCurrentUser();
    
    const levelHierarchy = {
        'guest': 0,
        'user': 1,
        'moderator': 2,    // New role
        'admin': 3
    };
    
    const userLevel = levelHierarchy[user.role.toLowerCase()] || 0;
    const requiredLevelValue = levelHierarchy[requiredLevel.toLowerCase()] || 0;
    
    return userLevel >= requiredLevelValue;
}
```

2. **Add new CSS classes**:
```css
.moderator-only { display: none; }
.authenticated .moderator-only { display: block; }
.admin-only .moderator-only { display: block; }
```

3. **Update visibility function** to handle new classes.

---

## Troubleshooting Quick Reference

| Problem | Quick Fix |
|---------|-----------|
| Login button doesn't work | Check console for errors, ensure `toggleLogin()` is called |
| API calls fail | Check network tab, verify authentication headers |
| UI doesn't update after login | Call `updateVisibility()` after authentication changes |
| Session expires immediately | Check token expiration time vs system time |
| Permission checks fail | Verify user role is stored correctly |
| Modal doesn't appear | Ensure `createLoginModal()` is called on page load |

---

## Getting Help

1. **Check browser console** for JavaScript errors
2. **Use debug commands** provided above
3. **Check network tab** for API request details
4. **Verify localStorage** contains expected tokens
5. **Test with demo login** to isolate issues

Remember: Authentication touches many parts of an application. When debugging, start with the simplest test (like demo login) and work your way up to more complex scenarios.
