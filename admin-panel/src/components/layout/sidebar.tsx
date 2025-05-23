import { cn } from "@/lib/utils";
import { ChevronLeft, Home, Users, UserCheck, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className, ...props }: SidebarProps) {
	const [collapsed, setCollapsed] = useState(false);
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	const handleSignOut = async () => {
		await signOut();
		toast({
			title: "Signed out",
			description: "You have been signed out successfully.",
		});
		navigate("/login");
	};

	// Get user initials for avatar
	const getUserInitials = () => {
		if (!user?.user_metadata?.full_name) return "U";
		const nameParts = user.user_metadata.full_name.split(" ");
		if (nameParts.length >= 2) {
			return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
		}
		return nameParts[0][0].toUpperCase();
	};

	// Get display name
	const getDisplayName = () => {
		return user?.user_metadata?.full_name || user?.email || "User";
	};

	const navItems = [
		{
			title: "Dashboard",
			icon: Home,
			path: "/dashboard",
		},
		{
			title: "Active Users",
			icon: UserCheck,
			path: "/active-users",
		},
		{
			title: "All Users",
			icon: Users,
			path: "/all-users",
		},
	];

	return (
		<aside
			className={cn(
				"bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out relative flex flex-col h-screen",
				collapsed ? "w-[70px]" : "w-[250px]",
				className
			)}
			{...props}
		>
			{/* Logo */}
			<div
				className={cn(
					"p-4 flex items-center h-16",
					collapsed ? "justify-center" : "justify-between"
				)}
			>
				{!collapsed && (
					<span className="text-xl font-semibold text-sidebar-foreground">
						WiFi Cafe
					</span>
				)}
				<button
					onClick={() => setCollapsed(!collapsed)}
					className="p-1.5 rounded-md bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/70 transition"
				>
					<ChevronLeft
						className={cn(
							"h-4 w-4 transition-transform",
							collapsed && "rotate-180"
						)}
					/>
				</button>
			</div>

			{/* Nav items */}
			<nav className="flex-1 p-2 space-y-1 overflow-y-auto">
				{navItems.map((item) => (
					<Link
						key={item.title}
						to={item.path}
						className={cn(
							"flex items-center space-x-2 rounded-md px-3 py-2.5 text-sidebar-foreground hover:bg-sidebar-accent transition group",
							{
								"justify-center": collapsed,
							}
						)}
					>
						<item.icon className="h-5 w-5 text-sidebar-foreground/70 group-hover:text-sidebar-foreground" />
						{!collapsed && <span className="text-sm">{item.title}</span>}
					</Link>
				))}
			</nav>

			{/* Profile section */}
			<div
				className={cn(
					"border-t border-sidebar-border p-3 flex items-center",
					collapsed ? "justify-center" : "justify-between"
				)}
			>
				{!collapsed && (
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 bg-sidebar-accent rounded-full flex items-center justify-center">
							<span className="text-sm font-medium">{getUserInitials()}</span>
						</div>
						<div>
							<p className="text-sm font-medium line-clamp-1">
								{getDisplayName()}
							</p>
							<p className="text-xs text-muted-foreground">Admin</p>
						</div>
					</div>
				)}
				<button
					onClick={handleSignOut}
					className={cn(
						"p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/70 transition",
						collapsed && "ml-0"
					)}
					title="Sign out"
				>
					<LogOut className="h-4 w-4" />
				</button>
			</div>
		</aside>
	);
}
