const {
	app,
	BrowserWindow,
	Menu,
	globalShortcut,
	dialog,
	ipcMain,
	shell,
} = require("electron");
const path = require("path");
const { supabase } = require("./supabase-config");
const { testSupabaseConnection } = require("./supabase-test");
const { realtimeManager } = require("./supabase-realtime");
const { authManager } = require("./auth-manager");
const { sessionManager } = require("./session-manager");
const { spawn, exec, execFile } = require("child_process");

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
	// Handle Windows-specific setup
	const appFolder = path.dirname(process.execPath);
	const updateExe = path.resolve(appFolder, "..", "Update.exe");
	const exeName = path.basename(process.execPath);

	// Handle Squirrel.Windows events
	if (process.argv.length === 1) {
		// App is being launched normally, continue with startup
	} else {
		const squirrelEvent = process.argv[1];
		switch (squirrelEvent) {
			case "--squirrel-install":
			case "--squirrel-updated":
				// Create shortcuts here
				// The following creates shortcuts during installation
				require("child_process").spawnSync(updateExe, [
					"--createShortcut",
					exeName,
				]);
				app.quit();
				break;
			case "--squirrel-uninstall":
				// Remove shortcuts here
				require("child_process").spawnSync(updateExe, [
					"--removeShortcut",
					exeName,
				]);
				app.quit();
				break;
			case "--squirrel-obsolete":
				app.quit();
				break;
		}
	}
}

// Get Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;

// Store launched application types for cleanup (instead of tracking individual processes)
let launchedAppTypes = new Map(); // userId -> Set of app executable names

// Flag to determine if the app is running in kiosk mode
let isKioskMode = process.env.NODE_ENV !== "development";
let isDevelopment = process.env.NODE_ENV === "development";

// Enable kiosk mode for production deployment
isKioskMode = true;
isDevelopment = false;

// Helper function to check if a process is running by executable name
const isProcessRunning = (executableName) => {
	return new Promise((resolve) => {
		const processName = executableName.replace(".exe", "");

		console.log(`[Main] Checking if ${executableName} is running...`);

		// Use tasklist command which is more reliable than PowerShell for process detection
		exec(
			`tasklist /FI "IMAGENAME eq ${executableName}" /FO CSV`,
			{ timeout: 3000 },
			(error, stdout, stderr) => {
				if (error) {
					console.log(
						`[Main] ${executableName} is not running (tasklist error)`
					);
					resolve(false);
				} else {
					// Check if the output contains the process name (more than just the header)
					const lines = stdout.trim().split("\n");
					if (lines.length > 1) {
						console.log(`[Main] ${executableName} is running`);
						resolve(true);
					} else {
						console.log(`[Main] ${executableName} is not running`);
						resolve(false);
					}
				}
			}
		);
	});
};

// Helper function to bring kiosk window to front when session expires
const bringKioskToFront = () => {
	if (!mainWindow) return;

	console.log(`[Main] Bringing kiosk window to front`);

	// Set window to highest z-order level
	mainWindow.setAlwaysOnTop(true, "screen-saver");

	// Ensure window is visible and focused
	if (mainWindow.isMinimized()) {
		mainWindow.restore();
	}
	mainWindow.show();
	mainWindow.focus();

	// Ensure fullscreen/kiosk mode
	if (isKioskMode) {
		mainWindow.setKiosk(true);
		mainWindow.setFullScreen(true);
	}

	console.log(`[Main] Kiosk window brought to front successfully`);
};

// Helper function to send kiosk window to back when session is active
const sendKioskToBack = () => {
	if (!mainWindow) return;

	console.log(`[Main] Sending kiosk window to back`);

	// Turn off always-on-top flag
	mainWindow.setAlwaysOnTop(false);

	// Relinquish focus
	mainWindow.blur();

	// Keep window visible but unfocused
	mainWindow.showInactive();

	// In development mode, keep some visibility
	if (isDevelopment) {
		mainWindow.setKiosk(false);
		mainWindow.setFullScreen(false);
	}

	console.log(`[Main] Kiosk window sent to back successfully`);
};

// Function to launch an application
const launchApplication = (appPath, userId) => {
	return new Promise(async (resolve, reject) => {
		try {
			// Extract executable name from path
			const path = require("path");
			const executableName = path.basename(appPath);

			console.log(
				`[Main] Attempting to launch ${executableName} for user ${userId}`
			);

			// Check if the application is already running
			const isRunning = await isProcessRunning(executableName);

			if (isRunning) {
				console.log(
					`[Main] ${executableName} is already running, sending kiosk to background`
				);

				// Instead of opening a new instance, send the kiosk to the background
				sendKioskToBack();

				// Update tracking without launching new instance
				if (!launchedAppTypes.has(userId)) {
					launchedAppTypes.set(userId, new Set());
				}
				launchedAppTypes.get(userId).add(executableName);

				resolve();
				return;
			}

			// If not running, launch new instance and send kiosk to background
			console.log(`[Main] Launching new instance of ${executableName}`);

			// Use PowerShell to launch the application with proper path escaping
			// Use single quotes to avoid issues with special characters and spaces
			const psCommand = `Start-Process -FilePath '${appPath}' -PassThru`;

			exec(
				`powershell.exe -Command "${psCommand}"`,
				(error, stdout, stderr) => {
					if (error) {
						console.error("Failed to launch application:", error);
						reject(error);
						return;
					}

					// Track the application type for cleanup later (by executable name)
					if (!launchedAppTypes.has(userId)) {
						launchedAppTypes.set(userId, new Set());
					}
					launchedAppTypes.get(userId).add(executableName);

					// Send kiosk to background after successful launch
					sendKioskToBack();

					console.log(
						`[Main] Tracked application ${executableName} for user ${userId} and sent kiosk to background`
					);
					resolve();
				}
			);
		} catch (error) {
			reject(error);
		}
	});
};

// Function to close all launched applications for a user using taskkill
const closeUserApplications = (userId) => {
	console.log(`[Main] Closing applications for user ${userId}`);

	const userAppTypes = launchedAppTypes.get(userId);
	if (!userAppTypes || userAppTypes.size === 0) {
		console.log(`[Main] No applications to close for user ${userId}`);
		return;
	}

	// Convert Set to Array for processing
	const appList = Array.from(userAppTypes);
	console.log(`[Main] Closing applications: ${appList.join(", ")}`);

	// Close each application type using taskkill
	appList.forEach((executableName) => {
		console.log(`[Main] Terminating all instances of ${executableName}`);

		// Use taskkill to force close all instances of the executable
		// /IM = Image Name, /T = include child processes, /F = force termination
		execFile(
			"taskkill",
			["/IM", executableName, "/T", "/F"],
			(error, stdout, stderr) => {
				if (error) {
					// This is expected if the app is not running, so just log it
					console.log(
						`[Main] ${executableName} may not be running or already closed: ${error.message}`
					);
				} else {
					console.log(`[Main] Successfully terminated ${executableName}`);
				}
			}
		);
	});

	// Clear the tracked applications for this user
	launchedAppTypes.set(userId, new Set());
	console.log(`[Main] Cleared application tracking for user ${userId}`);
};

// Function to forcefully close all common applications (brute force cleanup)
const forceCloseAllApplications = () => {
	console.log(`[Main] Force closing all common user applications`);

	// List of common applications that users might launch
	const commonApps = [
		"msedge.exe", // Microsoft Edge
		"chrome.exe", // Google Chrome
		"firefox.exe", // Mozilla Firefox
		"notepad.exe", // Notepad
		"calc.exe", // Calculator
		"mspaint.exe", // Paint
		"winword.exe", // Microsoft Word
		"excel.exe", // Microsoft Excel
		"powerpnt.exe", // Microsoft PowerPoint
		"steam.exe", // Steam
		"discord.exe", // Discord
		"spotify.exe", // Spotify
		"vlc.exe", // VLC Media Player
		"code.exe", // Visual Studio Code
		"notepad++.exe", // Notepad++
	];

	commonApps.forEach((executableName) => {
		execFile(
			"taskkill",
			["/IM", executableName, "/T", "/F"],
			(error, stdout, stderr) => {
				if (error) {
					// This is expected if the app is not running
					console.log(`[Main] ${executableName} not running or already closed`);
				} else {
					console.log(`[Main] Force terminated ${executableName}`);
				}
			}
		);
	});
};

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

			// Restart the computer after logout using PowerShell
			try {
				const { exec } = require("child_process");
				// Use PowerShell command to restart the computer
				exec(
					'powershell.exe -Command "Restart-Computer -Force"',
					(error, stdout, stderr) => {
						if (error) {
							// Try alternative PowerShell command
							exec(
								'shutdown.exe /r /t 5 /c "Logging out and restarting computer"',
								(fallbackError) => {
									if (fallbackError) {
										event.sender.send("notification", {
											type: "error",
											message:
												"Failed to restart computer. Please restart manually.",
										});
									}
								}
							);
						}
					}
				);
			} catch (restartError) {
				event.sender.send("notification", {
					type: "error",
					message: "Failed to restart computer. Please restart manually.",
				});
			}
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

			// If session started successfully, send kiosk to back
			if (result.success) {
				sendKioskToBack();
			}

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
			console.log(`[Main] End session request received:`, data);

			// Step 1: Clean up tracked applications for this user
			console.log(
				`[Main] Cleaning up tracked user applications for user ${data.userId}`
			);
			closeUserApplications(data.userId);

			// Step 2: Force close all common applications (brute force cleanup)
			console.log(`[Main] Performing brute force application cleanup`);
			setTimeout(() => {
				forceCloseAllApplications();
			}, 1000); // Wait 1 second to let tracked apps close first

			// Step 3: End the session in database
			console.log(`[Main] Calling sessionManager.endSession`);
			const result = await sessionManager.endSession(
				data.sessionId,
				data.userId
			);

			console.log(`[Main] End session result:`, result);

			// Always send success response and trigger logout, regardless of database issues
			// The session manager now handles database failures gracefully
			event.sender.send("sessionEndResponse", {
				success: true,
				message: result.message || "Session ended successfully",
				userData: result.userData,
			});

			// Also send a logout signal to ensure the user gets logged out
			console.log(`[Main] Sending logout signal after session end`);
			setTimeout(() => {
				if (mainWindow && mainWindow.webContents) {
					mainWindow.webContents.send("forceLogout");
				}
			}, 2000); // Wait 2 seconds to ensure app cleanup completes
		} catch (err) {
			console.error(`[Main] Error in endSession handler:`, err);

			// Even if there's an error, clean up and logout
			console.log(`[Main] Emergency cleanup and logout due to error`);
			closeUserApplications(data.userId);

			// Force close all apps as emergency measure
			setTimeout(() => {
				forceCloseAllApplications();
			}, 500);

			event.sender.send("sessionEndResponse", {
				success: true, // Return success to allow logout
				message: `Session cleanup completed: ${err.message}`,
			});

			// Force logout in case of errors
			setTimeout(() => {
				if (mainWindow && mainWindow.webContents) {
					mainWindow.webContents.send("forceLogout");
				}
			}, 2000);
		}
	});

	// Handle logout and close other apps request
	ipcMain.on("logoutAndCloseOtherApps", async (event, data) => {
		try {
			console.log(`[Main] Logout and close apps request received:`, data);

			// Clean up any applications launched by this user first
			if (data && data.userId) {
				console.log(`[Main] Cleaning up applications for user ${data.userId}`);
				closeUserApplications(data.userId);
			}

			// Force close all common applications
			console.log(`[Main] Force closing all applications for logout`);
			forceCloseAllApplications();

			// Clear any stored session data in the main process
			if (mainWindow && mainWindow.webContents) {
				// Clear any app state and return to login screen
				setTimeout(() => {
					mainWindow.webContents.send("forceLogout");
				}, 1500); // Wait for app cleanup to complete
			}

			event.sender.send("logoutAndCloseOtherAppsResponse", {
				success: true,
				message: "Logged out successfully",
			});
		} catch (error) {
			console.error("Error in logoutAndCloseOtherApps:", error);

			// Even on error, try to clean up
			if (data && data.userId) {
				closeUserApplications(data.userId);
			}
			forceCloseAllApplications();

			event.sender.send("logoutAndCloseOtherAppsResponse", {
				success: false,
				message: "Failed to logout and close other apps",
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

	// Handle session expired notification
	ipcMain.on("sessionExpired", async (event) => {
		// When session expires, bring kiosk window to front
		console.log(`[Main] Session expired - bringing kiosk to front`);

		// Bring the kiosk window to the front
		bringKioskToFront();

		// Notify renderer about session expiration
		if (mainWindow && mainWindow.webContents) {
			mainWindow.webContents.send("sessionExpiredUI");
		}
	});

	// Handle session extended notification
	ipcMain.on("sessionExtended", (event) => {
		// Keep the kiosk in the background since session is still active
		console.log(`[Main] Session extended - keeping kiosk in background`);

		// Ensure the window stays in the background
		if (mainWindow) {
			sendKioskToBack();
		}
	});

	// Handle restart computer request
	ipcMain.on("restartComputer", async (event) => {
		// This should be properly secured in production
		// Only allow this if the user has appropriate permissions

		// For Windows using PowerShell
		try {
			const { exec } = require("child_process");
			// Primary method: Use PowerShell Restart-Computer command
			exec(
				'powershell.exe -Command "Restart-Computer -Force"',
				(error, stdout, stderr) => {
					if (error) {
						// Fallback method: Use Windows shutdown command
						exec(
							'shutdown.exe /r /t 10 /c "System restart scheduled by Gaming Cafe Management System"',
							(fallbackError, fallbackStdout, fallbackStderr) => {
								if (fallbackError) {
									event.sender.send("notification", {
										type: "error",
										message: "Failed to restart computer. Access denied.",
									});
									return;
								}

								event.sender.send("notification", {
									type: "success",
									message: "Computer will restart in 10 seconds.",
								});
							}
						);
					} else {
						event.sender.send("notification", {
							type: "success",
							message: "Computer restart initiated.",
						});
					}
				}
			);
		} catch (error) {
			event.sender.send("notification", {
				type: "error",
				message: "Failed to restart computer.",
			});
		}
	});

	// Handle application launch request
	ipcMain.on("launchApplication", async (event, data) => {
		try {
			console.log(`[Main] Launch application request received:`, data);

			// Verify user has an active session
			const sessionResult = await sessionManager.getActiveSession(data.userId);

			if (!sessionResult.success) {
				console.log(`[Main] User ${data.userId} has no active session`);
				event.sender.send("applicationLaunched", {
					success: false,
					message: "You must have an active session to launch applications",
				});
				return;
			}

			console.log(
				`[Main] User has active session, launching application: ${data.appPath}`
			);

			// Launch the application
			await launchApplication(data.appPath, data.userId);

			console.log(`[Main] Application launched successfully`);

			// Send success response
			event.sender.send("applicationLaunched", {
				success: true,
				message: "Application launched successfully",
			});
		} catch (err) {
			console.error(`[Main] Failed to launch application:`, err);
			event.sender.send("applicationLaunched", {
				success: false,
				message: `Failed to launch application: ${err.message}`,
			});
		}
	});

	// Handle session end cleanup
	ipcMain.on("cleanupUserProcesses", (event, userId) => {
		closeUserApplications(userId);
		event.sender.send("processesCleanedUp", { success: true });
	});

	// Handle manual kiosk background switching
	ipcMain.on("sendKioskToBackground", (event) => {
		try {
			console.log(`[Main] Manual kiosk background request received`);
			sendKioskToBack();
			console.log(`[Main] Kiosk sent to background successfully`);
			event.sender.send("kioskSentToBackground", {
				success: true,
				message: "Kiosk sent to background",
			});
		} catch (error) {
			console.error(`[Main] Failed to send kiosk to background:`, error);
			event.sender.send("kioskSentToBackground", {
				success: false,
				message: `Failed to send kiosk to background: ${error.message}`,
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
			devTools: isDevelopment, // Enable DevTools only in development mode
			webSecurity: true, // Enable web security features
			allowRunningInsecureContent: false, // Prevents loading HTTP resources on HTTPS pages
			sandbox: false, // Disable sandbox temporarily to allow the preload script to access Node modules
			enableRemoteModule: false, // Disable remote module for security
		},
		// Kiosk mode configuration
		kiosk: isKioskMode,
		fullscreen: isKioskMode,
		autoHideMenuBar: !isDevelopment, // Show menu bar in development mode
		frame: !isKioskMode, // Show frame only in development mode
		resizable: !isKioskMode, // Allow resize only in development mode
		skipTaskbar: false, // Don't hide from taskbar - we want it visible but unfocused
	});

	// Load the index.html of the app
	mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

	// Disable menu in production/kiosk mode
	if (isKioskMode) {
		Menu.setApplicationMenu(null);
	}

	// Disable context menu in production mode
	if (isKioskMode) {
		mainWindow.webContents.on("context-menu", (e, params) => {
			e.preventDefault();
			// Block context menu
		});
	}

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
