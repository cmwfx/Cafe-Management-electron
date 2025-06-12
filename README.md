# Gaming Cafe Management System

A comprehensive gaming cafe management software developed as a university capstone project. This system enables efficient management of gaming computer access based on user credits, with real-time monitoring and reporting capabilities.

## Overview

This project consists of two main components:

1. **Windows Client Application**: A kiosk-mode Electron application that:

   - Provides user authentication (login/signup)
   - Displays available credits and gaming session options
   - Manages gaming computer access based on user credits
   - Handles gaming session timeouts with extension options
   - Automatically restarts the computer after session expiration

2. **Admin Panel**: A React-based web application that:
   - Displays active and inactive gamers
   - Manages user credits and accounts
   - Provides detailed gaming usage statistics and reports
   - Visualizes data with interactive graphs and charts

## Features

### Client Application

- Full-screen kiosk mode with exit prevention
- User authentication system
- Credit-based gaming session management (1 credit = 1 minute)
- Gaming session extension capabilities
- Automatic computer restart functionality

### Admin Panel

- User management dashboard
- Credit management system for gaming time
- Comprehensive gaming statistics and reporting
- Real-time gamer activity monitoring
- Financial metrics (credit usage to USD conversion)

## Technology Stack

- **Frontend**: React, Electron
- **Backend**: Supabase (Authentication, Database, Realtime)
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Electron Builder, Supabase Hosting

## Project Structure

```
gaming-cafe-management-system/
├── src/
│   ├── main/           # Electron main process files
│   ├── renderer/       # React frontend for Electron app
│   ├── preload/        # Preload scripts for Electron
│   └── assets/         # Images, icons, and other static files
├── admin-panel/        # React admin dashboard
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Git

### Installation

1. Clone the repository:

   ```
   git clone [repository-url]
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Building and Packaging the Application

### Configuring the Build

The project uses Electron Builder for packaging the application. The build configuration is defined in the `package.json` file under the `build` section.

### Building for Windows

1. Prepare your application icon:

   - Replace the placeholder icon at `src/assets/icon.ico` with your actual application icon
   - The icon should be in .ico format with multiple resolutions (16x16, 32x32, 48x48, 256x256)

2. Using the PowerShell script (recommended):
   ```
   .\build-win.ps1
   ```
3. Or manually using npm:

   ```
   npm run build:win
   ```

4. The installer will be generated in the `dist` folder

### Installer Customization

You can customize the installer by modifying the `nsis` section in `package.json`:

- `oneClick`: Set to `false` to show installation dialogs
- `allowToChangeInstallationDirectory`: Allow users to change install location
- `createDesktopShortcut`: Create a desktop shortcut during installation
- `createStartMenuShortcut`: Create a start menu entry

## Development Workflow

Please refer to the `gaming-cafe-management-checklist.md` file for a detailed development plan and current progress tracking.

## License

[Specify License]

## Contributors

[Your Name] and contributors
