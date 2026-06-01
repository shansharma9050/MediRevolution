const API_BASE = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", function() {
	protectPage();
	loadUserInfo();
	applyRoleBasedMenu();
	loadNotificationCount();
	loadDashboardByRole();
});

function protectPage() {
	const token = localStorage.getItem("token");

	if (!token) {
		window.location.href = "/";
	}
}

function loadUserInfo() {
	document.getElementById("userEmail").innerText =
		localStorage.getItem("email") || "user@email.com";

	document.getElementById("userRole").innerText =
		localStorage.getItem("role") || "USER";
}

function applyRoleBasedMenu() {
	const role = localStorage.getItem("role");

	document.querySelectorAll("[data-role]").forEach(item => {
		const allowedRoles = item.getAttribute("data-role").split(" ");

		if (!allowedRoles.includes(role)) {
			item.style.display = "none";
		}
	});
}

async function loadNotificationCount() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/notifications/my/unread-count`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		if (response.ok) {
			const count = await response.json();

			document.getElementById("notificationCount").innerText = count;
			document.getElementById("card4Value").innerText = count;
		}

	} catch (error) {
		console.log("Notification service unavailable");
	}
}

function loadDashboardByRole() {
	const role = localStorage.getItem("role");

	if (role === "SUPER_ADMIN") {
		setDashboard(
			"System control center for approvals, users and reports.",
			"Pending Approvals", "0",
			"Total Users", "0",
			"Orders", "0",
			"Notifications", document.getElementById("card4Value").innerText,
			[
				["Pending Approvals", "/approvals"],
				["Manage Users", "#"],
				["View Reports", "#"]
			]
		);
	}

	if (role === "WHOLESALER") {
		setDashboard(
			"Manage medicine inventory, retailer orders and invoices.",
			"Total Medicines", "0",
			"Available Stock", "0",
			"Pending Orders", "0",
			"Notifications", document.getElementById("card4Value").innerText,
			[
				["Add Medicine", "/wholesaler/medicines"],
				["Add Stock", "/wholesaler/inventory"],
				["View Orders", "/orders"]
			]
		);
	}

	if (role === "RETAILER") {
		setDashboard(
			"Search medicines, place orders and download invoices.",
			"My Orders", "0",
			"Pending Orders", "0",
			"Delivered Orders", "0",
			"Notifications", document.getElementById("card4Value").innerText,
			[
				["Search Medicines", "/retailer/search-medicines"],
				["View Cart", "/retailer/cart"],
				["My Orders", "/orders"]
			]
		);
	}

	if (role === "DOCTOR") {
		setDashboard(
			"Create prescriptions and manage patient medicine recommendations.",
			"Prescriptions", "0",
			"Patients", "0",
			"Appointments", "0",
			"Notifications", document.getElementById("card4Value").innerText,
			[
				["Create Prescription", "#"],
				["Patient Records", "#"]
			]
		);
	}

	if (role === "HOSPITAL") {
		setDashboard(
			"Manage hospital procurement, pharmacy inventory and departments.",
			"Departments", "0",
			"Doctors", "0",
			"Procurements", "0",
			"Notifications", document.getElementById("card4Value").innerText,
			[
				["Hospital Procurement", "#"],
				["Pharmacy Inventory", "#"]
			]
		);
	}
}

function setDashboard(description,
	c1Title, c1Value,
	c2Title, c2Value,
	c3Title, c3Value,
	c4Title, c4Value,
	actions) {

	document.getElementById("roleDescription").innerText = description;

	document.getElementById("card1Title").innerText = c1Title;
	document.getElementById("card1Value").innerText = c1Value;

	document.getElementById("card2Title").innerText = c2Title;
	document.getElementById("card2Value").innerText = c2Value;

	document.getElementById("card3Title").innerText = c3Title;
	document.getElementById("card3Value").innerText = c3Value;

	document.getElementById("card4Title").innerText = c4Title;
	document.getElementById("card4Value").innerText = c4Value;

	let html = "";

	actions.forEach(action => {
		html += `
            <a href="${action[1]}" class="btn btn-medi mb-2">
                ${action[0]}
            </a>
        `;
	});

	document.getElementById("quickActions").innerHTML = html;
}

function toggleSidebar() {
	document.getElementById("sidebar").classList.toggle("show");
}

function openNotifications() {
	alert("Notification page will be created next.");
}

function logout() {
	localStorage.clear();
	window.location.href = "/";
}