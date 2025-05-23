import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Database } from "@/lib/database.types";
import { ActiveUserData } from "@/components/user-table";

// Define the type for the session data we get from Supabase
export type SessionWithProfile =
	Database["public"]["Tables"]["sessions"]["Row"] & {
		user_email?: string;
	};

/**
 * Fetches active sessions from Supabase
 * @param limit Optional limit for the number of sessions to fetch
 * @returns Active sessions data and statistics
 */
export async function fetchActiveSessions(limit?: number) {
	try {
		const now = new Date().toISOString();

		// First, get active sessions
		let query = supabase
			.from("sessions")
			.select(
				`
        id,
        user_id,
        computer_id,
        start_time,
        end_time,
        duration_minutes,
        credits_used,
        is_active
      `
			)
			.eq("is_active", true)
			.lte("start_time", now)
			.or(`end_time.gt.${now},end_time.is.null`);

		// Apply limit if provided
		if (limit) {
			query = query.limit(limit);
		}

		// Execute the query
		const { data: sessionData, error: sessionError } = await query;

		if (sessionError) {
			console.error("Error fetching active sessions:", sessionError);
			return {
				sessions: [],
				stats: { activeCount: 0, averageTimeLeft: "0h 0m", sessionValue: 0 },
			};
		}

		// Now get user emails from profiles table for these sessions
		const userIds = sessionData.map((session) => session.user_id);

		// Only query profiles if we have user IDs
		let userEmails = {};
		if (userIds.length > 0) {
			const { data: profilesData, error: profilesError } = await supabase
				.from("profiles")
				.select("id, username")
				.in("id", userIds);

			if (!profilesError && profilesData) {
				// Create a map of user_id -> email
				userEmails = profilesData.reduce((acc, profile) => {
					acc[profile.id] = profile.username || "Unknown";
					return acc;
				}, {});
			} else if (profilesError) {
				console.error("Error fetching profiles:", profilesError);
			}
		}

		// Combine session data with user emails
		const sessions = sessionData.map((session) => ({
			...session,
			user_email: userEmails[session.user_id] || "Unknown",
		})) as SessionWithProfile[];

		// Transform the data to match ActiveUserData interface
		const formattedSessions: ActiveUserData[] = sessions.map((session) => {
			// Calculate if session is expiring soon (within 30 minutes)
			const endTime = session.end_time ? new Date(session.end_time) : null;
			const isExpiringSoon = endTime
				? endTime.getTime() - new Date().getTime() < 30 * 60 * 1000
				: false;

			return {
				id: session.id,
				email: session.user_email || "Unknown",
				computerId: session.computer_id,
				startTime: format(new Date(session.start_time), "hh:mm a"),
				expiryTime: session.end_time
					? format(new Date(session.end_time), "hh:mm a")
					: "No Limit",
				status: isExpiringSoon ? "Expiring Soon" : "Active",
			};
		});

		// Get total count of active users
		const { count, error: countError } = await supabase
			.from("sessions")
			.select("*", { count: "exact", head: true })
			.eq("is_active", true)
			.lte("start_time", now)
			.or(`end_time.gt.${now},end_time.is.null`);

		const activeCount =
			!countError && count !== null ? count : formattedSessions.length;

		// Calculate average time left
		let totalMinutesLeft = 0;
		const now2 = new Date();

		sessions.forEach((session) => {
			if (session.end_time) {
				const endTime = new Date(session.end_time);
				const minutesLeft = Math.max(
					0,
					(endTime.getTime() - now2.getTime()) / (1000 * 60)
				);
				totalMinutesLeft += minutesLeft;
			}
		});

		const avgMinutesLeft =
			activeCount > 0 ? Math.round(totalMinutesLeft / activeCount) : 0;
		const hours = Math.floor(avgMinutesLeft / 60);
		const minutes = Math.round(avgMinutesLeft % 60);
		const averageTimeLeft = `${hours}h ${minutes}m`;

		// Calculate total session value (assuming each credit is worth $0.10)
		const sessionValue =
			sessions.reduce((total, session) => total + session.credits_used, 0) *
			0.1;

		return {
			sessions: formattedSessions,
			stats: {
				activeCount,
				averageTimeLeft,
				sessionValue,
			},
		};
	} catch (error) {
		console.error("Error in fetchActiveSessions:", error);
		return {
			sessions: [],
			stats: {
				activeCount: 0,
				averageTimeLeft: "0h 0m",
				sessionValue: 0,
			},
		};
	}
}
