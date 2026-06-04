let hospitalAvailability = [];

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalAvailability();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleAvailabilityForm() {
	const panel = document.getElementById("availabilityFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function saveHospitalAvailability() {
	const payload = {
		doctorName: getVal("doctorName"),
		department: getVal("department"),
		availableDate: getVal("availableDate"),
		startTime: getVal("startTime") + ":00",
		endTime: getVal("endTime") + ":00",
		slotDuration: parseInt(getVal("slotDuration"))
	};

	if (!payload.doctorName || !payload.department || !payload.availableDate || !getVal("startTime") || !getVal("endTime")) {
		showMsg("Doctor name, department, date, start time and end time are required");
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/doctor-availability`, {
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

		showMsg("Doctor availability saved successfully", "success");
		clearForm();
		document.getElementById("availabilityFormPanel").style.display = "none";
		loadHospitalAvailability();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

async function loadHospitalAvailability() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/doctor-availability/my`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to load availability");
			return;
		}

		hospitalAvailability = result;
		renderAvailability();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function renderAvailability() {
	const table = document.getElementById("availabilityTable");

	if (!hospitalAvailability.length) {
		table.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No availability found</td></tr>`;
		return;
	}

	let html = "";

	hospitalAvailability.forEach((a, index) => {
		html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(a.doctorName)}</strong></td>
                <td>${safe(a.department)}</td>
                <td>${formatDate(a.availableDate)}</td>
                <td>${safe(a.startTime)}</td>
                <td>${safe(a.endTime)}</td>
                <td>${safe(a.slotDuration)} min</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function clearForm() {
	["doctorName", "department", "availableDate", "startTime", "endTime"]
		.forEach(id => document.getElementById(id).value = "");

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