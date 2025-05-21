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
				// Error in listener
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
		} catch (error) {
			// Error persisting session
		}
	}

	/**
	 * Load the persisted session from disk
	 */
	async loadPersistedSession() {
		try {
			// Check if session file exists
			if (!fs.existsSync(this.sessionPath)) {
				return;
			}

			// Read and parse the session file
			const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, "utf8"));

			// Check if session is too old (24 hours)
			const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
			if (Date.now() - sessionData.timestamp > MAX_AGE) {
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
						// Check if session is still active
						const { data: sessionCheck, error: sessionError } = await supabase
							.from("sessions")
							.select("*")
							.eq("id", sessionData.activeSession.id)
							.eq("is_active", true)
							.single();

						if (!sessionError && sessionCheck) {
							this.activeSession = sessionCheck;
						}
					}

					// Set up realtime subscriptions
					this.setupRealtimeSubscriptions();

					// Notify listeners that session was restored
					this.notifyListeners({
						type: "SESSION_RESTORED",
						data: this.userData,
					});
				} catch (error) {
					// Error restoring session
					fs.unlinkSync(this.sessionPath);
				}
			}
		} catch (error) {
			// Error loading persisted session
			if (fs.existsSync(this.sessionPath)) {
				fs.unlinkSync(this.sessionPath);
			}
		}
	}

	/**
	 * Set up realtime subscriptions for the current user
	 */
	setupRealtimeSubscriptions() {
		// Clear any existing subscriptions
		this.clearRealtimeSubscriptions();

		// Make sure we have a user and realtime manager
		if (!this.userData || !this.realtimeManager) {
			return;
		}

		// Subscribe to profile updates
		const profileSubscription = this.realtimeManager.subscribe(
			"profiles",
			"UPDATE",
			(payload) => {
				// Check if this update is for the current user
				if (
					payload.new &&
					payload.new.id === this.userData.id &&
					this.userData
				) {
					// Update the user data
					this.userData = {
						...this.userData,
						...payload.new,
					};

					// Notify listeners
					this.notifyListeners({
						type: "USER_UPDATED",
						data: this.userData,
					});
				}
			},
			{
				filter: { column: "id", value: this.userData.id },
			}
		);

		// Subscribe to credit transactions
		const transactionSubscription = this.realtimeManager.subscribe(
			"credit_transactions",
			"INSERT",
			(payload) => {
				// Check if this transaction is for the current user
				if (
					payload.new &&
					payload.new.user_id === this.userData.id &&
					this.userData
				) {
					// Notify listeners about the transaction
					this.notifyListeners({
						type: "CREDIT_TRANSACTION",
						data: payload.new,
					});
				}
			},
			{
				filter: { column: "user_id", value: this.userData.id },
			}
		);

		// Store subscription IDs for cleanup
		this.realtimeSubscriptions.push(profileSubscription);
		this.realtimeSubscriptions.push(transactionSubscription);
	}

	/**
	 * Clear all realtime subscriptions
	 */
	clearRealtimeSubscriptions() {
		if (!this.realtimeManager) return;

		// Unsubscribe from all subscriptions
		this.realtimeSubscriptions.forEach((subscriptionId) => {
			this.realtimeManager.unsubscribe(subscriptionId);
		});

		// Clear the subscriptions array
		this.realtimeSubscriptions = [];
	}

	/**
	 * Clear the current user data
	 */
	clearCurrentUser() {
		// Clear realtime subscriptions
		this.clearRealtimeSubscriptions();

		// Clear user data and active session
		this.userData = null;
		this.activeSession = null;

		// Remove persisted session
		if (fs.existsSync(this.sessionPath)) {
			fs.unlinkSync(this.sessionPath);
		}
	}

	/**
	 * Handle authentication errors
	 * @param {Object} error - The authentication error
	 * @returns {string} A user-friendly error message
	 */
	handleAuthError(error) {
		if (!error) return "An unknown error occurred";

		// Map common error messages to user-friendly messages
		const errorMap = {
			"Invalid login credentials": "Invalid email or password",
			"Email not confirmed": "Please verify your email address",
			"Email already in use": "This email is already registered",
			"Password is too weak":
				"Password is too weak. Use at least 8 characters with numbers and special characters.",
			"Rate limit exceeded": "Too many attempts. Please try again later.",
		};

		// Check if we have a mapped message
		for (const [key, message] of Object.entries(errorMap)) {
			if (error.message && error.message.includes(key)) {
				return message;
			}
		}

		// Return the original error message if no mapping found
		return error.message || "An unexpected error occurred";
	}

	/**
	 * Logout the current user
	 * @returns {Promise<{success: boolean, message: string}>}
	 */
	async logout() {
		try {
			// Sign out from Supabase
			const { error } = await supabase.auth.signOut();

			// Clear local user data regardless of Supabase response
			this.clearCurrentUser();

			// Notify listeners
			this.notifyListeners({ type: "LOGGED_OUT" });

			return {
				success: true,
				message: "Logged out successfully",
			};
		} catch (error) {
			// Still clear local data even if there's an error
			this.clearCurrentUser();

			return {
				success: false,
				message: "Error during logout, but local data was cleared",
			};
		}
	}
}

// Create and export singleton instance
const authManager = new AuthManager();
module.exports = { authManager };
