const {
	app,
	BrowserWindow,
	Menu,
	globalShortcut,
	dialog,
	ipcMain,
} = require("electron");
const path = require("path");
const { supabase } = require("./supabase-config");
const { testSupabaseConnection } = require("./supabase-test");
const { realtimeManager } = require("./supabase-realtime");
const { authManager } = require("./auth-manager");
const { sessionManager } = require("./session-manager");

// Get Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
	app.quit();
}

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;

// Flag to determine if the app is running in kiosk mode
let isKioskMode = process.env.NODE_ENV !== "development";
let isDevelopment = process.env.NODE_ENV === "development";

// Force production mode and kiosk mode
isDevelopment = false;
isKioskMode = true;

// Set up IPC handlers for communication with renderer process
const setupIpcHandlers = () => {
	// Handle login requests
	ipcMain.on("login", async (event, credentials) => {
		try {
			// Authenticate with Supabase
			const { data, error } = await supabase.auth.signInWithPassword({
				email: credentials.username,
				password: credentials.password,
			});

			if (error) {
				event.sender.send("loginResponse", {
					success: false,
					message: authManager.handleAuthError(error),
				});
				return;
			}

			// Fetch user data from profiles table
			const { data: profileData, error: profileError } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", data.user.id)
				.single();

			if (profileError) {
				event.sender.send("loginResponse", {
					success: false,
					message: "Error retrieving user profile",
				});
				return;
			}

			// Store the current user data in auth manager
			const userData = {
				id: data.user.id,
				email: data.user.email,
				...profileData,
			};

			// Set current user in auth manager
			authManager.setCurrentUser(userData);

			event.sender.send("loginResponse", {
				success: true,
				message: "Login successful",
				userData: userData,
			});
		} catch (err) {
			event.sender.send("loginResponse", {
				success: false,
				message: "An unexpected error occurred",
			});
		}
	});

	// Handle user registration
	ipcMain.on("register", async (event, userData) => {
		// Make sure Supabase client is properly configured
		if (!supabase) {
			event.sender.send("registerResponse", {
				success: false,
				message: "Registration failed: Database connection is not available",
			});
			return;
		}

		if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
			event.sender.send("registerResponse", {
				success: false,
				message:
					"Database configuration is missing. Please check your installation.",
			});
			return;
		}

		// Test connection before proceeding
		try {
			const connectionTest = await testSupabaseConnection();
			if (!connectionTest) {
				event.sender.send("registerResponse", {
					success: false,
					message:
						"Unable to connect to the database. Please check your internet connection.",
				});
				return;
			}
		} catch (connErr) {
			// Continue anyway to get more specific errors
		}

		try {
			// Try an alternative approach to work around Supabase issues

			// First check if user exists
			const { data: existingUser, error: userCheckError } =
				await supabase.auth.signInWithPassword({
					email: userData.username,
					password: userData.password,
				});

			if (!userCheckError && existingUser && existingUser.user) {
				// Check if they have a profile
				const { data: existingProfile, error: profileCheckError } =
					await supabase
						.from("profiles")
						.select("*")
						.eq("id", existingUser.user.id)
						.single();

				if (profileCheckError || !existingProfile) {
					// Create profile for existing user
					const initialCredits = 100;

					const { data: newProfile, error: profileCreateError } = await supabase
						.from("profiles")
						.insert({
							id: existingUser.user.id,
							username: userData.display_name,
							credits: initialCredits,
							first_name: "",
							last_name: "",
							is_admin: false,
						});
				}

				// Return success for existing user
				event.sender.send("registerResponse", {
					success: true,
					message: "Account exists - you can now login with your credentials.",
				});
				return;
			}

			// Check if username is already taken
			const { data: existingProfiles, error: profileCheckError } =
				await supabase
					.from("profiles")
					.select("username")
					.eq("username", userData.display_name)
					.limit(1);

			if (profileCheckError) {
				// Continue with registration despite this error
			} else if (existingProfiles && existingProfiles.length > 0) {
				// Username is already taken
				event.sender.send("registerResponse", {
					success: false,
					message:
						"This username is already taken. Please choose a different one.",
				});
				return;
			}

			// Try to create user with direct signUp
			const { data, error } = await supabase.auth.signUp({
				email: userData.username,
				password: userData.password,
				options: {
					// Use data object to store additional user info
					data: {
						display_name: userData.display_name,
					},
				},
			});

			if (error) {
				// Try alternate admin signup approach
				try {
					// This would be replaced with proper admin signup in production
					// For now, just return the error
					event.sender.send("registerResponse", {
						success: false,
						message: `Registration failed: ${error.message}`,
					});
					return;
				} catch (adminErr) {
					event.sender.send("registerResponse", {
						success: false,
						message: `Registration failed: ${error.message}`,
					});
					return;
				}
			}

			// Check if we got a valid user back
			if (!data || !data.user || !data.user.id) {
				event.sender.send("registerResponse", {
					success: false,
					message: "Registration failed: No user data returned",
				});
				return;
			}

			// Create profile for the user if needed
			try {
				// Check if profile already exists
				const { data: existingProfile, error: profileCheckError } =
					await supabase
						.from("profiles")
						.select("*")
						.eq("id", data.user.id)
						.single();

				if (!profileCheckError && existingProfile) {
					// Profile already exists, no need to create one
				} else {
					// Create a new profile
					const initialCredits = 100; // Default starting credits

					const { data: profileData, error: profileError } = await supabase
						.from("profiles")
						.insert({
							id: data.user.id,
							username: userData.display_name,
							credits: initialCredits,
							first_name: "",
							last_name: "",
							is_admin: false,
						});

					if (profileError) {
						event.sender.send("registerResponse", {
							success: false,
							message: `Profile creation failed: ${profileError.message}`,
						});
						return;
					}

					// Add welcome credits transaction
					const { error: transactionError } = await supabase
						.from("credit_transactions")
						.insert({
							user_id: data.user.id,
							amount: initialCredits,
							description: "Welcome credits",
							reference_type: "system",
						});
				}

				// Return success response
				event.sender.send("registerResponse", {
					success: true,
					message:
						"Registration successful! You can now login with your credentials.",
				});
			} catch (profileErr) {
				event.sender.send("registerResponse", {
					success: false,
					message: "Error creating user profile",
				});
			}
		} catch (err) {
			event.sender.send("registerResponse", {
				success: false,
				message: "An unexpected error occurred during registration",
			});
		}
	});

	// Handle logout
	ipcMain.on("logout", async (event) => {
		try {
			// Sign out from Supabase
			const { error } = await supabase.auth.signOut();

			// Clear auth manager state regardless of Supabase response
			authManager.clearCurrentUser();

			// Send response to renderer
			event.sender.send("logoutResponse", {
				success: true,
				message: "Logged out successfully",
			});
		} catch (error) {
			event.sender.send("logoutResponse", {
				success: false,
				message: "Error during logout",
			});
		}
	});

	// Handle getUserData requests
	ipcMain.on("getUserData", (event) => {
		// Get current user from auth manager
		const userData = authManager.getCurrentUser();

		if (userData) {
			event.sender.send("userData", {
				success: true,
				userData: userData,
			});
		} else {
			event.sender.send("userData", {
				success: false,
				message: "No user is currently logged in",
			});
		}
	});

	// Handle transaction history request
	ipcMain.on("getTransactionHistory", async (event, data) => {
		try {
			// Get transactions for the user
			const { data: transactions, error } = await supabase
				.from("credit_transactions")
				.select("*")
				.eq("user_id", data.userId)
				.order("created_at", { ascending: false })
				.limit(10);

			if (error) {
				event.sender.send("transactionHistoryResponse", {
					success: false,
					message: error.message,
				});
				return;
			}

			event.sender.send("transactionHistoryResponse", {
				success: true,
				transactions: transactions,
			});
		} catch (err) {
			event.sender.send("transactionHistoryResponse", {
				success: false,
				message: "An unexpected error occurred",
			});
		}
	});

	// Handle session start request
	ipcMain.on("startSession", async (event, data) => {
		try {
			// Validate inputs
			const userId = data.userId;
			const durationMinutes = parseInt(data.duration);
			const credits = parseInt(data.credits);

			// Start the session
			const result = await sessionManager.startSession(
				userId,
				durationMinutes,
				credits
			);

			// Send response to renderer
			event.sender.send("sessionStartResponse", result);
		} catch (err) {
			event.sender.send("sessionStartResponse", {
				success: false,
				message: "Failed to start session",
			});
		}
	});

	// Handle session extension request
	ipcMain.on("extendSession", async (event, data) => {
		try {
			// Validate inputs
			const sessionId = data.sessionId;
			const userId = data.userId;
			const durationMinutes = parseInt(data.duration);
			const credits = parseInt(data.credits);

			// Extend the session
			const result = await sessionManager.extendSession(
				sessionId,
				userId,
				durationMinutes,
				credits
			);

			// Send response to renderer
			event.sender.send("sessionExtendResponse", result);
		} catch (err) {
			event.sender.send("sessionExtendResponse", {
				success: false,
				message: "Failed to extend session",
			});
		}
	});

	// Handle session end request
	ipcMain.on("endSession", async (event, data) => {
		try {
			// End the session
			const result = await sessionManager.endSession(
				data.sessionId,
				data.userId
			);

			// Send response to renderer
			event.sender.send("sessionEndResponse", result);
		} catch (err) {
			event.sender.send("sessionEndResponse", {
				success: false,
				message: "Failed to end session",
			});
		}
	});

	// Handle get active session request
	ipcMain.on("getActiveSession", async (event, data) => {
		try {
			// Get active session for the user
			const result = await sessionManager.getActiveSession(data.userId);

			// Send response to renderer
			event.sender.send("sessionResponse", result);
		} catch (err) {
			event.sender.send("sessionResponse", {
				success: false,
				message: "Failed to get active session",
			});
		}
	});

	// Handle minimize app request
	ipcMain.on("minimizeApp", (event) => {
		if (mainWindow) {
			mainWindow.minimize();
		}
	});

	// Handle session expired notification
	ipcMain.on("sessionExpired", (event) => {
		// Notify the main process that the session has expired
		if (mainWindow && mainWindow.webContents) {
			// Step 1: Ensure window is restored (not minimized)
			if (mainWindow.isMinimized()) {
				mainWindow.restore();
			}

			// Step 2: Ensure window is visible and focused
			if (!mainWindow.isVisible()) {
				mainWindow.show();
			}
			mainWindow.focus();

			// Step 3: Force fullscreen mode
			mainWindow.setKiosk(true);
			mainWindow.setFullScreen(true);

			// Step 4: Force window to be always on top PERMANENTLY to ensure it stays in foreground
			// Using 'screen-saver' level to ensure it's above all other windows
			mainWindow.setAlwaysOnTop(true, "screen-saver");

			// Step 5: Notify renderer about session expiration
			mainWindow.webContents.send("sessionExpiredUI");

			// Step 6: Remove the timeout that would disable always-on-top
			// We want it to STAY on top until user extends the session
		}
	});

	// Handle session extended notification (disable always-on-top)
	ipcMain.on("sessionExtended", (event) => {
		if (mainWindow) {
			// Disable always-on-top when session is extended
			mainWindow.setAlwaysOnTop(false);

			// Keep fullscreen mode since session is still active
			mainWindow.setFullScreen(true);
			mainWindow.setKiosk(true);
		}
	});

	// Handle restart computer request
	ipcMain.on("restartComputer", async (event) => {
		// This should be properly secured in production
		// Only allow this if the user has appropriate permissions

		// For Windows
		try {
			const { exec } = require("child_process");
			exec(
				'shutdown /r /t 60 /c "System restart scheduled by Cafe Management System"',
				(error, stdout, stderr) => {
					if (error) {
						event.sender.send("notification", {
							type: "error",
							message: "Failed to restart computer. Access denied.",
						});
						return;
					}

					event.sender.send("notification", {
						type: "success",
						message: "Computer will restart in 60 seconds.",
					});
				}
			);
		} catch (error) {
			event.sender.send("notification", {
				type: "error",
				message: "Failed to restart computer.",
			});
		}
	});

	// Send notification to renderer process
	const sendNotification = (message) => {
		if (mainWindow && mainWindow.webContents) {
			mainWindow.webContents.send("notification", message);
		}
	};
};

const disableKeyboardShortcuts = () => {
	// Disable common keyboard shortcuts that could be used to exit kiosk mode
	const shortcutsToDisable = [
		"CommandOrControl+W", // Close window
		"CommandOrControl+Q", // Quit app
		"CommandOrControl+Shift+I", // Open dev tools
		"F11", // Toggle full screen
		"Alt+Tab", // Switch windows (this doesn't work in Electron, just for documentation)
		"Alt+F4", // Close window
		"CommandOrControl+R", // Reload
		"CommandOrControl+Shift+R", // Hard reload
		"CommandOrControl+F", // Find
		"CommandOrControl+P", // Print
		"CommandOrControl+S", // Save
		"CommandOrControl+O", // Open
		"CommandOrControl+N", // New window
		"CommandOrControl+T", // New tab
		"CommandOrControl+Shift+N", // New incognito window
		"CommandOrControl+Tab", // Next tab
		"CommandOrControl+Shift+Tab", // Previous tab
		"CommandOrControl+1", // First tab
		"CommandOrControl+2", // Second tab
		"CommandOrControl+3", // Third tab
		"CommandOrControl+4", // Fourth tab
		"CommandOrControl+5", // Fifth tab
		"CommandOrControl+6", // Sixth tab
		"CommandOrControl+7", // Seventh tab
		"CommandOrControl+8", // Eighth tab
		"CommandOrControl+9", // Last tab
	];

	// Register handlers that prevent default behavior
	shortcutsToDisable.forEach((shortcut) => {
		try {
			globalShortcut.register(shortcut, () => {
				// Block shortcut
				return false;
			});
		} catch (error) {
			// Silently handle error - some shortcuts might not be valid on all platforms
		}
	});

	// Register a global 'ESC' key handler to prevent exiting kiosk mode
	if (isKioskMode) {
		globalShortcut.register("Escape", () => {
			// Block Escape key
			return false;
		});
	}
};

const createWindow = () => {
	// Create the browser window
	mainWindow = new BrowserWindow({
		width: 1024,
		height: 768,
		webPreferences: {
			nodeIntegration: false, // Security: Disable Node integration in renderer
			contextIsolation: true, // Security: Enable context isolation
			preload: path.join(__dirname, "../preload/preload.js"), // Path to preload script
			// Additional security settings
			devTools: false, // Disable DevTools in production
			webSecurity: true, // Enable web security features
			allowRunningInsecureContent: false, // Prevents loading HTTP resources on HTTPS pages
			sandbox: false, // Disable sandbox temporarily to allow the preload script to access Node modules
			enableRemoteModule: false, // Disable remote module for security
		},
		// Kiosk mode configuration
		kiosk: isKioskMode,
		fullscreen: isKioskMode,
		autoHideMenuBar: true, // Hide menu bar in all modes
		frame: !isKioskMode, // Show frame only in development mode
		resizable: !isKioskMode, // Allow resize only in development mode
	});

	// Load the index.html of the app
	mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

	// Disable menu in production/kiosk mode
	Menu.setApplicationMenu(null);

	// Disable context menu in production mode
	mainWindow.webContents.on("context-menu", (e, params) => {
		e.preventDefault();
		// Block context menu
	});

	// Emitted when the window is closed
	mainWindow.on("closed", () => {
		// Dereference the window object
		mainWindow = null;
	});

	// Prevent window navigation to external URLs
	mainWindow.webContents.on("will-navigate", (event, url) => {
		// Allow navigation only to internal pages
		const parsedUrl = new URL(url);
		if (parsedUrl.origin !== "file://") {
			event.preventDefault();
		}
	});

	// Prevent window from creating new windows
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		// Deny all new windows
		return { action: "deny" };
	});
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
	// Initialize auth manager with realtime manager
	authManager.initialize(realtimeManager);

	// Set up auth manager event listener
	authManager.addListener((event) => {
		if (!mainWindow || !mainWindow.webContents) return;

		// Forward authentication events to renderer
		switch (event.type) {
			case "USER_UPDATED":
				mainWindow.webContents.send("profileUpdate", event.data);
				break;
			case "SESSION_UPDATED":
				mainWindow.webContents.send("sessionUpdate", event.data);
				break;
			case "CREDIT_TRANSACTION":
				mainWindow.webContents.send("creditTransaction", event.data);
				break;
			case "SESSION_RESTORED":
				mainWindow.webContents.send("loginResponse", {
					success: true,
					message: "Session restored",
					userData: event.data,
				});
				break;
			case "LOGGED_OUT":
				mainWindow.webContents.send("logoutResponse", {
					success: true,
					message: "Logged out successfully",
				});
				break;
		}
	});

	createWindow();
	setupIpcHandlers();
	disableKeyboardShortcuts();

	// Handle macOS app activation
	app.on("activate", () => {
		// On macOS it's common to re-create a window when the dock icon is clicked
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Clean up when app is quitting
app.on("will-quit", () => {
	// Unregister all shortcuts
	globalShortcut.unregisterAll();
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	// Log error and exit gracefully
	if (mainWindow) {
		dialog.showErrorBox(
			"Application Error",
			"An unexpected error occurred. The application will close."
		);
	}
	app.quit();
});
