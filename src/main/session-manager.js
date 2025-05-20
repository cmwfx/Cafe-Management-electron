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
					message: "You don't have enough credits for this session",
				};
			}

			// Get computer ID (could be obtained from a more robust method)
			const computerId = await this.getComputerId();

			// Calculate end time
			const startTime = new Date();
			const endTime = new Date(
				startTime.getTime() + durationMinutes * 60 * 1000
			);

			// Start transaction
			// 1. Insert session record
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

			// 2. Deduct credits from user
			const { data: updatedUser, error: creditError } = await supabase
				.from("profiles")
				.update({ credits: user.credits - credits })
				.eq("id", userId)
				.select()
				.single();

			if (creditError) {
				console.error("Error updating user credits:", creditError);

				// Try to roll back session creation
				await supabase.from("sessions").delete().eq("id", sessionData.id);

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
					transaction_type: "session_payment",
					description: `Session payment for ${durationMinutes} minutes`,
					session_id: sessionData.id,
				});

			if (transactionError) {
				console.error("Error recording transaction:", transactionError);
				// Non-critical error, continue anyway
			}

			// Update computer status
			await this.updateComputerStatus(computerId, userId, "in_use");

			// Store session in memory
			this.activeSessions.set(userId, sessionData);

			// Update the auth manager's current user
			authManager.updateCurrentUser(updatedUser);

			return {
				success: true,
				message: "Session started successfully",
				sessionData: sessionData,
				userData: updatedUser,
			};
		} catch (error) {
			console.error("Unexpected error starting session:", error);
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

			// Calculate new end time
			const currentEndTime = new Date(session.end_time);
			const newEndTime = new Date(
				currentEndTime.getTime() + durationMinutes * 60 * 1000
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
			authManager.updateCurrentUser(updatedUser);

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
				authManager.updateCurrentUser(updatedUser);
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
	 * In a production system, this would get the actual computer identifier
	 * @returns {Promise<string>} - Computer ID
	 */
	async getComputerId() {
		// For development, generate a simple computer ID
		// In production, you would get the actual machine ID
		const computerIdPrefix = "COMP";
		const randomId = Math.floor(Math.random() * 1000)
			.toString()
			.padStart(3, "0");
		const computerId = `${computerIdPrefix}${randomId}`;

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
				name: `Computer ${randomId}`,
				location: "Main Lab",
				status: "available",
			});
		}

		return computerId;
	}

	/**
	 * Helper: Update computer status
	 * @param {string} computerId - Computer ID
	 * @param {string} userId - User ID (null if computer is available)
	 * @param {string} status - Status (available, in_use, maintenance, etc.)
	 */
	async updateComputerStatus(computerId, userId, status) {
		try {
			await supabase
				.from("computers")
				.update({
					status: status,
					last_user_id: userId,
					last_active: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq("id", computerId);
		} catch (error) {
			console.error("Error updating computer status:", error);
			// Non-critical error, continue anyway
		}
	}
}

const sessionManager = new SessionManager();

module.exports = { sessionManager };
