// Supabase client and authentication functions
let supabaseClient = null;
let currentUser = null;

// Initialize Supabase client
function initializeSupabase() {
	if (!validateConfig()) {
		return false;
	}

	try {
		supabaseClient = supabase.createClient(
			CONFIG.SUPABASE_URL,
			CONFIG.SUPABASE_ANON_KEY
		);
		return true;
	} catch (error) {
		console.error("Failed to initialize Supabase:", error);
		return false;
	}
}

// Authentication functions
const Auth = {
	async signIn(email, password) {
		try {
			const { data, error } = await supabaseClient.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				throw error;
			}

			// Check if user is admin
			const isAdmin = await this.checkIsAdmin(data.user.id);
			if (!isAdmin) {
				await this.signOut();
				throw new Error("Access denied. Admin privileges required.");
			}

			currentUser = data.user;
			return { user: data.user, error: null };
		} catch (error) {
			return { user: null, error };
		}
	},

	async signOut() {
		try {
			const { error } = await supabaseClient.auth.signOut();
			currentUser = null;
			return { error };
		} catch (error) {
			return { error };
		}
	},

	async getCurrentUser() {
		try {
			const { data, error } = await supabaseClient.auth.getUser();
			if (data.user) {
				currentUser = data.user;
			}
			return { user: data.user, error };
		} catch (error) {
			return { user: null, error };
		}
	},

	async checkIsAdmin(userId) {
		try {
			const { data, error } = await supabaseClient
				.from("profiles")
				.select("is_admin")
				.eq("id", userId)
				.single();

			if (error || !data) {
				return false;
			}

			return data.is_admin === true;
		} catch (error) {
			console.error("Error checking admin status:", error);
			return false;
		}
	},
};

// Data fetching functions
const DataService = {
	// Expire sessions that have passed their end time
	async expireOldSessions() {
		try {
			const now = new Date();

			// First, get sessions that should be expired
			const { data: sessionsToExpire, error: fetchError } = await supabaseClient
				.from("sessions")
				.select("id, start_time, duration_minutes, end_time")
				.eq("is_active", true);

			if (fetchError) {
				console.warn("Error fetching sessions for expiration:", fetchError);
				return 0;
			}

			if (!sessionsToExpire || sessionsToExpire.length === 0) {
				return 0;
			}

			// Filter sessions that have expired
			const expiredSessionIds = sessionsToExpire
				.filter((session) => {
					let endTime;
					if (session.end_time) {
						endTime = new Date(session.end_time);
					} else {
						// Calculate end time from start_time + duration
						const startTime = new Date(session.start_time);
						endTime = new Date(
							startTime.getTime() + session.duration_minutes * 60 * 1000
						);
					}
					return endTime < now;
				})
				.map((session) => session.id);

			if (expiredSessionIds.length === 0) {
				return 0;
			}

			// Update expired sessions
			const { error: updateError } = await supabaseClient
				.from("sessions")
				.update({
					is_active: false,
					end_time: now.toISOString(),
				})
				.in("id", expiredSessionIds);

			if (updateError) {
				console.warn("Error expiring sessions:", updateError);
				return 0;
			}

			console.log(`Expired ${expiredSessionIds.length} sessions`);
			return expiredSessionIds.length;
		} catch (error) {
			console.error("Error in expireOldSessions:", error);
			return 0;
		}
	},

	// Dashboard data
	async getDashboardStats() {
		try {
			// First, expire old sessions
			await this.expireOldSessions();

			// Get active users count
			const { data: activeSessions, error: activeError } = await supabaseClient
				.from("sessions")
				.select("*")
				.eq("is_active", true);

			if (activeError) throw activeError;

			// Get total credits
			const { data: profiles, error: profilesError } = await supabaseClient
				.from("profiles")
				.select("credits");

			if (profilesError) throw profilesError;

			const totalCredits = profiles.reduce(
				(sum, profile) => sum + profile.credits,
				0
			);

			// Get average session duration (last 30 days)
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const { data: completedSessions, error: sessionsError } =
				await supabaseClient
					.from("sessions")
					.select("duration_minutes")
					.eq("is_active", false)
					.gte("start_time", thirtyDaysAgo.toISOString());

			if (sessionsError) throw sessionsError;

			const avgDuration =
				completedSessions.length > 0
					? completedSessions.reduce(
							(sum, session) => sum + session.duration_minutes,
							0
					  ) / completedSessions.length
					: 0;

			// Get today's revenue
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const { data: todaySessions, error: revenueError } = await supabaseClient
				.from("sessions")
				.select("credits_used, user_id")
				.gte("start_time", today.toISOString());

			if (revenueError) throw revenueError;

			const todayRevenue =
				todaySessions.reduce((sum, session) => sum + session.credits_used, 0) *
				CONFIG.PRICING.PER_MINUTE;
			const uniqueUsers = new Set(todaySessions.map((s) => s.user_id)).size;

			return {
				activeUsers: activeSessions.length,
				totalCredits,
				avgSessionDuration: Math.round(avgDuration),
				todayRevenue: todayRevenue,
				todayUserCount: uniqueUsers,
			};
		} catch (error) {
			console.error("Error fetching dashboard stats:", error);
			throw error;
		}
	},

	// Active sessions
	async getActiveSessions() {
		try {
			// First, expire old sessions
			await this.expireOldSessions();

			const { data: sessions, error } = await supabaseClient
				.from("sessions")
				.select(
					`
                    *,
                    profiles!inner(username, first_name, last_name)
                `
				)
				.eq("is_active", true)
				.order("start_time", { ascending: false });

			if (error) throw error;

			const now = new Date();
			const transformedSessions = sessions.map((session) => {
				const startTime = new Date(session.start_time);
				const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
				const remainingMinutes = Math.max(
					0,
					session.duration_minutes - elapsedMinutes
				);

				return {
					id: session.id,
					username: session.profiles.username,
					name:
						`${session.profiles.first_name || ""} ${
							session.profiles.last_name || ""
						}`.trim() || "No Name",
					computer: session.computer_id,
					startTime: startTime.toLocaleTimeString(),
					timeLeft: this.formatDuration(remainingMinutes),
					creditsUsed: session.credits_used,
					status: remainingMinutes > 0 ? "Active" : "Expired",
				};
			});

			// Calculate stats
			const averageTimeLeft =
				transformedSessions.length > 0
					? transformedSessions.reduce((sum, session) => {
							const timeLeft = this.parseDuration(session.timeLeft);
							return sum + timeLeft;
					  }, 0) / transformedSessions.length
					: 0;

			const sessionValue = transformedSessions.reduce(
				(sum, session) => sum + session.creditsUsed * CONFIG.PRICING.PER_MINUTE,
				0
			);

			return {
				sessions: transformedSessions,
				stats: {
					activeCount: transformedSessions.length,
					averageTimeLeft: this.formatDuration(Math.round(averageTimeLeft)),
					sessionValue,
				},
			};
		} catch (error) {
			console.error("Error fetching active sessions:", error);
			throw error;
		}
	},

	// All users
	async getAllUsers() {
		try {
			// First, expire old sessions to ensure accurate active status
			await this.expireOldSessions();

			// Get all profiles
			const { data: profiles, error } = await supabaseClient
				.from("profiles")
				.select("*")
				.order("updated_at", { ascending: false });

			if (error) throw error;

			// Get all active sessions to determine which users are actually active
			const { data: activeSessions, error: sessionsError } =
				await supabaseClient
					.from("sessions")
					.select("user_id")
					.eq("is_active", true);

			if (sessionsError) throw sessionsError;

			// Create a set of active user IDs for fast lookup
			const activeUserIds = new Set(
				activeSessions.map((session) => session.user_id)
			);

			const transformedUsers = profiles.map((profile) => {
				let lastActive = "Never";
				if (profile.updated_at) {
					const date = new Date(profile.updated_at);
					const today = new Date();
					const yesterday = new Date(today);
					yesterday.setDate(yesterday.getDate() - 1);

					if (date.toDateString() === today.toDateString()) {
						lastActive = `Today, ${date.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}`;
					} else if (date.toDateString() === yesterday.toDateString()) {
						lastActive = `Yesterday, ${date.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}`;
					} else {
						lastActive = date.toLocaleDateString([], {
							month: "short",
							day: "numeric",
							year: "numeric",
						});
					}
				}

				return {
					id: profile.id,
					username: profile.username || "",
					name:
						`${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
						"No Name",
					credits: profile.credits,
					lastActive,
					// Use the same logic as getActiveSessions - check if user has active sessions
					status: activeUserIds.has(profile.id) ? "Active" : "Inactive",
					isAdmin: profile.is_admin,
				};
			});

			return transformedUsers;
		} catch (error) {
			console.error("Error fetching all users:", error);
			throw error;
		}
	},

	// Add credits to user
	async addUserCredits(userId, creditsToAdd, reason = "") {
		try {
			// First get the current credits
			const { data: currentUser, error: getUserError } = await supabaseClient
				.from("profiles")
				.select("credits")
				.eq("id", userId)
				.single();

			if (getUserError) throw getUserError;

			const newCredits = (currentUser.credits || 0) + creditsToAdd;

			// Update the user's credits
			const { error: updateError } = await supabaseClient
				.from("profiles")
				.update({ credits: newCredits, updated_at: new Date().toISOString() })
				.eq("id", userId);

			if (updateError) throw updateError;

			// Log the transaction with the actual amount added
			const { error: transactionError } = await supabaseClient
				.from("credit_transactions")
				.insert({
					user_id: userId,
					amount: creditsToAdd, // Log the actual amount added
					transaction_type: "admin_adjustment",
					description: reason || "Admin credit addition",
					admin_id: currentUser?.id,
				});

			if (transactionError) {
				console.warn("Failed to log credit transaction:", transactionError);
				// Don't throw here, as the main update succeeded
			}

			return { success: true, newTotal: newCredits };
		} catch (error) {
			console.error("Error adding user credits:", error);
			throw error;
		}
	},

	// Update user credits
	async updateUserCredits(userId, newCredits, reason = "") {
		try {
			// Update the user's credits
			const { error: updateError } = await supabaseClient
				.from("profiles")
				.update({ credits: newCredits, updated_at: new Date().toISOString() })
				.eq("id", userId);

			if (updateError) throw updateError;

			// Log the transaction
			const { error: transactionError } = await supabaseClient
				.from("credit_transactions")
				.insert({
					user_id: userId,
					amount: newCredits, // This should ideally be the difference, but we'll store the new total
					transaction_type: "admin_adjustment",
					description: reason || "Admin credit adjustment",
					admin_id: currentUser?.id,
				});

			if (transactionError) {
				console.warn("Failed to log credit transaction:", transactionError);
				// Don't throw here, as the main update succeeded
			}

			return { success: true };
		} catch (error) {
			console.error("Error updating user credits:", error);
			throw error;
		}
	},

	// End session
	async endSession(sessionId) {
		try {
			const now = new Date();
			const { error } = await supabaseClient
				.from("sessions")
				.update({
					is_active: false,
					end_time: now.toISOString(),
				})
				.eq("id", sessionId);

			if (error) throw error;

			return { success: true };
		} catch (error) {
			console.error("Error ending session:", error);
			throw error;
		}
	},

	// Utility functions
	formatDuration(minutes) {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
	},

	parseDuration(durationStr) {
		const match = durationStr.match(/(?:(\d+)h\s*)?(\d+)m/);
		if (!match) return 0;
		const hours = parseInt(match[1]) || 0;
		const minutes = parseInt(match[2]) || 0;
		return hours * 60 + minutes;
	},
};
