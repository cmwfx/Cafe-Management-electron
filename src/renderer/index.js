/**
 * Cafe Management System - Renderer Process
 * Full authentication state management implementation
 */

// Application state
let userData = null;
let activeSession = null;

// Check if the API is available from preload script
console.log(
	"Checking for API availability:",
	window.api ? "API Available" : "API Missing"
);

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
	console.log("Updating UI, userData:", userData);

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
	console.log("Updating session view with session data:", activeSession);

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
	console.log("Updating dashboard view with user data:", userData);

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
		console.error("Error requesting transaction history:", error);
	}
};

// Update transaction history display
const updateTransactionHistory = (transactions) => {
	const transactionList = document.getElementById("transaction-list");
	if (!transactionList) return;

	// Clear existing content
	transactionList.innerHTML = "";

	if (!transactions || transactions.length === 0) {
		// Show empty state
		const emptyDiv = document.createElement("div");
		emptyDiv.className = "transaction-empty";
		emptyDiv.textContent = "No recent transactions";
		transactionList.appendChild(emptyDiv);
		return;
	}

	// Add transactions to the list
	transactions.forEach((transaction) => {
		const transactionItem = document.createElement("div");
		transactionItem.className = "transaction-item";

		const transactionInfo = document.createElement("div");
		transactionInfo.className = "transaction-info";

		const transactionType = document.createElement("div");
		transactionType.className = "transaction-type";
		transactionType.textContent =
			transaction.description ||
			(transaction.amount > 0 ? "Credit added" : "Session payment");

		const transactionDate = document.createElement("div");
		transactionDate.className = "transaction-date";
		transactionDate.textContent = new Date(
			transaction.created_at
		).toLocaleString();

		transactionInfo.appendChild(transactionType);
		transactionInfo.appendChild(transactionDate);

		const transactionAmount = document.createElement("div");
		transactionAmount.className = `transaction-amount ${
			transaction.amount > 0 ? "positive" : "negative"
		}`;
		transactionAmount.textContent = `${transaction.amount > 0 ? "+" : ""}${
			transaction.amount
		} credits`;

		transactionItem.appendChild(transactionInfo);
		transactionItem.appendChild(transactionAmount);

		transactionList.appendChild(transactionItem);
	});
};

// Calculate credit cost based on duration
const calculateCreditCost = (minutes) => {
	// Basic formula: 0.5 credits per minute with minimum of 15 minutes
	// Could be replaced with pricing from the server in a future update
	const minMinutes = 15;
	const validMinutes = Math.max(minMinutes, minutes);
	return Math.ceil(validMinutes * 0.5);
};

// Update session pricing information
const updateSessionPricing = () => {
	// Update custom duration price
	const customDuration = document.getElementById("custom-duration");
	const customPrice = document.getElementById("custom-price");

	if (customDuration && customPrice) {
		const updateCustomPrice = () => {
			const minutes = parseInt(customDuration.value) || 15;
			const credits = calculateCreditCost(minutes);
			customPrice.textContent = `${credits} credits`;
		};

		// Set initial value
		updateCustomPrice();

		// Update when value changes
		customDuration.addEventListener("input", updateCustomPrice);
	}
};

// Setup dashboard controls
const setupDashboardControls = () => {
	console.log("Setting up dashboard controls");

	// Set up logout button
	const logoutButton = document.getElementById("logout-button");
	if (logoutButton) {
		logoutButton.addEventListener("click", () => {
			console.log("Logout button clicked");

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

			// Calculate duration and credits
			const minutes = parseInt(customDuration.value) || 15;
			selectedDuration = minutes;
			selectedCredits = calculateCreditCost(minutes);

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

			console.log(
				`Starting session for ${selectedDuration} minutes, using ${selectedCredits} credits`
			);

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

			console.log(
				`Extending session for ${extensionDuration} minutes, using ${extensionCredits} credits`
			);

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
			console.log("Minimize button clicked");
			if (window.api) {
				window.api.send("minimizeApp");
			}
		});
	}

	if (endSessionBtn) {
		endSessionBtn.addEventListener("click", () => {
			console.log("End session button clicked");

			// Ask for confirmation
			const confirmEnd = confirm(
				"Are you sure you want to end your session? This will not refund your credits."
			);

			if (confirmEnd && window.api && activeSession) {
				window.api.send("endSession", {
					sessionId: activeSession.id,
					userId: userData.id,
				});
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
				window.api.send("sessionExpired");
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
		console.error("Could not find view switching elements");
		return;
	}

	console.log("Setting up view switching");

	switchToSignup.addEventListener("click", () => {
		console.log("Switching to signup view");
		loginView.classList.add("hidden");
		signupView.classList.remove("hidden");
		hideMessage("login-message");
	});

	switchToLogin.addEventListener("click", () => {
		console.log("Switching to login view");
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
		console.error("Could not find login form elements");
		return;
	}

	console.log("Setting up login form");

	loginButton.addEventListener("click", () => {
		const email = emailInput.value.trim();
		const password = passwordInput.value.trim();

		console.log("Login button clicked:", email);

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
			console.error("Error: API is not available, cannot send login request");
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
			console.log("Login request sent successfully");
		} catch (error) {
			console.error("Error sending login request:", error);
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
		console.error("Could not find signup form elements");
		return;
	}

	console.log("Setting up signup form");

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

		console.log("Signup button clicked - email:", email, "username:", username);

		// Clear any previous messages
		hideMessage("signup-message");

		// Validate inputs
		if (!validateSignupForm()) {
			return;
		}

		// Check if API is available
		if (!window.api) {
			console.error(
				"Error: API is not available, cannot send registration request"
			);
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

		console.log("Sending registration request to main process");

		try {
			// Send signup request to main process
			window.api.send("register", {
				username: email,
				display_name: username,
				password,
			});
			console.log("Registration request sent successfully");
		} catch (error) {
			console.error("Error sending registration request:", error);
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
		console.error("API is not available, cannot set up message listeners");
		return;
	}

	// Listen for login response
	window.api.receive("loginResponse", (response) => {
		console.log("Received login response:", response.success);

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
				console.error("Error saving user data to localStorage:", error);
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
		console.log("Received logout response:", response);

		// Clear localStorage
		try {
			localStorage.removeItem("userData");
		} catch (error) {
			console.error("Error clearing user data from localStorage:", error);
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
		console.log("Transaction history response received:", response);

		if (response.success) {
			updateTransactionHistory(response.transactions);
		} else {
			console.error("Error fetching transaction history:", response.message);
		}
	});

	// Listen for session start response
	window.api.receive("sessionStartResponse", (response) => {
		console.log("Session start response received:", response);

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
		console.log("Session extension response received:", response);

		const extensionMessage = document.getElementById("extension-message");
		const extendSessionBtn = document.getElementById("extend-session-btn");

		if (extendSessionBtn) {
			extendSessionBtn.disabled = false;
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

			// Show success message
			if (extensionMessage) {
				showSuccess("extension-message", "Session extended successfully");
				setTimeout(() => hideMessage("extension-message"), 3000);
			}

			// Remove selection from extension options
			const extensionOptions = document.querySelectorAll(
				"#session-view .duration-option"
			);
			extensionOptions.forEach((opt) => opt.classList.remove("selected"));
		} else {
			if (extensionMessage) {
				showError(
					"extension-message",
					response.message || "Failed to extend session"
				);
			}
		}
	});

	// Listen for session end response
	window.api.receive("sessionEndResponse", (response) => {
		console.log("Session end response received:", response);

		if (response.success) {
			// Clear active session
			activeSession = null;

			// Update user data with new credit balance
			if (response.userData) {
				userData = response.userData;
			}

			// Update UI to show dashboard view
			updateUI();
		} else {
			alert("Failed to end session: " + (response.message || "Unknown error"));
		}
	});

	// Listen for session expiration
	window.api.receive("sessionExpired", () => {
		console.log("Session expired");

		// Clear active session
		activeSession = null;

		// Show expiration message
		alert("Your session has expired!");

		// Update UI to show dashboard view
		updateUI();
	});

	// Listen for credit update
	window.api.receive("creditUpdate", (response) => {
		console.log("Credit update received:", response);

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

	console.log("Checking for existing session...");

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
		console.error("Error checking for existing session:", error);
		// Show dashboard view (default)
		updateUI();
	}
};

// Initialize the application
const initApp = () => {
	console.log("Initializing application...");

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
			console.log(
				"Found stored user data:",
				userData.username || userData.email
			);

			// Check for existing session
			checkExistingSession();
		}
	} catch (error) {
		console.error("Error loading stored user data:", error);
	}

	// Update UI based on current state
	updateUI();
};

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);
