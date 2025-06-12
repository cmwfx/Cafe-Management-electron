/**
 * Gaming Cafe Kiosk System - Renderer Process
 * New flow: Login -> Dashboard -> Application Launcher (no minimize)
 */

// Application state
let userData = null;
let activeSession = null;
let sessionCountdown = null;
let selectedDuration = 1;
let selectedCredits = 1;
let sessionExpiredTriggered = false; // Global flag to prevent multiple session expiry triggers

// Available applications
const availableApps = [
	{
		name: "Microsoft Edge",
		path: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		icon: "🌐",
		description: "Web Browser",
	},
	// Additional apps can be added here in the future
];

// Email validation function
const isValidEmail = (email) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

// Show an error message
const showError = (elementId, message) => {
	const element = document.getElementById(elementId);
	if (!element) return;

	element.textContent = message;
	element.classList.remove("hidden");
	element.classList.add("error-message");
	element.classList.remove("success-message");
};

// Show a success message
const showSuccess = (elementId, message) => {
	const element = document.getElementById(elementId);
	if (!element) return;

	element.textContent = message;
	element.classList.remove("hidden");
	element.classList.add("success-message");
	element.classList.remove("error-message");
};

// Hide a message
const hideMessage = (elementId) => {
	const element = document.getElementById(elementId);
	if (!element) return;

	element.textContent = "";
	element.classList.add("hidden");
};

// Clear login form fields for security
const clearLoginForm = () => {
	console.log(`[Renderer] Clearing login form for security`);
	const loginUsername = document.getElementById("login-username");
	const loginPassword = document.getElementById("login-password");

	if (loginUsername) {
		loginUsername.value = "";
	}
	if (loginPassword) {
		loginPassword.value = "";
	}
};

// Clear signup form fields
const clearSignupForm = () => {
	console.log(`[Renderer] Clearing signup form`);
	const signupUsername = document.getElementById("signup-username");
	const signupDisplayName = document.getElementById("signup-display-name");
	const signupPassword = document.getElementById("signup-password");
	const signupConfirmPassword = document.getElementById(
		"signup-confirm-password"
	);

	if (signupUsername) signupUsername.value = "";
	if (signupDisplayName) signupDisplayName.value = "";
	if (signupPassword) signupPassword.value = "";
	if (signupConfirmPassword) signupConfirmPassword.value = "";
};

// Update the UI based on the current state
const updateUI = () => {
	const loginView = document.getElementById("login-view");
	const signupView = document.getElementById("signup-view");
	const dashboardView = document.getElementById("dashboard-view");
	const appLauncherView = document.getElementById("app-launcher-view");
	const loadingView = document.getElementById("loading-view");

	// First, hide all views
	if (loginView) loginView.classList.add("hidden");
	if (signupView) signupView.classList.add("hidden");
	if (dashboardView) dashboardView.classList.add("hidden");
	if (appLauncherView) appLauncherView.classList.add("hidden");
	if (loadingView) loadingView.classList.add("hidden");

	// Then show the appropriate view
	if (userData) {
		// User is logged in
		if (activeSession) {
			// User has an active session - show application launcher
			if (appLauncherView) appLauncherView.classList.remove("hidden");
			updateAppLauncherView();
		} else {
			// User is logged in but doesn't have an active session - show dashboard
			if (dashboardView) dashboardView.classList.remove("hidden");
			updateDashboardView();
		}
	} else {
		// User is not logged in, show login by default
		if (loginView) loginView.classList.remove("hidden");
		// SECURITY: Clear login form when returning to login screen
		clearLoginForm();
	}
};

// Update application launcher view
const updateAppLauncherView = () => {
	if (!activeSession) return;

	// Update user info in session view
	const sessionUserName = document.getElementById("session-user-name");
	const sessionCreditDisplay = document.getElementById(
		"session-credit-display"
	);

	if (sessionUserName && userData) {
		sessionUserName.textContent = userData.username || userData.email || "User";
	}

	if (sessionCreditDisplay && userData) {
		sessionCreditDisplay.textContent = `${userData.credits || 0} credits`;
	}

	// Start session countdown
	startSessionCountdown();
};

// Update dashboard view with current user data
const updateDashboardView = () => {
	// Update user display name
	const userDisplayName = document.getElementById("user-display-name");
	if (userDisplayName && userData) {
		userDisplayName.textContent = userData.username || userData.email || "User";
	}

	// Update credit display
	const dashboardCredits = document.getElementById("dashboard-credits");
	if (dashboardCredits && userData) {
		dashboardCredits.textContent = userData.credits || 0;
	}

	// Update pricing in session selection
	updateSessionPricing();
};

// Calculate credit cost based on duration
const calculateCreditCost = (minutes) => {
	// 1 credit per minute, minimum 1 minute
	const minMinutes = 1;
	const validMinutes = Math.max(minMinutes, minutes);
	return validMinutes;
};

// Update session pricing information
const updateSessionPricing = () => {
	// Update custom duration price
	const customDuration = document.getElementById("custom-duration");
	const customPrice = document.getElementById("custom-price");

	if (customDuration && customPrice) {
		const updateCustomPrice = () => {
			const minutes = parseInt(customDuration.value) || 1;
			customPrice.textContent = `${calculateCreditCost(minutes)} credits`;
		};

		// Set initial value
		updateCustomPrice();

		// Update when value changes
		customDuration.removeEventListener("input", updateCustomPrice);
		customDuration.addEventListener("input", updateCustomPrice);
	}

	// Update extension pricing in expired overlay
	const extensionDuration = document.getElementById("extension-duration");
	const extensionPrice = document.getElementById("extension-price");

	if (extensionDuration && extensionPrice) {
		const updateExtensionPrice = () => {
			const minutes = parseInt(extensionDuration.value) || 1;
			extensionPrice.textContent = `${calculateCreditCost(minutes)} credits`;
		};

		updateExtensionPrice();
		extensionDuration.removeEventListener("input", updateExtensionPrice);
		extensionDuration.addEventListener("input", updateExtensionPrice);
	}
};

// Setup dashboard controls
const setupDashboardControls = () => {
	// Set up logout button
	const logoutButton = document.getElementById("logout-button");
	if (logoutButton) {
		logoutButton.addEventListener("click", () => {
			console.log(`[Renderer] Logout button clicked`);
			// Clear user data and send logout request
			const currentUserId = userData?.id;
			userData = null;
			activeSession = null;
			sessionExpiredTriggered = false; // Reset the flag

			// SECURITY: Clear all forms immediately
			clearLoginForm();
			clearSignupForm();

			if (window.api && currentUserId) {
				window.api.send("logoutAndCloseOtherApps", { userId: currentUserId });
			}

			updateUI();
		});
	}

	// Set up session option selection
	const sessionOptions = document.querySelectorAll(".session-option");
	sessionOptions.forEach((option) => {
		option.addEventListener("click", () => {
			// Remove selected class from all options
			sessionOptions.forEach((opt) => opt.classList.remove("selected"));

			// Add selected class to clicked option
			option.classList.add("selected");

			// Update selected values
			selectedDuration = parseInt(option.dataset.duration);
			selectedCredits = parseInt(option.dataset.credits);

			updateSessionButton();
		});
	});

	// Set up custom duration input
	const customDuration = document.getElementById("custom-duration");
	if (customDuration) {
		customDuration.addEventListener("input", () => {
			// Clear selected options
			sessionOptions.forEach((opt) => opt.classList.remove("selected"));

			// Update selected values
			selectedDuration = parseInt(customDuration.value) || 1;
			selectedCredits = calculateCreditCost(selectedDuration);

			updateSessionButton();
		});
	}

	// Set up start session button
	const startSessionButton = document.getElementById("start-session-button");
	if (startSessionButton) {
		startSessionButton.addEventListener("click", () => {
			if (!userData) return;

			// Validate credits
			if (userData.credits < selectedCredits) {
				showError(
					"dashboard-message",
					"You don't have enough credits for this session."
				);
				return;
			}

			// Send session start request
			if (window.api) {
				window.api.send("startSession", {
					userId: userData.id,
					duration: selectedDuration,
					credits: selectedCredits,
				});
			}
		});
	}

	const updateSessionButton = () => {
		const startButton = document.getElementById("start-session-button");
		if (!startButton || !userData) return;

		const hasEnoughCredits = userData.credits >= selectedCredits;
		startButton.disabled = !hasEnoughCredits;

		if (hasEnoughCredits) {
			startButton.textContent = `Start Session (${selectedCredits} credits)`;
		} else {
			startButton.textContent = "Not enough credits";
		}
	};

	// Initial button state update
	updateSessionButton();
};

// Setup application launcher controls
const setupAppLauncherControls = () => {
	// Set up application cards
	const appCards = document.querySelectorAll(".app-card");
	appCards.forEach((card) => {
		card.addEventListener("click", () => {
			const appPath = card.dataset.appPath;
			console.log(`[Renderer] Application card clicked: ${appPath}`);
			if (appPath && userData && window.api) {
				console.log(`[Renderer] Launching application for user ${userData.id}`);
				window.api.send("launchApplication", {
					appPath: appPath,
					userId: userData.id,
				});
			} else {
				console.log(`[Renderer] Cannot launch application - missing data:`, {
					hasAppPath: !!appPath,
					hasUserData: !!userData,
					hasApi: !!window.api,
				});
			}
		});
	});

	// Set up session extend button
	const extendButton = document.getElementById("session-extend-button");
	if (extendButton) {
		extendButton.addEventListener("click", () => {
			showSessionExtensionModal();
		});
	}

	// Set up session end button
	const endButton = document.getElementById("session-end-button");
	if (endButton) {
		endButton.addEventListener("click", () => {
			console.log(`[Renderer] End session button clicked`);
			if (activeSession && userData && window.api) {
				console.log(
					`[Renderer] Ending session ${activeSession.id} for user ${userData.id}`
				);
				// Clean up processes and end session
				window.api.send("cleanupUserProcesses", userData.id);
				window.api.send("endSession", {
					sessionId: activeSession.id,
					userId: userData.id,
				});
			} else {
				console.log(`[Renderer] Cannot end session - missing data:`, {
					hasActiveSession: !!activeSession,
					hasUserData: !!userData,
					hasApi: !!window.api,
				});
			}
		});
	}

	// Set up hide kiosk button
	const hideKioskButton = document.getElementById("hide-kiosk-button");
	if (hideKioskButton) {
		hideKioskButton.addEventListener("click", () => {
			console.log(`[Renderer] Hide kiosk button clicked`);
			if (window.api) {
				window.api.send("sendKioskToBackground");
			}
		});
	}
};

// Show session extension modal (reuse expired overlay)
const showSessionExtensionModal = () => {
	const overlay = document.getElementById("session-expired-overlay");
	const title = overlay.querySelector(".expired-title");
	const description = overlay.querySelector("p");

	if (title) title.textContent = "⏱️ Extend Session";
	if (description)
		description.textContent = "Add more time to your current session.";

	overlay.classList.remove("hidden");

	// Set up extend button handlers for manual extension
	const extendExpiredButton = document.getElementById("extend-session-expired");
	const logoutExpiredButton = document.getElementById("logout-expired");

	if (extendExpiredButton) {
		extendExpiredButton.onclick = () => {
			const extensionDuration = document.getElementById("extension-duration");
			const duration = parseInt(extensionDuration.value) || 1;
			const credits = calculateCreditCost(duration);

			if (!userData || userData.credits < credits) {
				showError("expired-message", "Not enough credits for this extension.");
				return;
			}

			if (activeSession && window.api) {
				window.api.send("extendSession", {
					sessionId: activeSession.id,
					userId: userData.id,
					duration: duration,
					credits: credits,
				});
			}
		};
	}

	if (logoutExpiredButton) {
		logoutExpiredButton.onclick = () => {
			console.log(`[Renderer] Logout from manual session extension overlay`);
			// Just hide the overlay, don't logout since this is manual extension
			overlay.classList.add("hidden");
		};
	}
};

// Start session countdown timer
const startSessionCountdown = () => {
	if (sessionCountdown) {
		clearInterval(sessionCountdown);
	}

	// Reset the session expired flag when starting new countdown
	sessionExpiredTriggered = false;

	const updateTimeDisplay = () => {
		if (!activeSession) return;

		const now = new Date();
		const endTime = new Date(activeSession.end_time);
		const timeLeft = Math.max(0, endTime - now);

		const hours = Math.floor(timeLeft / (1000 * 60 * 60));
		const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

		const timeString = `${hours.toString().padStart(2, "0")}:${minutes
			.toString()
			.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

		const timeDisplay = document.getElementById("session-time-remaining");
		if (timeDisplay) {
			timeDisplay.textContent = timeString;

			if (timeLeft <= 300000) {
				// 5 minutes warning
				timeDisplay.classList.add("time-expired");
			} else {
				timeDisplay.classList.remove("time-expired");
			}
		}

		if (timeLeft <= 0 && !sessionExpiredTriggered) {
			// Set flag to prevent multiple triggers
			sessionExpiredTriggered = true;

			// Clear the interval immediately
			clearInterval(sessionCountdown);
			sessionCountdown = null;

			// Trigger session expiration in main process (minimize all windows)
			if (window.api) {
				console.log(
					`[Renderer] Session timer hit zero - triggering sessionExpired`
				);
				window.api.send("sessionExpired");
			}

			showSessionExpiredOverlay();
		}
	};

	updateTimeDisplay();
	sessionCountdown = setInterval(updateTimeDisplay, 1000);
};

// Show session expired overlay
const showSessionExpiredOverlay = () => {
	const overlay = document.getElementById("session-expired-overlay");
	const title = overlay.querySelector(".expired-title");
	const description = overlay.querySelector("p");

	if (title) title.textContent = "⏰ Session Expired";
	if (description)
		description.textContent =
			"Your session has ended. You can extend your session or logout to return to the login screen.";

	overlay.classList.remove("hidden");

	// Set up extend button in overlay
	const extendExpiredButton = document.getElementById("extend-session-expired");
	const logoutExpiredButton = document.getElementById("logout-expired");

	if (extendExpiredButton) {
		extendExpiredButton.onclick = () => {
			const extensionDuration = document.getElementById("extension-duration");
			const duration = parseInt(extensionDuration.value) || 1;
			const credits = calculateCreditCost(duration);

			if (!userData || userData.credits < credits) {
				showError("expired-message", "Not enough credits for this extension.");
				return;
			}

			if (activeSession && window.api) {
				window.api.send("extendSession", {
					sessionId: activeSession.id,
					userId: userData.id,
					duration: duration,
					credits: credits,
				});
			}
		};
	}

	if (logoutExpiredButton) {
		logoutExpiredButton.onclick = () => {
			console.log(`[Renderer] Logout from expired session overlay`);
			// Clean up and logout
			const currentUserId = userData?.id;
			if (userData && window.api) {
				window.api.send("cleanupUserProcesses", userData.id);
				window.api.send("logoutAndCloseOtherApps", { userId: userData.id });
			}

			userData = null;
			activeSession = null;
			sessionExpiredTriggered = false; // Reset the flag

			// SECURITY: Clear all forms when logging out from expired session
			clearLoginForm();
			clearSignupForm();

			overlay.classList.add("hidden");
			updateUI();
		};
	}
};

// Setup view switching between login and signup
const setupViewSwitching = () => {
	const showSignupLink = document.getElementById("show-signup");
	const showLoginLink = document.getElementById("show-login");

	if (showSignupLink) {
		showSignupLink.addEventListener("click", (e) => {
			e.preventDefault();
			console.log(`[Renderer] Switching to signup view`);

			// SECURITY: Clear login form when switching to signup
			clearLoginForm();
			hideMessage("login-message");

			document.getElementById("login-view").classList.add("hidden");
			document.getElementById("signup-view").classList.remove("hidden");
		});
	}

	if (showLoginLink) {
		showLoginLink.addEventListener("click", (e) => {
			e.preventDefault();
			console.log(`[Renderer] Switching to login view`);

			// SECURITY: Clear signup form when switching to login
			clearSignupForm();
			hideMessage("signup-message");

			document.getElementById("signup-view").classList.add("hidden");
			document.getElementById("login-view").classList.remove("hidden");
		});
	}
};

// Setup login form
const setupLoginForm = () => {
	const loginForm = document.getElementById("login-form");
	const loginButton = document.getElementById("login-button");

	if (loginForm) {
		loginForm.addEventListener("submit", (e) => {
			e.preventDefault();

			const username = document.getElementById("login-username").value.trim();
			const password = document.getElementById("login-password").value;

			if (!username || !password) {
				showError("login-message", "Please fill in all fields.");
				return;
			}

			if (!isValidEmail(username)) {
				showError("login-message", "Please enter a valid email address.");
				return;
			}

			hideMessage("login-message");

			if (loginButton) {
				loginButton.textContent = "Logging in...";
				loginButton.disabled = true;
			}

			if (window.api) {
				window.api.send("login", { username, password });
			}
		});
	}
};

// Setup signup form
const setupSignupForm = () => {
	const signupForm = document.getElementById("signup-form");
	const signupButton = document.getElementById("signup-button");

	if (signupForm) {
		signupForm.addEventListener("submit", (e) => {
			e.preventDefault();

			const username = document.getElementById("signup-username").value.trim();
			const displayName = document
				.getElementById("signup-display-name")
				.value.trim();
			const password = document.getElementById("signup-password").value;
			const confirmPassword = document.getElementById(
				"signup-confirm-password"
			).value;

			if (!username || !displayName || !password || !confirmPassword) {
				showError("signup-message", "Please fill in all fields.");
				return;
			}

			if (!isValidEmail(username)) {
				showError("signup-message", "Please enter a valid email address.");
				return;
			}

			if (password !== confirmPassword) {
				showError("signup-message", "Passwords do not match.");
				return;
			}

			if (password.length < 6) {
				showError(
					"signup-message",
					"Password must be at least 6 characters long."
				);
				return;
			}

			hideMessage("signup-message");

			if (signupButton) {
				signupButton.textContent = "Creating account...";
				signupButton.disabled = true;
			}

			if (window.api) {
				window.api.send("register", {
					username,
					display_name: displayName,
					password,
				});
			}
		});
	}
};

// Setup message listeners for IPC communication
const setupMessageListeners = () => {
	if (!window.api) return;

	// Login response
	window.api.receive("loginResponse", (response) => {
		const loginButton = document.getElementById("login-button");

		if (loginButton) {
			loginButton.textContent = "Login";
			loginButton.disabled = false;
		}

		if (response.success) {
			console.log(`[Renderer] Login successful`);
			userData = response.userData;
			hideMessage("login-message");

			// SECURITY: Clear login form immediately after successful login
			clearLoginForm();

			// Check for existing session
			checkExistingSession();
		} else {
			console.log(`[Renderer] Login failed: ${response.message}`);
			showError("login-message", response.message || "Login failed");
			// Clear password field on failed login for security
			const loginPassword = document.getElementById("login-password");
			if (loginPassword) {
				loginPassword.value = "";
			}
		}
	});

	// Register response
	window.api.receive("registerResponse", (response) => {
		const signupButton = document.getElementById("signup-button");

		if (signupButton) {
			signupButton.textContent = "Create Account";
			signupButton.disabled = false;
		}

		if (response.success) {
			console.log(`[Renderer] Registration successful`);
			showSuccess(
				"signup-message",
				response.message || "Account created successfully! Please login."
			);

			// SECURITY: Clear signup form after successful registration
			clearSignupForm();

			// Optionally switch to login view
			setTimeout(() => {
				document.getElementById("signup-view").classList.add("hidden");
				document.getElementById("login-view").classList.remove("hidden");
			}, 2000);
		} else {
			console.log(`[Renderer] Registration failed: ${response.message}`);
			showError("signup-message", response.message || "Registration failed");
			// Clear password fields on failed registration for security
			const signupPassword = document.getElementById("signup-password");
			const signupConfirmPassword = document.getElementById(
				"signup-confirm-password"
			);
			if (signupPassword) signupPassword.value = "";
			if (signupConfirmPassword) signupConfirmPassword.value = "";
		}
	});

	// Session start response
	window.api.receive("sessionStartResponse", (response) => {
		if (response.success) {
			activeSession = response.sessionData;
			userData = response.userData; // Update user data with new credit balance
			hideMessage("dashboard-message");
			updateUI();
		} else {
			showError(
				"dashboard-message",
				response.message || "Failed to start session"
			);
		}
	});

	// Session extend response
	window.api.receive("sessionExtendResponse", (response) => {
		if (response.success) {
			activeSession = response.sessionData;
			userData = response.userData; // Update user data with new credit balance
			hideMessage("expired-message");

			// Hide expired overlay immediately and ensure it stays hidden
			const overlay = document.getElementById("session-expired-overlay");
			if (overlay) {
				overlay.classList.add("hidden");
			}

			// Clear any existing countdown before restarting to prevent conflicts
			if (sessionCountdown) {
				clearInterval(sessionCountdown);
				sessionCountdown = null;
			}

			// Reset the time display immediately
			const timeDisplay = document.getElementById("session-time-remaining");
			if (timeDisplay) {
				timeDisplay.classList.remove("time-expired");
			}

			// Wait a moment before restarting countdown to ensure clean state
			setTimeout(() => {
				// Restart countdown with the new session data
				startSessionCountdown();

				// Notify main process that session was extended successfully
				if (window.api) {
					window.api.send("sessionExtended");
				}

				// Update UI to reflect new session state
				updateUI();
			}, 100);

			console.log(
				`[Renderer] Session extended successfully, overlay hidden, countdown restarted`
			);
		} else {
			showError(
				"expired-message",
				response.message || "Failed to extend session"
			);
		}
	});

	// Session end response
	window.api.receive("sessionEndResponse", (response) => {
		console.log(`[Renderer] Session end response received:`, response);

		// Always clear the session and update UI, regardless of response status
		console.log(`[Renderer] Clearing session and updating UI`);
		activeSession = null;
		sessionExpiredTriggered = false; // Reset the flag
		if (sessionCountdown) {
			clearInterval(sessionCountdown);
			sessionCountdown = null;
		}

		// Hide any overlays
		const overlay = document.getElementById("session-expired-overlay");
		if (overlay) {
			overlay.classList.add("hidden");
		}

		// Clear any messages
		hideMessage("app-launcher-message");
		hideMessage("dashboard-message");

		if (response.success) {
			console.log(`[Renderer] Session ended successfully: ${response.message}`);
		} else {
			console.warn(
				`[Renderer] Session end had issues but continuing: ${response.message}`
			);
		}

		// Update UI to show dashboard or login
		updateUI();
	});

	// Application launched response
	window.api.receive("applicationLaunched", (response) => {
		console.log(`[Renderer] Application launch response received:`, response);
		if (response.success) {
			console.log(`[Renderer] Application launched successfully`);
			showSuccess("app-launcher-message", `Application launched successfully!`);
			setTimeout(() => hideMessage("app-launcher-message"), 3000);
		} else {
			console.error(
				`[Renderer] Failed to launch application:`,
				response.message
			);
			showError(
				"app-launcher-message",
				response.message || "Failed to launch application"
			);
		}
	});

	// Session expired UI notification
	window.api.receive("sessionExpiredUI", () => {
		// Only show the overlay if we have an active session and haven't handled expiry yet
		// Also check if the session actually has time left (in case of timing issues)
		if (activeSession) {
			const now = new Date();
			const endTime = new Date(activeSession.end_time);
			const timeLeft = endTime - now;

			if (timeLeft <= 0) {
				console.log(
					`[Renderer] Received sessionExpiredUI - session actually expired, showing overlay`
				);
				showSessionExpiredOverlay();
			} else {
				console.log(
					`[Renderer] Ignoring sessionExpiredUI - session still has time left:`,
					{
						timeLeftMs: timeLeft,
						endTime: activeSession.end_time,
					}
				);
			}
		} else {
			console.log(`[Renderer] Ignoring sessionExpiredUI - no active session`);
		}
	});

	// Force logout
	window.api.receive("forceLogout", () => {
		console.log(`[Renderer] Force logout received`);
		userData = null;
		activeSession = null;
		sessionExpiredTriggered = false; // Reset the flag
		if (sessionCountdown) {
			clearInterval(sessionCountdown);
		}

		// SECURITY: Clear all forms when forced logout
		clearLoginForm();
		clearSignupForm();

		const overlay = document.getElementById("session-expired-overlay");
		if (overlay) {
			overlay.classList.add("hidden");
		}

		// Clear any messages
		hideMessage("login-message");
		hideMessage("signup-message");
		hideMessage("dashboard-message");
		hideMessage("app-launcher-message");
		hideMessage("expired-message");

		updateUI();
	});

	// Profile update
	window.api.receive("profileUpdate", (updatedUserData) => {
		if (userData && updatedUserData.id === userData.id) {
			userData = { ...userData, ...updatedUserData };
			updateUI();
		}
	});

	// Kiosk sent to background response
	window.api.receive("kioskSentToBackground", (response) => {
		console.log(`[Renderer] Kiosk background response received:`, response);
		if (response.success) {
			console.log(`[Renderer] Kiosk sent to background successfully`);
			showSuccess("app-launcher-message", "Kiosk sent to background");
			setTimeout(() => hideMessage("app-launcher-message"), 2000);
		} else {
			console.error(
				`[Renderer] Failed to send kiosk to background:`,
				response.message
			);
			showError(
				"app-launcher-message",
				response.message || "Failed to hide kiosk"
			);
		}
	});
};

// Check for existing session
const checkExistingSession = () => {
	if (!userData || !window.api) return;

	window.api.send("getActiveSession", { userId: userData.id });

	// Listen for session response
	window.api.receive("sessionResponse", (response) => {
		if (response.success && response.sessionData) {
			activeSession = response.sessionData;
		}
		updateUI();
	});
};

// Initialize the application
const initApp = () => {
	setupViewSwitching();
	setupLoginForm();
	setupSignupForm();
	setupDashboardControls();
	setupAppLauncherControls();
	setupMessageListeners();
	updateSessionPricing();

	// Show loading initially
	updateUI();
};

// Start the app when DOM is loaded
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initApp);
} else {
	initApp();
}
