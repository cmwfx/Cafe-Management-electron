const fs = require("fs");
const path = require("path");
const { supabase } = require("./supabase-config");

/**
 * Executes the SQL schema file against the Supabase database
 */
async function setupSupabaseDatabase() {
	try {
		console.log("Setting up Supabase database schema...");

		// Read the schema file
		const schemaPath = path.join(__dirname, "supabase-schema.sql");
		const schemaSQL = fs.readFileSync(schemaPath, "utf8");

		// Split the schema into individual statements
		// This is a simple approach and might not handle all SQL edge cases
		const statements = schemaSQL
			.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, "") // Remove comments
			.split(";")
			.filter((stmt) => stmt.trim().length > 0);

		console.log(`Found ${statements.length} SQL statements to execute.`);

		// Execute each statement
		let successCount = 0;
		let errorCount = 0;

		for (let i = 0; i < statements.length; i++) {
			const statement = statements[i].trim();
			console.log(`Executing statement ${i + 1}/${statements.length}...`);

			try {
				// Execute the SQL statement via Supabase's rpc function
				const { error } = await supabase.rpc("exec_sql", {
					sql_string: statement,
				});

				if (error) {
					console.error(`Error executing statement ${i + 1}:`, error.message);
					errorCount++;
				} else {
					successCount++;
				}
			} catch (err) {
				console.error(`Exception executing statement ${i + 1}:`, err.message);
				errorCount++;
			}
		}

		console.log(
			`Database setup completed. Success: ${successCount}, Errors: ${errorCount}`
		);
		return errorCount === 0;
	} catch (err) {
		console.error("Error setting up database:", err);
		return false;
	}
}

// Export the function
module.exports = { setupSupabaseDatabase };

// If this file is run directly, execute the setup
if (require.main === module) {
	setupSupabaseDatabase()
		.then((success) => {
			if (success) {
				console.log("✅ Database setup completed successfully.");
			} else {
				console.log("❌ Database setup completed with errors.");
				process.exit(1);
			}
		})
		.catch((err) => {
			console.error("Unhandled error in database setup:", err);
			process.exit(1);
		});
}
