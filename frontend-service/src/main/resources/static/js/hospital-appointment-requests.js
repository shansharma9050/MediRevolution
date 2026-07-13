let hospitalAppointmentsOnline = [];

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalAppointments();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadHospitalAppointments() {
	const token = localStorage.getItem("token");

	showAppointmentLoadingState();

	try {
		const response = await fetch(`${API_BASE}/hospital/appointments/hospital?t=${Date.now()}`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token,
				"Cache-Control": "no-cache"
			}
		});

		let result = [];

		try {
			result = await response.json();
		} catch (e) {
			result = [];
		}

		if (!response.ok) {
			showMsg(result.message || "Unable to load appointments");
			renderAppointments([]);
			updateAppointmentSummary([]);
			return;
		}

		hospitalAppointmentsOnline = Array.isArray(result)
			? result.map(normalizeAppointment)
			: [];

		updateAppointmentSummary(hospitalAppointmentsOnline);
		renderAppointments(hospitalAppointmentsOnline);

	} catch (e) {
		console.error("Hospital appointments load error:", e);
		showMsg("Hospital service not reachable.");
		renderAppointments([]);
		updateAppointmentSummary([]);
	}
}

function filterAppointments() {
	const status = document.getElementById("statusFilter").value;

	if (!status) {
		renderAppointments(hospitalAppointmentsOnline);
		return;
	}

	renderAppointments(
		hospitalAppointmentsOnline.filter(a => a.status === status)
	);
}

function renderAppointments(list) {
	const container = document.getElementById("appointmentList");

	if (!container) {
		return;
	}

	if (!list || !list.length) {
		container.innerHTML = `
			<div class="appointment-empty-state">
				<div class="appointment-empty-icon">
					<i class="bi bi-calendar-x"></i>
				</div>
				<h5 class="fw-bold text-primary">No appointments found</h5>
				<p class="text-muted mb-0">
					No hospital appointments match the selected status.
				</p>
			</div>
		`;
		return;
	}

	let html = "";

	list.forEach((a, index) => {
		html += `
			<article class="order-card hospital-appointment-card mb-3"
					 style="--card-delay:${Math.min(index * 65, 390)}ms">

				<div class="d-flex justify-content-between flex-wrap gap-4">

					<div class="flex-grow-1">

						<div class="appointment-primary-info">

							<div class="appointment-patient-avatar">
								<i class="bi bi-person-fill"></i>
							</div>

							<div>
								<h5 class="fw-bold text-primary mb-1">
									${safe(a.patientName)}
								</h5>

								<div class="text-muted small">
									Patient appointment #${safe(a.id)}
								</div>
							</div>

						</div>

						<div class="appointment-detail-grid">

							<div class="appointment-detail-item">
								<i class="bi bi-telephone-fill"></i>
								<span>Mobile: ${safe(a.patientMobile)}</span>
							</div>

							<div class="appointment-detail-item">
								<i class="bi bi-person-badge-fill"></i>
								<span>Doctor: ${safe(a.doctorName)}</span>
							</div>

							<div class="appointment-detail-item">
								<i class="bi bi-building"></i>
								<span>Department: ${safe(a.department)}</span>
							</div>

							<div class="appointment-detail-item">
								<i class="bi bi-calendar-event-fill"></i>
								<span>${formatDate(a.appointmentDate)} at ${safe(a.appointmentTime)}</span>
							</div>

							<div class="appointment-detail-item">
								<i class="bi bi-camera-video-fill"></i>
								<span>Consultation: ${consultationBadge(a.consultationType)}</span>
							</div>

							${a.paymentStatus ? `
								<div class="appointment-detail-item">
									<i class="bi bi-credit-card-fill"></i>
									<span>Payment: ${paymentBadge(a.paymentStatus)}</span>
								</div>
							` : ""}

							${a.consultationFee !== null && a.consultationFee !== undefined ? `
								<div class="appointment-detail-item">
									<i class="bi bi-currency-rupee"></i>
									<span>Fee: ₹${safe(a.consultationFee)}</span>
								</div>
							` : ""}

						</div>

						<div class="appointment-symptoms-box">
							<strong>Symptoms:</strong>
							${safe(a.symptoms)}
						</div>

						${meetingInfo(a)}

					</div>

					<div class="appointment-action-column">

						${statusBadge(a.status)}

						<div class="mt-3">
							${actionButtons(a)}
						</div>

					</div>

				</div>

			</article>
		`;
	});

	container.innerHTML = html;
}

function showAppointmentLoadingState() {
	const container = document.getElementById("appointmentList");

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="appointment-loading-state">
			<div class="appointment-loading-orb">
				<i class="bi bi-calendar2-heart-fill"></i>
			</div>
			<h5 class="fw-bold text-primary">Loading appointments</h5>
			<p class="text-muted mb-0">
				Please wait while we prepare hospital appointment requests.
			</p>
		</div>
	`;
}

function updateAppointmentSummary(list) {
	const appointments = Array.isArray(list) ? list : [];

	setSummaryValue("totalAppointmentCount", appointments.length);

	setSummaryValue(
		"pendingAppointmentCount",
		appointments.filter(a =>
			a.status === "PENDING" ||
			a.status === "REQUESTED" ||
			a.status === "PAYMENT_PENDING"
		).length
	);

	setSummaryValue(
		"onlineAppointmentCount",
		appointments.filter(a => a.consultationType === "ONLINE").length
	);

	setSummaryValue(
		"completedAppointmentCount",
		appointments.filter(a => a.status === "COMPLETED").length
	);
}

function setSummaryValue(id, value) {
	const element = document.getElementById(id);

	if (!element) {
		return;
	}

	const target = Number(value) || 0;
	const start = Number(element.textContent) || 0;
	const difference = target - start;
	const duration = 500;
	const startTime = performance.now();

	if (
		window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
		difference === 0
	) {
		element.textContent = target;
		return;
	}

	function update(currentTime) {
		const progress = Math.min((currentTime - startTime) / duration, 1);
		const eased = 1 - Math.pow(1 - progress, 3);

		element.textContent = Math.round(start + difference * eased);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function meetingInfo(a) {
	if (a.consultationType !== "ONLINE") {
		return "";
	}

	if (a.status === "PAYMENT_PENDING") {
		return `
			<div class="appointment-status-message text-warning">
				<i class="bi bi-hourglass-split me-1"></i>
				Waiting for patient payment. Video link will be available after payment success.
			</div>
		`;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
			<div class="appointment-status-message text-danger">
				<i class="bi bi-exclamation-triangle-fill me-1"></i>
				Payment failed. Meeting link is not available.
			</div>
		`;
	}

	if (a.status === "CONFIRMED" && isValidMeetingUrl(a.meetingUrl)) {
		return `
			<div class="appointment-status-message text-success">
				<i class="bi bi-camera-video-fill me-1"></i>
				<strong>Meeting:</strong> Link generated. Click Join Meeting to start consultation.
			</div>
		`;
	}

	if (a.status === "CONFIRMED" && !isValidMeetingUrl(a.meetingUrl)) {
		return `
			<div class="appointment-status-message text-muted">
				<i class="bi bi-link-45deg me-1"></i>
				Meeting link is not generated yet. Please refresh after payment verification.
			</div>
		`;
	}

	if (a.status === "IN_CONSULTATION") {
		return `
			<div class="appointment-status-message text-primary">
				<i class="bi bi-broadcast me-1"></i>
				Consultation is in progress.
			</div>
		`;
	}

	if (a.status === "COMPLETED") {
		return `
			<div class="appointment-status-message text-success">
				<i class="bi bi-check2-circle me-1"></i>
				Consultation completed.
			</div>
		`;
	}

	if (a.status === "CANCELLED") {
		return `
			<div class="appointment-status-message text-muted">
				<i class="bi bi-x-circle me-1"></i>
				Appointment cancelled.
			</div>
		`;
	}

	return "";
}

function actionButtons(a) {

	if (a.status === "PAYMENT_PENDING") {
		return `
			<div class="text-warning small fw-bold">
				<i class="bi bi-hourglass-split me-1"></i>
				Payment pending
			</div>
		`;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
			<div class="text-danger small fw-bold">
				<i class="bi bi-exclamation-circle me-1"></i>
				Payment failed
			</div>
		`;
	}

	if (a.status === "PENDING" || a.status === "REQUESTED") {
		return `
			<button class="btn btn-sm btn-success me-1"
					onclick="updateStatus(${a.id}, 'CONFIRMED')">
				<i class="bi bi-check2-circle me-1"></i>
				Confirm
			</button>

			<button class="btn btn-sm btn-danger"
					onclick="updateStatus(${a.id}, 'REJECTED')">
				<i class="bi bi-x-circle me-1"></i>
				Reject
			</button>
		`;
	}

	if (a.status === "CONFIRMED") {

		if (a.consultationType === "ONLINE") {

			if (isValidMeetingUrl(a.meetingUrl)) {
				return `
					<button class="btn btn-sm btn-success me-1"
							onclick="startConsultation(${a.id}, '${escapeJs(a.meetingUrl)}')">
						<i class="bi bi-camera-video-fill me-1"></i>
						Join Meeting
					</button>

					<button class="btn btn-sm btn-outline-danger"
							onclick="updateStatus(${a.id}, 'CANCELLED')">
						Cancel
					</button>
				`;
			}

			return `
				<div class="text-muted small">
					<i class="bi bi-link-45deg me-1"></i>
					Waiting for valid meeting link
				</div>
			`;
		}

		return `
			<button class="btn btn-sm btn-medi me-1"
					style="width:auto;"
					onclick="updateStatus(${a.id}, 'COMPLETED')">
				<i class="bi bi-check2-circle me-1"></i>
				Complete
			</button>

			<button class="btn btn-sm btn-outline-danger"
					onclick="updateStatus(${a.id}, 'CANCELLED')">
				Cancel
			</button>
		`;
	}

	if (a.status === "IN_CONSULTATION") {

		if (a.consultationType === "ONLINE" && isValidMeetingUrl(a.meetingUrl)) {
			return `
				<button class="btn btn-sm btn-primary me-1"
						onclick="openMeeting('${escapeJs(a.meetingUrl)}')">
					<i class="bi bi-camera-video-fill me-1"></i>
					Rejoin Meeting
				</button>

				<button class="btn btn-sm btn-medi"
						style="width:auto;"
						onclick="updateStatus(${a.id}, 'COMPLETED')">
					Mark Completed
				</button>
			`;
		}

		return `
			<button class="btn btn-sm btn-medi"
					style="width:auto;"
					onclick="updateStatus(${a.id}, 'COMPLETED')">
				Mark Completed
			</button>
		`;
	}

	return "";
}

async function startConsultation(id, meetingUrl) {
	if (!isValidMeetingUrl(meetingUrl)) {
		showMsg("Meeting link is not generated yet.");
		return;
	}

	const meetingWindow = window.open("about:blank", "_blank");
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/appointments/${id}/status?status=IN_CONSULTATION`, {
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

			showMsg(result.message || "Unable to start consultation");
			return;
		}

		if (meetingWindow) {
			meetingWindow.location.href = meetingUrl;
		} else {
			window.location.href = meetingUrl;
		}

		loadHospitalAppointments();

	} catch (e) {
		console.error("Start hospital consultation error:", e);

		if (meetingWindow) {
			meetingWindow.close();
		}

		showMsg("Hospital service not reachable.");
	}
}

async function updateStatus(id, status) {
	if (!confirm("Update appointment status to " + status + "?")) {
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/appointments/${id}/status?status=${status}`, {
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
			showMsg(result.message || "Unable to update appointment");
			return;
		}

		showMsg("Appointment updated successfully", "success");
		loadHospitalAppointments();

	} catch (e) {
		console.error("Update hospital appointment status error:", e);
		showMsg("Hospital service not reachable.");
	}
}

function openMeeting(url) {
	if (!isValidMeetingUrl(url)) {
		showMsg("Meeting link is not generated yet.");
		return;
	}

	window.open(url, "_blank");
}

function isValidMeetingUrl(url) {
	return url
		&& typeof url === "string"
		&& (url.startsWith("http://") || url.startsWith("https://"));
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
	if (paymentStatus === "NOT_REQUIRED") {
		return `<span class="badge bg-secondary">NOT REQUIRED</span>`;
	}

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

function statusBadge(status) {
	if (status === "PAYMENT_PENDING") {
		return `<span class="badge bg-warning text-dark">PAYMENT PENDING</span>`;
	}

	if (status === "PAYMENT_FAILED") {
		return `<span class="badge bg-danger">PAYMENT FAILED</span>`;
	}

	if (status === "PENDING") {
		return `<span class="badge bg-warning text-dark">PENDING</span>`;
	}

	if (status === "REQUESTED") {
		return `<span class="badge bg-warning text-dark">REQUESTED</span>`;
	}

	if (status === "CONFIRMED") {
		return `<span class="badge bg-info text-dark">CONFIRMED</span>`;
	}

	if (status === "IN_CONSULTATION") {
		return `<span class="badge bg-primary">IN CONSULTATION</span>`;
	}

	if (status === "REJECTED") {
		return `<span class="badge bg-danger">REJECTED</span>`;
	}

	if (status === "COMPLETED") {
		return `<span class="badge bg-success">COMPLETED</span>`;
	}

	if (status === "CANCELLED") {
		return `<span class="badge bg-secondary">CANCELLED</span>`;
	}

	return `<span class="badge bg-secondary">${safe(status)}</span>`;
}

function normalizeAppointment(a) {
	if (!a) {
		return {};
	}

	return {
		...a,
		status: normalizeStatus(a.status),
		consultationType: normalizeConsultationType(a.consultationType),
		paymentStatus: normalizePaymentStatus(a.paymentStatus)
	};
}

function normalizeStatus(status) {
	if (status === null || status === undefined) {
		return "";
	}

	const value = String(status);

	if (value === "0") return "PENDING";
	if (value === "1") return "PAYMENT_PENDING";
	if (value === "2") return "PAYMENT_FAILED";
	if (value === "3") return "CONFIRMED";
	if (value === "4") return "REJECTED";
	if (value === "5") return "COMPLETED";
	if (value === "6") return "CANCELLED";
	if (value === "7") return "IN_CONSULTATION";

	return value;
}

function normalizeConsultationType(type) {
	if (type === null || type === undefined) {
		return "";
	}

	const value = String(type);

	if (value === "0") return "ONLINE";
	if (value === "1") return "OFFLINE";

	return value;
}

function normalizePaymentStatus(status) {
	if (status === null || status === undefined) {
		return "";
	}

	const value = String(status);

	if (value === "0") return "NOT_REQUIRED";
	if (value === "1") return "INITIATED";
	if (value === "2") return "PENDING";
	if (value === "3") return "SUCCESS";
	if (value === "4") return "FAILED";

	return value;
}

function showMsg(message, type = "danger") {
	const msgBox = document.getElementById("msg");

	if (!msgBox) {
		return;
	}

	msgBox.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function formatDate(value) {
	return value ? new Date(value).toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	}) : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : escapeHtml(value);
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeJs(value) {
	return String(value || "")
		.replace(/\\/g, "\\\\")
		.replace(/'/g, "\\'")
		.replace(/"/g, "&quot;");
}