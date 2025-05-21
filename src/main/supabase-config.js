const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

// Define Supabase URL and API key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create and export Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export the client for use in other files
module.exports = { supabase };
