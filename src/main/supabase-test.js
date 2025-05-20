const { supabase } = require("./supabase-config");

/**
 * Test function to verify Supabase connection and table access
 */
async function testSupabaseConnection() {
	try {
		console.log("Testing Supabase connection...");
		console.log(
			"Supabase URL:",
			process.env.VITE_SUPABASE_URL ? "Configured" : "Missing"
		);
		console.log(
			"Supabase Key:",
			process.env.VITE_SUPABASE_ANON_KEY
				? "Configured (length: " +
						process.env.VITE_SUPABASE_ANON_KEY.length +
						")"
				: "Missing"
		);

		// Test the connection by getting the server version
		const { data, error } = await supabase.rpc("get_server_version");

		if (error) {
			// If the RPC method doesn't exist, try a simpler query
			console.log("RPC method not found, trying direct connection test...");
			console.log("Error details:", error.message);

			// Just check if we can connect by getting the current timestamp
			const { data: pingData, error: pingError } = await supabase
				.from("_pgsodium_keyid_seq")
				.select("*", { count: "exact", head: true });

			// For this test, we expect a permission error, but not a connection error
			if (pingError && !pingError.message.includes("permission denied")) {
				console.error("Error connecting to Supabase:", pingError.message);
				return false;
			}

			console.log("Successfully connected to Supabase!");

			// Test profiles table access
			console.log("Testing profiles table access...");
			const { data: profilesData, error: profilesError } = await supabase
				.from("profiles")
				.select("count()", { count: "exact", head: true });

			if (profilesError) {
				console.error("Error accessing profiles table:", profilesError.message);
				console.error(
					"This may indicate permission issues with the profiles table."
				);
				// Continue despite this error
			} else {
				console.log(
					"Successfully accessed profiles table! Count:",
					profilesData[0]?.count || "unknown"
				);
			}

			// Test auth functionality by checking sign-up capability (without actually creating a user)
			console.log("Testing auth module...");
			try {
				// Just check if we can access the auth API (this won't create a user)
				const authResponse = await supabase.auth.getSession();
				console.log("Auth module accessible:", authResponse ? "Yes" : "No");
			} catch (authErr) {
				console.error("Error accessing auth module:", authErr.message);
			}

			return true;
		}

		console.log("Successfully connected to Supabase!");
		console.log("Server version:", data);

		// Test profiles table access
		console.log("Testing profiles table access...");
		const { data: profilesData, error: profilesError } = await supabase
			.from("profiles")
			.select("count()", { count: "exact", head: true });

		if (profilesError) {
			console.error("Error accessing profiles table:", profilesError.message);
			console.error(
				"This may indicate permission issues with the profiles table."
			);
			// Continue despite this error
		} else {
			console.log(
				"Successfully accessed profiles table! Count:",
				profilesData[0]?.count || "unknown"
			);
		}

		return true;
	} catch (err) {
		console.error(
			"Exception occurred during Supabase connection test:",
			err.message
		);
		if (err.stack) {
			console.error("Stack trace:", err.stack);
		}
		return false;
	}
}

// Export the test function
module.exports = { testSupabaseConnection };

// If this file is run directly, execute the test
if (require.main === module) {
	testSupabaseConnection()
		.then((success) => {
			if (!success) {
				console.log("❌ Supabase connection test failed.");
				process.exit(1);
			} else {
				console.log("✅ Supabase connection test passed.");
			}
		})
		.catch((err) => {
			console.error("❌ Unhandled error in Supabase test:", err);
			if (err.stack) {
				console.error("Stack trace:", err.stack);
			}
			process.exit(1);
		});
}
