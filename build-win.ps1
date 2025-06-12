# Gaming Cafe Management System Build Script for Windows
# This script helps automate the build process for the Gaming Cafe Management System

Write-Host "Starting build process for Gaming Cafe Management System..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path -Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if icon exists and warn if it's still a placeholder
if (Test-Path -Path "src/assets/icon.ico") {
    $iconContent = Get-Content -Path "src/assets/icon.ico" -Raw
    if ($iconContent -match "placeholder") {
        Write-Host "WARNING: You are using a placeholder icon file. Replace with a real .ico file before distribution." -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: Icon file is missing at src/assets/icon.ico" -ForegroundColor Red
    exit 1
}

# Clean previous builds
if (Test-Path -Path "dist") {
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
    Remove-Item -Path "dist" -Recurse -Force
}

# Run the build
Write-Host "Building application..." -ForegroundColor Yellow
npm run build:win

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "Installer can be found in the dist folder." -ForegroundColor Green
} else {
    Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
} 