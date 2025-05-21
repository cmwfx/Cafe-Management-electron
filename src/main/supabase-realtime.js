const { supabase } = require("./supabase-config");

/**
 * Class to manage Supabase realtime subscriptions
 */
class SupabaseRealtime {
	constructor() {
		this.subscriptions = new Map();
		this.isInitialized = false;
	}

	/**
	 * Initialize the realtime client
	 */
	initialize() {
		if (this.isInitialized) return;
		this.isInitialized = true;
	}

	/**
	 * Subscribe to changes on a specific table
	 * @param {string} table - The table name to subscribe to
	 * @param {string} event - The event to listen for ('INSERT', 'UPDATE', 'DELETE', '*')
	 * @param {Function} callback - Callback function to execute when an event occurs
	 * @param {Object} options - Additional options for the subscription
	 * @returns {string} Subscription ID
	 */
	subscribe(table, event, callback, options = {}) {
		this.initialize();

		const filter = options.filter || {};
		const key = `${table}:${event}:${JSON.stringify(filter)}`;

		// Check if subscription already exists
		if (this.subscriptions.has(key)) {
			return this.subscriptions.get(key).id;
		}

		// Create channel for the table and event
		let channel = supabase
			.channel(key)
			.on(
				"postgres_changes",
				{
					event: event,
					schema: "public",
					table: table,
					...filter,
				},
				(payload) => {
					callback(payload);
				}
			)
			.subscribe();

		// Store the subscription
		this.subscriptions.set(key, { channel, id: key });

		return key;
	}

	/**
	 * Unsubscribe from a specific subscription
	 * @param {string} subscriptionId - The subscription ID to unsubscribe from
	 */
	unsubscribe(subscriptionId) {
		if (!this.subscriptions.has(subscriptionId)) {
			return;
		}

		const { channel } = this.subscriptions.get(subscriptionId);

		// Remove the subscription
		supabase.removeChannel(channel);
		this.subscriptions.delete(subscriptionId);
	}

	/**
	 * Unsubscribe from all subscriptions
	 */
	unsubscribeAll() {
		for (const [key, { channel }] of this.subscriptions.entries()) {
			supabase.removeChannel(channel);
			this.subscriptions.delete(key);
		}
	}
}

// Create and export a singleton instance
const realtimeManager = new SupabaseRealtime();
module.exports = { realtimeManager };
