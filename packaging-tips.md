# Packaging and Distribution Tips

This document provides guidance for packaging and distributing the Cafe Management System application for Windows.

## Common Issues and Solutions

### 1. Missing Dependencies

**Issue:** The packaged application fails to run due to missing npm dependencies.

**Solution:**

- Make sure all dependencies are correctly listed in `package.json` (not as devDependencies if needed at runtime)
- Run `npm install` before building to ensure all dependencies are installed
- Check for native modules that might need rebuilding for the target platform

### 2. Environment Variables

**Issue:** Environment variables defined during development are not available in the packaged application.

**Solution:**

- Environment variables defined in `.env` are not automatically included in the packaged application
- For production builds, hardcode the Supabase URL and anonymous key in the configuration file
- Another option is to use a config file that is packaged with the application and read at runtime

### 3. Icons and Assets

**Issue:** Custom icons or assets are missing in the packaged application.

**Solution:**

- Make sure all assets are in the correct directories (src/assets)
- Ensure the icon is properly formatted as an .ico file with multiple resolutions
- Verify that the build configuration in package.json correctly references these assets

### 4. Windows Security Warnings

**Issue:** Windows SmartScreen warns users about the application.

**Solution:**

- Code signing is recommended for production applications
- Purchase a code signing certificate from a trusted certificate authority
- Add code signing configuration to the `win` section of the build configuration:
  ```json
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "certificate-password",
    "verifyUpdateCodeSignature": true
  }
  ```

### 5. Installation Directory Issues

**Issue:** Application installs to an unexpected directory or has permission issues.

**Solution:**

- The default installation directory is in Program Files, which requires admin privileges
- You can customize the installation directory in the nsis configuration
- For kiosk applications, consider installing to a directory that doesn't require elevated privileges

## Testing the Packaged Application

Before distributing the application:

1. Test on a clean Windows system (without development tools installed)
2. Verify all features work correctly, especially those requiring system access
3. Test the installation and uninstallation process
4. Check that shortcut creation works correctly
5. Verify the application starts correctly after a system reboot

## Distribution Options

### 1. Direct Download

- Host the installer on a website for direct download
- Provide clear installation instructions
- Consider using a download manager for larger installations

### 2. Enterprise Deployment

- Use Group Policy to deploy the application in an enterprise environment
- Create an MSI package for enterprise deployment
- Provide documentation for IT administrators

### 3. Auto-Updates

For future versions, consider implementing auto-updates:

1. Add an update server configuration to electron-builder
2. Create a versioning strategy
3. Implement update checking logic in the main process
4. Test update scenarios thoroughly

## Security Considerations

1. **Code Signing:** Sign your application to prevent security warnings and tampering
2. **Secure Storage:** Use secure storage for user credentials and sensitive data
3. **Network Security:** Ensure all network communications are encrypted
4. **Error Handling:** Implement secure error handling that doesn't expose sensitive information

## Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [Windows Code Signing Guide](https://www.electron.build/code-signing.html)
- [NSIS Configuration Options](https://www.electron.build/configuration/nsis.html)
