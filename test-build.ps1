# Test Build Script for Cafe Management System
# This script helps test the packaging process without creating an installer

Write-Host "Starting test build process for Cafe Management System..." -ForegroundColor Green

# Check if icon exists and warn if it's still a placeholder
if (Test-Path -Path "src/assets/icon.ico") {
    $iconContent = Get-Content -Path "src/assets/icon.ico" -Raw
    if ($iconContent -match "placeholder") {
        Write-Host "WARNING: You are using a placeholder icon file. This will be included in the test build." -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Icon file is missing at src/assets/icon.ico" -ForegroundColor Red
    Write-Host "Creating a placeholder icon file for testing..." -ForegroundColor Yellow
    $placeholderContent = "This is a placeholder icon file for testing."
    $placeholderContent | Out-File -FilePath "src/assets/icon.ico" -Encoding utf8
}

# Run the pack command which creates unpacked app without installer
Write-Host "Building unpacked application..." -ForegroundColor Yellow
npm run pack

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Test build completed successfully!" -ForegroundColor Green
    Write-Host "Unpacked application can be found in the dist/win-unpacked folder." -ForegroundColor Green
    
    # Check if the unpacked directory exists
    if (Test-Path -Path "dist/win-unpacked") {
        # List the main executable
        Write-Host "Main executable:" -ForegroundColor Cyan
        Get-ChildItem -Path "dist/win-unpacked" -Filter "*.exe" | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor White
        }
    } else {
        Write-Host "Unpacked directory not found. Build may have used a different output path." -ForegroundColor Yellow
    }
} else {
    Write-Host "Test build failed with exit code $LASTEXITCODE" -ForegroundColor Red
} 