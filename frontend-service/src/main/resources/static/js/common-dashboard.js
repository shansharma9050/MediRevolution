const API_BASE = "http://localhost:8080";
/* const API_BASE = "https://medirevolution-api-gateway.onrender.com"; */

window.SAAS_PERMISSIONS = window.SAAS_PERMISSIONS || [];
window.SAAS_MEMBER_ROLE = window.SAAS_MEMBER_ROLE || null;
window.SAAS_OWNER_OR_ADMIN = window.SAAS_OWNER_OR_ADMIN || false;

document.addEventListener("DOMContentLoaded", function() {
	protectDashboardPage();
	fixUserDataFromToken();
	setUserInfo();
	applyRoleBasedMenu();
	markActiveSidebarLink();
	loadCommonNotificationCount();
	loadSaasNotificationCount();

	// IMPORTANT:
	// applySaasPermissionMenu() saas-auth-guard.js me hai.
	// Agar saas-auth-guard.js page me loaded hai tabhi call hoga.
	if (typeof applySaasPermissionMenu === "function") {
		applySaasPermissionMenu();
	}
});

function protectDashboardPage() {
	const token = localStorage.getItem("token");

	if (!token) {
		window.location.href = "/";
	}
}

function requireRole(requiredRole) {
	const role = localStorage.getItem("role");

	if (role !== requiredRole) {
		alert("Access denied. Only " + requiredRole + " can access this page.");
		window.location.href = "/dashboard";
	}
}

function setUserInfo() {
	const email = localStorage.getItem("email") || "user@email.com";
	const userEmailElement = document.getElementById("userEmail");

	if (userEmailElement) {
		userEmailElement.innerText = email;
	}
}

async function loadCommonNotificationCount() {
	const token = localStorage.getItem("token");
	const countElement = document.getElementById("notificationCount");

	if (!token) {
		if (countElement) {
			countElement.innerText = "0";
		}
		return;
	}

	try {
		const response = await fetch(`${API_BASE}/notifications/my/unread-count`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const text = await response.text();

		if (!response.ok) {
			console.warn("Common notification count unavailable", {
				status: response.status,
				body: text
			});

			if (countElement) {
				countElement.innerText = "0";
			}

			return;
		}

		if (!text || text.trim() === "") {
			if (countElement) {
				countElement.innerText = "0";
			}
			return;
		}

		let count = 0;

		try {
			const result = JSON.parse(text);

			if (typeof result === "number") {
				count = result;
			} else if (result.count !== undefined) {
				count = Number(result.count || 0);
			} else if (result.unreadCount !== undefined) {
				count = Number(result.unreadCount || 0);
			}
		} catch (error) {
			count = Number(text || 0);
		}

		if (countElement) {
			countElement.innerText = count;
		}

	} catch (error) {
		console.log("Notification count unavailable", error);

		if (countElement) {
			countElement.innerText = "0";
		}
	}
}

function toggleSidebar() {
	const sidebar = document.getElementById("sidebar");

	if (sidebar) {
		sidebar.classList.toggle("show");
	}
}

function logout() {
	localStorage.clear();
	window.location.href = "/";
}

/*=================================== WebSocket ===========================================*/

function connectNotificationSocket() {
	const userId = localStorage.getItem("userId");

	if (!userId) {
		console.log("UserId not found for websocket");
		return;
	}

	const socket = new SockJS(`${API_BASE}/notifications-ws`);
	const stompClient = Stomp.over(socket);

	stompClient.connect({}, function() {
		console.log("Notification WebSocket connected");

		stompClient.subscribe("/topic/user-" + userId, function(message) {
			const notification = JSON.parse(message.body);

			console.log("New notification:", notification);

			loadCommonNotificationCount();
			loadSaasNotificationCount();

			showLiveNotification(notification);
		});

	}, function(error) {
		console.log("Notification WebSocket connection failed", error);
	});
}

function showLiveNotification(notification) {
	const toast = document.createElement("div");

	toast.className = "live-toast";

	toast.innerHTML = `
        <strong>${notification.title || "Notification"}</strong>
        <p>${notification.message || ""}</p>
    `;

	document.body.appendChild(toast);

	setTimeout(() => {
		toast.remove();
	}, 5000);
}

function fixUserDataFromToken() {
	const token = localStorage.getItem("token");

	if (!token || token === "undefined" || token === "null") {
		return;
	}

	try {
		const payload = parseJwt(token);

		if ((!localStorage.getItem("userId") || localStorage.getItem("userId") === "undefined") && payload.userId) {
			localStorage.setItem("userId", payload.userId);
		}

		if ((!localStorage.getItem("role") || localStorage.getItem("role") === "undefined") && payload.role) {
			localStorage.setItem("role", payload.role);
		}

		if ((!localStorage.getItem("email") || localStorage.getItem("email") === "undefined") && payload.email) {
			localStorage.setItem("email", payload.email);
		}

		if ((!localStorage.getItem("userName") || localStorage.getItem("userName") === "undefined") && payload.userName) {
			localStorage.setItem("userName", payload.userName);
		}

	} catch (error) {
		console.log("Unable to parse token", error);
	}
}

function parseJwt(token) {
	const parts = token.split(".");

	if (parts.length !== 3) {
		throw new Error("Invalid JWT token");
	}

	const base64Url = parts[1];
	const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

	const jsonPayload = decodeURIComponent(
		window.atob(base64)
			.split("")
			.map(function(c) {
				return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join("")
	);

	return JSON.parse(jsonPayload);
}

function applyRoleBasedMenu() {
	const role = (localStorage.getItem("role") || "").trim().toUpperCase();

	if (!role) {
		console.warn("Role not found in localStorage");
		return;
	}

	document.querySelectorAll("[data-role]").forEach(function(element) {
		const allowedRolesText = element.getAttribute("data-role") || "";

		const allowedRoles = allowedRolesText
			.split(" ")
			.map(function(r) {
				return r.trim().toUpperCase();
			})
			.filter(function(r) {
				return r.length > 0;
			});

		if (!allowedRoles.includes(role)) {
			element.style.display = "none";
		} else {
			element.style.display = "";
		}
	});
}

function markActiveSidebarLink() {
	const currentPath = window.location.pathname;

	document.querySelectorAll("#sidebar a, .sidebar a, .mr-sidebar a").forEach(function(link) {
		const href = link.getAttribute("href");

		if (!href || href === "#") {
			return;
		}

		if (currentPath === href || currentPath.startsWith(href + "/")) {
			link.classList.add("active");
		} else {
			link.classList.remove("active");
		}
	});
}

async function loadSaasNotificationCount() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");
	const saasMode = localStorage.getItem("saasMode");

	const btn = document.getElementById("saasNotificationBtn");
	const badge = document.getElementById("saasNotificationCount");

	if (!btn || !badge) {
		return;
	}

	if (!tenantId || saasMode !== "true") {
		btn.style.display = "none";
		badge.innerText = "0";
		badge.style.display = "none";
		return;
	}

	if (!token) {
		btn.style.display = "none";
		badge.innerText = "0";
		badge.style.display = "none";
		return;
	}

	btn.style.display = "inline-block";

	try {
		const response = await fetch(`${API_BASE}/saas/notifications/count?tenantId=${tenantId}`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const text = await response.text();

		if (!response.ok) {
			console.error("Unable to load SaaS notification count", {
				status: response.status,
				statusText: response.statusText,
				body: text
			});

			badge.innerText = "0";
			badge.style.display = "none";
			return;
		}

		if (!text || text.trim() === "") {
			console.warn("SaaS notification count API returned empty body");

			badge.innerText = "0";
			badge.style.display = "none";
			return;
		}

		let result = {};

		try {
			result = JSON.parse(text);
		} catch (error) {
			console.error("Invalid SaaS notification count JSON", text);

			badge.innerText = "0";
			badge.style.display = "none";
			return;
		}

		const count = Number(result.unreadCount || result.count || 0);

		badge.innerText = count;
		badge.style.display = count > 0 ? "inline-block" : "none";

	} catch (error) {
		console.error("Unable to load SaaS notification count", error);

		badge.innerText = "0";
		badge.style.display = "none";
	}

}

function switchMediRevolutionModule() {

		document.body.style.transition =
			"opacity 0.35s ease, transform 0.35s ease";

		document.body.style.opacity = "0";

		document.body.style.transform =
			"scale(0.985)";

		window.setTimeout(function() {

			window.location.href =
				"/module-selection";

		}, 350);

	}