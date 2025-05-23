import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

/**
 * Fetches the count of currently active users
 * @returns The number of active users
 */
export async function fetchActiveUsersCount() {
	try {
		const now = new Date().toISOString();

		// Query sessions that are currently active (current time is between start_time and end_time)
		const { count, error } = await supabase
			.from("sessions")
			.select("*", { count: "exact", head: true })
			.lte("start_time", now)
			.or(`end_time.gt.${now},end_time.is.null`)
			.eq("is_active", true);

		if (error) {
			console.error("Error fetching active users count:", error);
			return 0;
		}

		return count || 0;
	} catch (error) {
		console.error("Error in fetchActiveUsersCount:", error);
		return 0;
	}
}

/**
 * Fetches the total available credits across all user profiles
 * @returns The total credits available in the system
 */
export async function fetchTotalCredits() {
	try {
		const { data, error } = await supabase.from("profiles").select("credits");

		if (error) {
			console.error("Error fetching total credits:", error);
			return 0;
		}

		// Sum up all credits
		const totalCredits = data.reduce(
			(sum, profile) => sum + profile.credits,
			0
		);
		return totalCredits;
	} catch (error) {
		console.error("Error in fetchTotalCredits:", error);
		return 0;
	}
}

/**
 * Calculates the average session duration in minutes
 * @returns The average session duration in minutes
 */
export async function fetchAverageSessionDuration() {
	try {
		const { data, error } = await supabase
			.from("sessions")
			.select("duration_minutes");

		if (error) {
			console.error("Error fetching session durations:", error);
			return 0;
		}

		if (data.length === 0) {
			return 0;
		}

		// Calculate average duration
		const totalDuration = data.reduce(
			(sum, session) => sum + session.duration_minutes,
			0
		);
		const averageDuration = totalDuration / data.length;

		return averageDuration;
	} catch (error) {
		console.error("Error in fetchAverageSessionDuration:", error);
		return 0;
	}
}

/**
 * Formats minutes into hours and minutes string (e.g., "1h 45m")
 * @param minutes Total minutes
 * @returns Formatted string
 */
export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);
	return `${hours}h ${mins}m`;
}

/**
 * Calculates the revenue for today based on session credits used
 * @returns The total revenue for today
 */
export async function fetchTodayRevenue() {
	try {
		// Get today's date in YYYY-MM-DD format
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = today.toISOString();

		// Get tomorrow's date for the query
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const tomorrowStr = tomorrow.toISOString();

		// Query sessions created today
		const { data, error } = await supabase
			.from("sessions")
			.select("credits_used, user_id")
			.gte("created_at", todayStr)
			.lt("created_at", tomorrowStr);

		if (error) {
			console.error("Error fetching today's sessions:", error);
			return { revenue: 0, userCount: 0 };
		}

		// Calculate total credits used today
		const totalCreditsUsed = data.reduce(
			(sum, session) => sum + session.credits_used,
			0
		);

		// Convert credits to revenue (credits / 60 = revenue)
		const revenue = totalCreditsUsed / 60;

		// Count unique users
		const uniqueUserIds = new Set(data.map((session) => session.user_id));
		const userCount = uniqueUserIds.size;

		return { revenue, userCount };
	} catch (error) {
		console.error("Error in fetchTodayRevenue:", error);
		return { revenue: 0, userCount: 0 };
	}
}
