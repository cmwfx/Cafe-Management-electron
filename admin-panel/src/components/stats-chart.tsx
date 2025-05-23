import { useEffect, useState } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
	Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
	format,
	subDays,
	subMonths,
	subWeeks,
	startOfDay,
	endOfDay,
	parseISO,
} from "date-fns";

// Types for our data
type CreditUsageData = {
	date: string;
	credits: number;
};

type UsersData = {
	date: string;
	users: number;
};

type RevenueData = {
	date: string;
	revenue: number;
};

// Revenue calculation: credits_used divided by 60
const calculateRevenue = (credits: number) => credits / 60;

export function StatsChart() {
	const [selectedPeriod, setSelectedPeriod] = useState<
		"day" | "week" | "month"
	>("day");
	const [creditUsageData, setCreditUsageData] = useState<CreditUsageData[]>([]);
	const [usersData, setUsersData] = useState<UsersData[]>([]);
	const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
	const [isLoadingRevenue, setIsLoadingRevenue] = useState<boolean>(true);
	const [totalCreditsUsed, setTotalCreditsUsed] = useState<number>(0);
	const [averageUsers, setAverageUsers] = useState<number>(0);
	const [totalRevenue, setTotalRevenue] = useState<number>(0);

	// Function to fetch credit usage data based on the selected period
	const fetchCreditUsageData = async () => {
		setIsLoading(true);

		let startDate;
		let timeFormat: string;
		let groupBy: string;

		const now = new Date();

		// Set the appropriate date range and format based on the selected period
		if (selectedPeriod === "day") {
			startDate = startOfDay(now);
			timeFormat = "HH:mm";
			groupBy = "hour";
		} else if (selectedPeriod === "week") {
			startDate = subDays(now, 7);
			timeFormat = "MM/dd";
			groupBy = "day";
		} else {
			startDate = subMonths(now, 1);
			timeFormat = "MM/dd";
			groupBy = "day";
		}

		try {
			// Fetch sessions data from Supabase
			const { data, error } = await supabase
				.from("sessions")
				.select("created_at, credits_used")
				.gte("created_at", startDate.toISOString())
				.order("created_at", { ascending: true });

			if (error) {
				console.error("Error fetching credit usage data:", error);
				setIsLoading(false);
				return;
			}

			// Process the data based on the selected period
			const processedData: Record<string, number> = {};
			let total = 0;

			data.forEach((session) => {
				const sessionDate = parseISO(session.created_at);
				let dateKey: string;

				if (groupBy === "hour") {
					dateKey = format(sessionDate, timeFormat);
				} else {
					dateKey = format(sessionDate, timeFormat);
				}

				if (!processedData[dateKey]) {
					processedData[dateKey] = 0;
				}

				processedData[dateKey] += session.credits_used;
				total += session.credits_used;
			});

			// Convert the processed data to the format expected by the chart
			const chartData = Object.keys(processedData).map((date) => ({
				date,
				credits: processedData[date],
			}));

			setCreditUsageData(chartData);
			setTotalCreditsUsed(total);
		} catch (error) {
			console.error("Error processing credit usage data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Function to fetch active users data based on the selected period
	const fetchActiveUsersData = async () => {
		setIsLoadingUsers(true);

		let startDate;
		let timeFormat: string;
		let groupBy: string;

		const now = new Date();

		// Set the appropriate date range and format based on the selected period
		if (selectedPeriod === "day") {
			startDate = startOfDay(now);
			timeFormat = "HH:mm";
			groupBy = "hour";
		} else if (selectedPeriod === "week") {
			startDate = subDays(now, 7);
			timeFormat = "MM/dd";
			groupBy = "day";
		} else {
			startDate = subMonths(now, 1);
			timeFormat = "MM/dd";
			groupBy = "day";
		}

		try {
			// Fetch sessions data from Supabase
			const { data, error } = await supabase
				.from("sessions")
				.select("created_at, user_id")
				.gte("created_at", startDate.toISOString())
				.order("created_at", { ascending: true });

			if (error) {
				console.error("Error fetching active users data:", error);
				setIsLoadingUsers(false);
				return;
			}

			// Process the data based on the selected period
			const processedData: Record<string, Set<string>> = {};

			data.forEach((session) => {
				const sessionDate = parseISO(session.created_at);
				let dateKey: string;

				if (groupBy === "hour") {
					dateKey = format(sessionDate, timeFormat);
				} else {
					dateKey = format(sessionDate, timeFormat);
				}

				if (!processedData[dateKey]) {
					processedData[dateKey] = new Set();
				}

				processedData[dateKey].add(session.user_id);
			});

			// Convert the processed data to the format expected by the chart
			const chartData = Object.keys(processedData).map((date) => ({
				date,
				users: processedData[date].size,
			}));

			// Calculate average users per time period
			let totalUsers = 0;
			chartData.forEach((item) => {
				totalUsers += item.users;
			});

			const avgUsers =
				chartData.length > 0 ? Math.round(totalUsers / chartData.length) : 0;

			setUsersData(chartData);
			setAverageUsers(avgUsers);
		} catch (error) {
			console.error("Error processing active users data:", error);
		} finally {
			setIsLoadingUsers(false);
		}
	};

	// Function to fetch revenue data based on the selected period
	const fetchRevenueData = async () => {
		setIsLoadingRevenue(true);

		let startDate;
		let timeFormat: string;
		let groupBy: string;

		const now = new Date();

		// Set the appropriate date range and format based on the selected period
		if (selectedPeriod === "day") {
			startDate = startOfDay(now);
			timeFormat = "HH:mm";
			groupBy = "hour";
		} else if (selectedPeriod === "week") {
			startDate = subDays(now, 7);
			timeFormat = "MM/dd";
			groupBy = "day";
		} else {
			startDate = subMonths(now, 1);
			timeFormat = "MM/dd";
			groupBy = "day";
		}

		try {
			// Fetch sessions data from Supabase
			const { data, error } = await supabase
				.from("sessions")
				.select("created_at, credits_used")
				.gte("created_at", startDate.toISOString())
				.order("created_at", { ascending: true });

			if (error) {
				console.error("Error fetching revenue data:", error);
				setIsLoadingRevenue(false);
				return;
			}

			// Process the data based on the selected period
			const processedData: Record<string, number> = {};
			let total = 0;

			data.forEach((session) => {
				const sessionDate = parseISO(session.created_at);
				let dateKey: string;

				if (groupBy === "hour") {
					dateKey = format(sessionDate, timeFormat);
				} else {
					dateKey = format(sessionDate, timeFormat);
				}

				if (!processedData[dateKey]) {
					processedData[dateKey] = 0;
				}

				// Convert credits to revenue: credits_used / 60
				const sessionRevenue = calculateRevenue(session.credits_used);
				processedData[dateKey] += sessionRevenue;
				total += sessionRevenue;
			});

			// Convert the processed data to the format expected by the chart
			const chartData = Object.keys(processedData).map((date) => ({
				date,
				revenue: Math.round(processedData[date] * 100) / 100, // Round to 2 decimal places
			}));

			setRevenueData(chartData);
			setTotalRevenue(Math.round(total * 100) / 100); // Round to 2 decimal places
		} catch (error) {
			console.error("Error processing revenue data:", error);
		} finally {
			setIsLoadingRevenue(false);
		}
	};

	// Fetch data when the component mounts or when the selected period changes
	useEffect(() => {
		fetchCreditUsageData();
		fetchActiveUsersData();
		fetchRevenueData();
	}, [selectedPeriod]);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle>Analytics Overview</CardTitle>
				<div className="flex items-center space-x-2">
					<Button
						variant={selectedPeriod === "day" ? "default" : "outline"}
						size="sm"
						onClick={() => setSelectedPeriod("day")}
					>
						Day
					</Button>
					<Button
						variant={selectedPeriod === "week" ? "default" : "outline"}
						size="sm"
						onClick={() => setSelectedPeriod("week")}
					>
						Week
					</Button>
					<Button
						variant={selectedPeriod === "month" ? "default" : "outline"}
						size="sm"
						onClick={() => setSelectedPeriod("month")}
					>
						Month
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="credits" className="w-full">
					<TabsList className="mb-4">
						<TabsTrigger value="credits">Credits Usage</TabsTrigger>
						<TabsTrigger value="users">Active Users</TabsTrigger>
						<TabsTrigger value="revenue">Revenue</TabsTrigger>
					</TabsList>
					<TabsContent value="credits" className="space-y-4">
						<div className="h-[350px]">
							{isLoading ? (
								<div className="flex items-center justify-center h-full">
									<p>Loading data...</p>
								</div>
							) : creditUsageData.length === 0 ? (
								<div className="flex items-center justify-center h-full">
									<p>No data available for the selected period</p>
								</div>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={creditUsageData}>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#333"
										/>
										<XAxis
											dataKey="date"
											stroke="#888"
											fontSize={12}
											tickMargin={10}
										/>
										<YAxis stroke="#888" fontSize={12} tickMargin={10} />
										<Tooltip
											contentStyle={{
												backgroundColor: "#1e1e2f",
												borderColor: "#333",
											}}
											labelStyle={{ color: "#fff" }}
										/>
										<Bar
											dataKey="credits"
											name="Credits Used"
											fill="hsl(var(--primary))"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							)}
						</div>
						<div className="text-sm text-muted-foreground text-center">
							Total Credits Used{" "}
							{selectedPeriod === "day"
								? "Today"
								: selectedPeriod === "week"
								? "This Week"
								: "This Month"}
							: {totalCreditsUsed}
						</div>
					</TabsContent>
					<TabsContent value="users" className="space-y-4">
						<div className="h-[350px]">
							{isLoadingUsers ? (
								<div className="flex items-center justify-center h-full">
									<p>Loading data...</p>
								</div>
							) : usersData.length === 0 ? (
								<div className="flex items-center justify-center h-full">
									<p>No data available for the selected period</p>
								</div>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={usersData}>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#333"
										/>
										<XAxis
											dataKey="date"
											stroke="#888"
											fontSize={12}
											tickMargin={10}
										/>
										<YAxis stroke="#888" fontSize={12} tickMargin={10} />
										<Tooltip
											contentStyle={{
												backgroundColor: "#1e1e2f",
												borderColor: "#333",
											}}
											labelStyle={{ color: "#fff" }}
										/>
										<Line
											type="monotone"
											dataKey="users"
											name="Active Users"
											stroke="hsl(var(--primary))"
											strokeWidth={2}
											dot={{ strokeWidth: 0, r: 4 }}
											activeDot={{ r: 6, stroke: "hsl(var(--background))" }}
										/>
									</LineChart>
								</ResponsiveContainer>
							)}
						</div>
						<div className="text-sm text-muted-foreground text-center">
							Average Users per{" "}
							{selectedPeriod === "day"
								? "Hour"
								: selectedPeriod === "week"
								? "Day"
								: "Day"}
							: {averageUsers}
						</div>
					</TabsContent>
					<TabsContent value="revenue" className="space-y-4">
						<div className="h-[350px]">
							{isLoadingRevenue ? (
								<div className="flex items-center justify-center h-full">
									<p>Loading data...</p>
								</div>
							) : revenueData.length === 0 ? (
								<div className="flex items-center justify-center h-full">
									<p>No data available for the selected period</p>
								</div>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={revenueData}>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#333"
										/>
										<XAxis
											dataKey="date"
											stroke="#888"
											fontSize={12}
											tickMargin={10}
										/>
										<YAxis stroke="#888" fontSize={12} tickMargin={10} />
										<Tooltip
											contentStyle={{
												backgroundColor: "#1e1e2f",
												borderColor: "#333",
											}}
											labelStyle={{ color: "#fff" }}
										/>
										<Bar
											dataKey="revenue"
											name="Revenue ($)"
											fill="#10b981"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							)}
						</div>
						<div className="text-sm text-muted-foreground text-center">
							Total Revenue{" "}
							{selectedPeriod === "day"
								? "Today"
								: selectedPeriod === "week"
								? "This Week"
								: "This Month"}
							: ${totalRevenue}
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
