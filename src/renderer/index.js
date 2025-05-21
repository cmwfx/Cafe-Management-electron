/**
 * Cafe Management System - Renderer Process
 * Full authentication state management implementation
 */

// Application state
let userData = null;
let activeSession = null;

// Define the handler for when window loses focus during expired session
function handleSessionExpiredWindowBlur() {
	// After a very brief delay, re-focus and send session expired
	setTimeout(() => {
		if (window.api) {
			window.api.send("sessionExpired");
		}
	}, 100);
}

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

// Update the UI based on the current state
const updateUI = () => {
	const loginView = document.getElementById("login-view");
	const signupView = document.getElementById("signup-view");
	const dashboardView = document.getElementById("dashboard-view");
	const sessionView = document.getElementById("session-view");
	const loadingView = document.getElementById("loading-view");

	// First, hide all views
	if (loginView) loginView.classList.add("hidden");
	if (signupView) signupView.classList.add("hidden");
	if (dashboardView) dashboardView.classList.add("hidden");
	if (sessionView) sessionView.classList.add("hidden");
	if (loadingView) loadingView.classList.add("hidden");

	// Then show the appropriate view
	if (userData) {
		// User is logged in
		if (activeSession) {
			// User has an active session
			if (sessionView) sessionView.classList.remove("hidden");
			updateSessionView();
		} else {
			// User is logged in but doesn't have an active session
			if (dashboardView) dashboardView.classList.remove("hidden");
			updateDashboardView();
		}
	} else {
		// User is not logged in, show login by default
		if (loginView) loginView.classList.remove("hidden");
	}

	// Update user info display if available
	updateUserInfoDisplay();
};

// Update session view with current session data
const updateSessionView = () => {
	if (!activeSession) return;

	// Update user info in session view
	const sessionUserInfo = document.getElementById("session-user-info");
	const sessionCreditDisplay = document.getElementById(
		"session-credit-display"
	);

	if (sessionUserInfo && userData) {
		sessionUserInfo.textContent =
			userData.display_name || userData.email || "User";
	}

	if (sessionCreditDisplay && userData) {
		sessionCreditDisplay.textContent = `${userData.credits || 0} credits`;
	}

	// Update session end time
	const sessionEndTime = document.getElementById("session-end-time");
	if (sessionEndTime && activeSession.end_time) {
		const endTime = new Date(activeSession.end_time);
		sessionEndTime.textContent = endTime.toLocaleTimeString();
	}

	// Start time remaining countdown
	startSessionCountdown();
};

// Update dashboard view with current user data
const updateDashboardView = () => {
	// Update credit display if available
	const creditDisplay = document.getElementById("credit-display");
	if (creditDisplay && userData) {
		creditDisplay.textContent = `${userData.credits || 0} credits`;
	}

	// Update dashboard credits display
	const dashboardCredits = document.getElementById("dashboard-credits");
	if (dashboardCredits && userData) {
		dashboardCredits.textContent = userData.credits || 0;
	}

	// Fetch recent transactions
	fetchTransactionHistory();

	// Update pricing in session selection
	updateSessionPricing();
};

// Fetch and display transaction history
const fetchTransactionHistory = async () => {
	if (!userData || !window.api) return;

	try {
		// Request transaction history from main process
		window.api.send("getTransactionHistory", { userId: userData.id });
	} catch (error) {
		// Error handling
	}
};

// Calculate credit cost based on duration
const calculateCreditCost = (minutes) => {
	// Updated formula: 1 credit per minute
	// Could be replaced with pricing from the server in a future update
	const minMinutes = 15;
	const validMinutes = Math.max(minMinutes, minutes);
	return validMinutes; // 1:1 ratio - 1 credit per minute
};

// Update session pricing information
const updateSessionPricing = () => {
	// Update custom duration price
	const customDuration = document.getElementById("custom-duration");
	const customPrice = document.getElementById("custom-price");

	if (customDuration && customPrice) {
		const updateCustomPrice = () => {
			const minutes = parseInt(customDuration.value) || 15;
			// Directly use minutes value (1:1 ratio)
			customPrice.textContent = `${minutes} credits`;
		};

		// Set initial value
		updateCustomPrice();

		// Update when value changes
		customDuration.removeEventListener("input", updateCustomPrice); // Remove any existing listeners
		customDuration.addEventListener("input", updateCustomPrice);
	}
};

// Setup dashboard controls
const setupDashboardControls = () => {
	// Set up logout button
	const logoutButton = document.getElementById("logout-button");
	if (logoutButton) {
		logoutButton.addEventListener("click", () => {
			// Clear user data
			userData = null;
			activeSession = null;

			// Update UI
			updateUI();

			// Send logout message to main process
			if (window.api) {
				window.api.send("logout");
			}
		});
	}

	// Set up duration option selection
	const durationOptions = document.querySelectorAll(".duration-option");
	const startSessionBtn = document.getElementById("start-session-btn");

	let selectedDuration = null;
	let selectedCredits = null;

	const updateSessionButton = () => {
		if (startSessionBtn) {
			if (
				selectedDuration &&
				selectedCredits &&
				userData &&
				userData.credits >= selectedCredits
			) {
				startSessionBtn.disabled = false;
				hideMessage("session-message");
			} else if (
				userData &&
				selectedCredits &&
				userData.credits < selectedCredits
			) {
				startSessionBtn.disabled = true;
				showError(
					"session-message",
					"You don't have enough credits for this duration"
				);
			} else {
				startSessionBtn.disabled = true;
				hideMessage("session-message");
			}
		}
	};

	// Handle duration option clicks
	durationOptions.forEach((option) => {
		option.addEventListener("click", () => {
			// Remove selected class from all options
			durationOptions.forEach((opt) => opt.classList.remove("selected"));

			// Add selected class to clicked option
			option.classList.add("selected");

			// Store selected duration and credits
			selectedDuration = parseInt(option.getAttribute("data-minutes")) || 0;
			selectedCredits = parseInt(option.getAttribute("data-credits")) || 0;

			// Reset custom duration if any
			const customDuration = document.getElementById("custom-duration");
			if (customDuration) {
				customDuration.value = 15;
			}

			// Update session button state
			updateSessionButton();
		});
	});

	// Handle custom duration
	const customDuration = document.getElementById("custom-duration");
	if (customDuration) {
		customDuration.addEventListener("input", () => {
			// Remove selected class from preset options
			durationOptions.forEach((opt) => opt.classList.remove("selected"));

			// Calculate duration and credits - directly use minutes value
			const minutes = parseInt(customDuration.value) || 15;
			selectedDuration = minutes;
			selectedCredits = minutes; // 1:1 ratio - 1 credit per minute

			// Update custom price display
			const customPrice = document.getElementById("custom-price");
			if (customPrice) {
				customPrice.textContent = `${selectedCredits} credits`;
			}

			// Update session button state
			updateSessionButton();
		});
	}

	// Handle start session button
	if (startSessionBtn) {
		startSessionBtn.addEventListener("click", () => {
			if (!selectedDuration || !selectedCredits || !userData) {
				return;
			}

			// Check if user has enough credits
			if (userData.credits < selectedCredits) {
				showError(
					"session-message",
					"You don't have enough credits for this duration"
				);
				return;
			}

			// Send start session request to main process
			if (window.api) {
				window.api.send("startSession", {
					userId: userData.id,
					duration: selectedDuration,
					credits: selectedCredits,
				});

				// Show loading message
				showSuccess("session-message", "Starting your session...");
				startSessionBtn.disabled = true;
			}
		});
	}

	// Set up session extension
	setupSessionExtension();
};

// Set up session extension functionality
const setupSessionExtension = () => {
	const extensionOptions = document.querySelectorAll(
		"#session-view .duration-option"
	);
	const extendSessionBtn = document.getElementById("extend-session-btn");

	let extensionDuration = null;
	let extensionCredits = null;

	const updateExtensionButton = () => {
		if (extendSessionBtn) {
			if (
				extensionDuration &&
				extensionCredits &&
				userData &&
				userData.credits >= extensionCredits
			) {
				extendSessionBtn.disabled = false;
				hideMessage("extension-message");
			} else if (
				userData &&
				extensionCredits &&
				userData.credits < extensionCredits
			) {
				extendSessionBtn.disabled = true;
				showError(
					"extension-message",
					"You don't have enough credits for this extension"
				);
			} else {
				extendSessionBtn.disabled = true;
				hideMessage("extension-message");
			}
		}
	};

	// Handle extension option clicks
	extensionOptions.forEach((option) => {
		option.addEventListener("click", () => {
			// Remove selected class from all options
			extensionOptions.forEach((opt) => opt.classList.remove("selected"));

			// Add selected class to clicked option
			option.classList.add("selected");

			// Store selected extension duration and credits
			extensionDuration = parseInt(option.getAttribute("data-minutes")) || 0;
			extensionCredits = parseInt(option.getAttribute("data-credits")) || 0;

			// Update extension button state
			updateExtensionButton();
		});
	});

	// Handle extend session button
	if (extendSessionBtn) {
		extendSessionBtn.addEventListener("click", () => {
			if (
				!extensionDuration ||
				!extensionCredits ||
				!userData ||
				!activeSession
			) {
				return;
			}

			// Check if user has enough credits
			if (userData.credits < extensionCredits) {
				showError(
					"extension-message",
					"You don't have enough credits for this extension"
				);
				return;
			}

			// Send extend session request to main process
			if (window.api) {
				window.api.send("extendSession", {
					sessionId: activeSession.id,
					userId: userData.id,
					duration: extensionDuration,
					credits: extensionCredits,
				});

				// Show loading message
				showSuccess("extension-message", "Extending your session...");
				extendSessionBtn.disabled = true;
			}
		});
	}

	// Set up minimize and end session buttons
	const minimizeBtn = document.getElementById("minimize-btn");
	const endSessionBtn = document.getElementById("end-session-btn");

	if (minimizeBtn) {
		minimizeBtn.addEventListener("click", () => {
			if (window.api) {
				window.api.send("minimizeApp");
			}
		});
	}

	if (endSessionBtn) {
		endSessionBtn.addEventListener("click", () => {
			// Ask for confirmation
			const confirmEnd = confirm(
				"Are you sure you want to end your session and restart the computer? All unsaved work will be lost."
			);

			if (confirmEnd && window.api && activeSession) {
				// First end the session
				window.api.send("endSession", {
					sessionId: activeSession.id,
					userId: userData.id,
				});

				// Then restart the computer
				setTimeout(() => {
					window.api.send("restartComputer");
				}, 1000);
			}
		});
	}
};

// Start countdown timer for session
const startSessionCountdown = () => {
	// Clear existing countdown
	if (window.countdownInterval) {
		clearInterval(window.countdownInterval);
	}

	const updateTimeRemaining = () => {
		if (!activeSession || !activeSession.end_time) return;

		const timeRemainingElement = document.getElementById("time-remaining");
		if (!timeRemainingElement) return;

		const now = new Date();
		const endTime = new Date(activeSession.end_time);
		let timeRemaining = endTime - now;

		if (timeRemaining <= 0) {
			// Session has ended
			clearInterval(window.countdownInterval);
			timeRemainingElement.textContent = "00:00:00";

			// Handle session expiration
			if (window.api) {
				// First session expired notification
				window.api.send("sessionExpired");

				// Disable minimize button if it exists
				const minimizeButton = document.getElementById("minimize-button");
				if (minimizeButton) {
					minimizeButton.classList.add("hidden");
					minimizeButton.disabled = true;
				}

				// Show session expired overlay
				showSessionExpiredOverlay();

				// Set up a recurring check to ensure the app stays in foreground
				// This is crucial to prevent users from bypassing the expired session screen
				const intervalId = setInterval(() => {
					// Re-send session expired notification every 2 seconds
					// This will bring the window back to foreground if user managed to switch to another app
					window.api.send("sessionExpired");
				}, 2000);

				// Store the interval ID in a global variable so we can clear it if the session is extended
				window.sessionExpiredForegroundInterval = intervalId;
			}
			return;
		}

		// Format time remaining
		const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
		timeRemaining -= hours * (1000 * 60 * 60);

		const minutes = Math.floor(timeRemaining / (1000 * 60));
		timeRemaining -= minutes * (1000 * 60);

		const seconds = Math.floor(timeRemaining / 1000);

		const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
			.toString()
			.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

		timeRemainingElement.textContent = formattedTime;
	};

	// Initial update
	updateTimeRemaining();

	// Update every second
	window.countdownInterval = setInterval(updateTimeRemaining, 1000);
};

// Show session expired overlay
const showSessionExpiredOverlay = () => {
	// Create overlay if it doesn't exist
	let overlay = document.getElementById("session-expired-overlay");

	if (!overlay) {
		overlay = document.createElement("div");
		overlay.id = "session-expired-overlay";
		overlay.className = "session-expired-overlay";

		// Create content container
		const contentContainer = document.createElement("div");
		contentContainer.className = "expired-content";

		// Add header
		const header = document.createElement("h2");
		header.textContent = "Session Expired";
		contentContainer.appendChild(header);

		// Add message
		const message = document.createElement("p");
		message.textContent =
			"Your session has expired. You can extend your session or logout.";
		contentContainer.appendChild(message);

		// Add extension options similar to dashboard
		const extensionContainer = document.createElement("div");
		extensionContainer.className = "session-extension";

		// Add extension title
		const extensionTitle = document.createElement("h3");
		extensionTitle.textContent = "Extend Your Session";
		extensionContainer.appendChild(extensionTitle);

		// Add extension description
		const extensionDesc = document.createElement("p");
		extensionDesc.textContent = "Add more time to continue your session:";
		extensionContainer.appendChild(extensionDesc);

		// Create duration options
		const durationOptions = document.createElement("div");
		durationOptions.className = "duration-options";

		// Define duration options
		const options = [
			{ minutes: 15, credits: 15, title: "15 Minutes" },
			{ minutes: 30, credits: 30, title: "30 Minutes" },
			{ minutes: 60, credits: 60, title: "1 Hour" },
		];

		// Create each option element
		options.forEach((option) => {
			const optionElement = document.createElement("div");
			optionElement.className = "duration-option";
			optionElement.setAttribute("data-minutes", option.minutes);
			optionElement.setAttribute("data-credits", option.credits);

			const titleDiv = document.createElement("div");
			titleDiv.className = "duration-title";
			titleDiv.textContent = option.title;

			const priceDiv = document.createElement("div");
			priceDiv.className = "duration-price";
			priceDiv.textContent = `${option.credits} Credits`;

			optionElement.appendChild(titleDiv);
			optionElement.appendChild(priceDiv);
			durationOptions.appendChild(optionElement);

			// Add click event
			optionElement.addEventListener("click", () => {
				// Remove selected class from all options
				document
					.querySelectorAll(".session-expired-overlay .duration-option")
					.forEach((opt) => opt.classList.remove("selected"));

				// Add selected class to clicked option
				optionElement.classList.add("selected");

				// Store selected values in custom input fields
				const customMinutesInput = document.getElementById(
					"custom-minutes-input"
				);
				if (customMinutesInput) {
					customMinutesInput.value = option.minutes;
				}

				// Update extend button state
				updateExpiredExtendButton();
			});
		});

		extensionContainer.appendChild(durationOptions);

		// Add custom minutes input
		const customInputContainer = document.createElement("div");
		customInputContainer.className = "custom-input-container";

		const customLabel = document.createElement("label");
		customLabel.textContent = "Custom Minutes:";
		customLabel.htmlFor = "custom-minutes-input";

		const customMinutesInput = document.createElement("input");
		customMinutesInput.type = "number";
		customMinutesInput.id = "custom-minutes-input";
		customMinutesInput.min = "5";
		customMinutesInput.max = "240";
		customMinutesInput.placeholder = "Enter minutes";

		// Add input event to calculate credits and update button state
		customMinutesInput.addEventListener("input", () => {
			// Calculate credits based on minutes using 1:1 ratio (1 credit = 1 minute)
			const minutes = parseInt(customMinutesInput.value) || 0;

			// Remove selected class from all options
			document
				.querySelectorAll(".session-expired-overlay .duration-option")
				.forEach((opt) => opt.classList.remove("selected"));

			// Update extend button state
			updateExpiredExtendButton();
		});

		customInputContainer.appendChild(customLabel);
		customInputContainer.appendChild(customMinutesInput);
		extensionContainer.appendChild(customInputContainer);

		// Add extend button
		const extendButton = document.createElement("button");
		extendButton.id = "expired-extend-btn";
		extendButton.className = "primary-button";
		extendButton.textContent = "Extend Session";
		extendButton.disabled = true;

		// Add extend button event
		extendButton.addEventListener("click", () => {
			// Get minutes from custom input or selected option
			const customMinutesInput = document.getElementById(
				"custom-minutes-input"
			);
			let minutes = parseInt(customMinutesInput.value) || 0;

			// If no custom minutes, get from selected option
			if (minutes === 0) {
				const selectedOption = document.querySelector(
					".session-expired-overlay .duration-option.selected"
				);
				if (selectedOption) {
					minutes = parseInt(selectedOption.getAttribute("data-minutes")) || 0;
				}
			}

			// Calculate credits using 1:1 ratio (1 credit = 1 minute)
			const credits = minutes;

			if (
				minutes > 0 &&
				userData &&
				userData.credits >= credits &&
				activeSession
			) {
				// Disable button during processing
				extendButton.disabled = true;

				// Show loading message
				const extensionMessage = document.getElementById(
					"expired-extension-message"
				);
				if (extensionMessage) {
					showSuccess(extensionMessage.id, "Extending your session...");
				}

				// Send extend session request
				if (window.api) {
					window.api.send("extendSession", {
						sessionId: activeSession.id,
						userId: userData.id,
						duration: minutes,
						credits: credits,
					});
				}
			}
		});

		extensionContainer.appendChild(extendButton);

		// Add message container for errors/success
		const extensionMessage = document.createElement("div");
		extensionMessage.id = "expired-extension-message";
		extensionMessage.className = "error-message hidden";
		extensionContainer.appendChild(extensionMessage);

		contentContainer.appendChild(extensionContainer);

		// Add restart computer button
		const restartButton = document.createElement("button");
		restartButton.textContent = "Logout & Restart Computer";
		restartButton.className = "warning-button";
		restartButton.addEventListener("click", () => {
			// Confirm restart
			const confirmRestart = confirm(
				"Are you sure you want to logout and restart the computer? All unsaved work will be lost."
			);

			if (confirmRestart && window.api) {
				// Send restart command to main process
				window.api.send("restartComputer");
			}
		});
		contentContainer.appendChild(restartButton);

		// Add content to overlay
		overlay.appendChild(contentContainer);

		// Add to body
		document.body.appendChild(overlay);
	} else {
		// Show existing overlay
		overlay.classList.remove("hidden");
	}

	// Helper function to update extend button state
	const updateExpiredExtendButton = () => {
		const extendButton = document.getElementById("expired-extend-btn");
		const customMinutesInput = document.getElementById("custom-minutes-input");
		const extensionMessage = document.getElementById(
			"expired-extension-message"
		);

		if (!extendButton || !userData) return;

		// Get minutes from custom input or selected option
		let minutes = parseInt(customMinutesInput?.value) || 0;

		// If no custom minutes, get from selected option
		if (minutes === 0) {
			const selectedOption = document.querySelector(
				".session-expired-overlay .duration-option.selected"
			);
			if (selectedOption) {
				minutes = parseInt(selectedOption.getAttribute("data-minutes")) || 0;
			}
		}

		// Calculate credits using 1:1 ratio (1 credit = 1 minute)
		const credits = minutes;

		// Update button state
		if (minutes > 0 && userData.credits >= credits) {
			extendButton.disabled = false;
			extendButton.textContent = `Extend Session (${credits} Credits)`;

			if (extensionMessage) {
				hideMessage(extensionMessage.id);
			}
		} else if (minutes > 0 && userData.credits < credits) {
			extendButton.disabled = true;
			extendButton.textContent = "Extend Session";

			if (extensionMessage) {
				showError(
					extensionMessage.id,
					"You don't have enough credits for this extension"
				);
			}
		} else {
			extendButton.disabled = true;
			extendButton.textContent = "Extend Session";

			if (extensionMessage) {
				hideMessage(extensionMessage.id);
			}
		}
	};
};

// Update user info display
const updateUserInfoDisplay = () => {
	const userInfo = document.getElementById("user-info");
	if (userInfo && userData) {
		userInfo.textContent = userData.display_name || userData.email || "User";
	}
};

// Switch between login and signup views
const setupViewSwitching = () => {
	const switchToSignup = document.getElementById("switch-to-signup");
	const switchToLogin = document.getElementById("switch-to-login");
	const loginView = document.getElementById("login-view");
	const signupView = document.getElementById("signup-view");

	if (!switchToSignup || !switchToLogin || !loginView || !signupView) {
		return;
	}

	switchToSignup.addEventListener("click", () => {
		loginView.classList.add("hidden");
		signupView.classList.remove("hidden");
		hideMessage("login-message");
	});

	switchToLogin.addEventListener("click", () => {
		signupView.classList.add("hidden");
		loginView.classList.remove("hidden");
		hideMessage("signup-message");
	});
};

// Set up the login form
const setupLoginForm = () => {
	const loginButton = document.getElementById("login-button");
	const emailInput = document.getElementById("login-email");
	const passwordInput = document.getElementById("login-password");

	if (!loginButton || !emailInput || !passwordInput) {
		return;
	}

	loginButton.addEventListener("click", () => {
		const email = emailInput.value.trim();
		const password = passwordInput.value.trim();

		// Validate inputs
		if (!email || !password) {
			showError("login-message", "Please enter both email and password.");
			return;
		}

		if (!isValidEmail(email)) {
			showError("login-message", "Please enter a valid email address.");
			return;
		}

		// Clear any previous error
		hideMessage("login-message");

		// Check if API is available
		if (!window.api) {
			showError(
				"login-message",
				"Internal error: Communication with the application is not available. Please restart the application."
			);
			return;
		}

		// Show loading state
		showSuccess("login-message", "Logging in...");

		// Disable the login button during authentication
		loginButton.disabled = true;
		loginButton.textContent = "Logging in...";

		try {
			// Send login request to main process
			window.api.send("login", { username: email, password });
		} catch (error) {
			showError(
				"login-message",
				"Failed to send login request. Please try again."
			);
			loginButton.disabled = false;
			loginButton.textContent = "Login";
		}
	});

	// Add keyboard event listener for Enter key
	passwordInput.addEventListener("keyup", (event) => {
		if (event.key === "Enter" && !loginButton.disabled) {
			loginButton.click();
		}
	});
};

// Set up the signup form
const setupSignupForm = () => {
	const signupButton = document.getElementById("signup-button");
	const emailInput = document.getElementById("signup-email");
	const usernameInput = document.getElementById("signup-username");
	const passwordInput = document.getElementById("signup-password");
	const confirmPasswordInput = document.getElementById(
		"signup-confirm-password"
	);

	if (
		!signupButton ||
		!emailInput ||
		!usernameInput ||
		!passwordInput ||
		!confirmPasswordInput
	) {
		return;
	}

	// Function to perform validation checks
	const validateSignupForm = () => {
		const email = emailInput.value.trim();
		const username = usernameInput.value.trim();
		const password = passwordInput.value.trim();
		const confirmPassword = confirmPasswordInput.value.trim();

		// Check for empty fields
		if (!email || !username || !password || !confirmPassword) {
			showError("signup-message", "Please fill in all fields.");
			return false;
		}

		// Validate email format
		if (!isValidEmail(email)) {
			showError("signup-message", "Please enter a valid email address.");
			return false;
		}

		// Validate username
		if (username.length < 3) {
			showError("signup-message", "Username must be at least 3 characters.");
			return false;
		}

		// Check for invalid characters in username
		const usernameRegex = /^[a-zA-Z0-9_\-\.]+$/;
		if (!usernameRegex.test(username)) {
			showError(
				"signup-message",
				"Username can only contain letters, numbers, underscores, hyphens, and periods."
			);
			return false;
		}

		// Validate password
		if (password.length < 6) {
			showError("signup-message", "Password must be at least 6 characters.");
			return false;
		}

		// Check password strength
		const hasUpperCase = /[A-Z]/.test(password);
		const hasLowerCase = /[a-z]/.test(password);
		const hasNumbers = /\d/.test(password);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

		if (!(hasUpperCase && hasLowerCase && hasNumbers) || password.length < 8) {
			showError(
				"signup-message",
				"Please use a stronger password with at least 8 characters, including uppercase, lowercase, and numbers."
			);
			return false;
		}

		// Check if passwords match
		if (password !== confirmPassword) {
			showError("signup-message", "Passwords do not match.");
			return false;
		}

		return true;
	};

	signupButton.addEventListener("click", () => {
		const email = emailInput.value.trim();
		const username = usernameInput.value.trim();
		const password = passwordInput.value.trim();

		// Clear any previous messages
		hideMessage("signup-message");

		// Validate inputs
		if (!validateSignupForm()) {
			return;
		}

		// Check if API is available
		if (!window.api) {
			showError(
				"signup-message",
				"Internal error: Communication with the application is not available. Please restart the application."
			);
			return;
		}

		// Disable the signup button during registration
		signupButton.disabled = true;
		signupButton.textContent = "Creating Account...";

		// Show processing message
		showSuccess("signup-message", "Processing registration...");

		try {
			// Send signup request to main process
			window.api.send("register", {
				username: email,
				display_name: username,
				password,
			});
		} catch (error) {
			showError(
				"signup-message",
				"Failed to send registration request. Please try again."
			);
			signupButton.disabled = false;
			signupButton.textContent = "Create Account";
		}
	});

	// Add keyboard event listener for Enter key
	confirmPasswordInput.addEventListener("keyup", (event) => {
		if (event.key === "Enter" && !signupButton.disabled) {
			signupButton.click();
		}
	});
};

// Set up message listeners from the main process
const setupMessageListeners = () => {
	if (!window.api) {
		return;
	}

	// Listen for login response
	window.api.receive("loginResponse", (response) => {
		// Enable the login button
		const loginButton = document.getElementById("login-button");
		if (loginButton) {
			loginButton.disabled = false;
			loginButton.textContent = "Login";
		}

		if (response.success) {
			// Store user data
			userData = response.userData;

			// Save to localStorage for persistence
			try {
				localStorage.setItem("userData", JSON.stringify(userData));
			} catch (error) {
				// Error handling
			}

			// Hide the login form
			hideMessage("login-message");

			// Update the UI
			updateUI();
		} else {
			// Show error message
			showError(
				"login-message",
				response.message || "Login failed. Please try again."
			);
		}
	});

	// Listen for logout response
	window.api.receive("logoutResponse", (response) => {
		// Clear localStorage
		try {
			localStorage.removeItem("userData");
		} catch (error) {
			// Error handling
		}

		// Reset logout button if exists
		const logoutButton = document.getElementById("logout-button");
		if (logoutButton) {
			logoutButton.disabled = false;
			logoutButton.textContent = "Logout";
		}

		// Clear user data and active session
		userData = null;
		activeSession = null;

		// Update UI
		updateUI();
	});

	// Listen for transaction history response
	window.api.receive("transactionHistoryResponse", (response) => {
		if (response.success) {
			updateTransactionHistory(response.transactions);
		} else {
			// Error handling
		}
	});

	// Listen for session start response
	window.api.receive("sessionStartResponse", (response) => {
		const sessionMessage = document.getElementById("session-message");
		const startSessionBtn = document.getElementById("start-session-btn");

		if (startSessionBtn) {
			startSessionBtn.disabled = false;
		}

		if (response.success) {
			// Update active session data
			activeSession = response.sessionData;

			// Update user data with new credit balance
			if (response.userData) {
				userData = response.userData;
			}

			// Update UI to show session view
			updateUI();
		} else {
			if (sessionMessage) {
				showError(
					"session-message",
					response.message || "Failed to start session"
				);
			}
		}
	});

	// Listen for session extension response
	window.api.receive("sessionExtendResponse", (response) => {
		const extensionMessage = document.getElementById("extension-message");
		const extendSessionBtn = document.getElementById("extend-session-btn");
		const expiredExtendBtn = document.getElementById("expired-extend-btn");
		const expiredExtensionMessage = document.getElementById(
			"expired-extension-message"
		);

		// Handle normal session extension button
		if (extendSessionBtn) {
			extendSessionBtn.disabled = false;
		}

		// Handle expired session extension button
		if (expiredExtendBtn) {
			expiredExtendBtn.disabled = false;
		}

		if (response.success) {
			// Update active session data
			activeSession = response.sessionData;

			// Update user data with new credit balance
			if (response.userData) {
				userData = response.userData;
			}

			// Update session view
			updateSessionView();

			// Show success message in regular session view
			if (extensionMessage) {
				showSuccess("extension-message", "Session extended successfully");
				setTimeout(() => hideMessage("extension-message"), 3000);
			}

			// Show success message in expired overlay
			if (expiredExtensionMessage) {
				showSuccess(
					expiredExtensionMessage.id,
					"Session extended successfully"
				);

				// Clear the foreground check interval if it exists
				if (window.sessionExpiredForegroundInterval) {
					clearInterval(window.sessionExpiredForegroundInterval);
					window.sessionExpiredForegroundInterval = null;
				}

				// Remove blur event listener if it was added
				window.removeEventListener("blur", handleSessionExpiredWindowBlur);

				// Remove the session expired overlay after a short delay
				setTimeout(() => {
					const overlay = document.getElementById("session-expired-overlay");
					if (overlay) {
						overlay.remove();
					}

					// Remove fullscreen mode class from body
					document.body.classList.remove("fullscreen-mode");

					// Allow the window to be non-always-on-top again
					if (window.api) {
						window.api.send("sessionExtended");
					}
				}, 2000);
			}

			// Remove selection from extension options
			const extensionOptions = document.querySelectorAll(
				"#session-view .duration-option, .session-expired-overlay .duration-option"
			);
			extensionOptions.forEach((opt) => opt.classList.remove("selected"));
		} else {
			// Show error in regular session view
			if (extensionMessage) {
				showError(
					"extension-message",
					response.message || "Failed to extend session"
				);
			}

			// Show error in expired overlay
			if (expiredExtensionMessage) {
				showError(
					expiredExtensionMessage.id,
					response.message || "Failed to extend session"
				);
			}
		}
	});

	// Listen for session end response
	window.api.receive("sessionEndResponse", (response) => {
		if (response.success) {
			// Clear active session
			activeSession = null;

			// Update user data with new credit balance
			if (response.userData) {
				userData = response.userData;
			}

			// Show a message about the computer restarting
			alert("Session ended. The computer will restart shortly.");

			// Don't update UI since we're restarting anyway
			// updateUI();
		} else {
			alert("Failed to end session: " + (response.message || "Unknown error"));
		}
	});

	// Listen for session expired UI update
	window.api.receive("sessionExpiredUI", () => {
		// Disable minimize button if it exists
		const minimizeButton = document.getElementById("minimize-button");
		if (minimizeButton) {
			minimizeButton.classList.add("hidden");
			minimizeButton.disabled = true;
		}

		// Show session expired overlay
		showSessionExpiredOverlay();

		// Add a class to document body to ensure fullscreen UI is shown correctly
		document.body.classList.add("fullscreen-mode");

		// If we're in an iframe or embedded context, try to request fullscreen at the DOM level as well
		try {
			// Use the appropriate fullscreen API based on browser support
			if (document.documentElement.requestFullscreen) {
				document.documentElement.requestFullscreen();
			} else if (document.documentElement.webkitRequestFullscreen) {
				document.documentElement.webkitRequestFullscreen();
			} else if (document.documentElement.msRequestFullscreen) {
				document.documentElement.msRequestFullscreen();
			}
		} catch (error) {
			// Silently handle any errors with fullscreen request
			console.error("Fullscreen request failed:", error);
		}

		// Add focus event listener to re-request focus when window loses focus
		// This is important to ensure our window stays in the foreground
		window.addEventListener("blur", handleSessionExpiredWindowBlur);
	});

	// Listen for session response
	window.api.receive("sessionResponse", (response) => {
		if (response.success) {
			// Update active session data
			activeSession = response.sessionData;

			// Update UI based on whether there's an active session
			updateUI();
		} else {
			// Error handling
		}
	});

	// Listen for registration response
	window.api.receive("registerResponse", (response) => {
		// Enable the signup button
		const signupButton = document.getElementById("signup-button");
		if (signupButton) {
			signupButton.disabled = false;
			signupButton.textContent = "Create Account";
		}

		if (response.success) {
			// Show success message
			showSuccess(
				"signup-message",
				response.needsEmailVerification
					? "Registration successful! Please check your email to verify your account."
					: "Registration successful! You can now login with your credentials."
			);

			// Clear the form
			const emailInput = document.getElementById("signup-email");
			const usernameInput = document.getElementById("signup-username");
			const passwordInput = document.getElementById("signup-password");
			const confirmPasswordInput = document.getElementById(
				"signup-confirm-password"
			);

			if (emailInput) emailInput.value = "";
			if (usernameInput) usernameInput.value = "";
			if (passwordInput) passwordInput.value = "";
			if (confirmPasswordInput) confirmPasswordInput.value = "";

			// Switch to login view after a delay
			setTimeout(() => {
				const loginView = document.getElementById("login-view");
				const signupView = document.getElementById("signup-view");

				if (loginView && signupView) {
					signupView.classList.add("hidden");
					loginView.classList.remove("hidden");
					hideMessage("signup-message");
				}
			}, 3000);
		} else {
			// Show error message
			showError(
				"signup-message",
				response.message || "Registration failed. Please try again."
			);
		}
	});

	// Listen for credit update
	window.api.receive("creditUpdate", (response) => {
		if (response.userData) {
			// Update user data with new credit balance
			userData = response.userData;

			// Update UI
			updateUserInfoDisplay();
		}
	});
};

// Check for existing session on startup
const checkExistingSession = () => {
	if (!userData || !window.api) return;

	// Show loading view
	const loadingView = document.getElementById("loading-view");
	if (loadingView) loadingView.classList.remove("hidden");

	// Hide other views
	const loginView = document.getElementById("login-view");
	const dashboardView = document.getElementById("dashboard-view");
	const sessionView = document.getElementById("session-view");

	if (loginView) loginView.classList.add("hidden");
	if (dashboardView) dashboardView.classList.add("hidden");
	if (sessionView) sessionView.classList.add("hidden");

	// Request active session from main process
	try {
		window.api.send("getActiveSession", { userId: userData.id });
	} catch (error) {
		// Show dashboard view (default)
		updateUI();
	}
};

// Initialize the application
const initApp = () => {
	// Set up event listeners
	setupViewSwitching();
	setupLoginForm();
	setupSignupForm();
	setupDashboardControls();
	setupMessageListeners();

	// Check for stored user data
	try {
		const storedUserData = localStorage.getItem("userData");
		if (storedUserData) {
			userData = JSON.parse(storedUserData);
			// Check for existing session
			checkExistingSession();
		}
	} catch (error) {
		// Error handling
	}

	// Update UI based on current state
	updateUI();
};

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);
