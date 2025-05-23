import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "./ui/spinner";

interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
	isLogin?: boolean;
}

export function AuthForm({
	isLogin = true,
	className,
	...props
}: AuthFormProps) {
	const [loading, setLoading] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [fullName, setFullName] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	const { signIn, signUp } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const from = location.state?.from?.pathname || "/dashboard";
	const notAdmin = location.state?.notAdmin;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validate form
		if (!email || !password) {
			setError("Email and password are required");
			return;
		}

		if (!isLogin) {
			if (password !== confirmPassword) {
				setError("Passwords do not match");
				return;
			}

			if (!fullName) {
				setError("Full name is required");
				return;
			}
		}

		setLoading(true);

		try {
			if (isLogin) {
				const { success, error } = await signIn(email, password);
				if (success) {
					navigate(from);
				} else if (error) {
					setError(error);
				}
			} else {
				const { success, error } = await signUp(email, password, fullName);
				if (success) {
					// Redirect to login after successful signup
					navigate("/login", {
						state: {
							message:
								"Account created. Please contact an administrator to grant you admin privileges.",
						},
					});
				} else if (error) {
					setError(error);
				}
			}
		} catch (err) {
			setError("An unexpected error occurred");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={cn("w-full max-w-md p-8", className)} {...props}>
			<div className="mb-8 text-center">
				<h1 className="text-3xl font-bold">WiFi Cafe Admin</h1>
				<p className="text-muted-foreground mt-2">
					{isLogin ? "Sign in to your account" : "Create a new account"}
				</p>
			</div>

			{location.state?.message && (
				<div className="mb-4 p-3 bg-primary/10 text-primary rounded-md text-sm">
					{location.state.message}
				</div>
			)}

			{notAdmin && (
				<div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
					You do not have admin privileges. Please contact an administrator.
				</div>
			)}

			{error && (
				<div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<label htmlFor="email" className="text-sm font-medium">
						Email
					</label>
					<Input
						id="email"
						placeholder="name@example.com"
						type="email"
						required
						autoComplete="email"
						className="w-full"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={loading}
					/>
				</div>

				{!isLogin && (
					<div className="space-y-2">
						<label htmlFor="name" className="text-sm font-medium">
							Full Name
						</label>
						<Input
							id="name"
							placeholder="John Doe"
							required
							className="w-full"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							disabled={loading}
						/>
					</div>
				)}

				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<label htmlFor="password" className="text-sm font-medium">
							Password
						</label>
						{isLogin && (
							<Link
								to="/forgot-password"
								className="text-xs text-primary hover:underline"
							>
								Forgot password?
							</Link>
						)}
					</div>
					<Input
						id="password"
						type="password"
						placeholder={isLogin ? "••••••••" : "Create a password"}
						required
						className="w-full"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={loading}
					/>
				</div>

				{!isLogin && (
					<div className="space-y-2">
						<label htmlFor="confirmPassword" className="text-sm font-medium">
							Confirm Password
						</label>
						<Input
							id="confirmPassword"
							type="password"
							placeholder="Confirm your password"
							required
							className="w-full"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							disabled={loading}
						/>
					</div>
				)}

				<Button type="submit" className="w-full" disabled={loading}>
					{loading ? (
						<>
							<Spinner size="sm" className="mr-2" />
							{isLogin ? "Signing in..." : "Creating account..."}
						</>
					) : (
						<>{isLogin ? "Sign in" : "Create account"}</>
					)}
				</Button>
			</form>

			<div className="mt-6 text-center text-sm">
				<p>
					{isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
					<Link
						to={isLogin ? "/signup" : "/login"}
						className="text-primary hover:underline focus:outline-none focus-visible:underline"
					>
						{isLogin ? "Sign up" : "Sign in"}
					</Link>
				</p>
			</div>
		</div>
	);
}
