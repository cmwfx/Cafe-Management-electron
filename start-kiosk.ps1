# Gaming Cafe Management System - Kiosk Mode Launcher
# This script starts the application in full kiosk mode

Write-Host "Starting Gaming Cafe Management System in Kiosk Mode..." -ForegroundColor Green

# Set environment to production to enable kiosk mode
$env:NODE_ENV = "production"

# Start the application
npm run start:production 