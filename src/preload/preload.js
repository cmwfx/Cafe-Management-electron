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

// Expose a limited API to the renderer process for security
contextBridge.exposeInMainWorld("api", {
	// Send messages to main process
	send: (channel, data) => {
		// List of allowed channels for security
		const validChannels = [
			"login",
			"logout",
			"logoutAndCloseOtherApps",
			"register",
			"getUserData",
			"getTransactionHistory",
			"startSession",
			"endSession",
			"extendSession",
			"launchApplication",
			"restartComputer",
			"getActiveSession",
			"cleanupUserProcesses",
			"sessionExpired",
			"sessionExtended",
			"sendKioskToBackground",
		];

		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},

	// Receive messages from main process
	receive: (channel, func) => {
		// List of allowed channels for security
		const validChannels = [
			"loginResponse",
			"logoutResponse",
			"logoutAndCloseOtherAppsResponse",
			"registerResponse",
			"userData",
			"transactionHistoryResponse",
			"sessionStartResponse",
			"sessionEndResponse",
			"sessionExtendResponse",
			"applicationLaunched",
			"notification",
			"sessionUpdate",
			"profileUpdate",
			"creditTransaction",
			"sessionExpired",
			"sessionExpiredUI",
			"forceLogout",
			"sessionResponse",
			"processesCleanedUp",
			"kioskSentToBackground",
		];

		if (validChannels.includes(channel)) {
			// Remove listener before adding to prevent duplicates
			ipcRenderer.removeAllListeners(channel);
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	},

	// One-time listeners
	once: (channel, func) => {
		const validChannels = ["loginResponse", "sessionResponse"];

		if (validChannels.includes(channel)) {
			ipcRenderer.once(channel, (event, ...args) => func(...args));
		}
	},
});
