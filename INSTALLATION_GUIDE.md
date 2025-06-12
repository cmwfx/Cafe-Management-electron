# Gaming Cafe Management System - Installation Guide

## System Requirements

Before installing the Gaming Cafe Management System, ensure your computer meets the following requirements:

### Minimum Requirements

- **Operating System**: Windows 10 (64-bit) or later
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free disk space
- **Processor**: Intel Core i3 or AMD equivalent
- **Network**: Stable internet connection for database connectivity

### Recommended Requirements

- **Operating System**: Windows 11 (64-bit)
- **RAM**: 8 GB or more
- **Storage**: 1 GB free disk space
- **Processor**: Intel Core i5 or AMD Ryzen 5 equivalent or better
- **Network**: High-speed broadband internet connection

## Download

1. Obtain the installer file: `Gaming Cafe Management System Setup 1.0.0.exe`
2. Verify the file size is approximately 83 MB
3. Ensure the file is downloaded from a trusted source

## Installation Process

### Step 1: Run the Installer

1. **Locate the installer**: Navigate to where you downloaded `Gaming Cafe Management System Setup 1.0.0.exe`
2. **Run as Administrator** (recommended):
   - Right-click on the installer file
   - Select "Run as administrator"
   - Click "Yes" when prompted by Windows User Account Control

### Step 2: Installation Wizard

1. **Welcome Screen**: Click "Next" to begin the installation process
2. **License Agreement**: Read and accept the license terms, then click "Next"
3. **Installation Directory**:
   - Default location: `C:\Users\[YourUsername]\AppData\Local\Programs\gaming-cafe-management-system`
   - To change location: Click "Browse" and select your preferred directory
   - Click "Next" to continue
4. **Start Menu Folder**: Choose where to place the application shortcuts, then click "Next"
5. **Additional Tasks**:
   - ✅ Create a desktop shortcut (recommended)
   - ✅ Create a Start Menu shortcut (recommended)
   - Click "Next"
6. **Ready to Install**: Review your settings and click "Install"
7. **Installation Progress**: Wait for the installation to complete
8. **Completion**: Click "Finish" to exit the installer

### Step 3: First Launch Verification

1. **Launch the application**:

   - Double-click the desktop shortcut, OR
   - Go to Start Menu > Gaming Cafe Management System, OR
   - Navigate to installation directory and run the executable

2. **Initial startup**: The application may take 10-15 seconds to load on first launch

## Initial Configuration

⚠️ **Important**: Before the application can function properly, you need to configure the database connection.

### Configuration Setup

1. **Locate the configuration file**:

   - Navigate to: `C:\Users\[YourUsername]\AppData\Local\Programs\gaming-cafe-management-system\resources\config.json`

2. **Edit the configuration** (you'll need administrator privileges):
   - Open `config.json` with a text editor (Notepad++, VS Code, or even Notepad)
   - Replace the placeholder values:

```json
{
	"supabaseUrl": "YOUR_ACTUAL_SUPABASE_URL_HERE",
	"supabaseAnonKey": "YOUR_ACTUAL_SUPABASE_ANON_KEY_HERE",
	"kioskMode": true,
	"initialCredits": 100,
	"creditsPerMinute": 1,
	"apiEndpoints": {
		"auth": "/auth/v1",
		"rest": "/rest/v1"
	}
}
```

3. **Save the file** and restart the application

### Kiosk Mode Settings

- **Full Kiosk Mode** (`"kioskMode": true`): Application runs in full-screen with limited exit options
- **Windowed Mode** (`"kioskMode": false`): Application runs in a normal window (for testing/admin use)

## Post-Installation Setup

### For Gaming Cafe Operators

1. **Test the installation**: Launch the application and verify it loads correctly
2. **Create admin accounts**: Set up administrative user accounts in your Supabase dashboard
3. **Configure credit system**: Adjust `initialCredits` and `creditsPerMinute` values as needed
4. **Network setup**: Ensure all gaming computers can access your Supabase database
5. **Security**: Set up proper firewall rules and network security

### For System Administrators

1. **Deploy to multiple computers**: Use the installer on each gaming computer
2. **Centralized configuration**: Consider using network-shared configuration files
3. **Monitoring**: Set up logging and monitoring for the application
4. **Backup**: Ensure database backups are configured in Supabase

## Troubleshooting

### Common Issues

#### Application Won't Start

- **Solution 1**: Run the application as administrator
- **Solution 2**: Check Windows Event Viewer for error details
- **Solution 3**: Temporarily disable antivirus software and try again
- **Solution 4**: Reinstall the application

#### "Database Connection Failed" Error

- **Cause**: Incorrect Supabase configuration
- **Solution**:
  1. Verify your `config.json` file has correct Supabase URL and API key
  2. Check internet connection
  3. Verify Supabase service is running

#### Application Crashes in Kiosk Mode

- **Solution**: Set `"kioskMode": false` in config.json for testing
- **Check**: Ensure graphics drivers are up to date
- **Alternative**: Run in compatibility mode for Windows 10

#### Can't Exit Application

- **In Kiosk Mode**: This is intentional behavior
- **Emergency Exit**: Press `Ctrl + Alt + Delete` and use Task Manager
- **Admin Access**: Configure admin hotkeys in the application settings

### Getting Help

1. **Check logs**: Application logs are stored in `%APPDATA%\gaming-cafe-management-system\logs\`
2. **Event Viewer**: Check Windows Event Viewer for system-level errors
3. **Contact Support**: [Provide your support contact information]

## Uninstallation

### Using Windows Settings (Recommended)

1. Open **Windows Settings** (`Windows Key + I`)
2. Go to **Apps**
3. Search for "Gaming Cafe Management System"
4. Click on the application and select **Uninstall**
5. Follow the uninstallation wizard
6. Confirm removal when prompted

### Using Control Panel

1. Open **Control Panel**
2. Go to **Programs and Features**
3. Find "Gaming Cafe Management System" in the list
4. Click **Uninstall**
5. Follow the removal wizard

### Manual Cleanup (if needed)

After uninstallation, you may manually remove:

- Configuration files: `%APPDATA%\gaming-cafe-management-system\`
- Desktop shortcuts
- Start Menu entries

## Security Considerations

- **Network Security**: Ensure proper firewall configuration
- **User Permissions**: Run with appropriate user privileges
- **Data Protection**: Secure your Supabase credentials
- **Physical Security**: Consider kiosk mode security for public computers

## Updates

- Future updates will be delivered as new installer packages
- Always backup your `config.json` before updating
- Check for updates regularly for security patches and new features

---

**Version**: 1.0.0  
**Last Updated**: [Current Date]  
**For Technical Support**: [Your Contact Information]
