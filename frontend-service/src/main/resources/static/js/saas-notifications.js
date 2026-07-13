let allNotifications = [];

let notificationPermissions = {
	update: false,
	delete: false
};

let isLoadingNotifications = false;
let isLoadingUnreadCount = false;
let isMarkingAllRead = false;
let processingNotificationIds = new Set();

document.addEventListener("DOMContentLoaded", async function() {
	const allowed = await protectSaasPage("NOTIFICATIONS", "VIEW");
	if (!allowed) return;

	const tenantId = localStorage.getItem("tenantId");
	const tenantName = localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText("tenantNameText", tenantName || "your workspace");

	await applyNotificationButtonPermissions();

	await Promise.all([
		loadUnreadCount(),
		loadNotifications()
	]);
});

async function applyNotificationButtonPermissions() {
	const [canUpdate, canDelete] = await Promise.all([
		hasSaasPermission("NOTIFICATIONS", "UPDATE"),
		hasSaasPermission("NOTIFICATIONS", "DELETE")
	]);

	notificationPermissions = {
		update: Boolean(canUpdate),
		delete: Boolean(canDelete)
	};

	showOrHideById("markAllReadBtn", notificationPermissions.update);
	showOrHideByClass("mark-read-btn", notificationPermissions.update);
	showOrHideByClass("delete-notification-btn", notificationPermissions.delete);
}

async function loadNotifications() {
	if (isLoadingNotifications) return;

	isLoadingNotifications = true;

	setButtonLoading("allNotificationsBtn", "Loading...", true);
	showNotificationsLoadingState();

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/notifications?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			allNotifications = [];
			const message = getApiErrorMessage(result, "Unable to load notifications.");
			showMsg(message);
			showNotificationsErrorState(message);
			updateNotificationSummary();
			return;
		}

		allNotifications = normalizeNotificationList(result);
		sortNotifications();

		renderNotifications(allNotifications);
		updateNotificationSummary();
		await loadUnreadCount();
		applyNotificationButtonPermissions();

	} catch (error) {
		console.error("Load notifications error:", error);
		allNotifications = [];
		showMsg("SaaS service not reachable.");
		showNotificationsErrorState("SaaS notification service is currently unavailable.");
		updateNotificationSummary();
	} finally {
		isLoadingNotifications = false;
		setButtonLoading("allNotificationsBtn", "All", false);
	}
}

async function loadUnreadNotifications() {
	if (isLoadingNotifications) return;

	isLoadingNotifications = true;

	setButtonLoading("unreadOnlyBtn", "Loading...", true);
	showNotificationsLoadingState();

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/notifications/unread?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			const message = getApiErrorMessage(result, "Unable to load unread notifications.");
			showMsg(message);
			showNotificationsErrorState(message);
			return;
		}

		const unreadNotifications = normalizeNotificationList(result);
		unreadNotifications.sort(
			(a, b) => safeDateTimestamp(b.createdAt) - safeDateTimestamp(a.createdAt)
		);

		renderNotifications(unreadNotifications);
		applyNotificationButtonPermissions();

	} catch (error) {
		console.error("Load unread notifications error:", error);
		showMsg("SaaS service not reachable.");
		showNotificationsErrorState("Unable to load unread notifications.");
	} finally {
		isLoadingNotifications = false;
		setButtonLoading("unreadOnlyBtn", "Unread", false);
	}
}

async function applyTypeFilter() {
	const type = getValue("filterType");

	if (!type) {
		filterNotificationsClientSide();
		return;
	}

	if (isLoadingNotifications) return;

	isLoadingNotifications = true;
	showNotificationsLoadingState();

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId"),
			type
		});

		const response = await fetch(
			`${API_BASE}/saas/notifications/type?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			const message = getApiErrorMessage(result, "Unable to filter notifications.");
			showMsg(message);
			showNotificationsErrorState(message);
			return;
		}

		const filtered = normalizeNotificationList(result);
		filtered.sort(
			(a, b) => safeDateTimestamp(b.createdAt) - safeDateTimestamp(a.createdAt)
		);

		renderNotifications(
			applyLocalFilters(filtered, false)
		);

		applyNotificationButtonPermissions();

	} catch (error) {
		console.error("Filter notifications error:", error);
		showMsg("SaaS service not reachable.");
		showNotificationsErrorState("Unable to filter notifications.");
	} finally {
		isLoadingNotifications = false;
	}
}

function filterNotificationsClientSide() {
	renderNotifications(
		applyLocalFilters(allNotifications, true)
	);

	applyNotificationButtonPermissions();
}

function applyLocalFilters(source, includeTypeFilter) {
	const keyword = getValue("notificationSearchBox").toLowerCase();
	const priority = getValue("priorityFilter").toUpperCase();
	const type = includeTypeFilter ? getValue("filterType").toUpperCase() : "";

	return source.filter(notification => {
		const searchable = [
			notification.title,
			notification.message,
			notification.notificationType,
			notification.priority
		].filter(Boolean).join(" ").toLowerCase();

		const keywordMatches = !keyword || searchable.includes(keyword);
		const priorityMatches =
			!priority ||
			String(notification.priority || "MEDIUM").toUpperCase() === priority;

		const typeMatches =
			!type ||
			String(notification.notificationType || "").toUpperCase() === type;

		return keywordMatches && priorityMatches && typeMatches;
	});
}

function normalizeNotificationList(result) {
	if (Array.isArray(result)) return result;
	if (Array.isArray(result?.data)) return result.data;
	if (Array.isArray(result?.content)) return result.content;
	return [];
}

function sortNotifications() {
	allNotifications.sort(
		(a, b) => safeDateTimestamp(b.createdAt) - safeDateTimestamp(a.createdAt)
	);
}

function renderNotifications(notifications) {
	const container = document.getElementById("notificationList");
	if (!container) return;

	const list = Array.isArray(notifications) ? notifications : [];

	if (!list.length) {
		container.innerHTML = `
			<div class="notifications-state">
				<div class="notifications-state-icon">
					<i class="bi bi-bell-slash-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">No notifications found</h5>
				<p class="text-muted mb-0">There are no notifications matching the selected filters.</p>
			</div>
		`;
		return;
	}

	container.innerHTML = list.map((notification, index) => {
		const id = safeNumber(notification.id);
		const unread = notification.readStatus !== true;
		const priority = normalizePriority(notification.priority);
		const actionUrl = sanitizeActionUrl(notification.actionUrl);

		return `
			<article class="notification-item ${unread ? "notification-unread" : ""} priority-${priority.toLowerCase()}"
					 style="--row-delay:${Math.min(index * 55, 330)}ms">

				<div class="notification-main">

					<div class="notification-icon">
						<i class="${getIconClass(notification.notificationType)}"></i>
					</div>

					<div class="notification-content">

						<div class="notification-title">
							${safe(notification.title)}
						</div>

						<p class="notification-message">
							${safe(notification.message)}
						</p>

						<div class="notification-meta-line">
							<span class="notification-meta-chip">
								<i class="bi bi-tags-fill"></i>
								${safe(formatType(notification.notificationType))}
							</span>

							<span class="notification-meta-chip">
								<i class="bi bi-flag-fill"></i>
								${safe(priority)}
							</span>

							<span class="notification-meta-chip">
								<i class="bi bi-clock-fill"></i>
								${formatDate(notification.createdAt)}
							</span>

							${unread ? `
								<span class="notification-meta-chip text-primary">
									<i class="bi bi-envelope-exclamation-fill"></i>
									Unread
								</span>
							` : `
								<span class="notification-meta-chip text-success">
									<i class="bi bi-envelope-check-fill"></i>
									Read
								</span>
							`}
						</div>

						<div class="notification-actions">

							${actionUrl ? `
								<a href="${escapeAttribute(actionUrl)}"
								   class="btn btn-sm btn-outline-primary">
									<i class="bi bi-box-arrow-up-right me-1"></i>
									Open
								</a>
							` : ""}

							${unread ? `
								<button type="button"
										id="markReadBtn_${id}"
										class="btn btn-sm btn-outline-primary mark-read-btn"
										onclick="markRead(${id})"
										${id ? "" : "disabled"}>
									<i class="bi bi-check2 me-1"></i>
									Read
								</button>
							` : ""}

							<button type="button"
									id="deleteNotificationBtn_${id}"
									class="btn btn-sm btn-outline-danger delete-notification-btn"
									onclick="deleteNotification(${id})"
									${id ? "" : "disabled"}>
								<i class="bi bi-trash-fill me-1"></i>
								Delete
							</button>

						</div>

					</div>

				</div>

			</article>
		`;
	}).join("");
}

async function markRead(notificationId) {
	if (!notificationPermissions.update) {
		showMsg("You do not have permission to update notifications.");
		return;
	}

	if (!isValidId(notificationId)) {
		showMsg("Invalid notification selected.");
		return;
	}

	if (processingNotificationIds.has(notificationId)) return;
	processingNotificationIds.add(notificationId);

	setButtonLoading(`markReadBtn_${notificationId}`, "Updating...", true);

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/notifications/${encodeURIComponent(notificationId)}/read?${query.toString()}`,
			{
				method: "PUT",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to mark notification read."));
			return;
		}

		updateNotificationReadState(notificationId);
		renderNotifications(applyLocalFilters(allNotifications, true));
		updateNotificationSummary();
		await loadUnreadCount();

	} catch (error) {
		console.error("Mark notification read error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		processingNotificationIds.delete(notificationId);
	}
}

function updateNotificationReadState(notificationId) {
	const notification = allNotifications.find(
		item => Number(item.id) === Number(notificationId)
	);

	if (notification) {
		notification.readStatus = true;
	}
}

async function markAllRead() {
	if (isMarkingAllRead) return;

	if (!notificationPermissions.update) {
		showMsg("You do not have permission to update notifications.");
		return;
	}

	if (!allNotifications.some(notification => notification.readStatus !== true)) {
		showMsg("All notifications are already marked as read.", "info");
		return;
	}

	isMarkingAllRead = true;
	setButtonLoading("markAllReadBtn", "Updating...", true);

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/notifications/read-all?${query.toString()}`,
			{
				method: "PUT",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to mark all read."));
			return;
		}

		allNotifications.forEach(notification => {
			notification.readStatus = true;
		});

		renderNotifications(applyLocalFilters(allNotifications, true));
		updateNotificationSummary();
		await loadUnreadCount();

		showMsg(
			getApiErrorMessage(result, "All notifications marked as read."),
			"success"
		);

	} catch (error) {
		console.error("Mark all notifications read error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isMarkingAllRead = false;
		setButtonLoading("markAllReadBtn", "Mark All Read", false);
	}
}

async function deleteNotification(notificationId) {
	if (!notificationPermissions.delete) {
		showMsg("You do not have permission to delete notifications.");
		return;
	}

	if (!isValidId(notificationId)) {
		showMsg("Invalid notification selected.");
		return;
	}

	if (!confirm("Delete this notification?")) return;
	if (processingNotificationIds.has(notificationId)) return;

	processingNotificationIds.add(notificationId);
	setButtonLoading(`deleteNotificationBtn_${notificationId}`, "Deleting...", true);

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/notifications/${encodeURIComponent(notificationId)}?${query.toString()}`,
			{
				method: "DELETE",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to delete notification."));
			return;
		}

		allNotifications = allNotifications.filter(
			item => Number(item.id) !== Number(notificationId)
		);

		renderNotifications(applyLocalFilters(allNotifications, true));
		updateNotificationSummary();
		await loadUnreadCount();

		showMsg(
			getApiErrorMessage(result, "Notification deleted successfully."),
			"success"
		);

	} catch (error) {
		console.error("Delete notification error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		processingNotificationIds.delete(notificationId);
	}
}

async function loadUnreadCount() {
	if (isLoadingUnreadCount) return;

	isLoadingUnreadCount = true;

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/notifications/count?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) return;

		const unreadCount = Number(
			result.unreadCount ??
			result.count ??
			0
		) || 0;

		setAnimatedNumber("unreadCountText", unreadCount);

		const badge = document.getElementById("saasNotificationCount");

		if (badge) {
			badge.innerText = unreadCount;
			badge.style.display = unreadCount > 0 ? "inline-block" : "none";
		}

	} catch (error) {
		console.error("Unread notification count error:", error);
	} finally {
		isLoadingUnreadCount = false;
	}
}

function updateNotificationSummary() {
	setAnimatedNumber(
		"totalNotificationCount",
		allNotifications.length
	);

	setAnimatedNumber(
		"highPriorityCount",
		allNotifications.filter(
			notification => normalizePriority(notification.priority) === "HIGH"
		).length
	);

	setAnimatedNumber(
		"todayNotificationCount",
		allNotifications.filter(
			notification => isToday(notification.createdAt)
		).length
	);
}

function normalizePriority(value) {
	const priority = String(value || "MEDIUM").toUpperCase();
	return ["HIGH", "MEDIUM", "LOW"].includes(priority)
		? priority
		: "MEDIUM";
}

function formatType(type) {
	return String(type || "SYSTEM")
		.replace(/_/g, " ")
		.toLowerCase()
		.replace(/\b\w/g, character => character.toUpperCase());
}

function getIconClass(type) {
	const icons = {
		APPOINTMENT: "bi bi-calendar-check-fill",
		BILLING: "bi bi-credit-card-fill",
		LOW_STOCK: "bi bi-exclamation-triangle-fill",
		LAB_REPORT: "bi bi-droplet-half",
		RADIOLOGY_REPORT: "bi bi-radioactive",
		IPD: "bi bi-bed-fill",
		PHARMACY: "bi bi-capsule-pill",
		SYSTEM: "bi bi-bell-fill"
	};

	return icons[String(type || "SYSTEM").toUpperCase()] || icons.SYSTEM;
}

function sanitizeActionUrl(value) {
	if (!value) return "";

	try {
		const url = new URL(value, window.location.origin);

		if (!["http:", "https:"].includes(url.protocol)) {
			return "";
		}

		if (url.origin === window.location.origin) {
			return `${url.pathname}${url.search}${url.hash}`;
		}

		return url.href;
	} catch {
		return "";
	}
}

function showNotificationsLoadingState() {
	const container = document.getElementById("notificationList");
	if (!container) return;

	container.innerHTML = `
		<div class="notifications-state">
			<div class="notifications-state-icon notifications-loading">
				<i class="bi bi-bell-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">Loading notifications</h5>
			<p class="text-muted mb-0">Please wait while workspace alerts are prepared.</p>
		</div>
	`;
}

function showNotificationsErrorState(message) {
	const container = document.getElementById("notificationList");
	if (!container) return;

	container.innerHTML = `
		<div class="notifications-state">
			<div class="notifications-state-icon bg-danger">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">Unable to load notifications</h5>
			<p class="text-muted mb-0">${escapeHtml(message)}</p>
		</div>
	`;
}

function getValue(id) {
	const element = document.getElementById(id);
	return element ? String(element.value || "").trim() : "";
}

function setText(id, value) {
	const element = document.getElementById(id);
	if (element) element.innerText = value ?? "";
}

async function safeJson(response) {
	try {
		const text = await response.text();

		if (!text.trim()) return {};

		try {
			return JSON.parse(text);
		} catch {
			return { rawBody: text };
		}
	} catch {
		return {};
	}
}

function getApiErrorMessage(data, fallback) {
	if (!data) return fallback;
	if (data.message) return data.message;
	if (data.error) return data.error;
	if (data.rawBody) return data.rawBody;
	if (typeof data === "string") return data;
	return fallback;
}

function showMsg(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show" role="alert">
			${escapeHtml(message)}
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
		</div>
	`;

	setTimeout(() => {
		if (msg) msg.innerHTML = "";
	}, 5000);
}

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button = document.getElementById(buttonId);
	if (!button) return;

	if (isLoading) {
		button.dataset.originalHtml = button.innerHTML;
		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2" role="status"></span>
			${escapeHtml(loadingText)}
		`;
		button.disabled = true;
	} else {
		button.innerHTML = button.dataset.originalHtml || button.innerHTML;
		button.disabled = false;
	}
}

function setAnimatedNumber(id, value) {
	const element = document.getElementById(id);
	if (!element) return;

	const target = Number(value) || 0;
	const start = Number(element.textContent) || 0;
	const difference = target - start;
	const duration = 500;
	const startTime = performance.now();

	if (!difference || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		element.textContent = target;
		return;
	}

	function update(now) {
		const progress = Math.min((now - startTime) / duration, 1);
		const eased = 1 - Math.pow(1 - progress, 3);
		element.textContent = Math.round(start + difference * eased);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function isValidId(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0;
}

function safeNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
}

function safeDateTimestamp(value) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isToday(value) {
	if (!value) return false;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return false;

	const today = new Date();

	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	);
}

function formatDate(value) {
	if (!value) return "-";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}

function safe(value) {
	return value === null || value === undefined || value === ""
		? "-"
		: escapeHtml(value);
}

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
	return escapeHtml(value);
}