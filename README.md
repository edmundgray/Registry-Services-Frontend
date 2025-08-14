## License

This project is licensed under the **European Union Public Licence v1.2 (EUPL-1.2)**.  
**Licensor (as defined by the EUPL):** `CEN` — `https://www.cencenelec.eu/about-cen`.
See the full text in [`LICENSE`](./RegistryServices/LICENSE.md).
# Registry Services Frontend

A JavaScript-based frontend application for managing eInvoicing specifications with JWT-based authentication.


## 🚀 Quick Start

1. **Clone the repository**
2. **Open `RegistryServices/index.html`** in your browser
3. **Open browser console** (F12 → Console tab)
4. **Test authentication** by typing: `demoLogin()` and pressing Enter

=======

## 🔐 Authentication System

This project includes a comprehensive JWT-based authentication system with three access levels:

- **Guest**: View public data
- **User**: Create and edit specifications  
- **Admin**: Full access including delete operations

### 📚 Documentation

- **[Complete Authentication Manual](COMPLETE_AUTHENTICATION_MANUAL.md)** - Comprehensive guide for developers
- **[FAQ for Developers](FAQ_FOR_DEVELOPERS.md)** - Common questions and troubleshooting
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Project overview and features

### 🎯 For Developers

The authentication system is designed to be **easy to understand and extend**:

- Clear documentation with examples
- Step-by-step implementation guides
- Troubleshooting and debug tools
- Best practices and security guidelines

## 🏗️ Project Structure

```
RegistryServices/
├── HTML/                   # Application pages
│   ├── eInvoicingSpecificationRegistry.html
│   ├── IdentifyingInformation.html
│   ├── coreInvoiceModel.html
│   ├── ExtensionComponentDataModel.html
│   ├── additionalRequirements.html
│   ├── specificationPreview.html
│   ├── governingEntityList.html
│   └── ... (all pages updated with modular architecture)
├── JS/
│   ├── javascript.js           # Core utilities and global functions
│   ├── dataManager.js          # Centralized data management system
│   ├── registryTable.js        # Registry table functionality
│   ├── identifyingInformation.js # Identifying Information page logic
│   ├── coreInvoiceModel.js     # Core Invoice Model functionality
│   ├── additionalRequirements.js # Additional Requirements management
│   ├── governingEntity.js      # Governing Entity management
│   ├── specificationPreview.js # Preview and submission workflow
│   └── auth/
│       └── authManager.js      # Centralized authentication system
├── CSS/                   # Styling
├── JSON/                  # Mock data and configuration
└── Images/               # Assets
```

## 🔧 Key Features

- **JWT Authentication** with real API integration
- **Role-based access control** (Guest/User/Admin)
- **Centralized Data Management** with SpecificationDataManager
- **Modular JavaScript Architecture** with page-specific modules
- **Session management** with expiration warnings
- **Method-based security** (GET public, POST/PUT/DELETE protected)
- **User-friendly error handling** with comprehensive debugging
- **Responsive UI** with role-based visibility
- **Consistent API Integration** using authenticatedFetch
- **Working Data Persistence** across multi-page workflows

## 🧪 Testing

**Prerequisites**: Load any HTML page that includes the authentication system:

- **Main page**: `RegistryServices/index.html` (now updated)
- **Registry page**: `RegistryServices/HTML/eInvoicingSpecificationRegistry.html`
- **Any other page** in the HTML folder

### Demo Login

1. **Open any page** with authentication (e.g., `RegistryServices/index.html`)
2. **Open browser console** (F12 → Console tab)
3. **Run the demo login**:

```javascript
// Quick test login (use in browser console)
demoLogin(); // Logs in as Admin with Password123
```

### API Testing
```javascript
// Test public endpoints (no auth needed)
const data = await authenticatedFetch('/api/specifications', { method: 'GET' });

// Test protected endpoints (requires login)
const result = await authenticatedFetch('/api/specifications', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Spec' })
});
```

## 🔄 Development Workflow

### Adding New Pages

1. **Include required scripts** in the following order:
   ```html
   <script src="../JS/auth/authManager.js"></script>
   <script>
       window.authManager = new AuthManager();
       function authenticatedFetch(url, options = {}) {
           const headers = { ...(options.headers || {}), ...window.authManager.getAuthHeaders() };
           return fetch(url, { ...options, headers });
       }
   </script>
   <script src="../JS/javascript.js"></script>
   <script src="../JS/dataManager.js"></script>
   ```

2. **Create page-specific module** (e.g., `JS/myNewPage.js`)

3. **Initialize data manager** in your page:
   ```javascript
   let dataManager = null;
   
   async function initializeDataManager() {
       dataManager = new SpecificationDataManager();
       // Additional initialization logic
   }
   
   document.addEventListener('DOMContentLoaded', async () => {
       await initializeDataManager();
       // Page-specific initialization
   });
   ```

4. **Add login modal container**: `<div id="loginModal"></div>`

### Using the Data Management System

The application now uses a centralized `SpecificationDataManager` for all data operations:

```javascript
// Initialize data manager
const dataManager = new SpecificationDataManager();

// Check if in edit mode
if (dataManager.isEditMode()) {
    const specId = dataManager.currentSpecId;
    await dataManager.loadSpecificationFromAPI(specId);
}

// Save working data
dataManager.workingData = { /* your data */ };
dataManager.saveWorkingDataToLocalStorage();

// Get all specifications
const specs = await dataManager.getAllSpecifications();
```

### Page-Specific Modules

Each major page now has its own JavaScript module:

- **Registry**: `registryTable.js` - Table management, search, filtering
- **Identifying Info**: `identifyingInformation.js` - Form handling, validation
- **Core Invoice**: `coreInvoiceModel.js` - Element selection, data persistence
- **Extension Components**: Integrated with `dataManager.js` for component management
- **Additional Requirements**: `additionalRequirements.js` - Dynamic table handling
- **Governing Entities**: `governingEntity.js` - Entity management
- **Preview**: `specificationPreview.js` - Data aggregation and submission

### Role-based UI Elements
```html
<!-- Visible only to logged-in users -->
<div class="user-only">User content</div>

<!-- Visible only to admins -->
<div class="admin-only">Admin content</div>

<!-- Create/edit buttons (user+) -->
<button class="create-edit-only">Create New</button>

<!-- Delete buttons (admin only) -->
<button class="delete-only">Delete</button>
```

## 📡 API Integration

The system integrates with the RegistryServices API:

- **Base URL**: `https://registryservices-staging.azurewebsites.net/api`
- **Login Endpoint**: `/auth/login`
- **Authentication**: JWT Bearer tokens
- **Session Duration**: 1 hour with 5-minute expiration warning

## 🛡️ Security Features

- **JWT token validation** with automatic expiration handling
- **Method-based access control** (GET public, others protected)
- **Role hierarchy enforcement** (Guest < User < Admin)
- **Secure token storage** in localStorage
- **Automatic session monitoring** and warnings
- **Graceful error handling** for all scenarios


## 🤝 Contributing

This project is designed for developers of all skill levels:

1. **Read the documentation** - Start with the [Complete Authentication Manual](COMPLETE_AUTHENTICATION_MANUAL.md)
2. **Check the FAQ** - Common questions are answered in [FAQ for Developers](FAQ_FOR_DEVELOPERS.md)
3. **Test your changes** - Use the provided debug tools and testing procedures
4. **Follow best practices** - Security and code quality guidelines are documented

## 📞 Support

- **Documentation Issues**: Check the FAQ or Implementation Summary
- **Authentication Problems**: Use the debug commands in the browser console
- **API Issues**: Verify endpoints and authentication headers in Network tab

## 🏷️ Version

**Current Version**: Prototype v1.0  
**Status**: Production-ready for prototype phase  
**Last Updated**: June 2025

---

*This project demonstrates modern web authentication patterns with comprehensive documentation for educational and production use.*
