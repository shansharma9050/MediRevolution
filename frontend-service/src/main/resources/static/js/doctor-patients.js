let doctorPatients = [];

document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadPatients();
});

function requireDoctorRole() {
	if (localStorage.getItem("role") !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

function togglePatientForm() {
	const panel = document.getElementById("patientFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function loadPatients() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showDoctorMsg(result.message || "Unable to load patients");
			return;
		}

		doctorPatients = result;
		renderPatients(doctorPatients);

	} catch (e) {
		showDoctorMsg("Doctor service not reachable.");
	}
}

async function createPatient() {
	const payload = {
		patientName: getVal("patientName"),
		mobile: getVal("mobile"),
		email: getVal("email"),
		gender: getVal("gender"),
		dateOfBirth: getVal("dateOfBirth"),
		bloodGroup: getVal("bloodGroup"),
		address: getVal("address"),
		medicalHistory: getVal("medicalHistory")
	};

	if (!payload.patientName || !payload.mobile) {
		showDoctorMsg("Patient name and mobile are required");
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await response.json();

		if (!response.ok) {
			showDoctorMsg(result.message || "Unable to create patient");
			return;
		}

		showDoctorMsg("Patient added successfully", "success");
		clearPatientForm();
		document.getElementById("patientFormPanel").style.display = "none";
		loadPatients();

	} catch (e) {
		showDoctorMsg("Doctor service not reachable.");
	}
}

function renderPatients(patients) {
	const table = document.getElementById("patientTable");

	if (!patients || patients.length === 0) {
		table.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No patients found</td></tr>`;
		return;
	}

	let html = "";

	patients.forEach((p, index) => {
		html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(p.patientName)}</strong><br><span class="text-muted small">${safe(p.email)}</span></td>
                <td>${safe(p.mobile)}</td>
                <td>${safe(p.gender)}</td>
                <td>${formatDate(p.dateOfBirth)}</td>
                <td>${safe(p.bloodGroup)}</td>
                <td>${safe(p.medicalHistory)}</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function filterPatients() {
	const keyword = document.getElementById("searchBox").value.toLowerCase();

	const filtered = doctorPatients.filter(p =>
		JSON.stringify(p).toLowerCase().includes(keyword)
	);

	renderPatients(filtered);
}

function clearPatientForm() {
	["patientName", "mobile", "email", "gender", "dateOfBirth", "bloodGroup", "address", "medicalHistory"]
		.forEach(id => document.getElementById(id).value = "");
}

function getVal(id) {
	return document.getElementById(id).value.trim();
}

function showDoctorMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDate(value) {
	return value ? new Date(value).toLocaleDateString() : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}