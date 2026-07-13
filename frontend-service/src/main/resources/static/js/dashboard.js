const API_BASE = "http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

document.addEventListener(
	"DOMContentLoaded",
	async function() {

		if (!protectPlatformPage()) {
			return;
		}

		setPlatformMode();

		loadPlatformUserInfo();
		initializeDashboardExperience();
		applyPlatformRoleBasedMenu();
		markActivePlatformSidebarLink();

		await loadNotificationCount();

		loadDashboardByRole();

		await loadRealDashboardCounts();

		connectNotificationSocket();

	}
);


function protectPlatformPage() {

	const token =
		localStorage.getItem("token");

	if (!token) {

		window.location.replace("/");

		return false;
	}

	const activeModule =
		localStorage.getItem("activeModule");

	if (
		activeModule &&
		activeModule !== "PLATFORM"
	) {

		window.location.replace(
			"/module-selection"
		);

		return false;
	}

	const role =
		localStorage.getItem("role");

	if (role === "SAAS_STAFF") {

		window.location.replace(
			"/module-selection"
		);

		return false;
	}

	return true;
}


function setPlatformMode() {

	localStorage.setItem(
		"activeModule",
		"PLATFORM"
	);

	localStorage.setItem(
		"saasMode",
		"false"
	);

}


function loadPlatformUserInfo() {

	const email =
		localStorage.getItem("email") ||
		"user@email.com";

	const role =
		localStorage.getItem("role") ||
		"USER";

	const userEmail =
		document.getElementById("userEmail");

	const userRole =
		document.getElementById("userRole");

	if (userEmail) {
		userEmail.textContent = email;
	}

	if (userRole) {
		userRole.textContent =
			formatRoleName(role);
	}

	document.body.dataset.userRole = role;

}


function initializeDashboardExperience() {

	setDashboardGreeting();
	setDashboardDate();
	initializeDashboardReveal();
	initializeStatCardTilt();

}


function setDashboardGreeting() {

	const greetingElement =
		document.getElementById(
			"dashboardGreeting"
		);

	if (!greetingElement) {
		return;
	}

	const currentHour =
		new Date().getHours();

	let greeting =
		"Welcome back";

	if (currentHour < 12) {
		greeting = "Good morning";
	} else if (currentHour < 17) {
		greeting = "Good afternoon";
	} else {
		greeting = "Good evening";
	}

	const fullName =
		localStorage.getItem("fullName");

	const displayName =
		fullName
			? fullName.trim().split(/\s+/)[0]
			: "";

	greetingElement.textContent =
		displayName
			? `${greeting}, ${displayName}`
			: greeting;

}


function setDashboardDate() {

	const dateElement =
		document.getElementById(
			"currentDashboardDate"
		);

	if (!dateElement) {
		return;
	}

	dateElement.textContent =
		new Intl.DateTimeFormat(
			"en-IN",
			{
				weekday: "long",
				day: "2-digit",
				month: "long",
				year: "numeric"
			}
		).format(new Date());

}


function initializeDashboardReveal() {

	const revealItems =
		document.querySelectorAll(
			".mr-dashboard-reveal"
		);

	if (
		!("IntersectionObserver" in window)
	) {

		revealItems.forEach(
			item => item.classList.add("is-visible")
		);

		return;
	}

	const observer =
		new IntersectionObserver(
			function(entries, activeObserver) {

				entries.forEach(
					function(entry) {

						if (!entry.isIntersecting) {
							return;
						}

						entry.target.classList.add(
							"is-visible"
						);

						activeObserver.unobserve(
							entry.target
						);

					}
				);

			},
			{
				threshold: 0.12,
				rootMargin: "0px 0px -40px 0px"
			}
		);

	revealItems.forEach(
		function(item, index) {

			item.style.setProperty(
				"--reveal-delay",
				`${Math.min(index * 55, 330)}ms`
			);

			observer.observe(item);

		}
	);

}


function initializeStatCardTilt() {

	if (
		window.matchMedia(
			"(pointer: coarse)"
		).matches
	) {
		return;
	}

	document
		.querySelectorAll(
			".animated-stat-card"
		)
		.forEach(
			function(card) {

				card.addEventListener(
					"mousemove",
					function(event) {

						const rect =
							card.getBoundingClientRect();

						const x =
							event.clientX - rect.left;

						const y =
							event.clientY - rect.top;

						const rotateY =
							((x / rect.width) - 0.5) * 5;

						const rotateX =
							((y / rect.height) - 0.5) * -5;

						card.style.transform =
							`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;

					}
				);

				card.addEventListener(
					"mouseleave",
					function() {

						card.style.transform = "";

					}
				);

			}
		);

}


function applyPlatformRoleBasedMenu() {

	const role =
		localStorage.getItem("role");

	document
		.querySelectorAll("[data-role]")
		.forEach(function(item) {

			const roleAttribute =
				item.getAttribute("data-role");

			if (!roleAttribute) {
				return;
			}

			const allowedRoles =
				roleAttribute
					.split(" ")
					.map(value => value.trim())
					.filter(Boolean);

			if (!allowedRoles.includes(role)) {
				item.style.display = "none";
			}

		});

}


function markActivePlatformSidebarLink() {

	const currentPath =
		window.location.pathname;

	document
		.querySelectorAll(
			"#platformSidebar a[href]"
		)
		.forEach(function(link) {

			const href =
				link.getAttribute("href");

			if (!href || href === "#") {
				return;
			}

			link.classList.remove("active");

			if (
				currentPath === href ||
				(
					href !== "/dashboard" &&
					currentPath.startsWith(href)
				)
			) {
				link.classList.add("active");
			}

		});

}


async function loadNotificationCount() {

	const token =
		localStorage.getItem("token");

	try {

		const response =
			await fetch(
				`${API_BASE}/notifications/my/unread-count`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			return;
		}

		const count =
			await response.json();

		setText(
			"notificationCount",
			count
		);

		setMetricValue(
			"card4Value",
			count
		);

	} catch (error) {

		console.log(
			"Notification service unavailable"
		);

	}

}


function loadDashboardByRole() {

	const role =
		localStorage.getItem("role");

	const notificationCount =
		getText("card4Value", "0");

	const dashboards = {

		SUPER_ADMIN: {
			description:
				"System control center for approvals, users and reports.",

			cards: [
				["Pending Approvals", "0"],
				["Total Users", "0"],
				["Orders", "0"],
				["Notifications", notificationCount]
			],

			actions: [
				[
					"Pending Approvals",
					"/approvals",
					"bi-person-check-fill"
				],
				[
					"Medicine Master",
					"/wholesaler/medicines",
					"bi-capsule-pill"
				],
				[
					"All Orders",
					"/orders",
					"bi-clipboard-data-fill"
				]
			]
		},

		WHOLESALER: {
			description:
				"Manage medicine inventory, retailer orders and invoices.",

			cards: [
				["Total Medicines", "0"],
				["Stock Items", "0"],
				["Pending Orders", "0"],
				["Notifications", notificationCount]
			],

			actions: [
				[
					"Add Medicine",
					"/wholesaler/medicines",
					"bi-capsule-pill"
				],
				[
					"Add Stock",
					"/wholesaler/inventory",
					"bi-box-seam-fill"
				],
				[
					"Orders",
					"/orders",
					"bi-clipboard-data-fill"
				],
				[
					"Invoices",
					"/invoices",
					"bi-receipt-cutoff"
				],
				[
					"Profile",
					"/profile",
					"bi-person-circle"
				]
			]
		},

		RETAILER: {
			description:
				"Search medicines, place orders and download invoices.",

			cards: [
				["My Orders", "0"],
				["Pending Orders", "0"],
				["Delivered Orders", "0"],
				["Notifications", notificationCount]
			],

			actions: [
				[
					"Search Medicines",
					"/retailer/search-medicines",
					"bi-search"
				],
				[
					"View Cart",
					"/retailer/cart",
					"bi-cart-fill"
				],
				[
					"My Orders",
					"/orders",
					"bi-clipboard-check-fill"
				],
				[
					"Invoices",
					"/invoices",
					"bi-receipt-cutoff"
				],
				[
					"Profile",
					"/profile",
					"bi-person-circle"
				]
			]
		},

		DOCTOR: {
			description:
				"Manage appointments, patients and prescriptions.",

			cards: [
				["Prescriptions", "0"],
				["Patients", "0"],
				["Appointments", "0"],
				["Notifications", notificationCount]
			],

			actions: [
				[
					"Create Prescription",
					"/doctor/prescriptions",
					"bi-file-medical-fill"
				],
				[
					"Patient Records",
					"/doctor/patients",
					"bi-people-fill"
				],
				[
					"Appointments",
					"/doctor/appointments",
					"bi-calendar-check-fill"
				],
				[
					"Availability",
					"/doctor/availability",
					"bi-clock-fill"
				],
				[
					"Profile",
					"/profile",
					"bi-person-circle"
				]
			]
		},

		HOSPITAL: {
			description:
				"Manage hospital patients, doctors, billing and departments.",

			cards: [
				["Departments", "0"],
				["Doctors", "0"],
				["Appointments", "0"],
				["Notifications", notificationCount]
			],

			actions: [
				[
					"Hospital Doctors",
					"/hospital/doctors",
					"bi-person-badge-fill"
				],
				[
					"OPD / IPD",
					"/hospital/patients",
					"bi-hospital-fill"
				],
				[
					"Hospital Billing",
					"/hospital/billing",
					"bi-credit-card-fill"
				],
				[
					"Inventory",
					"/hospital/inventory",
					"bi-box-seam-fill"
				],
				[
					"Profile",
					"/profile",
					"bi-person-circle"
				]
			]
		},

		PATIENT: {
			description:
				"Book appointments and manage your healthcare journey.",

			cards: [
				["My Appointments", "0"],
				["Pending", "0"],
				["Confirmed", "0"],
				["Notifications", notificationCount]
			],

			actions: [
				[
					"Book Appointment",
					"/appointments/book",
					"bi-calendar-plus-fill"
				],
				[
					"My Appointments",
					"/appointments/my",
					"bi-calendar-check-fill"
				],
				[
					"My Prescriptions",
					"/patient/prescriptions",
					"bi-file-medical-fill"
				],
				[
					"Profile",
					"/profile",
					"bi-person-circle"
				]
			]
		}

	};

	const selectedDashboard =
		dashboards[role];

	if (!selectedDashboard) {
		return;
	}

	setDashboard(
		selectedDashboard.description,
		selectedDashboard.cards,
		selectedDashboard.actions
	);

}


async function loadRealDashboardCounts() {

	const role =
		localStorage.getItem("role");

	if (role === "SUPER_ADMIN") {

		await loadAdminCounts();
		await loadOrderCounts();

	} else if (role === "WHOLESALER") {

		await loadWholesalerMedicineCounts();
		await loadOrderCounts();

	} else if (role === "RETAILER") {

		await loadOrderCounts();

	} else if (role === "PATIENT") {

		await loadPatientAppointmentCounts();

	}

}


async function loadPatientAppointmentCounts() {

	const token =
		localStorage.getItem("token");

	try {

		const responses =
			await Promise.all([
				fetch(
					`${API_BASE}/doctor/appointments/patient`,
					{
						headers: {
							"Authorization":
								"Bearer " + token
						}
					}
				),

				fetch(
					`${API_BASE}/hospital/appointments/patient`,
					{
						headers: {
							"Authorization":
								"Bearer " + token
						}
					}
				)
			]);

		const doctorAppointments =
			responses[0].ok
				? await responses[0].json()
				: [];

		const hospitalAppointments =
			responses[1].ok
				? await responses[1].json()
				: [];

		const allAppointments = [
			...doctorAppointments,
			...hospitalAppointments
		];

		setMetricValue(
			"card1Value",
			allAppointments.length
		);

		setMetricValue(
			"card2Value",
			allAppointments.filter(
				item => item.status === "PENDING"
			).length
		);

		setMetricValue(
			"card3Value",
			allAppointments.filter(
				item => item.status === "CONFIRMED"
			).length
		);

	} catch (error) {

		console.log(
			"Patient appointment count unavailable"
		);

	}

}


async function loadAdminCounts() {

	const token =
		localStorage.getItem("token");

	try {

		const response =
			await fetch(
				`${API_BASE}/auth/admin/users/dashboard-counts`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			return;
		}

		const data =
			await response.json();

		setMetricValue(
			"card1Value",
			data.pendingApprovals || 0
		);

		setMetricValue(
			"card2Value",
			data.totalUsers || 0
		);

	} catch (error) {

		console.log(
			"Admin count service unavailable"
		);

	}

}


async function loadWholesalerMedicineCounts() {

	const token =
		localStorage.getItem("token");

	try {

		const response =
			await fetch(
				`${API_BASE}/medicines/stock/dashboard-counts`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			return;
		}

		const data =
			await response.json();

		setMetricValue(
			"card1Value",
			data.totalMedicines || 0
		);

		setMetricValue(
			"card2Value",
			data.stockItems || 0
		);

	} catch (error) {

		console.log(
			"Medicine dashboard count unavailable"
		);

	}

}


async function loadOrderCounts() {

	const token =
		localStorage.getItem("token");

	const role =
		localStorage.getItem("role");

	try {

		const response =
			await fetch(
				`${API_BASE}/orders/dashboard-counts`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			return;
		}

		const data =
			await response.json();

		if (role === "SUPER_ADMIN") {

			setMetricValue(
				"card3Value",
				data.totalOrders || 0
			);

		} else if (role === "WHOLESALER") {

			setMetricValue(
				"card3Value",
				data.pendingOrders || 0
			);

		} else if (role === "RETAILER") {

			setMetricValue(
				"card1Value",
				data.totalOrders || 0
			);

			setMetricValue(
				"card2Value",
				data.pendingOrders || 0
			);

			setMetricValue(
				"card3Value",
				data.deliveredOrders || 0
			);

		}

	} catch (error) {

		console.log(
			"Order dashboard count unavailable"
		);

	}

}


function setDashboard(
	description,
	cards,
	actions
) {

	setText(
		"roleDescription",
		description
	);

	cards.forEach(
		function(card, index) {

			const position =
				index + 1;

			setText(
				`card${position}Title`,
				card[0]
			);

			setMetricValue(
				`card${position}Value`,
				card[1],
				false
			);

		}
	);

	const quickActions =
		document.getElementById(
			"quickActions"
		);

	if (!quickActions) {
		return;
	}

	quickActions.innerHTML =
		actions.map(
			function(action, index) {

				return `
					<a href="${action[1]}"
					   class="dashboard-quick-action"
					   style="--quick-delay:${index * 65}ms">

						<span class="quick-action-icon">
							<i class="bi ${action[2]}"></i>
						</span>

						<span class="quick-action-label">
							${escapeHtml(action[0])}
						</span>

						<span class="quick-action-arrow">
							<i class="bi bi-arrow-right"></i>
						</span>
					</a>
				`;

			}
		).join("");

}


function connectNotificationSocket() {

	const userId =
		localStorage.getItem("userId");

	if (
		!userId ||
		typeof SockJS === "undefined" ||
		typeof Stomp === "undefined"
	) {
		return;
	}

	try {

		const socket =
			new SockJS(
				`${API_BASE}/notifications-ws`
			);

		const stompClient =
			Stomp.over(socket);

		stompClient.debug = null;

		stompClient.connect(
			{},
			function() {

				stompClient.subscribe(
					`/topic/user-${userId}`,
					function(message) {

						const notification =
							JSON.parse(message.body);

						loadNotificationCount();

						showLiveNotification(
							notification
						);

					}
				);

			},
			function() {

				console.log(
					"Notification WebSocket unavailable"
				);

			}
		);

	} catch (error) {

		console.log(
			"Notification WebSocket unavailable"
		);

	}

}


function showLiveNotification(notification) {

	const toast =
		document.createElement("div");

	toast.className =
		"live-toast platform-live-toast";

	toast.innerHTML = `
		<div class="live-toast-icon">
			<i class="bi bi-bell-fill"></i>
		</div>

		<div class="live-toast-content">
			<strong>
				${escapeHtml(
		notification.title ||
		"New Notification"
	)}
			</strong>

			<p>
				${escapeHtml(
		notification.message ||
		""
	)}
			</p>
		</div>

		<button type="button"
				class="live-toast-close"
				aria-label="Close notification">
			<i class="bi bi-x"></i>
		</button>
	`;

	document.body.appendChild(toast);

	const closeButton =
		toast.querySelector(
			".live-toast-close"
		);

	if (closeButton) {

		closeButton.addEventListener(
			"click",
			function() {

				removeLiveToast(toast);

			}
		);

	}

	window.setTimeout(function() {

		toast.classList.add("show");

	}, 30);

	window.setTimeout(function() {

		removeLiveToast(toast);

	}, 5000);

}


function removeLiveToast(toast) {

	if (!toast || !toast.isConnected) {
		return;
	}

	toast.classList.remove("show");

	window.setTimeout(function() {

		if (toast.isConnected) {
			toast.remove();
		}

	}, 350);

}


function toggleSidebar() {

	if (
		typeof togglePlatformSidebar ===
		"function"
	) {

		togglePlatformSidebar();

	}

}


function logout() {

	if (
		typeof clearMediRevolutionSession ===
		"function"
	) {

		clearMediRevolutionSession();

	} else {

		localStorage.clear();
		sessionStorage.clear();

	}

	window.location.replace("/");

}


function setMetricValue(
	id,
	value,
	animate = true
) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const numericValue =
		Number(value);

	if (
		!animate ||
		!Number.isFinite(numericValue) ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {

		element.textContent = value;

		return;
	}

	const startValue =
		Number(element.textContent) || 0;

	const difference =
		numericValue - startValue;

	const duration = 650;

	const startTime =
		performance.now();

	function updateCounter(currentTime) {

		const elapsed =
			currentTime - startTime;

		const progress =
			Math.min(elapsed / duration, 1);

		const easedProgress =
			1 - Math.pow(1 - progress, 3);

		const currentValue =
			Math.round(
				startValue +
				difference *
				easedProgress
			);

		element.textContent =
			currentValue.toLocaleString(
				"en-IN"
			);

		if (progress < 1) {

			requestAnimationFrame(
				updateCounter
			);

		}

	}

	requestAnimationFrame(
		updateCounter
	);

}


function setText(id, value) {

	const element =
		document.getElementById(id);

	if (element) {
		element.textContent = value;
	}

}


function getText(id, fallback = "") {

	const element =
		document.getElementById(id);

	return element
		? element.textContent
		: fallback;

}


function formatRoleName(role) {

	return String(role || "USER")
		.replaceAll("_", " ")
		.toLowerCase()
		.replace(
			/\b\w/g,
			character =>
				character.toUpperCase()
		);

}


function escapeHtml(value) {

	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");

}