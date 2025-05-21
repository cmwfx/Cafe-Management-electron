const fs = require("fs");
const path = require("path");
const { supabase } = require("./supabase-config");

/**
 * Executes the SQL schema file against the Supabase database
 * @returns {Promise<boolean>} True if setup was successful, false otherwise
 */
async function setupSupabaseDatabase() {
	try {
		// Read the schema file
		const schemaPath = path.join(__dirname, "supabase-schema.sql");
		const schemaSQL = fs.readFileSync(schemaPath, "utf8");

		// Split the schema into individual statements
		// This is a simple approach and might not handle all SQL edge cases
		const statements = schemaSQL
			.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, "") // Remove comments
			.split(";")
			.filter((stmt) => stmt.trim().length > 0);

		// Execute each statement
		let successCount = 0;
		let errorCount = 0;

		for (let i = 0; i < statements.length; i++) {
			const statement = statements[i].trim();

			try {
				// Execute the SQL statement via Supabase's rpc function
				const { error } = await supabase.rpc("exec_sql", {
					sql_string: statement,
				});

				if (error) {
					errorCount++;
				} else {
					successCount++;
				}
			} catch (err) {
				errorCount++;
			}
		}

		return errorCount === 0;
	} catch (err) {
		return false;
	}
}

// Export the function
module.exports = { setupSupabaseDatabase };

// If this file is run directly, execute the setup
if (require.main === module) {
	setupSupabaseDatabase()
		.then((success) => {
			process.exit(success ? 0 : 1);
		})
		.catch(() => {
			process.exit(1);
		});
}
