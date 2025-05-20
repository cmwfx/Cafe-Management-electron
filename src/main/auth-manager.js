/**
 * Authentication Manager
 *
 * Handles authentication state management including:
 * - User session persistence
 * - Local storage of authentication tokens
 * - Session refreshing
 * - Error handling
 */

const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const { supabase } = require("./supabase-config");

class AuthManager {
	constructor() {
		this.userData = null;
		this.activeSession = null;
		this.authListeners = [];
		this.sessionPath = path.join(app.getPath("userData"), "session.json");

		// Initialize realtime subscriptions
		this.realtimeSubscriptions = [];
	}

	/**
	 * Initialize the auth manager
	 * @param {Object} realtimeManager - The realtime manager for subscriptions
	 */
	initialize(realtimeManager) {
		this.realtimeManager = realtimeManager;
		this.loadPersistedSession();
	}

	/**
	 * Set the current user data
	 * @param {Object} userData - The user data to set
	 */
	setCurrentUser(userData) {
		this.userData = userData;
		this.persistSession();

		// Notify listeners
		this.notifyListeners({ type: "USER_UPDATED", data: userData });
	}

	/**
	 * Set the active session
	 * @param {Object} sessionData - The session data to set
	 */
	setActiveSession(sessionData) {
		this.activeSession = sessionData;
		this.persistSession();

		// Notify listeners
		this.notifyListeners({ type: "SESSION_UPDATED", data: sessionData });
	}

	/**
	 * Get the current user data
	 * @returns {Object} The current user data
	 */
	getCurrentUser() {
		return this.userData;
	}

	/**
	 * Get the active session
	 * @returns {Object} The active session
	 */
	getActiveSession() {
		return this.activeSession;
	}

	/**
	 * Add a listener for auth events
	 * @param {Function} listener - The listener function
	 * @returns {Function} A function to remove the listener
	 */
	addListener(listener) {
		this.authListeners.push(listener);

		// Return a function to remove the listener
		return () => {
			this.authListeners = this.authListeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Notify all listeners of an auth event
	 * @param {Object} event - The event to notify listeners about
	 */
	notifyListeners(event) {
		this.authListeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				console.error("Error in auth listener:", error);
			}
		});
	}

	/**
	 * Persist the session to disk
	 */
	persistSession() {
		try {
			// Don't save if there's no user data
			if (!this.userData) {
				// Remove the session file if it exists
				if (fs.existsSync(this.sessionPath)) {
					fs.unlinkSync(this.sessionPath);
				}
				return;
			}

			// Get the current auth session
			const session = supabase.auth.session;

			// Save user data, session data, and auth tokens
			const dataToSave = {
				userData: this.userData,
				activeSession: this.activeSession,
				authSession: session
					? {
							access_token: session.access_token,
							refresh_token: session.refresh_token,
							expires_at: session.expires_at,
					  }
					: null,
				timestamp: Date.now(),
			};

			// Write to file
			fs.writeFileSync(this.sessionPath, JSON.stringify(dataToSave), "utf8");
			console.log("Session persisted to disk");
		} catch (error) {
			console.error("Error persisting session:", error);
		}
	}

	/**
	 * Load the persisted session from disk
	 */
	async loadPersistedSession() {
		try {
			// Check if session file exists
			if (!fs.existsSync(this.sessionPath)) {
				console.log("No persisted session found");
				return;
			}

			// Read and parse the session file
			const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, "utf8"));

			// Check if session is too old (24 hours)
			const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
			if (Date.now() - sessionData.timestamp > MAX_AGE) {
				console.log("Persisted session expired, removing");
				fs.unlinkSync(this.sessionPath);
				return;
			}

			// Try to restore auth session
			if (sessionData.authSession) {
				try {
					// Set session in Supabase
					const { data, error } = await supabase.auth.setSession({
						access_token: sessionData.authSession.access_token,
						refresh_token: sessionData.authSession.refresh_token,
					});

					if (error) {
						console.error("Error restoring auth session:", error.message);
						fs.unlinkSync(this.sessionPath);
						return;
					}

					// Verify user data is still valid
					const { data: profileData, error: profileError } = await supabase
						.from("profiles")
						.select("*")
						.eq("id", sessionData.userData.id)
						.single();

					if (profileError) {
						console.error(
							"Error verifying user profile:",
							profileError.message
						);
						fs.unlinkSync(this.sessionPath);
						return;
					}

					// Set user data with updated profile
					this.userData = {
						...sessionData.userData,
						...profileData,
					};

					// Set active session if it exists
					if (sessionData.activeSession) {
						// Verify session is still active
						const { data: sessionInfo, error: sessionError } = await supabase
							.from("sessions")
							.select("*")
							.eq("id", sessionData.activeSession.id)
							.single();

						if (!sessionError && sessionInfo) {
							this.activeSession = sessionInfo;
						}
					}

					// Set up realtime subscriptions
					this.setupRealtimeSubscriptions();

					// Notify listeners
					this.notifyListeners({
						type: "SESSION_RESTORED",
						data: this.userData,
					});
					console.log("Session restored successfully");
				} catch (error) {
					console.error("Error during session restoration:", error);
					fs.unlinkSync(this.sessionPath);
				}
			}
		} catch (error) {
			console.error("Error loading persisted session:", error);

			// Remove corrupted session file
			if (fs.existsSync(this.sessionPath)) {
				fs.unlinkSync(this.sessionPath);
			}
		}
	}

	/**
	 * Set up realtime subscriptions for the current user
	 */
	setupRealtimeSubscriptions() {
		// Clear existing subscriptions
		this.clearRealtimeSubscriptions();

		if (!this.userData || !this.realtimeManager) return;

		console.log(
			"Setting up realtime subscriptions for user:",
			this.userData.id
		);

		// Subscribe to profile changes
		const profileSub = this.realtimeManager.subscribe(
			"profiles",
			"UPDATE",
			(payload) => {
				// Only process updates for the current user
				if (payload.new && payload.new.id === this.userData.id) {
					console.log("Profile updated:", payload.new);

					// Update the current user data
					this.userData = { ...this.userData, ...payload.new };

					// Notify listeners
					this.notifyListeners({ type: "USER_UPDATED", data: this.userData });
				}
			},
			{
				filter: { filter: `id=eq.${this.userData.id}` },
			}
		);

		this.realtimeSubscriptions.push(profileSub);

		// Subscribe to active session updates if session exists
		if (this.activeSession) {
			const sessionSub = this.realtimeManager.subscribe(
				"sessions",
				"UPDATE",
				(payload) => {
					// Only process updates for the current session
					if (payload.new && payload.new.id === this.activeSession.id) {
						console.log("Session updated:", payload.new);

						// Update the active session data
						this.activeSession = { ...this.activeSession, ...payload.new };

						// Notify listeners
						this.notifyListeners({
							type: "SESSION_UPDATED",
							data: this.activeSession,
						});
					}
				},
				{
					filter: { filter: `id=eq.${this.activeSession.id}` },
				}
			);

			this.realtimeSubscriptions.push(sessionSub);
		}

		// Subscribe to credit transactions
		const creditSub = this.realtimeManager.subscribe(
			"credit_transactions",
			"INSERT",
			(payload) => {
				// Only process transactions for the current user
				if (payload.new && payload.new.user_id === this.userData.id) {
					console.log("New credit transaction:", payload.new);

					// Notify listeners
					this.notifyListeners({
						type: "CREDIT_TRANSACTION",
						data: payload.new,
					});
				}
			},
			{
				filter: { filter: `user_id=eq.${this.userData.id}` },
			}
		);

		this.realtimeSubscriptions.push(creditSub);
	}

	/**
	 * Clear all realtime subscriptions
	 */
	clearRealtimeSubscriptions() {
		if (this.realtimeSubscriptions && this.realtimeSubscriptions.length > 0) {
			this.realtimeSubscriptions.forEach((unsubscribe) => {
				if (typeof unsubscribe === "function") {
					try {
						unsubscribe();
					} catch (error) {
						console.error("Error unsubscribing from realtime channel:", error);
					}
				}
			});

			this.realtimeSubscriptions = [];
		}
	}

	/**
	 * Handle authentication errors
	 * @param {Object} error - The error object
	 * @returns {String} User-friendly error message
	 */
	handleAuthError(error) {
		console.error("Authentication error:", error);

		// Default error message
		let userMessage = "An unexpected error occurred during authentication";

		if (error) {
			// Common Supabase auth errors
			if (error.message) {
				if (error.message.includes("Invalid login credentials")) {
					userMessage = "Invalid email or password";
				} else if (error.message.includes("User already registered")) {
					userMessage = "An account with this email already exists";
				} else if (error.message.includes("Email not confirmed")) {
					userMessage = "Please verify your email address before logging in";
				} else if (
					error.message.includes("rate limit") ||
					error.message.includes("too many requests")
				) {
					userMessage = "Too many login attempts. Please try again later";
				} else if (
					error.message.includes("network") ||
					error.message.includes("connection")
				) {
					userMessage = "Network error. Please check your internet connection";
				} else {
					// Use the message from the error if it's not one of the recognized ones
					userMessage = error.message;
				}
			}
		}

		return userMessage;
	}

	/**
	 * Handle user logout
	 */
	async logout() {
		try {
			// Sign out from Supabase
			await supabase.auth.signOut();

			// Clear realtime subscriptions
			this.clearRealtimeSubscriptions();

			// Clear user data and active session
			this.userData = null;
			this.activeSession = null;

			// Remove persisted session
			if (fs.existsSync(this.sessionPath)) {
				fs.unlinkSync(this.sessionPath);
			}

			// Notify listeners
			this.notifyListeners({ type: "LOGGED_OUT" });

			return { success: true };
		} catch (error) {
			console.error("Error logging out:", error);
			return { success: false, message: "Failed to log out properly" };
		}
	}
}

// Create and export singleton instance
const authManager = new AuthManager();
module.exports = { authManager };
