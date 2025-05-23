import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	MoreHorizontal,
	Search,
	ChevronDown,
	ArrowUpDown,
	Clock,
	UserRoundX,
	Plus,
	RefreshCcw,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";
import { getCurrentUser } from "@/lib/supabase";

export interface ActiveUserData {
	id: string;
	email: string;
	computerId: string;
	startTime: string;
	expiryTime: string;
	status: "Active" | "Expiring Soon";
}

export interface UserData {
	id: string;
	email: string;
	name: string;
	creditBalance: number;
	lastActive: string;
	status: "Active" | "Inactive";
}

interface ActiveUserTableProps {
	data: ActiveUserData[];
	onRefresh?: () => void;
	isLoading?: boolean;
}

interface AllUserTableProps {
	data: UserData[];
	onRefresh?: () => void;
	isLoading?: boolean;
}

export function ActiveUserTable({
	data,
	onRefresh,
	isLoading = false,
}: ActiveUserTableProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<keyof ActiveUserData | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const handleSort = (column: keyof ActiveUserData) => {
		if (sortBy === column) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(column);
			setSortOrder("asc");
		}
	};

	const filteredData = data.filter(
		(user) =>
			user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.computerId.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const sortedData = [...filteredData].sort((a, b) => {
		if (!sortBy) return 0;

		if (sortBy === "status") {
			return sortOrder === "asc"
				? a.status.localeCompare(b.status)
				: b.status.localeCompare(a.status);
		}

		// For string comparisons
		if (typeof a[sortBy] === "string") {
			return sortOrder === "asc"
				? (a[sortBy] as string).localeCompare(b[sortBy] as string)
				: (b[sortBy] as string).localeCompare(a[sortBy] as string);
		}

		return 0;
	});

	return (
		<div className="w-full">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">Active Users</h2>
				<div className="flex items-center gap-2">
					<div className="relative">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search users..."
							className="w-[250px] pl-9"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<Button
						variant="outline"
						size="icon"
						onClick={onRefresh}
						disabled={isLoading}
					>
						<RefreshCcw
							className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
			</div>

			<div className="rounded-lg border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="data-table">
						<thead className="border-b bg-secondary/50">
							<tr>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("email")}
									>
										Email
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("computerId")}
									>
										Computer ID
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("startTime")}
									>
										Start Time
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("expiryTime")}
									>
										Expiry Time
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("status")}
									>
										Status
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{sortedData.map((user) => (
								<tr key={user.id}>
									<td className="font-medium">{user.email}</td>
									<td>{user.computerId}</td>
									<td>{user.startTime}</td>
									<td>{user.expiryTime}</td>
									<td>
										<div className="flex items-center gap-1.5">
											<span
												className={`inline-flex h-2 w-2 rounded-full ${
													user.status === "Active"
														? "bg-emerald-500"
														: "bg-amber-500"
												}`}
											/>
											<span className="text-sm">{user.status}</span>
										</div>
									</td>
									<td className="text-right">
										<div className="flex justify-end gap-2">
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
														>
															<Clock className="h-4 w-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>Extend Session</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>

											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
														>
															<UserRoundX className="h-4 w-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>End Session</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>

											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
													>
														<MoreHorizontal className="h-4 w-4" />
														<span className="sr-only">Open menu</span>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuLabel>Actions</DropdownMenuLabel>
													<DropdownMenuItem>View Profile</DropdownMenuItem>
													<DropdownMenuItem>
														View Usage History
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem className="text-destructive">
														End Session
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</td>
								</tr>
							))}
							{sortedData.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="py-6 text-center text-muted-foreground"
									>
										No active users found
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export function AllUserTable({
	data,
	onRefresh,
	isLoading = false,
}: AllUserTableProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<keyof UserData | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [showAddCreditId, setShowAddCreditId] = useState<string | null>(null);
	const [creditAmount, setCreditAmount] = useState<number>(0);
	const [creditDescription, setCreditDescription] = useState<string>("");

	const handleSort = (column: keyof UserData) => {
		if (sortBy === column) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(column);
			setSortOrder("asc");
		}
	};

	const handleAddCredit = async (userId: string) => {
		if (!creditAmount || creditAmount <= 0) {
			toast.error("Please enter a valid credit amount");
			return;
		}

		try {
			// Get current admin user
			const { user, error: userError } = await getCurrentUser();
			if (userError || !user) {
				toast.error("You must be logged in to add credits");
				console.error("User error:", userError);
				return;
			}

			// First update the user's credits in the profiles table
			const { data: profile, error: profileError } = await supabase
				.from("profiles")
				.select("credits")
				.eq("id", userId)
				.single();

			if (profileError) {
				toast.error("Error fetching user profile");
				console.error("Profile error:", profileError);
				return;
			}

			// Handle case where credits might be null
			const currentCredits = profile.credits || 0;
			const newCreditBalance = currentCredits + creditAmount;

			const { error: updateError } = await supabase
				.from("profiles")
				.update({ credits: newCreditBalance })
				.eq("id", userId);

			if (updateError) {
				toast.error("Error updating credits");
				console.error("Update error:", updateError);
				return;
			}

			// Then record the transaction in credit_transactions table
			const { error: transactionError } = await supabase
				.from("credit_transactions")
				.insert({
					user_id: userId,
					amount: creditAmount,
					transaction_type: "admin_add",
					description: creditDescription || "Added by admin",
					admin_id: user.id,
				});

			if (transactionError) {
				toast.error("Error recording transaction");
				console.error("Transaction error:", transactionError);
				// We should still consider the operation successful since the credits were added
			}

			toast.success(`Added ${creditAmount} credits successfully`);

			// Reset form and refresh data
			setShowAddCreditId(null);
			setCreditAmount(0);
			setCreditDescription("");

			// Refresh the user list if onRefresh is provided
			if (onRefresh) {
				onRefresh();
			}
		} catch (error) {
			toast.error("An unexpected error occurred");
			console.error("Unexpected error:", error);
		}
	};

	const filteredData = data.filter(
		(user) =>
			user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const sortedData = [...filteredData].sort((a, b) => {
		if (!sortBy) return 0;

		if (sortBy === "creditBalance") {
			return sortOrder === "asc"
				? a.creditBalance - b.creditBalance
				: b.creditBalance - a.creditBalance;
		}

		if (sortBy === "status") {
			return sortOrder === "asc"
				? a.status.localeCompare(b.status)
				: b.status.localeCompare(a.status);
		}

		// For string comparisons
		if (typeof a[sortBy] === "string") {
			return sortOrder === "asc"
				? (a[sortBy] as string).localeCompare(b[sortBy] as string)
				: (b[sortBy] as string).localeCompare(a[sortBy] as string);
		}

		return 0;
	});

	return (
		<div className="w-full">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">All Users</h2>
				<div className="flex items-center gap-2">
					<div className="relative">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search users..."
							className="w-[250px] pl-9"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<Button variant="outline">
						<ChevronDown className="h-4 w-4 mr-2" />
						Filter
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={onRefresh}
						disabled={isLoading}
					>
						<RefreshCcw
							className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
			</div>

			<div className="rounded-lg border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="data-table">
						<thead className="border-b bg-secondary/50">
							<tr>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("email")}
									>
										Email
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("name")}
									>
										Name
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("creditBalance")}
									>
										Credit Balance
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("lastActive")}
									>
										Last Active
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium">
									<div
										className="flex items-center cursor-pointer"
										onClick={() => handleSort("status")}
									>
										Status
										<ArrowUpDown className="ml-1 h-4 w-4" />
									</div>
								</th>
								<th className="font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{sortedData.map((user) => (
								<React.Fragment key={user.id}>
									<tr>
										<td className="font-medium">{user.email}</td>
										<td>{user.name}</td>
										<td>{user.creditBalance} credits</td>
										<td>{user.lastActive}</td>
										<td>
											<div className="flex items-center gap-1.5">
												<span
													className={`inline-flex h-2 w-2 rounded-full ${
														user.status === "Active"
															? "bg-emerald-500"
															: "bg-slate-400"
													}`}
												/>
												<span className="text-sm">{user.status}</span>
											</div>
										</td>
										<td className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													size="sm"
													className="text-xs"
													onClick={() => setShowAddCreditId(user.id)}
												>
													<Plus className="h-3.5 w-3.5 mr-1" />
													Add Credit
												</Button>

												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
														>
															<MoreHorizontal className="h-4 w-4" />
															<span className="sr-only">Open menu</span>
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuLabel>Actions</DropdownMenuLabel>
														<DropdownMenuItem>View Profile</DropdownMenuItem>
														<DropdownMenuItem>
															View Usage History
														</DropdownMenuItem>
														<DropdownMenuItem>Edit User</DropdownMenuItem>
														<DropdownMenuSeparator />
														<DropdownMenuItem className="text-destructive">
															Delete User
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</td>
									</tr>
									{showAddCreditId === user.id && (
										<tr className="bg-secondary/30">
											<td colSpan={6} className="py-4 px-6">
												<div className="space-y-3">
													<div className="text-sm font-medium">
														Add Credits to {user.email}
													</div>
													<div className="flex flex-wrap items-end gap-4">
														<div className="space-y-1">
															<label htmlFor="creditAmount" className="text-xs">
																Amount
															</label>
															<Input
																id="creditAmount"
																type="number"
																min="0"
																className="w-24"
																value={creditAmount}
																onChange={(e) =>
																	setCreditAmount(Number(e.target.value))
																}
															/>
														</div>
														<div className="space-y-1 flex-1">
															<label htmlFor="description" className="text-xs">
																Description
															</label>
															<Input
																id="description"
																placeholder="e.g., Monthly subscription, Promotion"
																value={creditDescription}
																onChange={(e) =>
																	setCreditDescription(e.target.value)
																}
															/>
														</div>
														<div className="flex gap-2">
															<Button
																size="sm"
																onClick={() => handleAddCredit(user.id)}
															>
																Add
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() => setShowAddCreditId(null)}
															>
																Cancel
															</Button>
														</div>
													</div>
												</div>
											</td>
										</tr>
									)}
								</React.Fragment>
							))}
							{sortedData.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="py-6 text-center text-muted-foreground"
									>
										No users found
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
