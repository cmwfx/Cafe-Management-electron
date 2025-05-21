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

// Force development mode for debugging
isDevelopment = true;
isKioskMode = false;

// Set up IPC handlers for communication with renderer process
const setupIpcHandlers = () => {
	// Handle login requests
	ipcMain.on("login", async (event, credentials) => {
		console.log("Login request received:", credentials.username);

		try {
			// Authenticate with Supabase
			const { data, error } = await supabase.auth.signInWithPassword({
				email: credentials.username,
				password: credentials.password,
			});

			if (error) {
				console.error("Login error:", error.message);
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
				console.error("Profile fetch error:", profileError.message);
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
			console.error("Unexpected error during login:", err);
			event.sender.send("loginResponse", {
				success: false,
				message: "An unexpected error occurred",
			});
		}
	});

	// Handle user registration
	ipcMain.on("register", async (event, userData) => {
		console.log("========== REGISTRATION REQUEST ==========");
		console.log("Registration request received for:", userData.username);
		console.log("Display name:", userData.display_name);
		console.log(
			"Password length:",
			userData.password ? userData.password.length : "password missing"
		);
		console.log("Supabase URL:", process.env.VITE_SUPABASE_URL || "Missing");
		console.log(
			"Supabase Key:",
			process.env.VITE_SUPABASE_ANON_KEY
				? "Configured (length: " +
						process.env.VITE_SUPABASE_ANON_KEY.length +
						")"
				: "Missing"
		);
		console.log("isDevelopment:", isDevelopment);

		// Make sure Supabase client is properly configured
		if (!supabase) {
			console.error("Supabase client is not initialized!");
			event.sender.send("registerResponse", {
				success: false,
				message: "Registration failed: Database connection is not available",
			});
			return;
		}

		if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
			console.error("Supabase configuration is missing!");
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
				console.error("Supabase connection test failed during registration!");
				event.sender.send("registerResponse", {
					success: false,
					message:
						"Unable to connect to the database. Please check your internet connection.",
				});
				return;
			}
			console.log("Connection test passed, proceeding with registration...");
		} catch (connErr) {
			console.error("Error testing connection:", connErr);
			// Continue anyway to get more specific errors
		}

		try {
			// Try an alternative approach to work around Supabase issues
			console.log("Using alternative registration approach...");

			// First check if user exists
			const { data: existingUser, error: userCheckError } =
				await supabase.auth.signInWithPassword({
					email: userData.username,
					password: userData.password,
				});

			if (!userCheckError && existingUser && existingUser.user) {
				console.log("User already exists, can use this account");

				// Check if they have a profile
				const { data: existingProfile, error: profileCheckError } =
					await supabase
						.from("profiles")
						.select("*")
						.eq("id", existingUser.user.id)
						.single();

				if (profileCheckError || !existingProfile) {
					// Create profile for existing user
					console.log("Creating profile for existing user...");
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

					if (profileCreateError) {
						console.error(
							"Error creating profile for existing user:",
							profileCreateError
						);
					} else {
						console.log("Profile created for existing user");
					}
				} else {
					console.log("User already has a profile");
				}

				// Return success for existing user
				event.sender.send("registerResponse", {
					success: true,
					message: "Account exists - you can now login with your credentials.",
				});
				return;
			}

			// Traditional approach for new user
			console.log("Checking if username is already taken...");
			const { data: existingProfiles, error: profileCheckError } =
				await supabase
					.from("profiles")
					.select("username")
					.eq("username", userData.display_name)
					.limit(1);

			if (profileCheckError) {
				console.error(
					"Error checking username availability:",
					profileCheckError.message
				);
				// Continue with registration despite this error
			} else if (existingProfiles && existingProfiles.length > 0) {
				// Username is already taken
				console.log("Username already exists:", userData.display_name);
				event.sender.send("registerResponse", {
					success: false,
					message:
						"This username is already taken. Please choose a different one.",
				});
				return;
			}

			console.log("Username is available, proceeding with registration...");
			console.log("Attempting to create user with Supabase Auth...");

			// Try to create user with direct signUp
			console.log("Calling supabase.auth.signUp...");
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

			console.log("Auth sign-up response received");

			if (error) {
				console.error("Registration error:", error.message, error.code);
				console.error("Full error object:", JSON.stringify(error));

				// Try an alternative approach if we received the "Database error saving new user"
				if (error.message === "Database error saving new user") {
					console.log("Trying alternate admin signup approach...");

					// Try another approach: create a user directly with the REST API
					try {
						const adminKeyMessage =
							"If you're seeing this error, it may be due to a Supabase limitation. " +
							"Please contact support to enable proper user registration or use the admin interface to create users.";

						event.sender.send("registerResponse", {
							success: false,
							message:
								"Registration through this app is currently unavailable. " +
								adminKeyMessage,
						});
						return;
					} catch (adminErr) {
						console.error("Admin signup also failed:", adminErr);
					}
				}

				let errorMessage = "Registration error: " + error.message;

				// Provide more user-friendly messages
				if (error.message.includes("already registered")) {
					errorMessage =
						"This email is already registered. Please try logging in or use a different email.";
				} else if (
					error.message.includes("password") &&
					error.message.includes("strong")
				) {
					errorMessage =
						"Password is too weak. Please use at least 8 characters with numbers and special characters.";
				} else if (error.message.includes("rate limit")) {
					errorMessage =
						"Too many registration attempts. Please try again later.";
				} else if (error.message.includes("network")) {
					errorMessage =
						"Network error. Please check your internet connection and try again.";
				}

				event.sender.send("registerResponse", {
					success: false,
					message: errorMessage,
				});
				return;
			}

			if (!data || !data.user) {
				console.error("No user data returned from signUp");
				console.log("Full response:", JSON.stringify(data));
				event.sender.send("registerResponse", {
					success: false,
					message: "Failed to create user account - no user data returned",
				});
				return;
			}

			console.log("User created successfully:", data.user.id);
			console.log("User email:", data.user.email);
			console.log(
				"Auth confirmation status:",
				data.user.confirmation_sent_at ? "Email sent" : "No confirmation needed"
			);

			// Since trigger may be failing, manually create profile
			try {
				const initialCredits = 100; // Initial credits for new users
				console.log("Creating profile for user:", data.user.id);

				// First try to check if profile already exists
				const { data: existingProfile } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", data.user.id)
					.single();

				if (existingProfile) {
					console.log("Profile already exists, skipping creation");
				} else {
					// Profile doesn't exist, create it
					const { data: profileData, error: profileError } = await supabase
						.from("profiles")
						.insert({
							id: data.user.id,
							username: userData.display_name,
							credits: initialCredits,
							first_name: "", // Can be updated later by user
							last_name: "", // Can be updated later by user
							is_admin: false, // Regular user by default
						});

					if (profileError) {
						console.error("Profile creation error:", profileError.message);
						console.error("Full profile error:", JSON.stringify(profileError));
						// We continue anyway because the account was created successfully
						console.warn("Continuing despite profile error...");
					} else {
						console.log("Profile created successfully:", profileData);

						// Record the initial credit transaction
						console.log("Adding welcome credits transaction...");
						const { error: transactionError } = await supabase
							.from("credit_transactions")
							.insert({
								user_id: data.user.id,
								amount: initialCredits,
								transaction_type: "signup_bonus",
								description: "Welcome bonus credits",
							});

						if (transactionError) {
							console.error(
								"Error recording welcome credits:",
								transactionError.message
							);
							console.error(
								"Full transaction error:",
								JSON.stringify(transactionError)
							);
						} else {
							console.log("Welcome credits added successfully");
						}
					}
				}
			} catch (profileErr) {
				console.error("Error in profile creation:", profileErr);
				console.error("Stack trace:", profileErr.stack);
			}

			console.log("Registration process completed successfully");

			// Return success regardless of profile update status
			// The user has been created, so they should be able to login
			event.sender.send("registerResponse", {
				success: true,
				message:
					"Registration successful! You can now login with your credentials.",
				needsEmailVerification: data.user.confirmation_sent_at ? true : false,
			});
		} catch (err) {
			console.error("Unexpected error during registration:", err);
			console.error("Error stack:", err.stack);
			event.sender.send("registerResponse", {
				success: false,
				message: "An unexpected error occurred: " + err.message,
			});
		}
		console.log("============ END REGISTRATION ============");
	});

	// Handle logout requests
	ipcMain.on("logout", async (event) => {
		try {
			const result = await authManager.logout();

			event.sender.send("logoutResponse", {
				success: result.success,
				message: result.message || "Logged out successfully",
			});
		} catch (error) {
			console.error("Error during logout:", error);
			event.sender.send("logoutResponse", {
				success: false,
				message: "An error occurred during logout",
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

	// Handle getTransactionHistory request
	ipcMain.on("getTransactionHistory", async (event, data) => {
		console.log("Transaction history request received for user:", data.userId);

		try {
			// Get transaction history from session manager
			const response = await sessionManager.getTransactionHistory(data.userId);

			event.sender.send("transactionHistoryResponse", response);
		} catch (err) {
			console.error("Unexpected error getting transaction history:", err);
			event.sender.send("transactionHistoryResponse", {
				success: false,
				message: "An unexpected error occurred",
			});
		}
	});

	// Handle startSession request
	ipcMain.on("startSession", async (event, data) => {
		console.log("Start session request received:", data);
		console.log("Data types:", {
			userId: typeof data.userId,
			duration: typeof data.duration,
			credits: typeof data.credits,
		});
		console.log("Values:", {
			userId: data.userId,
			duration: data.duration,
			credits: data.credits,
		});

		try {
			// Start session using session manager
			const response = await sessionManager.startSession(
				data.userId,
				data.duration,
				data.credits
			);

			event.sender.send("sessionStartResponse", response);
		} catch (err) {
			console.error("Unexpected error starting session:", err);
			console.error("Error details:", {
				name: err.name,
				message: err.message,
				stack: err.stack,
			});
			event.sender.send("sessionStartResponse", {
				success: false,
				message: "An unexpected error occurred",
			});
		}
	});

	// Handle extendSession request
	ipcMain.on("extendSession", async (event, data) => {
		console.log("Extend session request received:", data);

		try {
			// Extend session using session manager
			const response = await sessionManager.extendSession(
				data.sessionId,
				data.userId,
				data.duration,
				data.credits
			);

			event.sender.send("sessionExtendResponse", response);
		} catch (err) {
			console.error("Unexpected error extending session:", err);
			event.sender.send("sessionExtendResponse", {
				success: false,
				message: "An unexpected error occurred",
			});
		}
	});

	// Handle endSession request
	ipcMain.on("endSession", async (event, data) => {
		console.log("End session request received:", data);

		try {
			// End session using session manager
			const response = await sessionManager.endSession(
				data.sessionId,
				data.userId
			);

			event.sender.send("sessionEndResponse", response);
		} catch (err) {
			console.error("Unexpected error ending session:", err);
			event.sender.send("sessionEndResponse", {
				success: false,
				message: "An unexpected error occurred",
			});
		}
	});

	// Handle getActiveSession request
	ipcMain.on("getActiveSession", async (event, data) => {
		console.log("Get active session request received for user:", data.userId);

		try {
			// Get active session using session manager
			const response = await sessionManager.getActiveSession(data.userId);

			event.sender.send("sessionResponse", response);
		} catch (err) {
			console.error("Unexpected error getting active session:", err);
			event.sender.send("sessionResponse", {
				success: false,
				message: "An unexpected error occurred",
			});
		}
	});

	// Handle minimizeApp request
	ipcMain.on("minimizeApp", (event) => {
		console.log("Minimize app request received");

		if (mainWindow) {
			mainWindow.minimize();
		}
	});

	// Handle sessionExpired event
	ipcMain.on("sessionExpired", async (event) => {
		console.log("Session expired event received");

		// If we have a current user, update their active session
		const currentUser = authManager.getCurrentUser();
		if (currentUser) {
			const { success, sessionData } = await sessionManager.getActiveSession(
				currentUser.id
			);

			if (success && sessionData) {
				// End the session
				await sessionManager.endSession(sessionData.id, currentUser.id);
			}
		}

		// Show notification
		sendNotification("Your session has expired!");
	});

	// Send notification to renderer process (example of main->renderer communication)
	const sendNotification = (message) => {
		if (mainWindow && mainWindow.webContents) {
			mainWindow.webContents.send("notification", message);
		}
	};

	// Example: Send a notification after 5 seconds
	setTimeout(() => {
		sendNotification("This is a test notification from the main process");
	}, 5000);
};

const disableKeyboardShortcuts = () => {
	// Disable keyboard shortcuts that could exit the application
	const shortcutsToDisable = [
		"Alt+F4", // Close window
		"Ctrl+W", // Close tab/window
		"Ctrl+Shift+W", // Close window
		"CommandOrControl+Q", // Quit
		"F11", // Fullscreen toggle (we handle this differently)
		// 'Super' key alone cannot be registered in Electron, use specific combinations instead
		"Super+L", // Lock Windows
		"Super+D", // Show desktop
		"Super+M", // Minimize all windows
		"Super+Tab", // Task view
		"Alt+Tab", // Switch windows
		"Alt+Esc", // Cycle windows
		"Alt+Space", // Window menu
		"Ctrl+Alt+Delete", // Task manager
	];

	// Register each shortcut
	shortcutsToDisable.forEach((shortcut) => {
		try {
			globalShortcut.register(shortcut, () => {
				console.log(`Keyboard shortcut blocked: ${shortcut}`);
				return false;
			});
		} catch (error) {
			console.log(`Failed to register shortcut: ${shortcut}`, error);
		}
	});

	// Special development shortcut to close the app (Ctrl+O)
	if (isDevelopment) {
		globalShortcut.register("CommandOrControl+O", () => {
			console.log(
				"Development shortcut: CommandOrControl+O used to exit application"
			);
			if (mainWindow) {
				dialog
					.showMessageBox(mainWindow, {
						type: "question",
						buttons: ["Cancel", "Exit"],
						title: "Exit Application",
						message: "Do you want to exit the application?",
						defaultId: 0,
						cancelId: 0,
					})
					.then((result) => {
						if (result.response === 1) {
							app.quit();
						}
					});
			}
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
			devTools: true, // Always enable DevTools for debugging
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

	// Open DevTools in development mode
	if (isDevelopment) {
		mainWindow.webContents.openDevTools();

		// Create a menu for development mode only
		const devMenu = Menu.buildFromTemplate([
			{
				label: "Development",
				submenu: [
					{
						label: "Toggle DevTools",
						accelerator: "F12",
						click: () => {
							mainWindow.webContents.toggleDevTools();
						},
					},
					{
						label: "Toggle Kiosk Mode",
						accelerator: "F11",
						click: () => {
							isKioskMode = !isKioskMode;
							mainWindow.setKiosk(isKioskMode);
							mainWindow.setFullScreen(isKioskMode);
						},
					},
					{
						label: "Reload",
						accelerator: "F5",
						click: () => {
							mainWindow.reload();
						},
					},
					{
						label: "Exit Application",
						accelerator: "CommandOrControl+O",
						click: () => {
							dialog
								.showMessageBox(mainWindow, {
									type: "question",
									buttons: ["Cancel", "Exit"],
									title: "Exit Application",
									message: "Do you want to exit the application?",
									defaultId: 0,
									cancelId: 0,
								})
								.then((result) => {
									if (result.response === 1) {
										app.quit();
									}
								});
						},
					},
				],
			},
		]);
		Menu.setApplicationMenu(devMenu);
	} else {
		// Disable menu in production/kiosk mode
		Menu.setApplicationMenu(null);
	}

	// Disable context menu in production mode
	if (!isDevelopment) {
		mainWindow.webContents.on("context-menu", (e, params) => {
			e.preventDefault();
			// Block context menu
			console.log("Context menu blocked");
		});
	} else {
		// Custom context menu for development mode
		mainWindow.webContents.on("context-menu", (e, params) => {
			e.preventDefault();

			const contextMenu = Menu.buildFromTemplate([
				{
					label: "Inspect Element",
					click: () =>
						mainWindow.webContents.inspectElement(params.x, params.y),
				},
				{ type: "separator" },
				{ label: "Reload", click: () => mainWindow.reload() },
			]);

			contextMenu.popup();
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
			console.log(`Prevented navigation to: ${url}`);
		}
	});

	// Prevent window from creating new windows
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		// Deny all new windows
		console.log(`Prevented opening new window: ${url}`);
		return { action: "deny" };
	});
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
	// Test Supabase connection
	if (isDevelopment) {
		console.log("Testing Supabase connection in development mode...");
		try {
			const connectionSuccess = await testSupabaseConnection();
			if (connectionSuccess) {
				console.log("✅ Supabase connection successful!");
			} else {
				console.error("❌ Supabase connection test failed.");
				dialog.showErrorBox(
					"Database Connection Error",
					"Failed to connect to Supabase. Please check your credentials and internet connection."
				);
			}
		} catch (err) {
			console.error("Error testing Supabase connection:", err);
			dialog.showErrorBox(
				"Database Error",
				`Error connecting to database: ${err.message}`
			);
		}
	}

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

	// Register a global 'ESC' key handler to prevent exiting kiosk mode
	if (isKioskMode) {
		globalShortcut.register("Escape", () => {
			console.log("Escape key press blocked in kiosk mode");
			return false;
		});
	}

	// On macOS it's common to re-create a window in the app when the dock icon is clicked
	app.on("activate", () => {
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
