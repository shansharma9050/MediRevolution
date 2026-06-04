let appointmentPatients = [];
let doctorAppointments = [];

document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadPatientsForAppointment();
	loadAppointments();
});

function requireDoctorRole() {
	if (localStorage.getItem("role") !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleAppointmentForm() {
	const panel = document.getElementById("appointmentFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function loadPatientsForAppointment() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients`, {
			headers: { "Authorization": "Bearer " + token }
		});

		appointmentPatients = response.ok ? await response.json() : [];
		renderPatientDropdown();

	} catch (e) {
		showAppointmentMsg("Unable to load patients");
	}
}

function renderPatientDropdown() {
	const dropdown = document.getElementById("patientId");

	if (!appointmentPatients.length) {
		dropdown.innerHTML = `<option value="">No patients found</option>`;
		return;
	}

	let html = `<option value="">Select Patient</option>`;

	appointmentPatients.forEach(p => {
		html += `<option value="${p.id}">${p.patientName} - ${p.mobile}</option>`;
	});

	dropdown.innerHTML = html;
}

async function loadAppointments() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/appointments`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showAppointmentMsg(result.message || "Unable to load appointments");
			return;
		}

		doctorAppointments = result;
		renderAppointments(doctorAppointments);

	} catch (e) {
		showAppointmentMsg("Doctor service not reachable.");
	}
}

async function createAppointment() {
	const patientId = document.getElementById("patientId").value;

	if (!patientId) {
		showAppointmentMsg("Please select patient");
		return;
	}

	const payload = {
		appointmentDate: getVal("appointmentDate"),
		appointmentTime: getVal("appointmentTime"),
		purpose: getVal("purpose")
	};

	if (!payload.appointmentDate || !payload.appointmentTime || !payload.purpose) {
		showAppointmentMsg("Date, time and purpose are required");
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients/${patientId}/appointments`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await response.json();

		if (!response.ok) {
			showAppointmentMsg(result.message || "Unable to book appointment");
			return;
		}

		showAppointmentMsg("Appointment booked successfully", "success");
		clearAppointmentForm();
		document.getElementById("appointmentFormPanel").style.display = "none";
		loadAppointments();

	} catch (e) {
		showAppointmentMsg("Doctor service not reachable.");
	}
}

function filterAppointments() {
	const status = document.getElementById("statusFilter").value;

	if (!status) {
		renderAppointments(doctorAppointments);
		return;
	}

	renderAppointments(doctorAppointments.filter(a => a.status === status));
}

function renderAppointments(appointments) {
	const container = document.getElementById("appointmentList");

	if (!appointments.length) {
		container.innerHTML = `<div class="text-center text-muted py-4">No appointments found</div>`;
		return;
	}

	let html = "";

	appointments.forEach(a => {
		const patient = a.patient || {};

		html += `
            <div class="order-card mb-3">
                <div class="d-flex justify-content-between flex-wrap gap-3">
                    <div>
                        <h5 class="fw-bold text-primary">${safe(patient.patientName)}</h5>
                        <div class="text-muted small">
                            ${formatDate(a.appointmentDate)} at ${safe(a.appointmentTime)}
                        </div>
                        <div class="mt-2"><strong>Purpose:</strong> ${safe(a.purpose)}</div>
                    </div>

                    <div class="text-end">
                        ${appointmentBadge(a.status)}
                        ${actionButtons(a)}
                    </div>
                </div>
            </div>
        `;
	});

	container.innerHTML = html;
}

function actionButtons(a) {
	if (a.status === "REQUESTED") {
		return `
            <div class="mt-2">
                <button class="btn btn-sm btn-success" onclick="updateAppointmentStatus(${a.id}, 'CONFIRMED')">Confirm</button>
                <button class="btn btn-sm btn-danger" onclick="updateAppointmentStatus(${a.id}, 'CANCELLED')">Cancel</button>
            </div>
        `;
	}

	if (a.status === "CONFIRMED") {
		return `
            <div class="mt-2">
                <button class="btn btn-sm btn-medi" style="width:auto;" onclick="updateAppointmentStatus(${a.id}, 'COMPLETED')">Complete</button>
            </div>
        `;
	}

	return "";
}

async function updateAppointmentStatus(id, status) {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/appointments/${id}/status?status=${status}`, {
			method: "PUT",
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showAppointmentMsg(result.message || "Unable to update status");
			return;
		}

		showAppointmentMsg("Appointment status updated", "success");
		loadAppointments();

	} catch (e) {
		showAppointmentMsg("Doctor service not reachable.");
	}
}

function appointmentBadge(status) {
	if (status === "REQUESTED") return `<span class="badge bg-warning text-dark">REQUESTED</span>`;
	if (status === "CONFIRMED") return `<span class="badge bg-info text-dark">CONFIRMED</span>`;
	if (status === "COMPLETED") return `<span class="badge bg-success">COMPLETED</span>`;
	if (status === "CANCELLED") return `<span class="badge bg-danger">CANCELLED</span>`;
	return `<span class="badge bg-secondary">${safe(status)}</span>`;
}

function clearAppointmentForm() {
	["patientId", "appointmentDate", "appointmentTime", "purpose"]
		.forEach(id => document.getElementById(id).value = "");
}

function getVal(id) {
	return document.getElementById(id).value.trim();
}

function showAppointmentMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDate(value) {
	return value ? new Date(value).toLocaleDateString() : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}