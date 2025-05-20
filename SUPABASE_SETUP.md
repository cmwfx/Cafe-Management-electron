# Supabase Setup for Cafe Management System

This document outlines the steps to set up and configure the Supabase backend for the Cafe Management System.

## Prerequisites

- A Supabase account (https://supabase.com)
- Node.js installed locally
- Access to the Cafe Management System codebase

## Environment Configuration

1. The `.env` file contains the following credentials:

   - `VITE_SUPABASE_URL`: The URL of your Supabase project
   - `VITE_SUPABASE_ANON_KEY`: The anonymous API key for your Supabase project
   - `SUPABASE_DB_URI`: The PostgreSQL connection URI

2. **IMPORTANT**: Never commit the `.env` file to version control. It's already added to `.gitignore`.

## Database Schema Setup

The database schema is defined in the `src/main/supabase-schema.sql` file. This includes:

- Tables for user profiles, sessions, computers, credit transactions, and configurations
- Triggers for user creation
- Row Level Security (RLS) policies
- Admin user creation function

### Setting Up the Database

There are two ways to set up the database:

#### Option 1: Using the Setup Script

Run the setup script to automatically execute all SQL statements:

```bash
# Running the setup from the command line
node src/main/setup-supabase-db.js
```

#### Option 2: Manual Setup via Supabase Dashboard

1. Log in to your Supabase dashboard (https://app.supabase.com)
2. Navigate to your project
3. Go to the SQL Editor
4. Copy the contents of `src/main/supabase-schema.sql`
5. Paste into the SQL Editor and run

## Authentication Setup

The Cafe Management System uses Supabase Authentication with email/password:

1. In the Supabase dashboard, go to Authentication → Settings
2. Ensure Email Auth is enabled
3. Configure required settings:
   - Site URL: Set to your application's URL
   - Disable email confirmations if needed for development

## Creating an Admin User

To create an admin user, you have two options:

1. Use the SQL function `create_admin_user` (replace values as needed):

```sql
SELECT create_admin_user(
    'admin@example.com',  -- Admin email
    'securePassword123',  -- Admin password
    'cafesuperadmin'      -- Admin key (defined in the function)
);
```

2. Or create a user through the authentication system, then update their profile:

```sql
UPDATE profiles
SET is_admin = true
WHERE id = 'user-uuid';  -- The user's UUID
```

## Setting Up the exec_sql RPC Function

For the database setup script to work, you need to create a SQL function that allows executing SQL:

1. Go to the Supabase SQL Editor
2. Run the following SQL to create the function:

```sql
-- WARNING: This function should be used for setup only and then disabled or removed
-- It gives significant database permissions which is a security risk
CREATE OR REPLACE FUNCTION exec_sql(sql_string text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql_string;
END;
$$;
```

3. After using this function for setup, you should remove it with:

```sql
DROP FUNCTION exec_sql;
```

## Testing the Connection

You can test the connection to Supabase by running:

```bash
# Test Supabase connection
node src/main/supabase-test.js
```

If successful, you'll see a "Successfully connected to Supabase!" message.

## Troubleshooting

If you encounter errors:

1. Verify your credentials in the `.env` file are correct
2. Check the Supabase dashboard for any error logs
3. Ensure your database has the required extensions enabled (uuid-ossp)
4. Verify your Row Level Security (RLS) policies are correctly configured

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/)
