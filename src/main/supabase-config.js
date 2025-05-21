const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

// First try to load from app-config
let supabaseUrl = "";
let supabaseAnonKey = "";

// Try to load configuration from multiple sources with fallbacks
try {
	// First, try to use the resource path config file in production
	const resourcePath = process.resourcesPath
		? path.join(process.resourcesPath, "config.json")
		: path.join(__dirname, "..", "..", "config.json");

	if (fs.existsSync(resourcePath)) {
		console.log("Loading configuration from resources folder:", resourcePath);
		const config = JSON.parse(fs.readFileSync(resourcePath, "utf8"));
		supabaseUrl = config.supabaseUrl;
		supabaseAnonKey = config.supabaseAnonKey;
		console.log(
			"Loaded Supabase URL from config.json:",
			supabaseUrl ? "Found" : "Not found"
		);
	} else {
		console.log("Config file not found at resources path:", resourcePath);

		// As fallback, try env file
		const dotenv = require("dotenv");
		const envPath = path.resolve(process.cwd(), ".env");
		dotenv.config({ path: envPath });

		// Load from environment variables
		supabaseUrl = process.env.VITE_SUPABASE_URL;
		supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
		console.log(
			"Loaded from environment variables:",
			supabaseUrl ? "Found" : "Not found"
		);
	}
} catch (error) {
	console.error("Error loading configuration:", error);
}

// Validate configuration
if (!supabaseUrl) {
	throw new Error("supabaseUrl is required. Please check your configuration.");
}

if (!supabaseAnonKey) {
	throw new Error(
		"supabaseAnonKey is required. Please check your configuration."
	);
}

// Create and export Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export the client for use in other files
module.exports = { supabase };
