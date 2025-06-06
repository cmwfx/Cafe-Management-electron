// Configuration file for the Cafe Management Admin Panel
// Replace these with your actual Supabase credentials

const CONFIG = {
	SUPABASE_URL: "https://hyieiahyebuzfhriawbe.supabase.co",
	SUPABASE_ANON_KEY:
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5aWVpYWh5ZWJ1emZocmlhd2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NzYzMDYsImV4cCI6MjA2MzM1MjMwNn0.RebccTbq4z7zEU700bsf7FEaFkZr4rsBU2CHPPLKJII",

	// Auto-refresh intervals (in milliseconds)
	REFRESH_INTERVALS: {
		DASHBOARD: 60000, // 1 minute
		ACTIVE_USERS: 30000, // 30 seconds
		ALL_USERS: 120000, // 2 minutes
	},

	// Pricing configuration (matches your backend configuration)
	PRICING: {
		PER_MINUTE: 0.1,
		PER_HOUR: 5.0,
		MINIMUM_MINUTES: 15,
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
