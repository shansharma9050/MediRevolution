let pendingUsers = [];

document.addEventListener("DOMContentLoaded", function () {
	requireRole("SUPER_ADMIN");
	loadPendingUsers();
});

async function loadPendingUsers() {
	const token =
		localStorage.getItem("token");

	showPendingUsersLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/auth/admin/users/pending`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		let result = [];

		try {
			result =
				await response.json();
		} catch (error) {
			result = [];
		}

		if (!response.ok) {
			pendingUsers = [];

			updatePendingSummary(0, 0);

			showAdminMessage(
				getErrorMessage(
					result,
					"Unable to load pending users"
				)
			);

			showPendingUsersErrorState(
				getErrorMessage(
					result,
					"Unable to load pending users"
				)
			);

			return;
		}

		pendingUsers =
			Array.isArray(result)
				? result
				: [];

		renderPendingUsers(
			pendingUsers
		);

	} catch (error) {
		console.error(
			"Pending users load error:",
			error
		);

		pendingUsers = [];

		updatePendingSummary(0, 0);

		showAdminMessage(
			"Server not reachable. Please check auth-service/api-gateway."
		);

		showPendingUsersErrorState(
			"Server not reachable. Please check auth-service/api-gateway."
		);
	}
}

function renderPendingUsers(users) {
	const table =
		document.getElementById(
			"pendingUsersTable"
		);

	if (!table) {
		return;
	}

	const safeUsers =
		Array.isArray(users)
			? users
			: [];

	updatePendingSummary(
		pendingUsers.length,
		safeUsers.length
	);

	if (!safeUsers.length) {
		table.innerHTML = `
			<tr>
				<td colspan="8">

					<div class="approvals-empty-state">

						<div class="approvals-empty-icon">
							<i class="bi bi-person-check-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No pending approvals found
						</h5>

						<p class="text-muted mb-0">
							All registration requests are currently processed.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	safeUsers.forEach(
		function(user, index) {

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<div class="approval-user-cell">

							<div class="approval-user-avatar">
								<i class="bi bi-person-fill"></i>
							</div>

							<div>
								<strong class="text-primary">
									${safe(user.fullName)}
								</strong>
							</div>

						</div>
					</td>

					<td>
						<i class="bi bi-envelope-fill text-primary me-1"></i>
						${safe(user.email)}
					</td>

					<td>
						<i class="bi bi-telephone-fill text-primary me-1"></i>
						${safe(user.mobile)}
					</td>

					<td>
						<span class="approval-role-pill">
							<i class="bi bi-person-vcard-fill"></i>
							${safe(user.role)}
						</span>
					</td>

					<td>
						${formatDate(user.createdAt)}
					</td>

					<td>
						<span class="approval-status-pill">
							<i class="bi bi-hourglass-split"></i>
							Pending
						</span>
					</td>

					<td class="text-end">

						<div class="approval-action-group">

							<button type="button"
									class="btn btn-success btn-sm"
									onclick="approveUser(${safeNumber(user.id)})">

								<i class="bi bi-check2-circle me-1"></i>
								Approve
							</button>

							<button type="button"
									class="btn btn-danger btn-sm"
									onclick="rejectUser(${safeNumber(user.id)})">

								<i class="bi bi-x-circle me-1"></i>
								Reject
							</button>

						</div>

					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function showPendingUsersLoadingState() {
	const table =
		document.getElementById(
			"pendingUsersTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="approvals-loading-state">

					<div class="approvals-loading-icon">
						<i class="bi bi-person-lines-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading pending users
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare the registration queue.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showPendingUsersErrorState(message) {
	const table =
		document.getElementById(
			"pendingUsersTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="approvals-error-state">

					<div class="approvals-error-icon">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load pending users
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

async function approveUser(userId) {
	if (
		!confirm(
			"Are you sure you want to approve this user?"
		)
	) {
		return;
	}

	await updateUserApproval(
		userId,
		"approve"
	);
}

async function rejectUser(userId) {
	if (
		!confirm(
			"Are you sure you want to reject this user?"
		)
	) {
		return;
	}

	await updateUserApproval(
		userId,
		"reject"
	);
}

async function updateUserApproval(
	userId,
	action
) {
	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/auth/admin/users/${userId}/${action}`,
				{
					method: "PUT",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const resultText =
			await response.text();

		if (!response.ok) {
			showAdminMessage(
				resultText ||
				"Action failed"
			);

			return;
		}

		showAdminMessage(
			resultText ||
				(
					action === "approve"
						? "User approved successfully"
						: "User rejected successfully"
				),
			"success"
		);

		loadPendingUsers();

	} catch (error) {
		console.error(
			"User approval update error:",
			error
		);

		showAdminMessage(
			"Server not reachable. Please try again."
		);
	}
}

function filterTable() {
	const searchBox =
		document.getElementById(
			"searchBox"
		);

	const keyword =
		searchBox
			? searchBox.value
				.trim()
				.toLowerCase()
			: "";

	const filtered =
		pendingUsers.filter(
			function(user) {

				return (
					String(
						user.fullName || ""
					)
						.toLowerCase()
						.includes(keyword) ||

					String(
						user.email || ""
					)
						.toLowerCase()
						.includes(keyword) ||

					String(
						user.mobile || ""
					)
						.toLowerCase()
						.includes(keyword) ||

					String(
						user.role || ""
					)
						.toLowerCase()
						.includes(keyword)
				);

			}
		);

	renderPendingUsers(filtered);
}

function updatePendingSummary(
	totalCount,
	visibleCount
) {
	setSummaryValue(
		"pendingCount",
		totalCount
	);

	setSummaryValue(
		"visiblePendingCount",
		visibleCount
	);
}

function setSummaryValue(id, value) {
	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const target =
		Number(value) || 0;

	const start =
		Number(element.textContent) || 0;

	const difference =
		target - start;

	const duration = 450;
	const startTime = performance.now();

	if (
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches ||
		difference === 0
	) {
		element.textContent = target;
		return;
	}

	function update(currentTime) {
		const progress =
			Math.min(
				(currentTime - startTime) /
					duration,
				1
			);

		const eased =
			1 - Math.pow(1 - progress, 3);

		element.textContent =
			Math.round(
				start +
					difference *
						eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function showAdminMessage(
	message,
	type = "danger"
) {
	const msgBox =
		document.getElementById("msg");

	if (!msgBox) {
		return;
	}

	msgBox.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	setTimeout(() => {
		if (msgBox) {
			msgBox.innerHTML = "";
		}
	}, 3500);
}

function formatDate(dateValue) {
	if (!dateValue) {
		return "-";
	}

	const date =
		new Date(dateValue);

	if (Number.isNaN(date.getTime())) {
		return safe(dateValue);
	}

	return date.toLocaleString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		}
	);
}

function getErrorMessage(
	data,
	fallback
) {
	if (!data) {
		return fallback;
	}

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	if (typeof data === "string") {
		return data;
	}

	return fallback;
}

function safe(value) {
	return (
		value === null ||
		value === undefined ||
		value === ""
	)
		? "-"
		: escapeHtml(value);
}

function safeNumber(value) {
	const numberValue =
		Number(value);

	return Number.isFinite(numberValue)
		? numberValue
		: 0;
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}