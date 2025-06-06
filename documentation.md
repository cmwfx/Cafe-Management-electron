# Cafe Management System Documentation

This documentation provides a comprehensive technical overview of the Cafe Management System, including both the Electron desktop application and the web-based Admin Panel.

## Table of Contents

1. [Electron Application](#electron-application)

   - [Overview](#electron-overview)
   - [Tech Stack](#electron-tech-stack)
   - [Architecture](#electron-architecture)
   - [Key Features](#electron-key-features)
   - [Data Flow](#electron-data-flow)

2. [Admin Panel](#admin-panel)

   - [Overview](#admin-panel-overview)
   - [Tech Stack](#admin-panel-tech-stack)
   - [Architecture](#admin-panel-architecture)
   - [Key Features](#admin-panel-key-features)
   - [Data Flow](#admin-panel-data-flow)

3. [Integration Details](#integration-details)
   - [Database Schema](#database-schema)
   - [Authentication & Authorization](#authentication--authorization)
   - [Real-time Communication](#real-time-communication)

---

## Electron Application

<a name="electron-overview"></a>

### Overview

The Electron application serves as the client-side interface for cafe customers and operators. It's designed to run in kiosk mode on computers within a WiFi cafe, providing user management, session control, and credit tracking functionalities. The application communicates with Supabase for backend data management and real-time updates.

<a name="electron-tech-stack"></a>

### Tech Stack

- **Electron** (v36): Cross-platform desktop application framework
- **Node.js**: JavaScript runtime environment
- **HTML/CSS/JavaScript**: Frontend technologies for the renderer process
- **Supabase**: Backend-as-a-Service for database management and authentication
- **electron-builder**: Packaging and distribution tool

<a name="electron-architecture"></a>

### Architecture

The application follows Electron's main process/renderer process architecture:

1. **Main Process** (`src/main/main.js`):

   - Handles application lifecycle (startup, shutdown)
   - Manages window creation and configuration
   - Controls kiosk mode settings
   - Handles authentication via `auth-manager.js`
   - Manages user sessions through `session-manager.js`
   - Communicates with Supabase through `supabase-config.js`
   - Implements real-time updates with `supabase-realtime.js`
   - Establishes IPC (Inter-Process Communication) with renderer process

2. **Renderer Process** (`src/renderer/`):

   - Provides the user interface via `index.html`
   - Implements client-side logic in `index.js`
   - Communicates with the main process via IPC
   - Renders the user interface components

3. **Preload Scripts** (`src/preload/`):
   - Bridges main and renderer processes securely
   - Exposes specific Node.js APIs to the renderer process

<a name="electron-key-features"></a>

### Key Features

1. **Authentication System**:

   - User login/registration
   - Secure credential handling via Supabase Auth
   - Admin access control

2. **Session Management**:

   - Start/end user sessions
   - Time tracking and credit deduction
   - Automatic session management

3. **Kiosk Mode**:

   - Restricted environment for cafe computers
   - Disabled keyboard shortcuts and escape mechanisms
   - System protection features

4. **Credit System**:

   - User credits tracking
   - Credit consumption during sessions
   - Credit transaction history

5. **Real-time Updates**:
   - Live monitoring of session status
   - Real-time credit updates
   - Computer status tracking

<a name="electron-data-flow"></a>

### Data Flow

1. **Application Startup**:

   - Main process initializes
   - Supabase connection established
   - Window created with kiosk settings applied
   - IPC handlers registered

2. **Authentication Flow**:

   - User enters credentials in renderer
   - Credentials sent to main process via IPC
   - Main process authenticates with Supabase
   - User profile fetched and stored in auth manager
   - Results returned to renderer

3. **Session Flow**:

   - User starts a session
   - Session data recorded in Supabase
   - Credits deducted at regular intervals
   - Real-time updates tracked and displayed
   - Session ends with final accounting

4. **Error Handling**:
   - Network disconnections managed
   - Authentication failures reported
   - Session interruptions handled

---

## Admin Panel

<a name="admin-panel-overview"></a>

### Overview

The Admin Panel is a simplified web-based application designed for cafe administrators to manage the entire system. Built with vanilla HTML, CSS, and JavaScript, it provides an interface for monitoring active users, managing user accounts, adjusting credits, viewing session history, and configuring system settings. This simplified version maintains core functionality while being much easier to deploy and maintain than a complex React application.

<a name="admin-panel-tech-stack"></a>

### Tech Stack

- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with Grid and Flexbox layouts
- **Vanilla JavaScript (ES6+)**: Core application logic and DOM manipulation
- **Supabase JS Client**: Backend service interaction via CDN
- **No Build Tools**: Direct browser execution without compilation
- **Responsive Design**: CSS-based responsive layout for all device sizes

<a name="admin-panel-architecture"></a>

### Architecture

The Admin Panel follows a simple modular JavaScript architecture:

1. **File Structure**:

   - **`index.html`**: Main HTML structure and UI layout
   - **`styles.css`**: Complete styling and responsive design
   - **`config.js`**: Configuration settings and environment variables
   - **`supabase-client.js`**: Supabase client initialization and data access layer
   - **`utils.js`**: Utility functions for UI interactions and table generation
   - **`app.js`**: Main application logic and event handling

2. **Code Organization**:

   - **Authentication Module (`Auth`)**: Login/logout and admin verification
   - **Data Service Module (`DataService`)**: All Supabase database operations
   - **Navigation System**: Page switching and active state management
   - **Auto-refresh System**: Configurable data polling for real-time updates
   - **UI Utilities**: Toast notifications, modal dialogs, table rendering

3. **State Management**:

   - Global variables for authentication state
   - Local variables within function scopes
   - DOM-based state for UI components
   - Session storage for temporary data

4. **Authentication**:
   - Supabase Auth integration
   - Admin role verification
   - Protected page access control

<a name="admin-panel-key-features"></a>

### Key Features

1. **Dashboard Overview**:

   - Real-time system statistics (active users, total credits, session metrics)
   - Revenue tracking and average session duration
   - Recent active sessions preview
   - Auto-refresh every 60 seconds

2. **Active Users Management**:

   - Live monitoring of current computer sessions
   - Session time remaining and credits used display
   - Remote session termination capability
   - Average time remaining and session value calculations
   - Auto-refresh every 30 seconds

3. **User Management**:

   - Complete user directory with search functionality
   - Credit balance management and editing
   - User activity status tracking
   - Bulk operations and filtering
   - Auto-refresh every 2 minutes

4. **Credit Management**:

   - Add credits to user accounts
   - Transaction reason logging
   - Credit history tracking
   - Validation and error handling

5. **System Features**:

   - Responsive design for desktop, tablet, and mobile
   - Toast notification system for user feedback
   - Loading states and visual feedback
   - Modal dialogs for critical actions
   - Auto-logout on inactivity

6. **Simplified Features** (compared to React version):
   - Polling-based updates instead of WebSocket real-time
   - Basic HTML5 form validation
   - CSS-based responsive design
   - Direct API calls without complex state management

<a name="admin-panel-data-flow"></a>

### Data Flow

1. **Authentication Flow**:

   - Admin enters credentials in login form
   - Credentials validated with Supabase Auth
   - Admin role verification against profiles table
   - Authentication state stored globally
   - Dashboard access granted on successful login

2. **Data Fetching**:

   - Direct Supabase API calls through DataService module
   - Automatic session expiration before data fetching
   - Error handling with user-friendly toast messages
   - Data transformation and formatting for display

3. **Auto-refresh System**:

   - Configurable intervals for different pages (dashboard: 1min, active users: 30sec, all users: 2min)
   - Automatic start/stop based on page navigation
   - Background polling without interrupting user interactions
   - Error handling to prevent failed requests from breaking the system

4. **User Interactions**:

   - Form submissions trigger API calls
   - Real-time UI updates based on response
   - Optimistic UI updates where appropriate
   - Confirmation dialogs for destructive actions

5. **Error Handling**:
   - Network error detection and user notification
   - Graceful degradation when services are unavailable
   - Retry mechanisms for critical operations
   - Detailed error logging for debugging

---

## Integration Details

<a name="database-schema"></a>

### Database Schema

The system uses a Supabase PostgreSQL database with the following key tables:

1. **Profiles**:

   - Extends Supabase Auth users
   - Stores user details and credit balance
   - Tracks admin status

2. **Sessions**:

   - Records user computer sessions
   - Tracks start/end times and duration
   - Calculates credits used
   - Maintains active session status

3. **Computers**:

   - Manages computer inventory
   - Tracks availability status
   - Records last user and activity

4. **Credit Transactions**:

   - Logs all credit changes
   - Records transaction types (session, top-up, etc.)
   - Links to sessions and users

5. **Configurations**:
   - Stores system-wide settings
   - Manages pricing and operational parameters

The database uses Row Level Security (RLS) policies to ensure proper data access control based on user roles.

<a name="authentication--authorization"></a>

### Authentication & Authorization

Both applications use Supabase Authentication:

1. **Authentication Methods**:

   - Email/password authentication
   - Custom admin creation process

2. **Authorization**:

   - Role-based access control (user vs. admin)
   - Row Level Security policies in database
   - Permission checks in both applications

3. **Security Measures**:
   - Protected API endpoints
   - Secure token handling
   - Session validation

<a name="real-time-communication"></a>

### Real-time Communication

The system leverages different real-time strategies:

1. **Electron Application**:

   - Supabase real-time subscriptions for instant updates
   - WebSocket connections for live data synchronization
   - Event-driven architecture for responsive UI

2. **Admin Panel (Simplified)**:

   - Polling-based updates with configurable intervals
   - Automatic data refresh for critical information
   - Manual refresh capabilities for on-demand updates

3. **Synchronization**:
   - Consistent state between Electron app and Admin Panel
   - Immediate reflection of administrative actions in Electron
   - Session expiration handling to maintain data accuracy

This hybrid approach ensures that the Electron application provides real-time responsiveness for users while the Admin Panel maintains simplicity and reliability through polling-based updates.
