document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalDashboard();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadHospitalDashboard() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/dashboard-counts`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const data = await response.json();

		if (!response.ok) {
			showHospitalMessage(data.message || "Unable to load hospital dashboard");
			return;
		}

		document.getElementById("totalPatients").innerText = data.totalPatients || 0;
		document.getElementById("totalStaff").innerText = data.totalStaff || 0;
		document.getElementById("inventoryItems").innerText = data.inventoryItems || 0;
		document.getElementById("totalBills").innerText = data.totalBills || 0;

	} catch (e) {
		showHospitalMessage("Hospital service not reachable.");
	}
}

function showHospitalMessage(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;
}