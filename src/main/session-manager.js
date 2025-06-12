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
				startTime.getTime() + durationMinutes * 60 * 1000 + 10000
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
				return {
					success: false,
					message: "Failed to create session record",
				};
			}

			// 2. Deduct credits from user and mark as active
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

			// 4. Update computer status
			const computerUpdateSuccess = await this.updateComputerStatus(
				computerId,
				userId,
				"in_use"
			);

			// Store session in memory
			this.activeSessions.set(userId, sessionData);

			// Update the auth manager's current user
			this.updateCurrentUser(updatedUser);

			return {
				success: true,
				message: "Session started successfully",
				sessionData: sessionData,
				userData: updatedUser,
			};
		} catch (error) {
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
			// Fetch the session - allow both active and recently expired sessions (within 5 minutes grace period)
			const { data: sessions, error: sessionError } = await supabase
				.from("sessions")
				.select("*")
				.eq("id", sessionId)
				.limit(1);

			if (sessionError || !sessions || sessions.length === 0) {
				return {
					success: false,
					message: "Session not found",
				};
			}

			const session = sessions[0];

			// Verify the session belongs to the user
			if (session.user_id !== userId) {
				return {
					success: false,
					message: "This session does not belong to you",
				};
			}

			// Check if session is within the grace period for extension
			const now = new Date();
			const endTime = new Date(session.end_time);
			const gracePeriodMs = 5 * 60 * 1000; // 5 minutes grace period
			const timeSinceExpiry = now - endTime;

			// Allow extension if:
			// 1. Session is still active, OR
			// 2. Session expired within the grace period
			const canExtend =
				session.is_active ||
				(timeSinceExpiry <= gracePeriodMs && timeSinceExpiry >= 0);

			if (!canExtend) {
				return {
					success: false,
					message: "Session has expired beyond the extension grace period",
				};
			}

			// Fetch user to check credit balance
			const { data: user, error: userError } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (userError || !user) {
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

			// Calculate new end time - add duration from current end time or now (whichever is later)
			const extensionStartTime = endTime > now ? endTime : now;
			const newEndTime = new Date(
				extensionStartTime.getTime() + durationMinutes * 60 * 1000
			);

			// Start transaction
			// 1. Try to use the stored procedure first for better permission handling
			let sessionUpdateSuccess = false;
			let updatedSession = null;

			try {
				const { data: rpcResult, error: rpcError } = await supabase.rpc(
					"extend_user_session",
					{
						session_id: sessionId,
						end_user_id: userId,
						new_end_time: newEndTime.toISOString(),
						new_duration_minutes: session.duration_minutes + durationMinutes,
						new_credits_used: session.credits_used + credits,
					}
				);

				if (!rpcError && rpcResult) {
					sessionUpdateSuccess = true;

					// Fetch the updated session
					const { data: updatedSessionData, error: fetchError } = await supabase
						.from("sessions")
						.select("*")
						.eq("id", sessionId)
						.single();

					if (!fetchError && updatedSessionData) {
						updatedSession = updatedSessionData;
					}
				}
			} catch (rpcErr) {
				console.log("RPC method failed, trying direct update:", rpcErr);
			}

			// 2. Fallback to direct update if RPC failed
			if (!sessionUpdateSuccess) {
				const { data: directUpdateResult, error: updateError } = await supabase
					.from("sessions")
					.update({
						is_active: true, // Reactivate the session if it was marked inactive
						end_time: newEndTime.toISOString(),
						duration_minutes: session.duration_minutes + durationMinutes,
						credits_used: session.credits_used + credits,
					})
					.eq("id", sessionId)
					.select()
					.single();

				if (updateError) {
					return {
						success: false,
						message: "Failed to update session",
					};
				}

				updatedSession = directUpdateResult;
				sessionUpdateSuccess = true;
			}

			if (!sessionUpdateSuccess) {
				return {
					success: false,
					message: "Failed to update session",
				};
			}

			// 3. Deduct credits from user
			const { data: updatedUser, error: creditError } = await supabase
				.from("profiles")
				.update({ credits: user.credits - credits })
				.eq("id", userId)
				.select()
				.single();

			if (creditError) {
				// Try to roll back session update
				await supabase
					.from("sessions")
					.update({
						is_active: session.is_active, // Restore original state
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

			// 4. Record credit transaction
			const { error: transactionError } = await supabase
				.from("credit_transactions")
				.insert({
					user_id: userId,
					amount: -credits,
					transaction_type: "session_extension",
					description: `Session extension for ${durationMinutes} minutes`,
					session_id: sessionId,
				});

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
			console.log(
				`[SessionManager] Attempting to end session ${sessionId} for user ${userId}`
			);

			// Check if the session exists and is active
			const { data: session, error: sessionError } = await supabase
				.from("sessions")
				.select("*")
				.eq("id", sessionId)
				.eq("is_active", true)
				.single();

			if (sessionError) {
				console.error(`[SessionManager] Session lookup error:`, sessionError);
				// Even if we can't find the session, we should still clean up and logout
			}

			if (!session && !sessionError) {
				console.log(
					`[SessionManager] No active session found with ID ${sessionId}`
				);
				// Still continue with cleanup
			}

			// Verify the session belongs to the user (if we found it)
			if (session && session.user_id !== userId) {
				console.log(
					`[SessionManager] Session user mismatch: expected ${userId}, got ${session.user_id}`
				);
				return {
					success: false,
					message: "This session does not belong to you",
				};
			}

			console.log(
				`[SessionManager] Session found, attempting to update to inactive`
			);

			// Try multiple approaches to update the session
			let sessionUpdateSuccess = false;
			const currentTime = new Date().toISOString();

			// Approach 1: Try with user context (using RPC function)
			try {
				const { data: rpcResult, error: rpcError } = await supabase.rpc(
					"end_user_session",
					{
						session_id: sessionId,
						end_user_id: userId,
					}
				);

				if (!rpcError) {
					sessionUpdateSuccess = true;
					console.log(`[SessionManager] Session ended successfully using RPC`);
				} else {
					console.log(
						`[SessionManager] RPC method failed, trying direct update:`,
						rpcError
					);
				}
			} catch (rpcErr) {
				console.log(
					`[SessionManager] RPC method not available, trying direct update`
				);
			}

			// Approach 2: If RPC failed, try direct update
			if (!sessionUpdateSuccess) {
				try {
					const { error: updateError } = await supabase
						.from("sessions")
						.update({
							is_active: false,
							end_time: currentTime,
						})
						.eq("id", sessionId)
						.eq("user_id", userId); // Add user_id filter for security

					if (updateError) {
						console.error(
							`[SessionManager] Failed to update session in database:`,
							updateError
						);
						console.log(
							`[SessionManager] Continuing with local cleanup despite database error`
						);
					} else {
						sessionUpdateSuccess = true;
						console.log(
							`[SessionManager] Session updated successfully in database`
						);
					}
				} catch (dbError) {
					console.error(`[SessionManager] Database update exception:`, dbError);
					console.log(
						`[SessionManager] Continuing with local cleanup despite database exception`
					);
				}
			}

			// Always try to update computer status, but don't fail if it doesn't work
			if (session) {
				try {
					await this.updateComputerStatus(
						session.computer_id,
						null,
						"available"
					);
					console.log(`[SessionManager] Computer status updated successfully`);
				} catch (computerError) {
					console.error(
						`[SessionManager] Failed to update computer status:`,
						computerError
					);
				}
			}

			// Always remove from active sessions in memory
			this.activeSessions.delete(userId);
			console.log(
				`[SessionManager] Removed session from memory for user ${userId}`
			);

			// Try to fetch updated user data, but don't fail if we can't
			let updatedUser = null;
			try {
				const { data: userResult, error: userError } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", userId)
					.single();

				if (userError) {
					console.error(
						`[SessionManager] Failed to fetch updated user data:`,
						userError
					);
				} else {
					updatedUser = userResult;
				}
			} catch (userFetchError) {
				console.error(
					`[SessionManager] Exception fetching user data:`,
					userFetchError
				);
			}

			// Update the auth manager's current user if we have the data
			if (updatedUser) {
				this.updateCurrentUser(updatedUser);
			}

			// Always return success for local cleanup, even if database operations failed
			console.log(
				`[SessionManager] Session cleanup completed for user ${userId} (DB update: ${
					sessionUpdateSuccess ? "success" : "failed but continued"
				})`
			);

			return {
				success: true,
				message: sessionUpdateSuccess
					? "Session ended successfully"
					: "Session ended locally (database update failed but cleanup completed)",
				userData: updatedUser || null,
			};
		} catch (error) {
			console.error(`[SessionManager] Unexpected error ending session:`, error);

			// Even if there's an unexpected error, try to clean up locally
			this.activeSessions.delete(userId);
			console.log(
				`[SessionManager] Emergency cleanup - removed session from memory for user ${userId}`
			);

			return {
				success: true, // Return success to allow logout to proceed
				message: `Session cleanup completed despite errors: ${error.message}`,
				userData: null,
			};
		}
	}

	/**
	 * Get active session for a user
	 * @param {string} userId - The user ID
	 * @param {boolean} allowGracePeriod - Whether to include sessions within grace period (default: false)
	 * @returns {Promise<{success: boolean, sessionData: object}>}
	 */
	async getActiveSession(userId, allowGracePeriod = false) {
		try {
			// Check if we have the session in memory
			if (this.activeSessions.has(userId)) {
				const memorySession = this.activeSessions.get(userId);

				// If allowing grace period, check if the session is still valid
				if (allowGracePeriod) {
					const now = new Date();
					const endTime = new Date(memorySession.end_time);
					const gracePeriodMs = 5 * 60 * 1000; // 5 minutes grace period
					const timeSinceExpiry = now - endTime;

					// Still valid if not expired or within grace period
					if (endTime >= now || timeSinceExpiry <= gracePeriodMs) {
						return {
							success: true,
							sessionData: memorySession,
						};
					}
				} else if (new Date(memorySession.end_time) >= new Date()) {
					// Normal check - session must not be expired
					return {
						success: true,
						sessionData: memorySession,
					};
				}
			}

			// If not in memory, check the database
			const { data: session, error: sessionError } = await supabase
				.from("sessions")
				.select("*")
				.eq("user_id", userId)
				.eq("is_active", true)
				.order("created_at", { ascending: false })
				.limit(1)
				.single();

			if (sessionError) {
				// No active session found
				return {
					success: false,
					message: "No active session found",
				};
			}

			// Check if the session is expired
			const now = new Date();
			const endTime = new Date(session.end_time);
			const gracePeriodMs = 5 * 60 * 1000; // 5 minutes grace period
			const timeSinceExpiry = now - endTime;

			if (endTime < now) {
				// Session has expired
				if (allowGracePeriod && timeSinceExpiry <= gracePeriodMs) {
					// Within grace period - don't mark as inactive, return the session
					this.activeSessions.set(userId, session);
					return {
						success: true,
						sessionData: session,
					};
				} else {
					// Expired beyond grace period - mark as inactive
					await supabase
						.from("sessions")
						.update({
							is_active: false,
						})
						.eq("id", session.id);

					return {
						success: false,
						message: "Session has expired",
					};
				}
			}

			// Store the session in memory for faster access next time
			this.activeSessions.set(userId, session);

			return {
				success: true,
				sessionData: session,
			};
		} catch (error) {
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
			const { data: transactions, error } = await supabase
				.from("credit_transactions")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.limit(limit);

			if (error) {
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
			}

			return computerId;
		} catch (error) {
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
			// Validate input parameters
			if (!computerId) {
				return false;
			}

			// Define valid statuses to prevent invalid states
			const validStatuses = ["available", "in_use", "maintenance", "offline"];
			if (!validStatuses.includes(status)) {
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
				return false;
			}

			return true;
		} catch (error) {
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
			return;
		}

		// Update the user data in auth manager
		authManager.setCurrentUser(userData);
	}
}

const sessionManager = new SessionManager();

module.exports = { sessionManager };
