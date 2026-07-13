let notifications = [];
let currentFilter = "ALL";
let notificationRefreshTimer = null;
let isLoadingNotifications = false;

document.addEventListener("DOMContentLoaded", function() {
	loadNotifications();

	notificationRefreshTimer =
		window.setInterval(
			loadNotifications,
			30000
		);
});

window.addEventListener("beforeunload", function() {
	if (notificationRefreshTimer) {
		window.clearInterval(
			notificationRefreshTimer
		);
	}
});

async function loadNotifications() {
	if (isLoadingNotifications) {
		return;
	}

	isLoadingNotifications = true;

	const token =
		localStorage.getItem("token");

	showNotificationsLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/notifications/my`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showNotificationsErrorState(
				getErrorMessage(
					result,
					"Unable to load notifications"
				)
			);

			showNotificationMessage(
				getErrorMessage(
					result,
					"Unable to load notifications"
				)
			);

			return;
		}

		notifications =
			Array.isArray(result)
				? result
				: [];

		updateNotificationStats();
		renderNotifications();
		updateBellCounter();

	} catch (e) {
		console.error(
			"Load notifications error:",
			e
		);

		showNotificationsErrorState(
			"Notification service unavailable"
		);

		showNotificationMessage(
			"Notification service unavailable"
		);

	} finally {
		isLoadingNotifications = false;
	}
}

function renderNotifications() {
	const container =
		document.getElementById(
			"notificationList"
		);

	if (!container) {
		return;
	}

	let data =
		Array.isArray(notifications)
			? notifications
			: [];

	if (currentFilter !== "ALL") {
		data =
			data.filter(
				notification =>
					notification.type ===
					currentFilter
			);
	}

	if (!data.length) {
		container.innerHTML = `
			<div class="notifications-state">

				<div class="notifications-state-icon">
					<i class="bi bi-bell-slash-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No notifications
				</h5>

				<p class="text-muted mb-0">
					There are no notifications for the selected filter.
				</p>

			</div>
		`;

		renderDrawer();
		return;
	}

	let html = "";

	data.forEach(
		function(notification, index) {

			const priority =
				String(
					notification.priority ||
					"LOW"
				).toLowerCase();

			html += `
				<article class="notification-card
					${notification.read ? "" : "unread"}
					priority-${escapeHtml(priority)}"
					style="--card-delay:${Math.min(index * 55, 330)}ms">

					<div class="notification-card-content">

						<div class="notification-card-icon">
							<i class="${notificationIcon(notification.type)}"></i>
						</div>

						<div class="notification-card-main">

							<div class="notification-card-title-row">

								<div>

									<div class="notification-card-title">
										${safe(notification.title)}
									</div>

									<div class="notification-card-message">
										${safe(notification.message)}
									</div>

								</div>

								<div class="d-flex align-items-center gap-2">

									${!notification.read
					? `
											<span class="notification-unread-dot"
												  title="Unread">
											</span>

											<button type="button"
													class="btn btn-sm btn-outline-primary"
													onclick="markRead(${safeNumber(notification.id)})">

												<i class="bi bi-check2 me-1"></i>
												Read
											</button>
										`
					: ""
				}

								</div>

							</div>

							<div class="notification-card-meta">

								<span class="notification-chip">
									<i class="bi bi-tag-fill"></i>
									${safe(notification.type)}
								</span>

								<span class="notification-chip">
									<i class="bi bi-flag-fill"></i>
									${safe(notification.priority || "LOW")}
								</span>

								<span class="notification-chip">
									<i class="bi bi-clock-fill"></i>
									${formatDateTime(notification.createdAt)}
								</span>

							</div>

						</div>

					</div>

				</article>
			`;

		}
	);

	container.innerHTML = html;

	renderDrawer();
}

function showNotificationsLoadingState() {
	const container =
		document.getElementById(
			"notificationList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="notifications-state">

			<div class="notifications-state-icon notifications-loading-icon">
				<i class="bi bi-bell-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading notifications
			</h5>

			<p class="text-muted mb-0">
				Please wait while we prepare your activity feed.
			</p>

		</div>
	`;
}

function showNotificationsErrorState(message) {
	const container =
		document.getElementById(
			"notificationList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="notifications-state">

			<div class="notifications-state-icon bg-danger">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load notifications
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}

async function markRead(id) {
	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/notifications/${id}/read`,
				{
					method: "PUT",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			const result =
				await readJsonSafely(response);

			showNotificationMessage(
				getErrorMessage(
					result,
					"Unable to mark notification as read"
				)
			);

			return;
		}

		const target =
			notifications.find(
				item =>
					Number(item.id) ===
					Number(id)
			);

		if (target) {
			target.read = true;
		}

		updateNotificationStats();
		renderNotifications();
		updateBellCounter();

	} catch (e) {
		console.error(
			"Mark notification read error:",
			e
		);

		showNotificationMessage(
			"Notification service unavailable"
		);
	}
}

async function markAllRead() {
	const unreadItems =
		notifications.filter(
			notification =>
				!notification.read
		);

	if (!unreadItems.length) {
		showNotificationMessage(
			"All notifications are already read",
			"info"
		);

		return;
	}

	setButtonLoading(
		"markAllReadBtn",
		"Marking...",
		true
	);

	const token =
		localStorage.getItem("token");

	try {
		const responses =
			await Promise.all(
				unreadItems.map(
					notification =>
						fetch(
							`${API_BASE}/notifications/${notification.id}/read`,
							{
								method: "PUT",

								headers: {
									"Authorization":
										"Bearer " + token
								}
							}
						)
				)
			);

		const failed =
			responses.some(
				response =>
					!response.ok
			);

		if (failed) {
			showNotificationMessage(
				"Some notifications could not be marked as read"
			);

			await loadNotifications();
			return;
		}

		notifications.forEach(
			notification => {
				notification.read = true;
			}
		);

		updateNotificationStats();
		renderNotifications();
		updateBellCounter();

		showNotificationMessage(
			"All notifications marked as read",
			"success"
		);

	} catch (e) {
		console.error(
			"Mark all notifications read error:",
			e
		);

		showNotificationMessage(
			"Notification service unavailable"
		);

	} finally {
		setButtonLoading(
			"markAllReadBtn",
			"Mark All Read",
			false
		);
	}
}

function updateBellCounter() {
	const unread =
		notifications.filter(
			notification =>
				!notification.read
		).length;

	const badge =
		document.getElementById(
			"notificationCount"
		);

	if (badge) {
		badge.innerText = unread;
		badge.style.display =
			unread > 0
				? "inline-block"
				: "none";
	}
}

function updateNotificationStats() {
	setSummaryValue(
		"totalNotifications",
		notifications.length
	);

	setSummaryValue(
		"unreadNotifications",
		notifications.filter(
			notification =>
				!notification.read
		).length
	);

	setSummaryValue(
		"criticalNotifications",
		notifications.filter(
			notification =>
				notification.priority ===
				"CRITICAL"
		).length
	);

	setSummaryValue(
		"todayNotifications",
		notifications.filter(isToday)
			.length
	);
}

function filterNotifications(
	type,
	button
) {
	currentFilter = type;

	document
		.querySelectorAll(
			".notification-filter-btn"
		)
		.forEach(
			element =>
				element.classList.remove(
					"active"
				)
		);

	if (button) {
		button.classList.add("active");
	}

	renderNotifications();
}

function openNotificationDrawer() {
	const drawer =
		document.getElementById(
			"notificationDrawer"
		);

	const backdrop =
		document.getElementById(
			"notificationDrawerBackdrop"
		);

	if (drawer) {
		drawer.classList.add("show");
	}

	if (backdrop) {
		backdrop.classList.add("show");
	}

	renderDrawer();
}

function closeNotificationDrawer() {
	const drawer =
		document.getElementById(
			"notificationDrawer"
		);

	const backdrop =
		document.getElementById(
			"notificationDrawerBackdrop"
		);

	if (drawer) {
		drawer.classList.remove("show");
	}

	if (backdrop) {
		backdrop.classList.remove("show");
	}
}

function renderDrawer() {
	const drawer =
		document.getElementById(
			"drawerNotifications"
		);

	if (!drawer) {
		return;
	}

	const latest =
		notifications.slice(0, 10);

	if (!latest.length) {
		drawer.innerHTML = `
			<div class="notifications-state">

				<div class="notifications-state-icon">
					<i class="bi bi-bell-slash-fill"></i>
				</div>

				<p class="text-muted mb-0">
					No notifications available.
				</p>

			</div>
		`;

		return;
	}

	let html = "";

	latest.forEach(
		function(notification) {

			html += `
				<div class="drawer-notification-card
					${notification.read ? "" : "unread"}">

					<strong>
						${safe(notification.title)}
					</strong>

					<p>
						${safe(notification.message)}
					</p>

					<div class="text-muted small mt-2">
						${formatDateTime(notification.createdAt)}
					</div>

				</div>
			`;

		}
	);

	drawer.innerHTML = html;
}

function notificationIcon(type) {
	switch (type) {
		case "ORDER":
			return "bi bi-bag-check-fill";

		case "APPROVAL":
			return "bi bi-person-check-fill";

		case "INVOICE":
			return "bi bi-receipt-cutoff";

		case "LOW_STOCK":
			return "bi bi-exclamation-triangle-fill";

		default:
			return "bi bi-bell-fill";
	}
}

function isToday(notification) {
	if (!notification.createdAt) {
		return false;
	}

	const date =
		new Date(notification.createdAt);

	if (Number.isNaN(date.getTime())) {
		return false;
	}

	const today =
		new Date();

	return (
		date.getFullYear() ===
		today.getFullYear() &&
		date.getMonth() ===
		today.getMonth() &&
		date.getDate() ===
		today.getDate()
	);
}

function formatDateTime(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
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

	const duration = 500;
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
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {
	const button =
		document.getElementById(buttonId);

	if (!button) {
		return;
	}

	if (isLoading) {
		button.dataset.originalHtml =
			button.innerHTML;

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"
				  role="status"
				  aria-hidden="true"></span>
			${escapeHtml(loadingText)}
		`;

		button.disabled = true;

	} else {
		button.innerHTML =
			button.dataset.originalHtml ||
			button.innerHTML;

		button.disabled = false;
	}
}

async function readJsonSafely(response) {
	try {
		return await response.json();
	} catch (error) {
		return null;
	}
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

function showNotificationMessage(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type}">
			${escapeHtml(message)}
		</div>
	`;

	setTimeout(function() {
		if (msg) {
			msg.innerHTML = "";
		}
	}, 4000);
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