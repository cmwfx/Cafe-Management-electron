const { supabase } = require("./supabase-config");
const { authManager } = require("./auth-manager");

class SessionManager {
	constructor() {
		// Store active sessions by user ID
		this.activeSessions = new Map();
	}

	/**
	 * Start a new session for a user
	 * @param {string} userId - The user ID
	 * @param {number} durationMinutes - Duration in minutes
	 * @param {number} credits - Credits to be deducted
	 * @returns {Promise<{success: boolean, message: string, sessionData: object, userData: object}>}
	 */
	async startSession(userId, durationMinutes, credits) {
		try {
			console.log(
				`Starting session for user ${userId}, duration: ${durationMinutes} minutes, credits: ${credits}`
			);

			// Check if user already has an active session
			const existingSession = this.activeSessions.get(userId);
			if (existingSession) {
				return {
					success: false,
					message: "You already have an active session",
				};
			}

			// Fetch user to check credit balance
			console.log(`Fetching user data for ID: ${userId}`);
			const { data: user, error: userError } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (userError || !user) {
				console.error("Error fetching user:", userError);
				return {
					success: false,
					message: "User not found",
				};
			}
			console.log(
				`User data fetched successfully: ${user.username}, credits: ${user.credits}`
			);

			// Check if user has enough credits
			if (user.credits < credits) {
				return {
					success: false,
					message: "You don't have enough credits for this session",
				};
			}

			// Get computer ID (could be obtained from a more robust method)
			console.log("Generating computer ID...");
			const computerId = await this.getComputerId();
			console.log(`Computer ID generated: ${computerId}`);

			// Calculate end time
			const startTime = new Date();
			const endTime = new Date(
				startTime.getTime() + durationMinutes * 60 * 1000 + 10000
			);
			console.log(
				`Session period: ${startTime.toISOString()} to ${endTime.toISOString()}`
			);

			// Start transaction
			// 1. Insert session record
			console.log("Creating session record in database...");
			const { data: sessionData, error: sessionError } = await supabase
				.from("sessions")
				.insert({
					user_id: userId,
					computer_id: computerId,
					duration_minutes: durationMinutes,
					credits_used: credits,
					is_active: true,
					start_time: startTime.toISOString(),
					end_time: endTime.toISOString(),
				})
				.select()
				.single();

			if (sessionError) {
				console.error("Error creating session:", sessionError);
				return {
					success: false,
					message: "Failed to create session record",
				};
			}
			console.log(`Session record created with ID: ${sessionData.id}`);

			// 2. Deduct credits from user and mark as active
			console.log(
				`Updating user credits: ${user.credits} - ${credits} = ${
					user.credits - credits
				}`
			);
			const { data: updatedUser, error: creditError } = await supabase
				.from("profiles")
				.update({
					credits: user.credits - credits,
					updated_at: new Date().toISOString(),
				})
				.eq("id", userId)
				.select()
				.single();

			if (creditError) {
				console.error("Error updating user credits:", creditError);

				// Try to roll back session creation
				console.log(`Rolling back session creation for ID: ${sessionData.id}`);
				await supabase.from("sessions").delete().eq("id", sessionData.id);

				return {
					success: false,
					message: "Failed to update credits",
				};
			}
			console.log(
				`User credits updated successfully. New balance: ${updatedUser.credits}`
			);

			// 3. Record credit transaction
			console.log("Recording credit transaction...");
			const { error: transactionError } = await supabase
				.from("credit_transactions")
				.insert({
					user_id: userId,
					amount: -credits,
					transaction_type: "session_payment",
					description: `Session payment for ${durationMinutes} minutes`,
					session_id: sessionData.id,
				});

			if (transactionError) {
				console.error("Error recording transaction:", transactionError);
				// Non-critical error, continue anyway
			} else {
				console.log("Credit transaction recorded successfully");
			}

			// 4. Update computer status
			console.log(`Updating computer status for ${computerId} to in_use`);
			const computerUpdateSuccess = await this.updateComputerStatus(
				computerId,
				userId,
				"in_use"
			);
			if (!computerUpdateSuccess) {
				console.warn(
					"Could not update computer status, but continuing with session creation"
				);
			}

			// Store session in memory
			this.activeSessions.set(userId, sessionData);
			console.log(`Session stored in memory for user ${userId}`);

			// Update the auth manager's current user
			this.updateCurrentUser(updatedUser);
			console.log("Auth manager updated with new user data");

			// Log successful session start
			console.log(
				`Session started successfully. Session ID: ${sessionData.id}, User ID: ${userId}`
			);

			return {
				success: true,
				message: "Session started successfully",
				sessionData: sessionData,
				userData: updatedUser,
			};
		} catch (error) {
			console.error("Unexpected error starting session:", error);
			console.error("Error details:", {
				name: error.name,
				message: error.message,
				stack: error.stack,
			});
			return {
				success: false,
				message: "An unexpected error occurred while starting your session",
			};
		}
	}

	/**
	 * Extend an existing session
	 * @param {string} sessionId - The session ID to extend
	 * @param {string} userId - The user ID
	 * @param {number} durationMinutes - Additional minutes to add
	 * @param {number} credits - Credits to be deducted
	 * @returns {Promise<{success: boolean, message: string, sessionData: object, userData: object}>}
	 */
	async extendSession(sessionId, userId, durationMinutes, credits) {
		try {
			console.log(
				`Extending session ${sessionId} for user ${userId}, additional duration: ${durationMinutes} minutes, credits: ${credits}`
			);

			// Check if the session exists and is active
			const { data: session, error: sessionError } = await supabase
				.from("sessions")
				.select("*")
				.eq("id", sessionId)
				.eq("is_active", true)
				.single();

			if (sessionError || !session) {
				console.error("Error fetching session:", sessionError);
				return {
					success: false,
					message: "Session not found or not active",
				};
			}

			// Verify the session belongs to the user
			if (session.user_id !== userId) {
				return {
					success: false,
					message: "This session does not belong to you",
				};
			}

			// Fetch user to check credit balance
			const { data: user, error: userError } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (userError || !user) {
				console.error("Error fetching user:", userError);
				return {
					success: false,
					message: "User not found",
				};
			}

			// Check if user has enough credits
			if (user.credits < credits) {
				return {
					success: false,
					message: "You don't have enough credits for this extension",
				};
			}

			// Calculate new end time - add a buffer of 10 seconds to account for processing delay
			const currentEndTime = new Date(session.end_time);
			const newEndTime = new Date(
				currentEndTime.getTime() + durationMinutes * 60 * 1000 + 10000
			);

			// Start transaction
			// 1. Update session record
			const { data: updatedSession, error: updateError } = await supabase
				.from("sessions")
				.update({
					end_time: newEndTime.toISOString(),
					duration_minutes: session.duration_minutes + durationMinutes,
					credits_used: session.credits_used + credits,
				})
				.eq("id", sessionId)
				.select()
				.single();

			if (updateError) {
				console.error("Error updating session:", updateError);
				return {
					success: false,
					message: "Failed to update session",
				};
			}

			// 2. Deduct credits from user
			const { data: updatedUser, error: creditError } = await supabase
				.from("profiles")
				.update({ credits: user.credits - credits })
				.eq("id", userId)
				.select()
				.single();

			if (creditError) {
				console.error("Error updating user credits:", creditError);

				// Try to roll back session update
				await supabase
					.from("sessions")
					.update({
						end_time: session.end_time,
						duration_minutes: session.duration_minutes,
						credits_used: session.credits_used,
					})
					.eq("id", sessionId);

				return {
					success: false,
					message: "Failed to update credits",
				};
			}

			// 3. Record credit transaction
			const { error: transactionError } = await supabase
				.from("credit_transactions")
				.insert({
					user_id: userId,
					amount: -credits,
					transaction_type: "session_extension",
					description: `Session extension for ${durationMinutes} minutes`,
					session_id: sessionId,
				});

			if (transactionError) {
				console.error("Error recording transaction:", transactionError);
				// Non-critical error, continue anyway
			}

			// Update the stored session
			this.activeSessions.set(userId, updatedSession);

			// Update the auth manager's current user
			this.updateCurrentUser(updatedUser);

			return {
				success: true,
				message: "Session extended successfully",
				sessionData: updatedSession,
				userData: updatedUser,
			};
		} catch (error) {
			console.error("Unexpected error extending session:", error);
			return {
				success: false,
				message: "An unexpected error occurred while extending your session",
			};
		}
	}

	/**
	 * End a session
	 * @param {string} sessionId - The session ID to end
	 * @param {string} userId - The user ID
	 * @returns {Promise<{success: boolean, message: string, userData: object}>}
	 */
	async endSession(sessionId, userId) {
		try {
			console.log(`Ending session ${sessionId} for user ${userId}`);

			// Check if the session exists and is active
			const { data: session, error: sessionError } = await supabase
				.from("sessions")
				.select("*")
				.eq("id", sessionId)
				.eq("is_active", true)
				.single();

			if (sessionError || !session) {
				console.error("Error fetching session:", sessionError);
				return {
					success: false,
					message: "Session not found or not active",
				};
			}

			// Verify the session belongs to the user
			if (session.user_id !== userId) {
				return {
					success: false,
					message: "This session does not belong to you",
				};
			}

			// Update session to inactive
			const { error: updateError } = await supabase
				.from("sessions")
				.update({
					is_active: false,
					end_time: new Date().toISOString(),
				})
				.eq("id", sessionId);

			if (updateError) {
				console.error("Error ending session:", updateError);
				return {
					success: false,
					message: "Failed to end session",
				};
			}

			// Update computer status
			await this.updateComputerStatus(session.computer_id, null, "available");

			// Remove from active sessions
			this.activeSessions.delete(userId);

			// Fetch updated user data
			const { data: updatedUser, error: userError } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (userError) {
				console.error("Error fetching updated user data:", userError);
				// Non-critical error, continue anyway
			}

			// Update the auth manager's current user
			if (updatedUser) {
				this.updateCurrentUser(updatedUser);
			}

			return {
				success: true,
				message: "Session ended successfully",
				userData: updatedUser || null,
			};
		} catch (error) {
			console.error("Unexpected error ending session:", error);
			return {
				success: false,
				message: "An unexpected error occurred while ending your session",
			};
		}
	}

	/**
	 * Get active session for a user
	 * @param {string} userId - The user ID
	 * @returns {Promise<{success: boolean, sessionData: object}>}
	 */
	async getActiveSession(userId) {
		try {
			console.log(`Getting active session for user ${userId}`);

			// Check if we have the session in memory
			if (this.activeSessions.has(userId)) {
				return {
					success: true,
					sessionData: this.activeSessions.get(userId),
				};
			}

			// If not in memory, check the database
			const { data: session, error: sessionError } = await supabase
				.from("sessions")
				.select("*")
				.eq("user_id", userId)
				.eq("is_active", true)
				.single();

			if (sessionError) {
				console.log("No active session found for user");
				return {
					success: false,
					message: "No active session found",
				};
			}

			// Store session in memory for future reference
			this.activeSessions.set(userId, session);

			return {
				success: true,
				sessionData: session,
			};
		} catch (error) {
			console.error("Unexpected error getting active session:", error);
			return {
				success: false,
				message: "An unexpected error occurred while retrieving your session",
			};
		}
	}

	/**
	 * Get transaction history for a user
	 * @param {string} userId - The user ID
	 * @param {number} limit - Maximum number of transactions to return (default 10)
	 * @returns {Promise<{success: boolean, transactions: Array}>}
	 */
	async getTransactionHistory(userId, limit = 10) {
		try {
			console.log(
				`Getting transaction history for user ${userId}, limit: ${limit}`
			);

			const { data: transactions, error } = await supabase
				.from("credit_transactions")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.limit(limit);

			if (error) {
				console.error("Error fetching transaction history:", error);
				return {
					success: false,
					message: "Failed to fetch transaction history",
				};
			}

			return {
				success: true,
				transactions: transactions,
			};
		} catch (error) {
			console.error("Unexpected error getting transaction history:", error);
			return {
				success: false,
				message:
					"An unexpected error occurred while retrieving your transaction history",
			};
		}
	}

	/**
	 * Helper: Get computer ID
	 * Gets a unique computer identifier for the current machine
	 * @returns {Promise<string>} - Computer ID
	 */
	async getComputerId() {
		try {
			// For a production system, you would use a hardware identifier like:
			// - MAC address
			// - Serial number
			// - TPM identifier
			// - Or a combination of hardware identifiers

			// We'll use a more robust approach that simulates getting a unique computer ID
			// In a real-world implementation, you could use node libraries like:
			// - node-machine-id
			// - systeminformation
			// - os module combined with unique hardware info

			// For this implementation, we'll use a consistent ID based on some
			// environment info to make it somewhat persistent between app restarts
			const os = require("os");

			// Get some system identifiers
			const hostname = os.hostname();
			const username = os.userInfo().username;
			const platform = os.platform();
			const arch = os.arch();

			// Create a semi-persistent ID (this would be replaced with hardware-based ID in production)
			const idBase = `${hostname}-${username}-${platform}-${arch}`;

			// Create a hash-like string from the base ID
			let computerId = "";
			let sum = 0;

			for (let i = 0; i < idBase.length; i++) {
				sum += idBase.charCodeAt(i);
			}

			// Generate a more readable ID with COMP prefix and numbers
			computerId = `COMP${(sum % 10000).toString().padStart(4, "0")}`;

			console.log(
				`Generated computer ID: ${computerId} based on local system information`
			);

			// Check if computer exists in database, if not create it
			const { data: existingComputer } = await supabase
				.from("computers")
				.select("id")
				.eq("id", computerId)
				.single();

			if (!existingComputer) {
				// Create computer record
				await supabase.from("computers").insert({
					id: computerId,
					name: `Computer ${hostname}`,
					location: "Main Lab",
					status: "available",
				});
				console.log(`Created new computer record for ${computerId}`);
			}

			return computerId;
		} catch (error) {
			console.error("Error generating computer ID:", error);
			// Fallback to a random ID if we can't get system info
			const randomId = Math.floor(Math.random() * 10000)
				.toString()
				.padStart(4, "0");
			return `COMP${randomId}`;
		}
	}

	/**
	 * Helper: Update computer status
	 * @param {string} computerId - Computer ID
	 * @param {string} userId - User ID (null if computer is available)
	 * @param {string} status - Status (available, in_use, maintenance, etc.)
	 * @returns {Promise<boolean>} - Success or failure
	 */
	async updateComputerStatus(computerId, userId, status) {
		try {
			console.log(
				`Updating computer ${computerId} status to ${status} for user ${
					userId || "none"
				}`
			);

			// Validate input parameters
			if (!computerId) {
				console.error("Computer ID is required to update status");
				return false;
			}

			// Define valid statuses to prevent invalid states
			const validStatuses = ["available", "in_use", "maintenance", "offline"];
			if (!validStatuses.includes(status)) {
				console.error(
					`Invalid status: ${status}. Must be one of: ${validStatuses.join(
						", "
					)}`
				);
				status = "available"; // Default to available if invalid
			}

			// Update the computer record
			const { data, error } = await supabase
				.from("computers")
				.update({
					status: status,
					last_user_id: userId,
					last_active: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq("id", computerId)
				.select()
				.single();

			if (error) {
				console.error("Error updating computer status:", error);
				return false;
			}

			console.log(
				`Computer ${computerId} status updated successfully to ${status}`
			);
			return true;
		} catch (error) {
			console.error("Unexpected error updating computer status:", error);
			// Non-critical error, continue anyway
			return false;
		}
	}

	/**
	 * Update the current user data in the auth manager
	 * @param {Object} userData - Updated user data
	 */
	updateCurrentUser(userData) {
		// Make sure authManager is properly imported
		if (!authManager) {
			console.error("Auth manager is not available for user update");
			return;
		}

		// Update the user data in auth manager
		console.log("Updating current user data in auth manager:", userData);
		authManager.setCurrentUser(userData);
	}
}

const sessionManager = new SessionManager();

module.exports = { sessionManager };
