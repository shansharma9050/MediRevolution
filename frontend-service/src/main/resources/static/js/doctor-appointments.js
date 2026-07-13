let appointmentPatients = [];
let doctorAppointments = [];

document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	setMinimumAppointmentDate();
	loadPatientsForAppointment();
	loadAppointments();
});

function requireDoctorRole() {
	if (localStorage.getItem("role") !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

function setMinimumAppointmentDate() {
	const dateInput =
		document.getElementById("appointmentDate");

	if (!dateInput) {
		return;
	}

	const today = new Date();
	const year = today.getFullYear();
	const month =
		String(today.getMonth() + 1)
			.padStart(2, "0");
	const day =
		String(today.getDate())
			.padStart(2, "0");

	dateInput.min =
		`${year}-${month}-${day}`;
}

function toggleAppointmentForm() {
	const panel =
		document.getElementById(
			"appointmentFormPanel"
		);

	if (!panel) {
		return;
	}

	const isHidden =
		panel.style.display === "none" ||
		window.getComputedStyle(panel).display === "none";

	panel.style.display =
		isHidden
			? "block"
			: "none";

	if (isHidden) {
		window.setTimeout(function() {
			panel.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		}, 80);
	}
}

async function loadPatientsForAppointment() {
	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/patients`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		let result = [];

		try {
			result =
				await response.json();
		} catch (error) {
			result = [];
		}

		appointmentPatients =
			response.ok &&
				Array.isArray(result)
				? result
				: [];

		renderPatientDropdown();

		if (!response.ok) {
			showAppointmentMsg(
				getErrorMessage(
					result,
					"Unable to load patients"
				)
			);
		}

	} catch (e) {
		console.error(
			"Load patients for appointment error:",
			e
		);

		appointmentPatients = [];
		renderPatientDropdown();

		showAppointmentMsg(
			"Unable to load patients"
		);
	}
}

function renderPatientDropdown() {
	const dropdown =
		document.getElementById(
			"patientId"
		);

	if (!dropdown) {
		return;
	}

	if (!appointmentPatients.length) {
		dropdown.innerHTML =
			`<option value="">No patients found</option>`;

		return;
	}

	let html =
		`<option value="">Select Patient</option>`;

	appointmentPatients.forEach(
		function(p) {

			html += `
				<option value="${safeAttribute(p.id)}">
					${safe(p.patientName)} - ${safe(p.mobile)}
				</option>
			`;

		}
	);

	dropdown.innerHTML = html;
}

async function loadAppointments() {
	const token =
		localStorage.getItem("token");

	showAppointmentsLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/appointments`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		let result = [];

		try {
			result =
				await response.json();
		} catch (error) {
			result = [];
		}

		if (!response.ok) {
			doctorAppointments = [];

			updateAppointmentSummary();
			showAppointmentsErrorState(
				getErrorMessage(
					result,
					"Unable to load appointments"
				)
			);

			showAppointmentMsg(
				getErrorMessage(
					result,
					"Unable to load appointments"
				)
			);

			return;
		}

		doctorAppointments =
			Array.isArray(result)
				? result
				: [];

		updateAppointmentSummary();
		renderAppointments(
			doctorAppointments
		);

	} catch (e) {
		console.error(
			"Load doctor appointments error:",
			e
		);

		doctorAppointments = [];

		updateAppointmentSummary();

		showAppointmentsErrorState(
			"Doctor service not reachable."
		);

		showAppointmentMsg(
			"Doctor service not reachable."
		);
	}
}

async function createAppointment() {
	const patientId =
		document
			.getElementById("patientId")
			?.value || "";

	if (!patientId) {
		showAppointmentMsg(
			"Please select patient"
		);

		return;
	}

	const payload = {
		appointmentDate:
			getVal("appointmentDate"),

		appointmentTime:
			getVal("appointmentTime"),

		purpose:
			getVal("purpose")
	};

	if (
		!payload.appointmentDate ||
		!payload.appointmentTime ||
		!payload.purpose
	) {
		showAppointmentMsg(
			"Date, time and purpose are required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	setButtonLoading(
		"saveDoctorAppointmentBtn",
		"Saving Appointment...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/patients/${patientId}/appointments`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json",

						"Authorization":
							"Bearer " + token
					},

					body:
						JSON.stringify(payload)
				}
			);

		let result = {};

		try {
			result =
				await response.json();
		} catch (error) {
			result = {};
		}

		if (!response.ok) {
			showAppointmentMsg(
				getErrorMessage(
					result,
					"Unable to book appointment"
				)
			);

			return;
		}

		showAppointmentMsg(
			"Appointment booked successfully",
			"success"
		);

		clearAppointmentForm();

		const panel =
			document.getElementById(
				"appointmentFormPanel"
			);

		if (panel) {
			panel.style.display = "none";
		}

		loadAppointments();

	} catch (e) {
		console.error(
			"Create doctor appointment error:",
			e
		);

		showAppointmentMsg(
			"Doctor service not reachable."
		);

	} finally {
		setButtonLoading(
			"saveDoctorAppointmentBtn",
			"Save Appointment",
			false
		);
	}
}

function filterAppointments() {
	const status =
		document
			.getElementById("statusFilter")
			?.value || "";

	if (!status) {
		renderAppointments(
			doctorAppointments
		);

		return;
	}

	renderAppointments(
		doctorAppointments.filter(
			a => a.status === status
		)
	);
}

function renderAppointments(appointments) {
	const container =
		document.getElementById(
			"appointmentList"
		);

	if (!container) {
		return;
	}

	const safeAppointments =
		Array.isArray(appointments)
			? appointments
			: [];

	if (!safeAppointments.length) {
		container.innerHTML = `
			<div class="doctor-appointments-empty-state">

				<div class="doctor-appointments-empty-icon">
					<i class="bi bi-calendar-x"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No appointments found
				</h5>

				<p class="text-muted mb-0">
					No appointments match the selected status.
				</p>

			</div>
		`;

		return;
	}

	let html = "";

	safeAppointments.forEach(
		function(a, index) {

			const patient =
				a.patient || {};

			html += `
				<article class="order-card doctor-appointment-card mb-3"
						 style="--card-delay:${Math.min(index * 65, 390)}ms">

					<div class="d-flex justify-content-between flex-wrap gap-4">

						<div class="flex-grow-1">

							<div class="doctor-appointment-primary">

								<div class="doctor-appointment-avatar">
									<i class="bi bi-person-fill"></i>
								</div>

								<div>

									<h5 class="fw-bold text-primary mb-1">
										${safe(patient.patientName || a.patientName)}
									</h5>

									<div class="text-muted small">
										Appointment #${safe(a.id)}
									</div>

								</div>

							</div>

							<div class="doctor-appointment-detail-grid">

								<div class="doctor-appointment-detail">
									<i class="bi bi-telephone-fill"></i>
									<span>
										Mobile: ${safe(patient.mobile || a.patientMobile)}
									</span>
								</div>

								<div class="doctor-appointment-detail">
									<i class="bi bi-calendar-event-fill"></i>
									<span>
										${formatDate(a.appointmentDate)}
									</span>
								</div>

								<div class="doctor-appointment-detail">
									<i class="bi bi-clock-fill"></i>
									<span>
										${safe(a.appointmentTime)}
									</span>
								</div>

								<div class="doctor-appointment-detail">
									<i class="bi bi-camera-video-fill"></i>
									<span>
										Consultation: ${consultationBadge(a.consultationType)}
									</span>
								</div>

								${a.paymentStatus ? `
									<div class="doctor-appointment-detail">
										<i class="bi bi-credit-card-fill"></i>
										<span>
											Payment: ${paymentBadge(a.paymentStatus)}
										</span>
									</div>
								` : ""}

							</div>

							<div class="doctor-appointment-purpose">
								<strong>Purpose/Symptoms:</strong>
								${safe(a.purpose || a.symptoms)}
							</div>

							${meetingInfo(a)}

						</div>

						<div class="doctor-appointment-action">

							${appointmentBadge(a.status)}
							${actionButtons(a)}

						</div>

					</div>

				</article>
			`;

		}
	);

	container.innerHTML = html;
}

function showAppointmentsLoadingState() {
	const container =
		document.getElementById(
			"appointmentList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="doctor-appointments-loading-state">

			<div class="doctor-appointments-loading-icon">
				<i class="bi bi-calendar2-heart-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading appointments
			</h5>

			<p class="text-muted mb-0">
				Please wait while we prepare doctor appointments.
			</p>

		</div>
	`;
}

function showAppointmentsErrorState(message) {
	const container =
		document.getElementById(
			"appointmentList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="doctor-appointments-error-state">

			<div class="doctor-appointments-error-icon">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load appointments
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}

function updateAppointmentSummary() {
	const list =
		Array.isArray(doctorAppointments)
			? doctorAppointments
			: [];

	setSummaryValue(
		"totalDoctorAppointmentCount",
		list.length
	);

	setSummaryValue(
		"pendingDoctorAppointmentCount",
		list.filter(
			a =>
				a.status === "REQUESTED" ||
				a.status === "PENDING" ||
				a.status === "PAYMENT_PENDING"
		).length
	);

	setSummaryValue(
		"onlineDoctorAppointmentCount",
		list.filter(
			a => a.consultationType === "ONLINE"
		).length
	);

	setSummaryValue(
		"completedDoctorAppointmentCount",
		list.filter(
			a => a.status === "COMPLETED"
		).length
	);
}

function setSummaryValue(id, value) {
	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const target =
		Number(value) || 0;

	const start =
		Number(element.textContent) || 0;

	const difference =
		target - start;

	const duration = 500;
	const startTime = performance.now();

	if (
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches ||
		difference === 0
	) {
		element.textContent = target;
		return;
	}

	function update(currentTime) {
		const progress =
			Math.min(
				(currentTime - startTime) /
				duration,
				1
			);

		const eased =
			1 - Math.pow(1 - progress, 3);

		element.textContent =
			Math.round(
				start +
				difference *
				eased
			);

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
			<div class="doctor-appointment-message text-warning">
				<i class="bi bi-hourglass-split me-1"></i>
				Waiting for patient payment. Video link will be available after payment success.
			</div>
		`;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
			<div class="doctor-appointment-message text-danger">
				<i class="bi bi-exclamation-triangle-fill me-1"></i>
				Payment failed. Meeting link is not available.
			</div>
		`;
	}

	if (
		a.status === "CONFIRMED" &&
		isValidMeetingUrl(a.meetingUrl)
	) {
		return `
			<div class="doctor-appointment-message text-success">
				<i class="bi bi-camera-video-fill me-1"></i>
				<strong>Meeting:</strong> Link generated. Click Join Meeting to start consultation.
			</div>
		`;
	}

	if (
		a.status === "CONFIRMED" &&
		!isValidMeetingUrl(a.meetingUrl)
	) {
		return `
			<div class="doctor-appointment-message text-muted">
				<i class="bi bi-link-45deg me-1"></i>
				Meeting link is not generated yet. Please refresh after payment verification.
			</div>
		`;
	}

	if (a.status === "IN_CONSULTATION") {
		return `
			<div class="doctor-appointment-message text-primary">
				<i class="bi bi-broadcast me-1"></i>
				Consultation is in progress.
			</div>
		`;
	}

	if (a.status === "COMPLETED") {
		return `
			<div class="doctor-appointment-message text-success">
				<i class="bi bi-check2-circle me-1"></i>
				Consultation completed.
			</div>
		`;
	}

	return "";
}

function actionButtons(a) {
	if (a.status === "PAYMENT_PENDING") {
		return `
			<div class="mt-2 text-warning small fw-bold">
				<i class="bi bi-hourglass-split me-1"></i>
				Payment pending
			</div>
		`;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
			<div class="mt-2 text-danger small fw-bold">
				<i class="bi bi-exclamation-circle me-1"></i>
				Payment failed
			</div>
		`;
	}

	if (
		a.status === "REQUESTED" ||
		a.status === "PENDING"
	) {
		return `
			<div class="mt-3">

				<button class="btn btn-sm btn-success me-1"
						onclick="updateAppointmentStatus(${a.id}, 'CONFIRMED')">

					<i class="bi bi-check2-circle me-1"></i>
					Confirm
				</button>

				<button class="btn btn-sm btn-danger"
						onclick="updateAppointmentStatus(${a.id}, 'CANCELLED')">

					<i class="bi bi-x-circle me-1"></i>
					Cancel
				</button>

			</div>
		`;
	}

	if (a.status === "CONFIRMED") {
		if (a.consultationType === "ONLINE") {
			if (isValidMeetingUrl(a.meetingUrl)) {
				return `
					<div class="mt-3">

						<button class="btn btn-sm btn-success me-1"
								onclick="startConsultation(${a.id}, '${escapeJs(a.meetingUrl)}')">

							<i class="bi bi-camera-video-fill me-1"></i>
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
					<i class="bi bi-link-45deg me-1"></i>
					Waiting for valid meeting link
				</div>
			`;
		}

		return `
			<div class="mt-3">

				<button class="btn btn-sm btn-medi me-1"
						style="width:auto;"
						onclick="updateAppointmentStatus(${a.id}, 'COMPLETED')">

					<i class="bi bi-check2-circle me-1"></i>
					Mark Completed
				</button>

				<button class="btn btn-sm btn-outline-danger"
						onclick="updateAppointmentStatus(${a.id}, 'CANCELLED')">

					Cancel
				</button>

			</div>
		`;
	}

	if (a.status === "IN_CONSULTATION") {
		if (
			a.consultationType === "ONLINE" &&
			isValidMeetingUrl(a.meetingUrl)
		) {
			return `
				<div class="mt-3">

					<button class="btn btn-sm btn-primary me-1"
							onclick="openMeeting('${escapeJs(a.meetingUrl)}')">

						<i class="bi bi-camera-video-fill me-1"></i>
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
			<div class="mt-3">

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

async function startConsultation(
	id,
	meetingUrl
) {
	if (!isValidMeetingUrl(meetingUrl)) {
		showAppointmentMsg(
			"Meeting link is not generated yet."
		);

		return;
	}

	const meetingWindow =
		window.open(
			"about:blank",
			"_blank"
		);

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/appointments/${id}/status?status=IN_CONSULTATION`,
				{
					method: "PUT",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		let result = {};

		try {
			result =
				await response.json();
		} catch (e) {
			result = {};
		}

		if (!response.ok) {
			if (meetingWindow) {
				meetingWindow.close();
			}

			showAppointmentMsg(
				getErrorMessage(
					result,
					"Unable to start consultation"
				)
			);

			return;
		}

		if (meetingWindow) {
			meetingWindow.location.href =
				meetingUrl;
		} else {
			window.location.href =
				meetingUrl;
		}

		loadAppointments();

	} catch (e) {
		console.error(
			"Start consultation error:",
			e
		);

		if (meetingWindow) {
			meetingWindow.close();
		}

		showAppointmentMsg(
			"Doctor service not reachable."
		);
	}
}

function openMeeting(url) {
	if (!isValidMeetingUrl(url)) {
		showAppointmentMsg(
			"Meeting link is not generated yet."
		);

		return;
	}

	window.open(url, "_blank");
}

function isValidMeetingUrl(url) {
	return (
		url &&
		typeof url === "string" &&
		(
			url.startsWith("http://") ||
			url.startsWith("https://")
		)
	);
}

async function updateAppointmentStatus(
	id,
	status
) {
	if (
		!confirm(
			"Update appointment status to " +
			status +
			"?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/appointments/${id}/status?status=${status}`,
				{
					method: "PUT",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		let result = {};

		try {
			result =
				await response.json();
		} catch (error) {
			result = {};
		}

		if (!response.ok) {
			showAppointmentMsg(
				getErrorMessage(
					result,
					"Unable to update status"
				)
			);

			return;
		}

		showAppointmentMsg(
			"Appointment status updated",
			"success"
		);

		loadAppointments();

	} catch (e) {
		console.error(
			"Update appointment status error:",
			e
		);

		showAppointmentMsg(
			"Doctor service not reachable."
		);
	}
}

function consultationBadge(type) {
	if (type === "ONLINE") {
		return `
			<span class="badge bg-success">
				ONLINE VIDEO
			</span>
		`;
	}

	if (type === "OFFLINE") {
		return `
			<span class="badge bg-secondary">
				OFFLINE VISIT
			</span>
		`;
	}

	return `
		<span class="badge bg-light text-dark">
			-
		</span>
	`;
}

function paymentBadge(paymentStatus) {
	if (paymentStatus === "SUCCESS") {
		return `
			<span class="badge bg-success">
				SUCCESS
			</span>
		`;
	}

	if (
		paymentStatus === "INITIATED" ||
		paymentStatus === "PENDING"
	) {
		return `
			<span class="badge bg-warning text-dark">
				PENDING
			</span>
		`;
	}

	if (paymentStatus === "FAILED") {
		return `
			<span class="badge bg-danger">
				FAILED
			</span>
		`;
	}

	return `
		<span class="badge bg-secondary">
			${safe(paymentStatus)}
		</span>
	`;
}

function appointmentBadge(status) {
	if (status === "PAYMENT_PENDING") {
		return `
			<span class="badge bg-warning text-dark">
				PAYMENT PENDING
			</span>
		`;
	}

	if (status === "PAYMENT_FAILED") {
		return `
			<span class="badge bg-danger">
				PAYMENT FAILED
			</span>
		`;
	}

	if (status === "REQUESTED") {
		return `
			<span class="badge bg-warning text-dark">
				REQUESTED
			</span>
		`;
	}

	if (status === "PENDING") {
		return `
			<span class="badge bg-warning text-dark">
				PENDING
			</span>
		`;
	}

	if (status === "CONFIRMED") {
		return `
			<span class="badge bg-info text-dark">
				CONFIRMED
			</span>
		`;
	}

	if (status === "IN_CONSULTATION") {
		return `
			<span class="badge bg-primary">
				IN CONSULTATION
			</span>
		`;
	}

	if (status === "COMPLETED") {
		return `
			<span class="badge bg-success">
				COMPLETED
			</span>
		`;
	}

	if (status === "CANCELLED") {
		return `
			<span class="badge bg-danger">
				CANCELLED
			</span>
		`;
	}

	if (status === "REJECTED") {
		return `
			<span class="badge bg-danger">
				REJECTED
			</span>
		`;
	}

	return `
		<span class="badge bg-secondary">
			${safe(status)}
		</span>
	`;
}

function clearAppointmentForm() {
	[
		"patientId",
		"appointmentDate",
		"appointmentTime",
		"purpose"
	].forEach(function(id) {

		const element =
			document.getElementById(id);

		if (element) {
			element.value = "";
		}

	});
}

function getVal(id) {
	const element =
		document.getElementById(id);

	return element
		? element.value.trim()
		: "";
}

function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {
	const button =
		document.getElementById(buttonId);

	if (!button) {
		return;
	}

	if (isLoading) {
		button.dataset.originalHtml =
			button.innerHTML;

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"
				  role="status"
				  aria-hidden="true">
			</span>
			${escapeHtml(loadingText)}
		`;

		button.disabled = true;

	} else {
		button.innerHTML =
			button.dataset.originalHtml ||
			button.innerHTML;

		button.disabled = false;
	}
}

function showAppointmentMsg(
	message,
	type = "danger"
) {
	const msgBox =
		document.getElementById("msg");

	if (!msgBox) {
		alert(message);
		return;
	}

	msgBox.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	setTimeout(function() {
		if (msgBox) {
			msgBox.innerHTML = "";
		}
	}, 4000);
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleDateString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric"
		}
	);
}

function getErrorMessage(
	data,
	fallback
) {
	if (!data) {
		return fallback;
	}

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	if (typeof data === "string") {
		return data;
	}

	return fallback;
}

function safe(value) {
	return (
		value === null ||
		value === undefined ||
		value === ""
	)
		? "-"
		: escapeHtml(value);
}

function safeAttribute(value) {
	return escapeHtml(value)
		.replace(/`/g, "&#96;");
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