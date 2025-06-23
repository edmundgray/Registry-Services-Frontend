# Registry Services Frontend

A JavaScript-based frontend application for managing eInvoicing specifications with JWT-based authentication.

## 🚀 Quick Start

1. **Clone the repository**
2. **Open `RegistryServices/index.html`** in your browser
3. **Test authentication** with demo login (Admin/Password123)

## 🔐 Authentication System

This project includes a comprehensive JWT-based authentication system with three access levels:

- **Guest**: View public data
- **User**: Create and edit specifications  
- **Admin**: Full access including delete operations

### 📚 Documentation

- **[Complete Authentication Manual](COMPLETE_AUTHENTICATION_MANUAL.md)** - Comprehensive guide for developers
- **[FAQ for Developers](FAQ_FOR_DEVELOPERS.md)** - Common questions and troubleshooting
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Project overview and features

### 🎯 For Junior Developers

The authentication system is designed to be **easy to understand and extend**:

- Clear documentation with examples
- Step-by-step implementation guides
- Troubleshooting and debug tools
- Best practices and security guidelines

## 🏗️ Project Structure

```
RegistryServices/
├── HTML/                   # Application pages
├── JS/
│   └── javascript.js      # Main authentication system
├── CSS/                   # Styling
├── JSON/                  # Mock data and configuration
└── Images/               # Assets
```

## 🔧 Key Features

- **JWT Authentication** with real API integration
- **Role-based access control** (Guest/User/Admin)
- **Session management** with expiration warnings
- **Method-based security** (GET public, POST/PUT/DELETE protected)
- **User-friendly error handling**
- **Responsive UI** with role-based visibility

## 🧪 Testing

### Demo Login
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
1. Include the authentication script: `<script src="../JS/javascript.js"></script>`
2. Add login modal container: `<div id="loginModal"></div>`
3. Initialize on page load:
   ```javascript
   document.addEventListener("DOMContentLoaded", function() {
       createLoginModal();
       updateVisibility();
       startSessionMonitoring();
   });
   ```

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

## 🔮 Future Enhancements

### Short-term
- User registration functionality
- Password reset capability
- "Remember me" option

### Medium-term
- Refresh token implementation
- Enhanced session management
- Advanced error recovery

### Long-term
- Single Sign-On (SSO) integration
- Advanced user management
- Performance optimizations

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