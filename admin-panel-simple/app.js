// Main application logic for the Cafe Management Admin Panel
let isAuthenticated = false;

// Application initialization
document.addEventListener("DOMContentLoaded", async () => {
	console.log("🚀 Cafe Admin Panel starting...");

	// Initialize Supabase
	if (!initializeSupabase()) {
		Toast.error(
			"Failed to initialize application. Please check configuration."
		);
		return;
	}

	// Check if user is already authenticated
	try {
		const { user } = await Auth.getCurrentUser();
		if (user) {
			const isAdmin = await Auth.checkIsAdmin(user.id);
			if (isAdmin) {
				showDashboard();
				return;
			}
		}
	} catch (error) {
		console.log("No existing session found");
	}

	// Show login screen
	showLogin();
	setupEventListeners();
});

// Show login screen
function showLogin() {
	document.getElementById("login-screen").style.display = "flex";
	document.getElementById("dashboard").style.display = "none";
	isAuthenticated = false;
}

// Show dashboard
function showDashboard() {
	document.getElementById("login-screen").style.display = "none";
	document.getElementById("dashboard").style.display = "flex";
	isAuthenticated = true;

	// Load dashboard data
	Navigation.showPage("overview");
	refreshDashboard();
	setupSearch();

	// Setup auto-refresh for dashboard
	AutoRefresh.start(
		"dashboard",
		refreshDashboard,
		CONFIG.REFRESH_INTERVALS.DASHBOARD
	);

	// Setup navigation after dashboard is shown
	setupNavigation();
}

// Event listeners setup
function setupEventListeners() {
	// Login form
	const loginForm = document.getElementById("login-form");
	if (loginForm) {
		loginForm.addEventListener("submit", handleLogin);
	}
}

// Setup navigation (called after dashboard is shown)
function setupNavigation() {
	console.log("Setting up navigation...");

	// Navigation buttons (excluding logout)
	const navItems = document.querySelectorAll(".nav-item:not(.logout-btn)");
	console.log("Found nav items:", navItems.length);

	navItems.forEach((item, index) => {
		const page = item.dataset.page;
		console.log(`Setting up nav item ${index}: ${page}`);

		// Remove any existing listeners
		item.replaceWith(item.cloneNode(true));
		const newItem = document.querySelectorAll(".nav-item:not(.logout-btn)")[
			index
		];

		newItem.addEventListener("click", (e) => {
			e.preventDefault();
			console.log("Navigation clicked:", page);
			if (page && isAuthenticated) {
				handleNavigation(page);
			}
		});
	});

	// Logout button
	const logoutBtn = document.getElementById("logout-btn");
	if (logoutBtn) {
		console.log("Setting up logout button");
		// Remove existing listener and add new one
		logoutBtn.replaceWith(logoutBtn.cloneNode(true));
		const newLogoutBtn = document.getElementById("logout-btn");
		newLogoutBtn.addEventListener("click", (e) => {
			e.preventDefault();
			handleLogout();
		});
	}

	// Close modal on outside click
	document.addEventListener("click", (e) => {
		if (e.target.id === "credit-modal") {
			closeCreditModal();
		}
	});
}

// Handle login
async function handleLogin(e) {
	e.preventDefault();

	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;
	const loginBtn = document.getElementById("login-btn");
	const errorDiv = document.getElementById("login-error");

	// Clear previous errors
	errorDiv.style.display = "none";

	// Disable login button
	loginBtn.disabled = true;
	loginBtn.textContent = "Signing in...";

	try {
		const { user, error } = await Auth.signIn(email, password);

		if (error) {
			throw error;
		}

		if (user) {
			showDashboard();
			Toast.success("Welcome back!");
		}
	} catch (error) {
		errorDiv.textContent = error.message;
		errorDiv.style.display = "block";

		// Clear form
		document.getElementById("password").value = "";
	} finally {
		loginBtn.disabled = false;
		loginBtn.textContent = "Sign In";
	}
}

// Handle logout
async function handleLogout() {
	if (!confirm("Are you sure you want to logout?")) {
		return;
	}

	try {
		AutoRefresh.stopAll();
		await Auth.signOut();
		showLogin();
		Toast.info("Logged out successfully");

		// Clear form data
		document.getElementById("login-form").reset();
	} catch (error) {
		Toast.error("Error during logout: " + error.message);
	}
}

// Handle navigation
function handleNavigation(page) {
	console.log("Handling navigation to:", page);
	if (!isAuthenticated) {
		console.log("Not authenticated, ignoring navigation");
		return;
	}

	// Stop current auto-refresh
	AutoRefresh.stopAll();

	// Show the requested page
	Navigation.showPage(page);

	// Load page-specific data and setup auto-refresh
	switch (page) {
		case "overview":
			console.log("Loading overview page");
			refreshDashboard();
			AutoRefresh.start(
				"dashboard",
				refreshDashboard,
				CONFIG.REFRESH_INTERVALS.DASHBOARD
			);
			break;
		case "active-users":
			console.log("Loading active users page");
			refreshActiveUsers();
			AutoRefresh.start(
				"active-users",
				refreshActiveUsers,
				CONFIG.REFRESH_INTERVALS.ACTIVE_USERS
			);
			break;
		case "all-users":
			console.log("Loading all users page");
			refreshAllUsers();
			AutoRefresh.start(
				"all-users",
				refreshAllUsers,
				CONFIG.REFRESH_INTERVALS.ALL_USERS
			);
			setupSearch();
			break;
		default:
			console.log("Unknown page:", page);
	}
}

// Refresh dashboard data
async function refreshDashboard() {
	if (!isAuthenticated) return;

	try {
		// Get dashboard stats
		const stats = await DataService.getDashboardStats();

		// Update stats cards
		document.getElementById("active-users-count").textContent =
			stats.activeUsers;
		document.getElementById("total-credits").textContent = formatNumber(
			stats.totalCredits
		);
		document.getElementById("avg-session").textContent =
			DataService.formatDuration(stats.avgSessionDuration);
		document.getElementById("today-revenue").textContent = formatCurrency(
			stats.todayRevenue
		);

		// Get recent active sessions for preview (limit to 5)
		const { sessions } = await DataService.getActiveSessions();
		const recentSessions = sessions.slice(0, 5);
		TableUtils.generateActiveUsersTable(
			recentSessions,
			"overview-active-users"
		);
	} catch (error) {
		console.error("Error refreshing dashboard:", error);
		Toast.error("Failed to refresh dashboard data");
	}
}

// Refresh active users data
async function refreshActiveUsers() {
	if (!isAuthenticated) return;

	try {
		const { sessions, stats } = await DataService.getActiveSessions();

		// Update stats
		document.getElementById("active-count").textContent = stats.activeCount;
		document.getElementById("avg-time-left").textContent =
			stats.averageTimeLeft;
		document.getElementById("session-value").textContent = formatCurrency(
			stats.sessionValue
		);

		// Update table
		TableUtils.generateActiveUsersTable(sessions, "active-users-table");
	} catch (error) {
		console.error("Error refreshing active users:", error);
		Toast.error("Failed to refresh active users data");
	}
}

// Refresh all users data
async function refreshAllUsers() {
	if (!isAuthenticated) return;

	try {
		const users = await DataService.getAllUsers();

		// Update stats
		const totalUsers = users.length;
		const activeUsers = users.filter((user) => user.status === "Active").length;
		const totalCredits = users.reduce((sum, user) => sum + user.credits, 0);

		document.getElementById("total-users").textContent = totalUsers;
		document.getElementById("active-users").textContent = activeUsers;
		document.getElementById("all-total-credits").textContent =
			formatNumber(totalCredits);

		// Update table
		TableUtils.generateAllUsersTable(users, "all-users-table");

		// Re-setup search after table update
		setTimeout(setupSearch, 100);
	} catch (error) {
		console.error("Error refreshing all users:", error);
		Toast.error("Failed to refresh users data");
	}
}

// Global refresh functions (called from HTML buttons)
window.refreshDashboard = refreshDashboard;
window.refreshActiveUsers = refreshActiveUsers;
window.refreshAllUsers = refreshAllUsers;

// Handle window visibility change to pause/resume auto-refresh
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		AutoRefresh.stopAll();
	} else if (isAuthenticated) {
		// Resume auto-refresh based on current page
		const activePage = document.querySelector(".nav-item.active")?.dataset.page;
		if (activePage) {
			handleNavigation(activePage);
		}
	}
});

// Handle browser back/forward buttons
window.addEventListener("popstate", (e) => {
	if (isAuthenticated) {
		const page = e.state?.page || "overview";
		handleNavigation(page);
	}
});

// Error handling for unhandled promise rejections
window.addEventListener("unhandledrejection", (e) => {
	console.error("Unhandled promise rejection:", e.reason);
	Toast.error("An unexpected error occurred");
	e.preventDefault();
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
	AutoRefresh.stopAll();
});

// Development helpers (remove in production)
if (
	window.location.hostname === "localhost" ||
	window.location.hostname === "127.0.0.1"
) {
	window.DEBUG = {
		auth: Auth,
		data: DataService,
		config: CONFIG,
		toast: Toast,
		navigation: Navigation,
		currentUser: () => currentUser,
		isAuthenticated: () => isAuthenticated,
		handleNavigation: handleNavigation, // Add this for testing
	};
	console.log("🔧 Debug tools available in window.DEBUG");
}
