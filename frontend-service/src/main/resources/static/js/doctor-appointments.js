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
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		appointmentPatients = response.ok ? await response.json() : [];
		renderPatientDropdown();

	} catch (e) {
		showAppointmentMsg("Unable to load patients");
	}
}

function renderPatientDropdown() {
	const dropdown = document.getElementById("patientId");

	if (!dropdown) {
		return;
	}

	if (!appointmentPatients.length) {
		dropdown.innerHTML = `<option value="">No patients found</option>`;
		return;
	}

	let html = `<option value="">Select Patient</option>`;

	appointmentPatients.forEach(p => {
		html += `<option value="${p.id}">${safe(p.patientName)} - ${safe(p.mobile)}</option>`;
	});

	dropdown.innerHTML = html;
}

async function loadAppointments() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/appointments`, {
			headers: {
				"Authorization": "Bearer " + token
			}
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

	if (!appointments || !appointments.length) {
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
                        <h5 class="fw-bold text-primary">
                            ${safe(patient.patientName || a.patientName)}
                        </h5>

                        <div class="text-muted small">
                            Mobile: ${safe(patient.mobile || a.patientMobile)}
                        </div>

                        <div class="text-muted small">
                            Date: ${formatDate(a.appointmentDate)} | Time: ${safe(a.appointmentTime)}
                        </div>

                        <div class="text-muted small mt-1">
                            Consultation Type: ${consultationBadge(a.consultationType)}
                        </div>

                        ${a.paymentStatus ? `
                            <div class="text-muted small mt-1">
                                Payment: ${paymentBadge(a.paymentStatus)}
                            </div>
                        ` : ""}

                        <div class="mt-2">
                            <strong>Purpose/Symptoms:</strong> ${safe(a.purpose || a.symptoms)}
                        </div>

                        ${meetingInfo(a)}
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

function meetingInfo(a) {
	if (a.consultationType !== "ONLINE") {
		return "";
	}

	if (a.status === "PAYMENT_PENDING") {
		return `
            <div class="mt-3 text-warning small">
                Waiting for patient payment. Video link will be available after payment success.
            </div>
        `;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
            <div class="mt-3 text-danger small">
                Payment failed. Meeting link is not available.
            </div>
        `;
	}

	if (a.status === "CONFIRMED" && isValidMeetingUrl(a.meetingUrl)) {
		return `
            <div class="mt-3 text-success small">
                <strong>Meeting:</strong> Link generated. Click Join Meeting to start consultation.
            </div>
        `;
	}

	if (a.status === "CONFIRMED" && !isValidMeetingUrl(a.meetingUrl)) {
		return `
            <div class="mt-3 text-muted small">
                Meeting link is not generated yet. Please refresh after payment verification.
            </div>
        `;
	}

	if (a.status === "IN_CONSULTATION") {
		return `
            <div class="mt-3 text-primary small">
                Consultation is in progress.
            </div>
        `;
	}

	if (a.status === "COMPLETED") {
		return `
            <div class="mt-3 text-success small">
                Consultation completed.
            </div>
        `;
	}

	return "";
}

function actionButtons(a) {

	if (a.status === "PAYMENT_PENDING") {
		return `
            <div class="mt-2 text-warning small">
                Payment pending
            </div>
        `;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
            <div class="mt-2 text-danger small">
                Payment failed
            </div>
        `;
	}

	if (a.status === "REQUESTED" || a.status === "PENDING") {
		return `
            <div class="mt-2">
                <button class="btn btn-sm btn-success me-1"
                        onclick="updateAppointmentStatus(${a.id}, 'CONFIRMED')">
                    Confirm
                </button>

                <button class="btn btn-sm btn-danger"
                        onclick="updateAppointmentStatus(${a.id}, 'CANCELLED')">
                    Cancel
                </button>
            </div>
        `;
	}

	if (a.status === "CONFIRMED") {
		if (a.consultationType === "ONLINE") {
			if (isValidMeetingUrl(a.meetingUrl)) {
				return `
                <div class="mt-2">
                    <button class="btn btn-sm btn-success me-1"
                            onclick="startConsultation(${a.id}, '${escapeJs(a.meetingUrl)}')">
                        Join Meeting
                    </button>

                    <button class="btn btn-sm btn-outline-danger"
                            onclick="updateAppointmentStatus(${a.id}, 'CANCELLED')">
                        Cancel
                    </button>
                </div>
            `;
			}

			return `
            <div class="mt-2 text-muted small">
                Waiting for valid meeting link
            </div>
        `;
		}
	}

	if (a.status === "IN_CONSULTATION") {
		if (a.consultationType === "ONLINE" && isValidMeetingUrl(a.meetingUrl)) {
			return `
                <div class="mt-2">
                    <button class="btn btn-sm btn-primary me-1"
                            onclick="openMeeting('${escapeJs(a.meetingUrl)}')">
                        Rejoin Meeting
                    </button>

                    <button class="btn btn-sm btn-medi"
                            style="width:auto;"
                            onclick="updateAppointmentStatus(${a.id}, 'COMPLETED')">
                        Mark Completed
                    </button>
                </div>
            `;
		}

		return `
            <div class="mt-2">
                <button class="btn btn-sm btn-medi"
                        style="width:auto;"
                        onclick="updateAppointmentStatus(${a.id}, 'COMPLETED')">
                    Mark Completed
                </button>
            </div>
        `;
	}

	return "";
}

async function startConsultation(id, meetingUrl) {
	if (!isValidMeetingUrl(meetingUrl)) {
		showAppointmentMsg("Meeting link is not generated yet.");
		return;
	}

	const meetingWindow = window.open("about:blank", "_blank");
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/appointments/${id}/status?status=IN_CONSULTATION`, {
			method: "PUT",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		let result = {};
		try {
			result = await response.json();
		} catch (e) {
			result = {};
		}

		if (!response.ok) {
			if (meetingWindow) {
				meetingWindow.close();
			}

			showAppointmentMsg(result.message || "Unable to start consultation");
			return;
		}

		if (meetingWindow) {
			meetingWindow.location.href = meetingUrl;
		} else {
			window.location.href = meetingUrl;
		}

		loadAppointments();

	} catch (e) {
		if (meetingWindow) {
			meetingWindow.close();
		}

		showAppointmentMsg("Doctor service not reachable.");
	}
}

function openMeeting(url) {
	if (!isValidMeetingUrl(url)) {
		showAppointmentMsg("Meeting link is not generated yet.");
		return;
	}

	window.open(url, "_blank");
}

function isValidMeetingUrl(url) {
	return url
		&& typeof url === "string"
		&& (url.startsWith("http://") || url.startsWith("https://"));
}

function escapeJs(value) {
	return String(value || "")
		.replace(/\\/g, "\\\\")
		.replace(/'/g, "\\'")
		.replace(/"/g, "&quot;");
}

async function updateAppointmentStatus(id, status) {
	if (!confirm("Update appointment status to " + status + "?")) {
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/appointments/${id}/status?status=${status}`, {
			method: "PUT",
			headers: {
				"Authorization": "Bearer " + token
			}
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

function consultationBadge(type) {
	if (type === "ONLINE") {
		return `<span class="badge bg-success">ONLINE VIDEO</span>`;
	}

	if (type === "OFFLINE") {
		return `<span class="badge bg-secondary">OFFLINE VISIT</span>`;
	}

	return `<span class="badge bg-light text-dark">-</span>`;
}

function paymentBadge(paymentStatus) {
	if (paymentStatus === "SUCCESS") {
		return `<span class="badge bg-success">SUCCESS</span>`;
	}

	if (paymentStatus === "INITIATED" || paymentStatus === "PENDING") {
		return `<span class="badge bg-warning text-dark">PENDING</span>`;
	}

	if (paymentStatus === "FAILED") {
		return `<span class="badge bg-danger">FAILED</span>`;
	}

	return `<span class="badge bg-secondary">${safe(paymentStatus)}</span>`;
}

function appointmentBadge(status) {
	if (status === "PAYMENT_PENDING") {
		return `<span class="badge bg-warning text-dark">PAYMENT PENDING</span>`;
	}

	if (status === "PAYMENT_FAILED") {
		return `<span class="badge bg-danger">PAYMENT FAILED</span>`;
	}

	if (status === "REQUESTED") {
		return `<span class="badge bg-warning text-dark">REQUESTED</span>`;
	}

	if (status === "PENDING") {
		return `<span class="badge bg-warning text-dark">PENDING</span>`;
	}

	if (status === "CONFIRMED") {
		return `<span class="badge bg-info text-dark">CONFIRMED</span>`;
	}

	if (status === "IN_CONSULTATION") {
		return `<span class="badge bg-primary">IN CONSULTATION</span>`;
	}

	if (status === "COMPLETED") {
		return `<span class="badge bg-success">COMPLETED</span>`;
	}

	if (status === "CANCELLED") {
		return `<span class="badge bg-danger">CANCELLED</span>`;
	}

	if (status === "REJECTED") {
		return `<span class="badge bg-danger">REJECTED</span>`;
	}

	return `<span class="badge bg-secondary">${safe(status)}</span>`;
}

function clearAppointmentForm() {
	["patientId", "appointmentDate", "appointmentTime", "purpose"]
		.forEach(id => {
			const el = document.getElementById(id);
			if (el) {
				el.value = "";
			}
		});
}

function getVal(id) {
	const el = document.getElementById(id);
	return el ? el.value.trim() : "";
}

function showAppointmentMsg(message, type = "danger") {
	const msgBox = document.getElementById("msg");

	if (!msgBox) {
		alert(message);
		return;
	}

	msgBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDate(value) {
	return value ? new Date(value).toLocaleDateString() : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}
