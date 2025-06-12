// Configuration file for the Gaming Cafe Management Admin Panel
// Replace these with your actual Supabase credentials

const CONFIG = {
	SUPABASE_URL: "https://hyieiahyebuzfhriawbe.supabase.co",
	SUPABASE_ANON_KEY:
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5aWVpYWh5ZWJ1emZocmlhd2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NzYzMDYsImV4cCI6MjA2MzM1MjMwNn0.RebccTbq4z7zEU700bsf7FEaFkZr4rsBU2CHPPLKJII",

	REFRESH_INTERVALS: {
		DASHBOARD: 60000, // 1 minute
		ACTIVE_USERS: 30000, // 30 seconds
		ALL_USERS: 120000, // 2 minutes
	},

	PRICING: {
		PER_MINUTE: 0.0167, // $0.10 per credit/minute
		PER_HOUR: 1.0, // $6.00 per hour (60 credits × $0.10)
		MINIMUM_MINUTES: 1, // Minimum session time in minutes

		// System Logic:
		// - Time: 1 minute = 1 credit
		// - Time: 60 minutes = 60 credits = 1 hour
		// - Money: credits_used × PER_MINUTE = total_revenue
		// - Example: 17 credits used = 17 minutes = 17 × $0.10 = $1.70
	},
};

// Validation to ensure configuration is set
function validateConfig() {
	if (
		CONFIG.SUPABASE_URL === "YOUR_SUPABASE_URL_HERE" ||
		CONFIG.SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY_HERE"
	) {
		console.error(
			"⚠️ Please update config.js with your actual Supabase credentials"
		);
		return false;
	}
	return true;
}
