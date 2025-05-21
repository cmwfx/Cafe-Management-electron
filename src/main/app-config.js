/**
 * app-config.js
 * This file handles application configuration for both development and production builds.
 * It ensures environment variables are properly loaded in different environments.
 */

const path = require("path");
const fs = require("fs");

// Default configuration
const defaultConfig = {
	// Supabase configuration
	supabaseUrl: "",
	supabaseAnonKey: "",

	// Application settings
	kioskMode: true,
	devMode: false,

	// Session settings
	initialCredits: 100,
	creditsPerMinute: 1,
};

// Load production configuration
let prodConfig = {};
try {
	// Look for a config.json file in the application directory
	const configPath = path.join(
		process.resourcesPath || __dirname,
		"config.json"
	);
	if (fs.existsSync(configPath)) {
		const configData = fs.readFileSync(configPath, "utf8");
		prodConfig = JSON.parse(configData);
	}
} catch (err) {
	console.error("Error loading production config:", err);
}

// Load development environment variables
let devConfig = {};
try {
	if (process.env.NODE_ENV === "development") {
		// In development, use dotenv to load from .env file
		require("dotenv").config();

		devConfig = {
			supabaseUrl: process.env.VITE_SUPABASE_URL,
			supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
			devMode: true,
			kioskMode: false,
		};
	}
} catch (err) {
	console.error("Error loading development config:", err);
}

// Merge configurations with priority: production > development > default
const appConfig = {
	...defaultConfig,
	...devConfig,
	...prodConfig,
};

// Make sure we have required config values
if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
	console.error(
		"WARNING: Missing Supabase configuration. Application may not function correctly."
	);
}

module.exports = appConfig;
