import { useState, useEffect, useCallback } from "react";
import { ActiveUserTable, ActiveUserData } from "@/components/user-table";
import { fetchActiveSessions } from "@/lib/session-utils";

const ActiveUsers = () => {
	const [activeUsers, setActiveUsers] = useState<ActiveUserData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [stats, setStats] = useState({
		activeCount: 0,
		averageTimeLeft: "0h 0m",
		sessionValue: 0,
	});

	// Memoize the fetch function to prevent unnecessary re-renders
	const loadActiveSessions = useCallback(async () => {
		setIsLoading(true);
		try {
			const { sessions, stats } = await fetchActiveSessions();
			setActiveUsers(sessions);
			setStats(stats);
		} catch (error) {
			console.error("Error loading active sessions:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Fetch data on component mount
	useEffect(() => {
		loadActiveSessions();

		// Set up polling every 30 seconds to refresh data
		const pollingInterval = setInterval(() => {
			loadActiveSessions();
		}, 30000);

		// Clean up interval on component unmount
		return () => clearInterval(pollingInterval);
	}, [loadActiveSessions]);

	// Function to manually refresh data
	const handleRefresh = () => {
		loadActiveSessions();
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Active Users</h1>
				<p className="text-muted-foreground">
					Manage users currently using the computers
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="rounded-lg border bg-card p-6">
					<div className="flex flex-col">
						<h3 className="text-2xl font-bold">{stats.activeCount}</h3>
						<p className="text-xs text-muted-foreground">Active Users</p>
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex flex-col">
						<h3 className="text-2xl font-bold">{stats.averageTimeLeft}</h3>
						<p className="text-xs text-muted-foreground">Average Time Left</p>
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex flex-col">
						<h3 className="text-2xl font-bold">
							${stats.sessionValue.toFixed(2)}
						</h3>
						<p className="text-xs text-muted-foreground">
							Current Session Value
						</p>
					</div>
				</div>
			</div>

			<ActiveUserTable
				data={activeUsers}
				onRefresh={handleRefresh}
				isLoading={isLoading}
			/>
		</div>
	);
};

export default ActiveUsers;
