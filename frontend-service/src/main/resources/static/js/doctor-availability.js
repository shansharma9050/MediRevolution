let doctorAvailability = [];

document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadDoctorAvailability();
});

function requireDoctorRole() {
	if (localStorage.getItem("role") !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleAvailabilityForm() {
	const panel = document.getElementById("availabilityFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function saveAvailability() {
	const payload = {
		availableDate: getVal("availableDate"),
		startTime: getVal("startTime") + ":00",
		endTime: getVal("endTime") + ":00",
		slotDuration: parseInt(getVal("slotDuration"))
	};

	if (!payload.availableDate || !getVal("startTime") || !getVal("endTime")) {
		showMsg("Date, start time and end time are required");
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/availability`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to save availability");
			return;
		}

		showMsg("Availability saved successfully", "success");
		clearForm();
		document.getElementById("availabilityFormPanel").style.display = "none";
		loadDoctorAvailability();

	} catch (e) {
		showMsg("Doctor service not reachable.");
	}
}

async function loadDoctorAvailability() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/availability/my`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to load availability");
			return;
		}

		doctorAvailability = result;
		renderAvailability();

	} catch (e) {
		showMsg("Doctor service not reachable.");
	}
}

function renderAvailability() {
	const table = document.getElementById("availabilityTable");

	if (!doctorAvailability.length) {
		table.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No availability found</td></tr>`;
		return;
	}

	let html = "";

	doctorAvailability.forEach((a, index) => {
		html += `
            <tr>
                <td>${index + 1}</td>
                <td>${formatDate(a.availableDate)}</td>
                <td>${safe(a.startTime)}</td>
                <td>${safe(a.endTime)}</td>
                <td>${safe(a.slotDuration)} min</td>
                <td>${calculateSlotCount(a)} slots</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function calculateSlotCount(a) {
	if (!a.startTime || !a.endTime || !a.slotDuration) return 0;

	const start = timeToMinutes(a.startTime);
	const end = timeToMinutes(a.endTime);

	return Math.floor((end - start) / Number(a.slotDuration));
}

function timeToMinutes(time) {
	const parts = time.split(":");
	return Number(parts[0]) * 60 + Number(parts[1]);
}

function clearForm() {
	["availableDate", "startTime", "endTime"].forEach(id => document.getElementById(id).value = "");
	document.getElementById("slotDuration").value = "30";
}

function getVal(id) {
	return document.getElementById(id).value.trim();
}

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDate(value) {
	return value ? new Date(value).toLocaleDateString() : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}