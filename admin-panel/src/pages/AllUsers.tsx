import { AllUserTable, UserData } from "@/components/user-table";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";

const AllUsers = () => {
	const [users, setUsers] = useState<UserData[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [totalCredits, setTotalCredits] = useState<number>(0);

	const fetchUsers = async () => {
		setIsLoading(true);
		try {
			// Fetch users from Supabase
			const { data: profiles, error } = await supabase
				.from("profiles")
				.select(
					`
          id,
          username,
          credits,
          first_name,
          last_name,
          is_admin,
          updated_at
        `
				)
				.order("updated_at", { ascending: false });

			if (error) {
				console.error("Error fetching users:", error);
				toast.error("Failed to fetch users");
				return;
			}

			if (!profiles || profiles.length === 0) {
				setUsers([]);
				setTotalCredits(0);
				return;
			}

			// Transform the data to match the UserData interface
			const transformedUsers: UserData[] = profiles.map((profile) => {
				// Format the last active time
				let lastActive = "Never";
				if (profile.updated_at) {
					const date = new Date(profile.updated_at);
					const today = new Date();
					const yesterday = new Date(today);
					yesterday.setDate(yesterday.getDate() - 1);

					if (date.toDateString() === today.toDateString()) {
						lastActive = `Today, ${date.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}`;
					} else if (date.toDateString() === yesterday.toDateString()) {
						lastActive = `Yesterday, ${date.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}`;
					} else {
						lastActive = date.toLocaleDateString([], {
							month: "short",
							day: "numeric",
							year: "numeric",
						});
					}
				}

				return {
					id: profile.id,
					email: profile.username || "",
					name:
						`${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
						"No Name",
					creditBalance: profile.credits,
					lastActive: lastActive,
					status:
						profile.updated_at &&
						new Date().getTime() - new Date(profile.updated_at).getTime() <
							24 * 60 * 60 * 1000
							? "Active"
							: "Inactive",
				};
			});

			setUsers(transformedUsers);

			// Calculate total credits
			const total = profiles.reduce((sum, profile) => sum + profile.credits, 0);
			setTotalCredits(total);
		} catch (error) {
			console.error("Error in fetchUsers:", error);
			toast.error("An unexpected error occurred while fetching users");
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch users on component mount
	useEffect(() => {
		fetchUsers();
	}, []);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">All Users</h1>
				<p className="text-muted-foreground">
					Manage all registered users and their credit balances
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="rounded-lg border bg-card p-6">
					<div className="flex flex-col">
						<h3 className="text-2xl font-bold">{users.length}</h3>
						<p className="text-xs text-muted-foreground">Total Users</p>
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex flex-col">
						<h3 className="text-2xl font-bold">
							{users.filter((user) => user.status === "Active").length}
						</h3>
						<p className="text-xs text-muted-foreground">Active Users</p>
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex flex-col">
						<h3 className="text-2xl font-bold">
							{totalCredits.toLocaleString()}
						</h3>
						<p className="text-xs text-muted-foreground">Total Credits</p>
					</div>
				</div>
			</div>

			<AllUserTable data={users} onRefresh={fetchUsers} isLoading={isLoading} />
		</div>
	);
};

export default AllUsers;
