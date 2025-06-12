# Gaming Cafe Management System Documentation

This documentation provides a comprehensive technical overview of the Gaming Cafe Management System, including both the Electron desktop application and the simplified web-based Admin Panel.

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

The Electron application serves as the client-side kiosk interface for gaming cafe customers and operators. It's designed to run on gaming computers within a gaming cafe, providing comprehensive user management, advanced gaming session control, application launching capabilities, and credit tracking functionalities. The application features a modern glassmorphism UI design and communicates with Supabase for backend data management and real-time updates.

<a name="electron-tech-stack"></a>

### Tech Stack

- **Electron** (v36.2.1): Cross-platform desktop application framework
- **Node.js**: JavaScript runtime environment for main process
- **HTML5/CSS3/JavaScript (ES6+)**: Frontend technologies with modern design patterns
- **Supabase JS Client** (v2.38.5): Backend-as-a-Service client library
- **electron-builder** (v26.0.12): Application packaging and distribution
- **dotenv** (v16.3.1): Environment variable management
- **electron-squirrel-startup**: Windows installer integration

<a name="electron-architecture"></a>

### Architecture

The application follows Electron's main process/renderer process architecture with advanced features:

1. **Main Process** (`src/main/main.js` - 1185 lines):

   - **Application Lifecycle**: Handles startup, shutdown, and Squirrel.Windows events
   - **Window Management**: Creates and configures kiosk windows with advanced security
   - **Kiosk Mode Control**: Enforces fullscreen kiosk mode with escape prevention
   - **Application Launcher**: Launches external applications and monitors processes
   - **Process Management**: Tracks and controls launched gaming applications
   - **Authentication**: Manages user authentication via `auth-manager.js`
   - **Session Control**: Handles gaming sessions through `session-manager.js`
   - **Real-time Updates**: Implements live updates with `supabase-realtime.js`
   - **IPC Communication**: Establishes comprehensive Inter-Process Communication

2. **Supporting Modules**:

   - **`auth-manager.js`** (323 lines): Complete authentication workflow management
   - **`session-manager.js`** (806 lines): Advanced session lifecycle and credit management
   - **`supabase-config.js`**: Database connection and configuration
   - **`supabase-realtime.js`**: Real-time event handling and subscriptions
   - **`app-config.js`**: Application configuration management

3. **Renderer Process** (`src/renderer/`):

   - **`index.html`** (820 lines): Modern UI structure with comprehensive form handling
   - **`index.js`** (991 lines): Advanced client-side logic and UI interactions
   - **Modern CSS**: Glass morphism design with CSS custom properties and animations

4. **Preload Scripts** (`src/preload/preload.js`):
   - Secure bridge between main and renderer processes
   - Exposes controlled Node.js APIs to the renderer

<a name="electron-key-features"></a>

### Key Features

1. **Advanced Authentication System**:

   - User login/registration with comprehensive validation
   - Secure credential handling via Supabase Auth
   - Admin access control and role verification
   - Session persistence and automatic logout

2. **Comprehensive Session Management**:

   - Start/end gaming sessions with duration tracking
   - Session extension capabilities with grace periods
   - Real-time credit deduction and balance monitoring
   - Automatic session cleanup and timeout handling
   - Transaction history and audit trails

3. **Application Launching System**:

   - Launch external gaming applications from the kiosk
   - Process monitoring and automatic termination
   - Application state tracking and window management
   - Background/foreground kiosk window control

4. **Advanced Kiosk Mode**:

   - Full kiosk mode with escape prevention
   - Disabled keyboard shortcuts and system access
   - Process protection and monitoring
   - Window layering and focus management
   - Squirrel.Windows installer integration

5. **Modern UI/UX**:

   - Glassmorphism design with backdrop filters
   - CSS custom properties for theming
   - Responsive design for different screen sizes
   - Loading states and visual feedback
   - Toast notifications and modal dialogs

6. **Credit System**:

   - Real-time credit tracking and consumption
   - Automatic credit deduction during sessions
   - Credit transaction logging with descriptions
   - Balance validation and insufficient funds handling

7. **Real-time Features**:
   - Live session status updates
   - Real-time credit balance monitoring
   - Computer status tracking
   - Instant administrative actions reflection

<a name="electron-data-flow"></a>

### Data Flow

1. **Application Startup**:

   - Main process initializes with Squirrel.Windows handling
   - Supabase connection established and tested
   - Kiosk window created with security settings
   - IPC handlers registered for all communication channels
   - Real-time subscriptions activated

2. **Authentication Flow**:

   - User credentials entered in modern UI
   - Data validated and sent to main process via IPC
   - Auth manager handles Supabase authentication
   - User profile and permissions fetched
   - Session state maintained and UI updated

3. **Gaming Session Flow**:

   - User selects session duration and confirms credits
   - Session manager validates credit balance
   - Database transaction creates session record
   - Credits deducted and transaction logged
   - External applications launched if configured
   - Real-time monitoring and credit deduction
   - Session termination with final accounting

4. **Application Management**:

   - Applications launched via Windows PowerShell
   - Process monitoring through Windows tasklist
   - Automatic kiosk window background/foreground control
   - Process termination on session end

5. **Error Handling & Recovery**:
   - Network disconnection management
   - Authentication failure recovery
   - Session interruption handling
   - Process monitoring failures
   - Database transaction rollbacks

---

## Admin Panel

<a name="admin-panel-overview"></a>

### Overview

The Admin Panel is a simplified vanilla JavaScript web application designed for gaming cafe administrators. Built without frameworks for maximum simplicity and deployability, it provides comprehensive management capabilities including active session monitoring, user account management, credit administration, and system oversight. The panel features a modern responsive design with automatic data refresh capabilities.

<a name="admin-panel-tech-stack"></a>

### Tech Stack

- **HTML5**: Semantic markup with modern form elements
- **CSS3**: Advanced styling with Grid, Flexbox, and custom properties
- **Vanilla JavaScript (ES6+)**: Modern JavaScript without frameworks
- **Supabase JS Client**: Direct API integration via CDN
- **No Build Tools**: Direct browser execution for simplicity
- **Responsive Design**: CSS-based responsive layout for all devices

<a name="admin-panel-architecture"></a>

### Architecture

The Admin Panel follows a modular vanilla JavaScript architecture:

1. **File Structure**:

   - **`index.html`** (227 lines): Complete UI structure and navigation
   - **`styles.css`** (590 lines): Comprehensive responsive styling
   - **`config.js`** (41 lines): Configuration and environment settings
   - **`supabase-client.js`** (495 lines): Complete data access layer
   - **`utils.js`** (337 lines): UI utilities and table generation
   - **`app.js`** (374 lines): Main application logic and event handling

2. **Module Organization**:

   - **Authentication Module**: Login/logout and admin verification
   - **Data Service Module**: All Supabase database operations
   - **Navigation System**: Page switching and state management
   - **Auto-refresh System**: Configurable polling for real-time updates
   - **UI Utilities**: Toast notifications, modals, and table rendering

3. **State Management**:
   - Global authentication state tracking
   - Local state within function scopes
   - DOM-based UI state management
   - Configuration-based feature toggles

<a name="admin-panel-key-features"></a>

### Key Features

1. **Comprehensive Dashboard**:

   - Real-time system statistics (active sessions, total credits, revenue)
   - Live gaming session metrics and averages
   - Recent activity monitoring
   - Auto-refresh every 60 seconds

2. **Active Session Management**:

   - Live monitoring of all active gaming sessions
   - Session details (time remaining, credits used, computer info)
   - Remote session termination capabilities
   - Session statistics and calculations
   - Auto-refresh every 30 seconds

3. **Advanced User Management**:

   - Complete user directory with search functionality
   - Credit balance management and editing
   - User activity status and last seen tracking
   - Bulk operations and advanced filtering
   - Auto-refresh every 2 minutes

4. **Credit Administration**:

   - Add/remove credits with transaction logging
   - Credit transaction history viewing
   - Reason tracking and audit trails
   - Balance validation and error handling

5. **System Features**:

   - Fully responsive design for all device types
   - Toast notification system with multiple types
   - Loading states and comprehensive visual feedback
   - Modal dialogs for critical operations
   - Auto-logout and session management

6. **Simplified Architecture Benefits**:
   - No build process required - direct deployment
   - Framework-independent - long-term stability
   - Easy customization and maintenance
   - Fast loading and minimal dependencies

<a name="admin-panel-data-flow"></a>

### Data Flow

1. **Authentication Flow**:

   - Admin credentials validated through Supabase Auth
   - Admin role verification against profiles table
   - Global authentication state management
   - Protected route access control

2. **Data Operations**:

   - Direct Supabase API calls through DataService
   - Automatic session validation before requests
   - Error handling with user-friendly messages
   - Data transformation for display optimization

3. **Auto-refresh System**:

   - Configurable intervals per page type
   - Background polling without user interaction interference
   - Automatic start/stop based on navigation
   - Error resilience and retry mechanisms

4. **User Interactions**:
   - Form submissions with immediate API calls
   - Real-time UI updates based on responses
   - Optimistic UI updates for better UX
   - Confirmation flows for destructive actions

---

## Integration Details

<a name="database-schema"></a>

### Database Schema

The system uses a comprehensive Supabase PostgreSQL database with the following structure:

1. **Profiles Table**:

   - Extends Supabase Auth users with gaming cafe specific data
   - Stores username, credits, names, admin status
   - Automatic profile creation trigger for new users
   - Comprehensive audit fields (created_at, updated_at)

2. **Sessions Table**:

   - Complete gaming session lifecycle tracking
   - Links users to computers with duration and cost data
   - Active session status management
   - Start/end time tracking with timezone support

3. **Computers Table**:

   - Gaming computer inventory management
   - Status tracking (available, in_use, maintenance)
   - Last user and activity timestamp tracking
   - Location and naming information

4. **Credit Transactions Table**:

   - Complete audit trail for all credit changes
   - Transaction types (session_payment, admin_credit, etc.)
   - Links to sessions and admin users
   - Detailed descriptions for accountability

5. **Configurations Table**:
   - System-wide settings storage using JSONB
   - Pricing configurations and operational parameters
   - Admin-controlled feature toggles
   - Version and maintenance mode settings

**Advanced Features**:

- UUID primary keys with automatic generation
- Row Level Security (RLS) policies for data protection
- Automatic triggers for data consistency
- JSONB storage for flexible configuration data

<a name="authentication--authorization"></a>

### Authentication & Authorization

Both applications implement comprehensive security:

1. **Authentication Methods**:

   - Email/password authentication via Supabase Auth
   - Automatic profile creation for new users
   - Admin user creation with secure key verification
   - Session persistence and automatic renewal

2. **Authorization System**:

   - Role-based access control (user, admin)
   - Row Level Security policies in database
   - API endpoint protection
   - Feature-level permission checks

3. **Security Measures**:
   - Protected API endpoints with automatic session validation
   - Secure token handling and storage
   - CORS configuration for cross-origin requests
   - Input validation and sanitization

<a name="real-time-communication"></a>

### Real-time Communication

The system implements hybrid real-time strategies:

1. **Electron Application**:

   - Supabase real-time subscriptions for instant updates
   - WebSocket connections for live data synchronization
   - Event-driven architecture for responsive UI updates
   - Real-time session monitoring and credit tracking

2. **Admin Panel**:

   - Polling-based updates with configurable intervals
   - Automatic data refresh for critical information
   - Manual refresh capabilities for on-demand updates
   - Background polling without UI interruption

3. **Data Synchronization**:
   - Consistent state maintenance between applications
   - Immediate reflection of administrative actions
   - Session expiration handling across all clients
   - Conflict resolution for concurrent operations

This hybrid approach ensures the Electron application provides real-time responsiveness for gamers while the Admin Panel maintains simplicity and reliability through efficient polling-based updates.

## Development & Deployment

### Build System

- **electron-builder** for Windows executable packaging
- **PowerShell scripts** for automated build processes
- **Squirrel.Windows** integration for installation and updates
- **NSIS installer** with desktop and start menu shortcuts

### Configuration Management

- **Template-based configuration** with `config.json.template`
- **Environment variable support** for sensitive data
- **Supabase connection testing** and validation
- **Database schema setup scripts** for deployment

### Testing & Quality Assurance

- **Supabase connection testing** utilities
- **Database operation validation** scripts
- **Session management testing** scenarios
- **Admin panel functionality verification**

This documentation reflects the current state of a sophisticated gaming cafe management system with advanced features, modern architecture, and comprehensive functionality for both end-users and administrators.
