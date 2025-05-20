// Test script to check Supabase connectivity and permissions
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

async function testSupabase() {
	console.log("Starting Supabase test...");
	console.log("Supabase URL:", process.env.VITE_SUPABASE_URL);
	console.log(
		"Supabase Key Length:",
		process.env.VITE_SUPABASE_ANON_KEY
			? process.env.VITE_SUPABASE_ANON_KEY.length
			: "Not found"
	);

	// Create Supabase client
	const supabase = createClient(
		process.env.VITE_SUPABASE_URL,
		process.env.VITE_SUPABASE_ANON_KEY
	);

	try {
		// Test authentication capabilities
		console.log("\nTesting auth capabilities...");
		const { data: sessionData, error: sessionError } =
			await supabase.auth.getSession();
		console.log("Session check result:", sessionError ? "Error" : "Success");
		if (sessionError) console.error("Session error:", sessionError.message);

		// Try to directly create a test user using signUp
		console.log("\nAttempting to create a test user...");
		const testEmail = `test${Date.now()}@example.com`;
		const testPassword = "Test123456!";

		const { data: signupData, error: signupError } = await supabase.auth.signUp(
			{
				email: testEmail,
				password: testPassword,
			}
		);

		console.log("Test user creation:", signupError ? "Failed" : "Success");
		if (signupError) {
			console.error("Error creating test user:", signupError.message);
			console.error("Error details:", JSON.stringify(signupError));
		} else {
			console.log(
				"Test user data:",
				signupData.user ? "User created" : "No user data returned"
			);
			console.log("User ID:", signupData.user?.id);
		}

		// Test profiles table
		console.log("\nTesting profiles table access...");
		const { data: profilesData, error: profilesError } = await supabase
			.from("profiles")
			.select("count()", { count: "exact", head: true });

		if (profilesError) {
			console.error("Profiles table error:", profilesError.message);
			console.error("Error details:", JSON.stringify(profilesError));
		} else {
			console.log("Profiles count:", profilesData[0]?.count || "unknown");
		}

		// Test profiles insert capabilities
		if (signupData && signupData.user) {
			console.log("\nTesting profile insert/update capabilities...");
			const { data: upsertData, error: upsertError } = await supabase
				.from("profiles")
				.upsert(
					{
						id: signupData.user.id,
						username: "testuser",
						credits: 100,
					},
					{ onConflict: "id" }
				);

			console.log("Profile insert/update:", upsertError ? "Failed" : "Success");
			if (upsertError) {
				console.error("Profile insert error:", upsertError.message);
				console.error("Error details:", JSON.stringify(upsertError));
			} else {
				console.log("Profile data inserted/updated");
			}
		}

		return "Tests completed";
	} catch (err) {
		console.error("Unexpected error:", err.message);
		console.error("Error stack:", err.stack);
		return "Test failed with error";
	}
}

testSupabase()
	.then((result) => console.log("\nFINAL RESULT:", result))
	.catch((err) => console.error("Test execution error:", err));
