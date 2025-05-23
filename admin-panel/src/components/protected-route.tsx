import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "./ui/spinner";

export const ProtectedRoute = () => {
	const { user, loading, isAdmin } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Spinner size="lg" />
			</div>
		);
	}

	if (!user) {
		// Redirect to login if not authenticated
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	if (!isAdmin) {
		// Redirect to login if authenticated but not an admin
		return (
			<Navigate
				to="/login"
				state={{ from: location, notAdmin: true }}
				replace
			/>
		);
	}

	// User is authenticated and is an admin
	return <Outlet />;
};
