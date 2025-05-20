// Script to apply Supabase fixes using the API
require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// Read SQL files
const triggerFixSQL = fs.readFileSync(
	"./src/main/supabase-schema-fix-updated.sql",
	"utf8"
);
const policyFixSQL = fs.readFileSync("./fix-profiles-policy.sql", "utf8");

async function applySupabaseFixes() {
	console.log("Starting Supabase fixes application...");

	// Create Supabase client
	const supabase = createClient(
		process.env.VITE_SUPABASE_URL,
		process.env.VITE_SUPABASE_ANON_KEY
	);

	try {
		// Test connection
		console.log("Testing Supabase connection...");
		const { data: sessionData, error: sessionError } =
			await supabase.auth.getSession();
		if (sessionError) {
			console.error("Error connecting to Supabase:", sessionError.message);
			return;
		}
		console.log("Successfully connected to Supabase");

		// Apply trigger fix
		console.log("\nApplying trigger fix...");
		const { data: triggerResult, error: triggerError } = await supabase.rpc(
			"exec_sql",
			{
				sql_query: triggerFixSQL,
			}
		);

		if (triggerError) {
			console.error("Error applying trigger fix:");
			console.error(triggerError);
			console.log(
				"\nYou will need to apply these fixes manually through the Supabase dashboard:"
			);
			console.log("1. Go to https://app.supabase.com/");
			console.log("2. Select your project");
			console.log("3. Go to the SQL Editor");
			console.log("4. Paste and run the contents of:");
			console.log("   - src/main/supabase-schema-fix-updated.sql");
			console.log("   - fix-profiles-policy.sql");
		} else {
			console.log("Trigger fix applied successfully.");

			// Apply policy fix
			console.log("\nApplying policy fix...");
			const { data: policyResult, error: policyError } = await supabase.rpc(
				"exec_sql",
				{
					sql_query: policyFixSQL,
				}
			);

			if (policyError) {
				console.error("Error applying policy fix:");
				console.error(policyError);
			} else {
				console.log("Policy fix applied successfully.");
			}
		}

		// Test user creation after fixes
		console.log("\nTesting user creation after fixes...");
		const testEmail = `test${Date.now()}@example.com`;
		const testPassword = "Test123456!";

		const { data: signupData, error: signupError } = await supabase.auth.signUp(
			{
				email: testEmail,
				password: testPassword,
			}
		);

		if (signupError) {
			console.error("Test user creation failed:", signupError.message);
		} else {
			console.log("Test user created successfully!");

			// Test profile access
			if (signupData && signupData.user) {
				console.log("\nTesting profile access...");
				const { data: profileData, error: profileError } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", signupData.user.id)
					.single();

				if (profileError) {
					console.error("Error accessing profile:", profileError.message);
				} else {
					console.log(
						"Profile accessed successfully:",
						profileData ? "Yes" : "No"
					);
				}
			}
		}

		console.log("\nFix application completed.");
		console.log("Instructions for manual fix if needed:");
		console.log("1. Go to https://app.supabase.com/");
		console.log('2. Select your project "hyieiahyebuzfhriawbe"');
		console.log("3. Go to the SQL Editor");
		console.log("4. Paste and run the contents of:");
		console.log("   - src/main/supabase-schema-fix-updated.sql");
		console.log("   - fix-profiles-policy.sql");
	} catch (err) {
		console.error("Unexpected error:", err);
	}
}

applySupabaseFixes().catch(console.error);
