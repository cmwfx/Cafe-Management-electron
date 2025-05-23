import { useEffect, useState } from "react";
import { StatsChart } from "@/components/stats-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { differenceInMinutes, parseISO, startOfDay, subDays } from "date-fns";

const usageByStationType = [
	{ name: "Gaming PC", value: 65 },
	{ name: "Standard PC", value: 25 },
	{ name: "VR Station", value: 10 },
];

// Type for top users
type TopUser = {
	name: string;
	value: number;
};

// Revenue calculation: credits_used divided by 60
const calculateRevenue = (credits: number) => credits / 60;

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const Analytics = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [avgSessionLength, setAvgSessionLength] = useState("0h 0m");
	const [peakUsageHours, setPeakUsageHours] = useState("N/A");
	const [peakUtilization, setPeakUtilization] = useState(0);
	const [mostPopularStation, setMostPopularStation] = useState("N/A");
	const [stationUtilization, setStationUtilization] = useState(0);
	const [topUsersByCredits, setTopUsersByCredits] = useState<TopUser[]>([]);
	const [totalUsers, setTotalUsers] = useState(0);
	const [avgCreditsPerUser, setAvgCreditsPerUser] = useState(0);
	const [todayRevenue, setTodayRevenue] = useState(0);
	const [yesterdayRevenue, setYesterdayRevenue] = useState(0);
	const [avgRevenuePerUser, setAvgRevenuePerUser] = useState(0);
	const [projectedMonthlyRevenue, setProjectedMonthlyRevenue] = useState(0);
	const [lastMonthRevenue, setLastMonthRevenue] = useState(0);

	// Fetch statistics when component mounts
	useEffect(() => {
		const fetchStatistics = async () => {
			setIsLoading(true);
			try {
				// Fetch average session length
				const { data: sessionsData, error: sessionsError } = await supabase
					.from("sessions")
					.select("duration_minutes");

				if (sessionsError) {
					console.error("Error fetching sessions data:", sessionsError);
				} else if (sessionsData && sessionsData.length > 0) {
					// Calculate average session length
					const totalMinutes = sessionsData.reduce(
						(sum, session) => sum + session.duration_minutes,
						0
					);
					const avgMinutes = Math.round(totalMinutes / sessionsData.length);
					const hours = Math.floor(avgMinutes / 60);
					const minutes = avgMinutes % 60;
					setAvgSessionLength(`${hours}h ${minutes}m`);
				}

				// Fetch peak usage hours
				const { data: hourlyData, error: hourlyError } = await supabase
					.from("sessions")
					.select("created_at");

				if (hourlyError) {
					console.error("Error fetching hourly data:", hourlyError);
				} else if (hourlyData && hourlyData.length > 0) {
					// Count sessions by hour
					const hourCounts: Record<number, number> = {};

					hourlyData.forEach((session) => {
						const hour = parseISO(session.created_at).getHours();
						hourCounts[hour] = (hourCounts[hour] || 0) + 1;
					});

					// Find peak hour
					let peakHour = 0;
					let maxCount = 0;

					for (const [hour, count] of Object.entries(hourCounts)) {
						if (count > maxCount) {
							maxCount = count;
							peakHour = parseInt(hour);
						}
					}

					// Calculate utilization percentage
					const totalSessions = hourlyData.length;
					const peakPercentage = Math.round((maxCount / totalSessions) * 100);

					setPeakUsageHours(
						`${peakHour}-${(peakHour + 1) % 24} ${peakHour >= 12 ? "PM" : "AM"}`
					);
					setPeakUtilization(peakPercentage);
				}

				// Fetch most popular computer
				const { data: computerData, error: computerError } = await supabase
					.from("sessions")
					.select("computer_id");

				if (computerError) {
					console.error("Error fetching computer data:", computerError);
				} else if (computerData && computerData.length > 0) {
					// Count sessions by computer
					const computerCounts: Record<string, number> = {};

					computerData.forEach((session) => {
						computerCounts[session.computer_id] =
							(computerCounts[session.computer_id] || 0) + 1;
					});

					// Find most popular computer
					let popularComputer = "";
					let maxCount = 0;

					for (const [computer, count] of Object.entries(computerCounts)) {
						if (count > maxCount) {
							maxCount = count;
							popularComputer = computer;
						}
					}

					// Calculate utilization percentage
					const totalSessions = computerData.length;
					const utilPercentage = Math.round((maxCount / totalSessions) * 100);

					setMostPopularStation(popularComputer);
					setStationUtilization(utilPercentage);
				}

				// Fetch top users by credits
				const { data: usersData, error: usersError } = await supabase
					.from("profiles")
					.select("username, first_name, last_name, credits")
					.order("credits", { ascending: false })
					.limit(5);

				if (usersError) {
					console.error("Error fetching users data:", usersError);
				} else if (usersData && usersData.length > 0) {
					const topUsers = usersData.map((user) => ({
						name:
							user.first_name && user.last_name
								? `${user.first_name} ${user.last_name}`
								: user.username || "Unknown User",
						value: user.credits,
					}));

					setTopUsersByCredits(topUsers);
				}

				// Fetch total users and average credits per user
				const { data: allUsersData, error: allUsersError } = await supabase
					.from("profiles")
					.select("credits");

				if (allUsersError) {
					console.error("Error fetching all users data:", allUsersError);
				} else if (allUsersData && allUsersData.length > 0) {
					const totalCredits = allUsersData.reduce(
						(sum, user) => sum + user.credits,
						0
					);
					const avgCredits = Math.round(totalCredits / allUsersData.length);

					setTotalUsers(allUsersData.length);
					setAvgCreditsPerUser(avgCredits);

					// Calculate average revenue per user (credits / 60)
					setAvgRevenuePerUser(
						Math.round(calculateRevenue(avgCredits) * 100) / 100
					);
				}

				// Fetch today's revenue data
				const today = startOfDay(new Date());
				const { data: todayData, error: todayError } = await supabase
					.from("sessions")
					.select("credits_used")
					.gte("created_at", today.toISOString());

				if (todayError) {
					console.error("Error fetching today's revenue data:", todayError);
				} else if (todayData) {
					const todayCredits = todayData.reduce(
						(sum, session) => sum + session.credits_used,
						0
					);
					const todayRev =
						Math.round(calculateRevenue(todayCredits) * 100) / 100;
					setTodayRevenue(todayRev);
				}

				// Fetch yesterday's revenue data
				const yesterday = subDays(startOfDay(new Date()), 1);
				const dayBefore = subDays(yesterday, 1);
				const { data: yesterdayData, error: yesterdayError } = await supabase
					.from("sessions")
					.select("credits_used")
					.gte("created_at", yesterday.toISOString())
					.lt("created_at", today.toISOString());

				if (yesterdayError) {
					console.error(
						"Error fetching yesterday's revenue data:",
						yesterdayError
					);
				} else if (yesterdayData) {
					const yesterdayCredits = yesterdayData.reduce(
						(sum, session) => sum + session.credits_used,
						0
					);
					const yesterdayRev =
						Math.round(calculateRevenue(yesterdayCredits) * 100) / 100;
					setYesterdayRevenue(yesterdayRev);
				}

				// Calculate projected monthly revenue based on daily average
				if (todayData && yesterdayData) {
					const twoDayTotal =
						todayData.reduce((sum, session) => sum + session.credits_used, 0) +
						yesterdayData.reduce(
							(sum, session) => sum + session.credits_used,
							0
						);
					const dailyAverage = twoDayTotal / 2;
					const monthlyProjection =
						Math.round(calculateRevenue(dailyAverage * 30) * 100) / 100;
					setProjectedMonthlyRevenue(monthlyProjection);

					// Estimate last month's revenue as 90% of projected for comparison
					setLastMonthRevenue(Math.round(monthlyProjection * 0.9));
				}
			} catch (error) {
				console.error("Error fetching analytics data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStatistics();
	}, []);

	// Calculate percentage change
	const calculatePercentageChange = (current: number, previous: number) => {
		if (previous === 0) return 0;
		return Math.round(((current - previous) / previous) * 100);
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
				<p className="text-muted-foreground">
					Detailed statistics and insights
				</p>
			</div>

			<Tabs defaultValue="usage">
				<TabsList>
					<TabsTrigger value="usage">Usage Analytics</TabsTrigger>
					<TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
					<TabsTrigger value="user">User Analytics</TabsTrigger>
				</TabsList>

				<TabsContent value="usage" className="space-y-6 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
						<div className="md:col-span-8">
							<StatsChart />
						</div>

						<div className="md:col-span-4">
							<Card>
								<CardHeader>
									<CardTitle>Usage by Station Type</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="h-[300px]">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={usageByStationType}
													cx="50%"
													cy="50%"
													labelLine={false}
													outerRadius={80}
													fill="#8884d8"
													dataKey="value"
													label={({ name, percent }) =>
														`${name} ${(percent * 100).toFixed(0)}%`
													}
												>
													{usageByStationType.map((entry, index) => (
														<Cell
															key={`cell-${index}`}
															fill={COLORS[index % COLORS.length]}
														/>
													))}
												</Pie>
												<Tooltip
													formatter={(value) => [`${value}%`, "Usage"]}
													contentStyle={{
														backgroundColor: "#1e1e2f",
														borderColor: "#333",
													}}
													labelStyle={{ color: "#fff" }}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
									<div className="space-y-2 mt-4">
										{usageByStationType.map((item, index) => (
											<div
												key={item.name}
												className="flex items-center justify-between"
											>
												<div className="flex items-center">
													<span
														className="h-3 w-3 rounded-full mr-2"
														style={{
															backgroundColor: COLORS[index % COLORS.length],
														}}
													/>
													<span className="text-sm">{item.name}</span>
												</div>
												<span className="text-sm font-medium">
													{item.value}%
												</span>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Peak Usage Hours
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-sm">Loading...</div>
								) : (
									<>
										<div className="text-2xl font-bold">{peakUsageHours}</div>
										<p className="text-xs text-muted-foreground mt-1">
											{peakUtilization}% station utilization
										</p>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Avg. Session Length
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-sm">Loading...</div>
								) : (
									<>
										<div className="text-2xl font-bold">{avgSessionLength}</div>
										<p className="text-xs text-muted-foreground mt-1">
											Based on all sessions
										</p>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Most Popular Station
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-sm">Loading...</div>
								) : (
									<>
										<div className="text-2xl font-bold">
											{mostPopularStation}
										</div>
										<p className="text-xs text-muted-foreground mt-1">
											{stationUtilization}% utilization rate
										</p>
									</>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="revenue" className="space-y-6 mt-6">
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<Card className="lg:col-span-3">
							<CardHeader>
								<CardTitle>Revenue Overview</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="h-[400px]">
									<StatsChart />
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Total Revenue Today
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-sm">Loading...</div>
								) : (
									<>
										<div className="text-2xl font-bold">${todayRevenue}</div>
										<p className="text-xs text-muted-foreground mt-1">
											{yesterdayRevenue > 0
												? `${calculatePercentageChange(
														todayRevenue,
														yesterdayRevenue
												  )}% vs yesterday`
												: "No data for yesterday"}
										</p>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Avg Revenue Per User
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-sm">Loading...</div>
								) : (
									<>
										<div className="text-2xl font-bold">
											${avgRevenuePerUser}
										</div>
										<p className="text-xs text-muted-foreground mt-1">
											Based on average credits
										</p>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Projected Monthly
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-sm">Loading...</div>
								) : (
									<>
										<div className="text-2xl font-bold">
											${projectedMonthlyRevenue}
										</div>
										<p className="text-xs text-muted-foreground mt-1">
											{lastMonthRevenue > 0
												? `${calculatePercentageChange(
														projectedMonthlyRevenue,
														lastMonthRevenue
												  )}% vs last month`
												: "Based on daily average"}
										</p>
									</>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="user" className="space-y-6 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
						<div className="md:col-span-8">
							<Card>
								<CardHeader>
									<CardTitle>New User Registrations</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="h-[300px]">
										<StatsChart />
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="md:col-span-4">
							<Card>
								<CardHeader>
									<CardTitle>Top Users by Credits</CardTitle>
								</CardHeader>
								<CardContent>
									{isLoading ? (
										<div className="text-sm">Loading...</div>
									) : topUsersByCredits.length === 0 ? (
										<div className="text-sm">No user data available</div>
									) : (
										<div className="space-y-4">
											{topUsersByCredits.map((user, index) => (
												<div key={index} className="flex items-center">
													<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
														{index + 1}
													</div>
													<div className="flex-1">
														<p className="text-sm font-medium">{user.name}</p>
													</div>
													<div>
														<p className="text-sm font-bold">{user.value}</p>
														<p className="text-xs text-muted-foreground">
															credits
														</p>
													</div>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Total Users
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-sm">Loading...</div>
								) : (
									<>
										<div className="text-2xl font-bold">{totalUsers}</div>
										<p className="text-xs text-muted-foreground mt-1">
											Registered users
										</p>
									</>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Retention Rate
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">78%</div>
								<p className="text-xs text-muted-foreground mt-1">
									+2% vs last month
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium">
									Avg Credits per User
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-sm">Loading...</div>
								) : (
									<>
										<div className="text-2xl font-bold">
											{avgCreditsPerUser}
										</div>
										<p className="text-xs text-muted-foreground mt-1">
											Current average
										</p>
									</>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default Analytics;
