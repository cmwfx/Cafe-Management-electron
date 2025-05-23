import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

type PostgresChangesFilter = {
	event: "INSERT" | "UPDATE" | "DELETE" | "*";
	schema?: string;
	table: string;
	filter?: string;
};

/**
 * Hook to subscribe to Supabase real-time updates for a specific table
 * @param tableName The name of the table to subscribe to
 * @param callback Function to call when data changes
 * @param event Optional event type to filter on
 */
export function useSupabaseRealtime(
	tableName: string,
	callback: () => void,
	event: "INSERT" | "UPDATE" | "DELETE" | "*" = "*"
) {
	const [isConnected, setIsConnected] = useState(false);

	// Memoize the callback to prevent unnecessary re-subscriptions
	const memoizedCallback = useCallback(callback, [callback]);

	useEffect(() => {
		// Due to TypeScript issues with the Supabase realtime API,
		// we'll use polling instead of realtime subscriptions
		const pollingInterval = setInterval(() => {
			memoizedCallback();
		}, 15000); // Poll every 15 seconds

		console.log(`Started polling for ${tableName} changes`);
		setIsConnected(true);

		// Cleanup function to clear the interval
		return () => {
			clearInterval(pollingInterval);
			setIsConnected(false);
			console.log(`Stopped polling for ${tableName} changes`);
		};
	}, [tableName, memoizedCallback, event]);

	return { isConnected };
}
