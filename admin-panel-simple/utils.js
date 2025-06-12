// Utility functions for the admin panel

// Toast notification system
const Toast = {
	show(message, type = "info", duration = 5000) {
		const container = document.getElementById("toast-container");
		const toast = document.createElement("div");
		toast.className = `toast ${type}`;
		toast.textContent = message;

		container.appendChild(toast);

		// Auto-remove after duration
		setTimeout(() => {
			if (toast.parentNode) {
				toast.parentNode.removeChild(toast);
			}
		}, duration);
	},

	success(message, duration) {
		this.show(message, "success", duration);
	},

	error(message, duration) {
		this.show(message, "error", duration);
	},

	info(message, duration) {
		this.show(message, "info", duration);
	},
};

// Loading state management
const Loading = {
	show() {
		document.getElementById("loading").style.display = "flex";
	},

	hide() {
		document.getElementById("loading").style.display = "none";
	},
};

// Navigation management
const Navigation = {
	showPage(pageId) {
		console.log("Navigation.showPage called with:", pageId);

		// Hide all pages
		document.querySelectorAll(".page").forEach((page) => {
			page.classList.remove("active");
		});

		// Show selected page
		const targetPage = document.getElementById(pageId + "-page");
		if (targetPage) {
			targetPage.classList.add("active");
			console.log("Activated page:", pageId + "-page");
		} else {
			console.error("Page not found:", pageId + "-page");
		}

		// Update navigation active states
		document.querySelectorAll(".nav-item").forEach((item) => {
			item.classList.remove("active");
		});

		// Set active nav item
		const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
		if (activeNavItem) {
			activeNavItem.classList.add("active");
			console.log("Activated nav item for:", pageId);
		} else {
			console.error("Nav item not found for page:", pageId);
		}
	},
};

// Table generation utilities
const TableUtils = {
	generateActiveUsersTable(sessions, tableId) {
		const container = document.getElementById(tableId);

		if (!sessions || sessions.length === 0) {
			container.innerHTML =
				'<p class="text-center">No active sessions found.</p>';
			return;
		}

		const table = document.createElement("table");
		table.innerHTML = `
            <thead>
                <tr>
                    <th>User</th>
                    <th>Computer</th>
                    <th>Start Time</th>
                    <th>Time Left</th>
                    <th>Credits Used</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${sessions
									.map(
										(session) => `
                    <tr>
                        <td>
                            <div>
                                <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(
																	session.username
																)}</div>
                            </div>
                        </td>
                        <td>${escapeHtml(session.computer)}</td>
                        <td>${session.startTime}</td>
                        <td>${session.timeLeft}</td>
                        <td>${session.creditsUsed}</td>
                        <td>
                            <span class="status-badge ${
															session.status === "Active"
																? "status-active"
																: "status-inactive"
														}">
                                ${session.status}
                            </span>
                        </td>
                    </tr>
                `
									)
									.join("")}
            </tbody>
        `;

		container.innerHTML = "";
		container.appendChild(table);
	},

	generateAllUsersTable(users, tableId) {
		const container = document.getElementById(tableId);

		if (!users || users.length === 0) {
			container.innerHTML = '<p class="text-center">No users found.</p>';
			return;
		}

		const table = document.createElement("table");
		table.innerHTML = `
            <thead>
                <tr>
                    <th>User</th>
                    <th>Credits</th>
                    <th>Last Active</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users
									.map(
										(user) => `
                    <tr>
                        <td>
                            <div>
                                <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(
																	user.username
																)}${
											user.isAdmin
												? ' <span style="color: #3b82f6; font-size: 0.75rem;">(Admin)</span>'
												: ""
										}</div>
                            </div>
                        </td>
                        <td style="font-weight: 500;">${user.credits}</td>
                        <td>${user.lastActive}</td>
                        <td>
                            <span class="status-badge ${
															user.status === "Active"
																? "status-active"
																: "status-inactive"
														}">
                                ${user.status}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn" onclick="openCreditModal('${
															user.id
														}', '${escapeHtml(user.username)}', ${
											user.credits
										})">
                                Add Credits
                            </button>
                        </td>
                    </tr>
                `
									)
									.join("")}
            </tbody>
        `;

		container.innerHTML = "";
		container.appendChild(table);
	},
};

// Credit modal management
let currentEditingUserId = null;

function openCreditModal(userId, userName, currentCredits) {
	currentEditingUserId = userId;
	document.getElementById("modal-user-name").textContent = userName;
	document.getElementById("modal-current-credits").textContent = currentCredits;
	document.getElementById("new-credits").value = "";
	document.getElementById("credit-reason").value = "";
	document.getElementById("credit-modal").style.display = "flex";
}

function closeCreditModal() {
	currentEditingUserId = null;
	document.getElementById("credit-modal").style.display = "none";
}

async function updateCredits() {
	if (!currentEditingUserId) return;

	const creditsToAdd = parseInt(document.getElementById("new-credits").value);
	const reason = document.getElementById("credit-reason").value;

	if (isNaN(creditsToAdd) || creditsToAdd < 0) {
		Toast.error("Please enter a valid credit amount to add");
		return;
	}

	try {
		Loading.show();
		await DataService.addUserCredits(
			currentEditingUserId,
			creditsToAdd,
			reason
		);
		Toast.success("Credits added successfully");
		closeCreditModal();

		// Refresh current page data
		const activePage = document.querySelector(".nav-item.active").dataset.page;
		if (activePage === "all-users") {
			refreshAllUsers();
		} else if (activePage === "overview") {
			refreshDashboard();
		}
	} catch (error) {
		Toast.error("Failed to add credits: " + error.message);
	} finally {
		Loading.hide();
	}
}

// Search functionality
function setupSearch() {
	const searchInput = document.getElementById("user-search");
	if (searchInput) {
		// Remove existing event listeners
		const newSearchInput = searchInput.cloneNode(true);
		searchInput.parentNode.replaceChild(newSearchInput, searchInput);

		// Add new event listener
		newSearchInput.addEventListener("input", (e) => {
			const searchTerm = e.target.value.toLowerCase();
			const tableRows = document.querySelectorAll("#all-users-table tbody tr");

			tableRows.forEach((row) => {
				const userInfo = row.cells[0].textContent.toLowerCase();
				if (userInfo.includes(searchTerm)) {
					row.style.display = "";
				} else {
					row.style.display = "none";
				}
			});
		});
	}
}

// Utility functions
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

function formatCurrency(amount) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
}

function formatNumber(number) {
	return new Intl.NumberFormat("en-US").format(number);
}

// Auto-refresh management
const AutoRefresh = {
	intervals: {},

	start(pageId, callback, interval) {
		this.stop(pageId); // Clear any existing interval
		this.intervals[pageId] = setInterval(callback, interval);
	},

	stop(pageId) {
		if (this.intervals[pageId]) {
			clearInterval(this.intervals[pageId]);
			delete this.intervals[pageId];
		}
	},

	stopAll() {
		Object.keys(this.intervals).forEach((pageId) => {
			this.stop(pageId);
		});
	},
};

// Modal click outside to close
document.addEventListener("click", (e) => {
	if (e.target.classList.contains("modal")) {
		closeCreditModal();
	}
});

// Escape key to close modal
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		closeCreditModal();
	}
});
