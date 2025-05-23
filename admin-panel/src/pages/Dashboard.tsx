import { useState, useEffect, useCallback } from "react";
import { DataCard } from "@/components/ui/data-card";
import { StatsChart } from "@/components/stats-chart";
import { Users, CreditCard, Timer, ArrowUpRight } from "lucide-react";
import { ActiveUserTable, ActiveUserData } from "@/components/user-table";
import { fetchActiveSessions } from "@/lib/session-utils";
import {
	fetchActiveUsersCount,
	fetchTotalCredits,
	fetchAverageSessionDuration,
	formatDuration,
	fetchTodayRevenue,
} from "@/lib/dashboard-utils";

const Dashboard = () => {
	const [activeUsers, setActiveUsers] = useState<ActiveUserData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [activeCount, setActiveCount] = useState(0);
	const [totalCredits, setTotalCredits] = useState(0);
	const [avgSessionDuration, setAvgSessionDuration] = useState(0);
	const [todayRevenue, setTodayRevenue] = useState({
		revenue: 0,
		userCount: 0,
	});

	const loadDashboardData = useCallback(async () => {
		setIsLoading(true);
		try {
			// Load active sessions for the table
			const { sessions } = await fetchActiveSessions(3); // Only get top 3 for dashboard preview
			setActiveUsers(sessions);

			// Load active users count
			const count = await fetchActiveUsersCount();
			setActiveCount(count);

			// Load total credits
			const credits = await fetchTotalCredits();
			setTotalCredits(credits);

			// Load average session duration
			const avgDuration = await fetchAverageSessionDuration();
			setAvgSessionDuration(avgDuration);

			// Load today's revenue
			const revenue = await fetchTodayRevenue();
			setTodayRevenue(revenue);
		} catch (error) {
			console.error("Error loading dashboard data:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Fetch data on component mount and set up polling
	useEffect(() => {
		loadDashboardData();

		// Set up polling every 60 seconds to refresh dashboard data
		const pollingInterval = setInterval(() => {
			loadDashboardData();
		}, 60000); // Dashboard can refresh less frequently than the active users page

		// Clean up interval on component unmount
		return () => clearInterval(pollingInterval);
	}, [loadDashboardData]);

	// Handle manual refresh
	const handleRefresh = () => {
		loadDashboardData();
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground">
					Café overview and current status
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<DataCard
					title="Active Users"
					value={activeCount.toString()}
					description="Currently online"
					icon={<Users className="h-5 w-5" />}
				/>
				<DataCard
					title="Available Credits"
					value={totalCredits.toLocaleString()}
					description="Total in system"
					icon={<CreditCard className="h-5 w-5" />}
				/>
				<DataCard
					title="Average Session"
					value={formatDuration(avgSessionDuration)}
					description="Session duration"
					icon={<Timer className="h-5 w-5" />}
				/>
				<DataCard
					title="Revenue Today"
					value={`$${todayRevenue.revenue.toFixed(2)}`}
					description={`From ${todayRevenue.userCount} users`}
					icon={<ArrowUpRight className="h-5 w-5" />}
				/>
			</div>

			<StatsChart />

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				<div className="lg:col-span-12">
					<ActiveUserTable
						data={activeUsers}
						onRefresh={handleRefresh}
						isLoading={isLoading}
					/>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
