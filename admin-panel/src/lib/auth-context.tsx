import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, getCurrentUser, isUserAdmin } from "./supabase";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
	user: User | null;
	loading: boolean;
	isAdmin: boolean;
	signIn: (
		email: string,
		password: string
	) => Promise<{ success: boolean; error?: string }>;
	signUp: (
		email: string,
		password: string,
		fullName: string
	) => Promise<{ success: boolean; error?: string }>;
	signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [isAdmin, setIsAdmin] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		// Check active session when the provider loads
		const checkSession = async () => {
			try {
				const { user: currentUser } = await getCurrentUser();

				if (currentUser) {
					setUser(currentUser);
					const { isAdmin: adminStatus, error: adminError } = await isUserAdmin(
						currentUser.id
					);

					if (adminError) {
						console.error("Error checking admin status:", adminError);
					} else {
						setIsAdmin(adminStatus);
					}
				}
			} catch (error) {
				console.error("Error checking session:", error);
			} finally {
				setLoading(false);
			}
		};

		checkSession();

		// Set up auth state listener
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (session?.user) {
				setUser(session.user);
				const { isAdmin: adminStatus } = await isUserAdmin(session.user.id);
				setIsAdmin(adminStatus);
			} else {
				setUser(null);
				setIsAdmin(false);
			}
			setLoading(false);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	const handleSignIn = async (email: string, password: string) => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				toast({
					title: "Sign in failed",
					description: error.message,
					variant: "destructive",
				});
				return { success: false, error: error.message };
			}

			if (data.user) {
				const { isAdmin: adminStatus, error: adminError } = await isUserAdmin(
					data.user.id
				);

				if (adminError) {
					console.error("Error checking admin status:", adminError);
				} else {
					setIsAdmin(adminStatus);

					if (!adminStatus) {
						await supabase.auth.signOut();
						toast({
							title: "Access denied",
							description: "You do not have admin privileges.",
							variant: "destructive",
						});
						return {
							success: false,
							error: "You do not have admin privileges.",
						};
					}
				}
			}

			return { success: true };
		} catch (error) {
			console.error("Sign in error:", error);
			return { success: false, error: "An unexpected error occurred" };
		}
	};

	const handleSignUp = async (
		email: string,
		password: string,
		fullName: string
	) => {
		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: fullName,
					},
				},
			});

			if (error) {
				toast({
					title: "Sign up failed",
					description: error.message,
					variant: "destructive",
				});
				return { success: false, error: error.message };
			}

			toast({
				title: "Account created",
				description:
					"Your account has been created. Please contact an administrator to grant you admin privileges.",
			});

			return { success: true };
		} catch (error) {
			console.error("Sign up error:", error);
			return { success: false, error: "An unexpected error occurred" };
		}
	};

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		setUser(null);
		setIsAdmin(false);
	};

	const value = {
		user,
		loading,
		isAdmin,
		signIn: handleSignIn,
		signUp: handleSignUp,
		signOut: handleSignOut,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
