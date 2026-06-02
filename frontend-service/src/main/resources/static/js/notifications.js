let notifications = [];
let currentFilter = "ALL";

document.addEventListener("DOMContentLoaded", function() {

	loadNotifications();

	setInterval(() => {

		loadNotifications();

	}, 30000);

});

async function loadNotifications() {

	const token =
		localStorage.getItem("token");

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
			await response.json();

		if (!response.ok) {

			showNotificationMessage(
				result.message ||
				"Unable to load notifications"
			);

			return;
		}

		notifications = result;

		updateNotificationStats();

		renderNotifications();

		updateBellCounter();

	}
	catch (e) {

		showNotificationMessage(
			"Notification service unavailable"
		);
	}
}

function renderNotifications() {

	const container =
		document.getElementById(
			"notificationList"
		);

	let data =
		notifications;

	if (currentFilter !== "ALL") {

		data =
			notifications.filter(
				n => n.type === currentFilter
			);
	}

	if (data.length === 0) {

		container.innerHTML =
			`
            <div class="text-center text-muted py-5">
                No notifications
            </div>
            `;

		return;
	}

	let html = "";

	data.forEach(notification => {

		html += `
        
        <div class="notification-item
                    ${notification.read ? '' : 'notification-unread'}
                    priority-${(notification.priority || 'LOW').toLowerCase()}">

            <div class="d-flex justify-content-between">

                <div>

                    <div class="notification-title">
                        ${notification.title}
                    </div>

                    <div>
                        ${notification.message}
                    </div>

                    <div class="notification-time mt-2">
                        ${formatDateTime(notification.createdAt)}
                    </div>

                </div>

                ${!notification.read ? `
                
                <button class="btn btn-sm btn-outline-primary"
                        onclick="markRead(${notification.id})">

                    Read

                </button>

                ` : ''}

            </div>

        </div>
        
        `;
	});

	container.innerHTML = html;

	renderDrawer();
}

async function markRead(id) {

	const token =
		localStorage.getItem("token");

	try {

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

		loadNotifications();

	}
	catch (e) {

		console.log(e);
	}
}

function updateBellCounter() {

	const unread =
		notifications.filter(
			n => !n.read
		).length;

	const badge =
		document.getElementById(
			"notificationCount"
		);

	if (badge) {

		badge.innerText = unread;
	}
}

function updateNotificationStats() {

	document.getElementById(
		"totalNotifications"
	).innerText =
		notifications.length;

	document.getElementById(
		"unreadNotifications"
	).innerText =
		notifications.filter(
			n => !n.read
		).length;

	document.getElementById(
		"criticalNotifications"
	).innerText =
		notifications.filter(
			n => n.priority === "CRITICAL"
		).length;

	document.getElementById(
		"todayNotifications"
	).innerText =
		notifications.filter(isToday)
			.length;
}

function filterNotifications(type) {

	currentFilter = type;

	renderNotifications();
}

function openNotificationDrawer() {

	document
		.getElementById(
			"notificationDrawer"
		)
		.classList.add("show");
}

function closeNotificationDrawer() {

	document
		.getElementById(
			"notificationDrawer"
		)
		.classList.remove("show");
}

function renderDrawer() {

	const drawer =
		document.getElementById(
			"drawerNotifications"
		);

	const latest =
		notifications
			.slice(0, 10);

	let html = "";

	latest.forEach(n => {

		html += `
        
        <div class="notification-item
                    ${n.read ? '' : 'notification-unread'}">

            <strong>${n.title}</strong>

            <div>
                ${n.message}
            </div>

        </div>
        
        `;
	});

	drawer.innerHTML = html;
}

function markAllRead() {

	notifications
		.filter(n => !n.read)
		.forEach(n => markRead(n.id));
}

function isToday(notification) {

	if (!notification.createdAt)
		return false;

	const d =
		new Date(notification.createdAt);

	const t =
		new Date();

	return d.toDateString() === t.toDateString();
}

function formatDateTime(value) {

	if (!value) return "-";

	return new Date(value)
		.toLocaleString();
}

function showNotificationMessage(
	message,
	type = "danger"
) {

	document.getElementById("msg")
		.innerHTML =
		`<div class="alert alert-${type}">
            ${message}
        </div>`;
}