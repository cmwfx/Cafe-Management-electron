import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/main-layout";
import { AuthProvider } from "./lib/auth-context";
import { ProtectedRoute } from "./components/protected-route";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ActiveUsers from "./pages/ActiveUsers";
import AllUsers from "./pages/AllUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
	<QueryClientProvider client={queryClient}>
		<AuthProvider>
			<TooltipProvider>
				<Toaster />
				<Sonner />
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<Navigate to="/login" replace />} />
						<Route path="/login" element={<Login />} />
						<Route path="/signup" element={<Signup />} />

						{/* Protected Routes */}
						<Route element={<ProtectedRoute />}>
							<Route element={<MainLayout />}>
								<Route path="/dashboard" element={<Dashboard />} />
								<Route path="/active-users" element={<ActiveUsers />} />
								<Route path="/all-users" element={<AllUsers />} />
							</Route>
						</Route>

						<Route path="*" element={<NotFound />} />
					</Routes>
				</BrowserRouter>
			</TooltipProvider>
		</AuthProvider>
	</QueryClientProvider>
);

export default App;
