# Cafe Management System

A comprehensive WiFi cafe management software developed as a university capstone project. This system enables efficient management of computer access based on user credits, with real-time monitoring and reporting capabilities.

## Overview

This project consists of two main components:

1. **Windows Client Application**: A kiosk-mode Electron application that:

   - Provides user authentication (login/signup)
   - Displays available credits and session options
   - Manages computer access based on user credits
   - Handles session timeouts with extension options
   - Automatically restarts the computer after session expiration

2. **Admin Panel**: A React-based web application that:
   - Displays active and inactive users
   - Manages user credits and accounts
   - Provides detailed usage statistics and reports
   - Visualizes data with interactive graphs and charts

## Features

### Client Application

- Full-screen kiosk mode with exit prevention
- User authentication system
- Credit-based session management (1 credit = 1 minute)
- Session extension capabilities
- Automatic computer restart functionality

### Admin Panel

- User management dashboard
- Credit management system
- Comprehensive statistics and reporting
- Real-time user activity monitoring
- Financial metrics (credit usage to USD conversion)

## Technology Stack

- **Frontend**: React, Electron
- **Backend**: Firebase (Authentication, Firestore, Functions)
- **Database**: Firestore (NoSQL)
- **Deployment**: Electron Builder, Firebase Hosting

## Project Structure

```
cafe-management-system/
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

## Development Workflow

Please refer to the `cafe-management-checklist.md` file for a detailed development plan and current progress tracking.

## License

[Specify License]

## Contributors

[Your Name] and contributors
