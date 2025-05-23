import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper functions for auth
export const signUp = async (
	email: string,
	password: string,
	fullName?: string
) => {
	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: {
				full_name: fullName,
			},
		},
	});

	return { data, error };
};

export const signIn = async (email: string, password: string) => {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	return { data, error };
};

export const signOut = async () => {
	const { error } = await supabase.auth.signOut();
	return { error };
};

export const getCurrentUser = async () => {
	const { data, error } = await supabase.auth.getUser();
	return { user: data.user, error };
};

export const getSession = async () => {
	const { data, error } = await supabase.auth.getSession();
	return { session: data.session, error };
};

// Function to check if user is an admin
export const isUserAdmin = async (userId: string) => {
	const { data, error } = await supabase
		.from("profiles")
		.select("is_admin")
		.eq("id", userId)
		.single();

	if (error || !data) {
		return { isAdmin: false, error };
	}

	return { isAdmin: data.is_admin, error: null };
};
