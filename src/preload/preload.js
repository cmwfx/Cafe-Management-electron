/**
 * Preload Script
 *
 * This script runs in a context that has access to both the Electron renderer process and Node.js APIs.
 * It's used to securely expose specific Node/Electron functionality to the renderer process.
 *
 * Security principles:
 * 1. Contextual isolation is enabled
 * 2. Only whitelist specific APIs and channels
 * 3. Never expose the entire ipcRenderer object
 * 4. Validate all data passing through channels
 */

const { contextBridge, ipcRenderer } = require("electron");

// Channels the renderer process can send messages through
const validSendChannels = [
	"login",
	"logout",
	"register",
	"startSession",
	"endSession",
	"extendSession",
	"getSystemInfo",
	"minimizeApp",
	"getUserData",
	"getActiveSession",
	"getTransactions",
	"getComputers",
	"getTransactionHistory",
	"sessionExpired",
	"restartComputer",
];

// Channels the renderer process can receive messages from
const validReceiveChannels = [
	"loginResponse",
	"logoutResponse",
	"registerResponse",
	"sessionResponse",
	"sessionUpdate",
	"sessionExpiring",
	"systemInfo",
	"notification",
	"connectionStatus",
	"creditTransaction",
	"profileUpdate",
	"userData",
	"computerUpdate",
	"transactionsData",
	"transactionHistoryResponse",
	"sessionStartResponse",
	"sessionExtendResponse",
	"sessionEndResponse",
	"sessionExpired",
	"creditUpdate",
];

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld("api", {
	// Send messages to main process
	send: (channel, data) => {
		// Validate channel
		if (!validSendChannels.includes(channel)) {
			return;
		}

		// Send to main process
		ipcRenderer.send(channel, data);
	},

	// Receive messages from main process
	receive: (channel, callback) => {
		// Validate channel
		if (!validReceiveChannels.includes(channel)) {
			return;
		}

		// Create handler that strips 'event' to prevent exposing ipcRenderer
		const subscription = (event, ...args) => callback(...args);
		ipcRenderer.on(channel, subscription);

		// Return a function to remove the listener
		return () => {
			ipcRenderer.removeListener(channel, subscription);
		};
	},

	// Get current timestamp (safe operation)
	getTimestamp: () => Date.now(),
});
