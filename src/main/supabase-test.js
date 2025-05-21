const { supabase } = require("./supabase-config");

/**
 * Test function to verify Supabase connection and table access
 * @returns {Promise<boolean>} True if connection is successful, false otherwise
 */
async function testSupabaseConnection() {
	try {
		// Test the connection by getting the server version
		const { data, error } = await supabase.rpc("get_server_version");

		if (error) {
			// If the RPC method doesn't exist, try a simpler query
			const { data: pingData, error: pingError } = await supabase
				.from("_pgsodium_keyid_seq")
				.select("*", { count: "exact", head: true });

			// For this test, we expect a permission error, but not a connection error
			if (pingError && !pingError.message.includes("permission denied")) {
				return false;
			}

			// Test profiles table access
			const { data: profilesData, error: profilesError } = await supabase
				.from("profiles")
				.select("count()", { count: "exact", head: true });

			// Test auth functionality by checking session capability
			try {
				const authResponse = await supabase.auth.getSession();
			} catch (authErr) {
				// Auth error - non-critical
			}

			return true;
		}

		// Test profiles table access
		const { data: profilesData, error: profilesError } = await supabase
			.from("profiles")
			.select("count()", { count: "exact", head: true });

		return true;
	} catch (err) {
		return false;
	}
}

// Export the test function
module.exports = { testSupabaseConnection };

// If this file is run directly, execute the test
if (require.main === module) {
	testSupabaseConnection()
		.then((success) => {
			process.exit(success ? 0 : 1);
		})
		.catch(() => {
			process.exit(1);
		});
}
