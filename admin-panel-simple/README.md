# Cafe Management Admin Panel (Simplified)

A simplified vanilla HTML, CSS, and JavaScript version of the Cafe Management Admin Panel. This version maintains the core functionality of the original React-based admin panel while being much simpler to deploy and maintain.

## Features

### ✅ **Implemented Features**

- **Admin Authentication**: Secure login for administrators
- **Dashboard Overview**: Real-time statistics and active session preview
- **Active Users Management**: Monitor and manage current computer sessions
- **User Management**: View all users, manage credits, search functionality
- **Credit Management**: Edit user credits with transaction logging
- **Session Control**: End active sessions remotely
- **Auto-refresh**: Automatic data updates for real-time monitoring
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Toast Notifications**: User-friendly success/error messages
- **Loading States**: Visual feedback during operations

### ❌ **Simplified/Removed Features**

The following features from the original React version have been simplified or removed:

1. **Advanced Charts**: The React-based charts (using Recharts) have been removed as they would require complex charting libraries
2. **Complex Analytics Page**: The detailed analytics with multiple chart types has been omitted
3. **Real-time WebSocket Updates**: Simplified to polling-based updates instead of Supabase real-time subscriptions
4. **Advanced Component Library**: No Shadcn UI components - custom CSS instead
5. **TypeScript**: Converted to vanilla JavaScript for simplicity
6. **Advanced State Management**: No React Query - direct API calls instead
7. **Form Validation Libraries**: Basic HTML5 validation instead of Zod schemas
8. **Advanced Routing**: Simple page switching instead of React Router

## Prerequisites

- A Supabase project with the cafe management database schema
- Admin user account in your Supabase database
- Web server to serve static files (can be as simple as VS Code Live Server)

## Setup Instructions

### 1. Clone/Download Files

Download all the files to a directory on your web server:

```
admin-panel-simple/
├── index.html
├── styles.css
├── config.js
├── supabase-client.js
├── utils.js
├── app.js
└── README.md
```

### 2. Configure Supabase Connection

Edit `config.js` and replace the placeholder values with your actual Supabase credentials:

```javascript
const CONFIG = {
	SUPABASE_URL: "your-actual-supabase-url",
	SUPABASE_ANON_KEY: "your-actual-supabase-anon-key",
	// ... rest of config
};
```

You can find these values in your Supabase project dashboard under Settings > API.

### 3. Database Requirements

Ensure your Supabase database has the following tables with proper structure:

- `profiles` - User profiles with credits and admin status
- `sessions` - Active and completed sessions
- `credit_transactions` - Credit transaction history

Refer to your existing database schema or the provided SQL files.

### 4. Serve the Files

You can serve these files using any web server:

**Option A: VS Code Live Server**

1. Install the Live Server extension in VS Code
2. Right-click on `index.html` and select "Open with Live Server"

**Option B: Python HTTP Server**

```bash
# Navigate to the admin-panel-simple directory
cd admin-panel-simple

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Option C: Node.js HTTP Server**

```bash
# Install a simple HTTP server
npm install -g http-server

# Navigate to the directory and serve
cd admin-panel-simple
http-server -p 8000
```

**Option D: Any Web Server**
Upload the files to your web server (Apache, Nginx, etc.)

### 5. Access the Admin Panel

Open your browser and navigate to the served location (e.g., `http://localhost:8000`)

## Usage

### Login

1. Use your admin credentials to log in
2. Only users with `is_admin: true` in the profiles table can access the panel

### Dashboard

- View real-time statistics
- Monitor recent active sessions
- Auto-refreshes every minute

### Active Users

- See all currently active sessions
- End sessions remotely
- Monitor time remaining and credits used
- Auto-refreshes every 30 seconds

### All Users

- View all registered users
- Search for specific users
- Edit user credits
- View user activity status
- Auto-refreshes every 2 minutes

## Configuration

### Auto-refresh Intervals

You can adjust the auto-refresh intervals in `config.js`:

```javascript
REFRESH_INTERVALS: {
    DASHBOARD: 60000,    // 1 minute
    ACTIVE_USERS: 30000, // 30 seconds
    ALL_USERS: 120000    // 2 minutes
}
```

### Pricing Settings

Update pricing information to match your cafe's rates:

```javascript
PRICING: {
    PER_MINUTE: 0.10,
    PER_HOUR: 5.00,
    MINIMUM_MINUTES: 15
}
```

## Troubleshooting

### Common Issues

1. **Configuration Error**

   - Ensure `config.js` has the correct Supabase credentials
   - Check browser console for configuration validation errors

2. **Login Issues**

   - Verify the user exists in your Supabase auth.users table
   - Ensure the user has `is_admin: true` in the profiles table
   - Check Supabase dashboard for authentication logs

3. **Data Not Loading**

   - Check browser console for API errors
   - Verify database table permissions in Supabase
   - Ensure RLS (Row Level Security) policies are properly configured

4. **CORS Errors**
   - Serve files through a proper HTTP server, not file:// protocol
   - Check Supabase CORS settings if needed

### Debug Tools

When running on localhost, debug tools are available in the browser console:

```javascript
// Access debug tools
window.DEBUG.auth; // Authentication functions
window.DEBUG.data; // Data service functions
window.DEBUG.config; // Current configuration
window.DEBUG.currentUser(); // Current logged-in user
```

## Security Considerations

1. **Environment Variables**: In production, consider moving sensitive config to environment variables
2. **HTTPS**: Always use HTTPS in production
3. **Access Control**: Ensure only authorized users can access the admin panel
4. **Regular Updates**: Keep Supabase client library updated

## File Structure

- **`index.html`** - Main HTML structure and layout
- **`styles.css`** - All styling and responsive design
- **`config.js`** - Configuration settings and Supabase credentials
- **`supabase-client.js`** - Supabase client initialization and data access functions
- **`utils.js`** - Utility functions for UI interactions and table generation
- **`app.js`** - Main application logic and event handling

## Browser Compatibility

This admin panel works with modern browsers that support:

- ES6+ JavaScript features
- CSS Grid and Flexbox
- Fetch API
- Async/await

Tested on:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This is a simplified version of the original Cafe Management System admin panel. Use according to your project's license terms.
