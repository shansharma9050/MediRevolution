console.log("MY APPOINTMENTS JS LOADED - DOCTOR + HOSPITAL FIX");

let currentType = "DOCTOR";
let myDoctorAppointments = [];
let myHospitalAppointments = [];

let doctorLoadError = "";
let hospitalLoadError = "";

document.addEventListener("DOMContentLoaded", function() {
	requirePatientRole();
	updateTypeButtons();
	showAppointmentsLoadingState();
	loadMyAppointments();
});

function requirePatientRole() {
	if (localStorage.getItem("role") !== "PATIENT") {
		alert("Only PATIENT can view patient appointments.");
		window.location.href = "/dashboard";
	}
}

function setType(type) {
	currentType = type;

	const listTitle =
		document.getElementById("listTitle");

	if (listTitle) {
		listTitle.innerText =
			type === "DOCTOR"
				? "Doctor Appointments"
				: "Hospital Appointments";
	}

	updateTypeButtons();
	renderAppointments();
}

function updateTypeButtons() {
	const doctorButton =
		document.getElementById("doctorTypeButton");

	const hospitalButton =
		document.getElementById("hospitalTypeButton");

	if (doctorButton) {
		doctorButton.classList.toggle(
			"active",
			currentType === "DOCTOR"
		);
	}

	if (hospitalButton) {
		hospitalButton.classList.toggle(
			"active",
			currentType === "HOSPITAL"
		);
	}
}

async function loadMyAppointments() {
	const token = localStorage.getItem("token");

	myDoctorAppointments = [];
	myHospitalAppointments = [];

	doctorLoadError = "";
	hospitalLoadError = "";

	showAppointmentsLoadingState();

	try {
		const doctorPromise = fetch(`${API_BASE}/doctor/appointments/patient?t=${Date.now()}`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token,
				"Cache-Control": "no-cache"
			}
		});

		const hospitalPromise = fetch(`${API_BASE}/hospital/appointments/patient?t=${Date.now()}`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token,
				"Cache-Control": "no-cache"
			}
		});

		const [doctorResult, hospitalResult] = await Promise.allSettled([
			doctorPromise,
			hospitalPromise
		]);

		if (doctorResult.status === "fulfilled") {
			const doctorRes = doctorResult.value;
			const doctorData = await readJsonSafely(doctorRes);

			if (doctorRes.ok) {
				myDoctorAppointments = normalizeList(doctorData).map(normalizeAppointment);
			} else {
				doctorLoadError = getErrorMessage(
					doctorData,
					`Doctor appointment API failed. Status: ${doctorRes.status}`
				);

				console.error(
					"Doctor appointment API failed:",
					doctorRes.status,
					doctorData
				);
			}
		} else {
			doctorLoadError =
				"Doctor appointment service not reachable.";

			console.error(
				"Doctor appointment service error:",
				doctorResult.reason
			);
		}

		if (hospitalResult.status === "fulfilled") {
			const hospitalRes = hospitalResult.value;
			const hospitalData = await readJsonSafely(hospitalRes);

			if (hospitalRes.ok) {
				myHospitalAppointments = normalizeList(hospitalData).map(normalizeAppointment);
			} else {
				hospitalLoadError = getErrorMessage(
					hospitalData,
					`Hospital appointment API failed. Status: ${hospitalRes.status}`
				);

				console.error(
					"Hospital appointment API failed:",
					hospitalRes.status,
					hospitalData
				);
			}
		} else {
			hospitalLoadError =
				"Hospital appointment service not reachable.";

			console.error(
				"Hospital appointment service error:",
				hospitalResult.reason
			);
		}

		console.log(
			"Doctor appointments:",
			myDoctorAppointments
		);

		console.log(
			"Hospital appointments:",
			myHospitalAppointments
		);

		updateAppointmentSummary();
		renderAppointments();

		if (
			!myDoctorAppointments.length &&
			!myHospitalAppointments.length
		) {
			if (
				currentType === "DOCTOR" &&
				doctorLoadError
			) {
				showMsg(
					doctorLoadError,
					"danger"
				);
			} else if (
				currentType === "HOSPITAL" &&
				hospitalLoadError
			) {
				showMsg(
					hospitalLoadError,
					"danger"
				);
			} else {
				showMsg(
					"No appointments found.",
					"warning"
				);
			}
		} else {
			clearMsg();
		}

	} catch (e) {
		console.error(
			"Appointment load error:",
			e
		);

		updateAppointmentSummary();
		renderAppointments();

		showMsg(
			"Appointment services not reachable."
		);
	}
}

function renderAppointments() {
	const container =
		document.getElementById(
			"appointmentList"
		);

	if (!container) {
		return;
	}

	const list =
		currentType === "DOCTOR"
			? myDoctorAppointments
			: myHospitalAppointments;

	const error =
		currentType === "DOCTOR"
			? doctorLoadError
			: hospitalLoadError;

	if (error && !list.length) {
		container.innerHTML = `
			<div class="my-appointments-error-state">

				<div class="my-appointments-error-icon">
					<i class="bi bi-exclamation-triangle-fill"></i>
				</div>

				<h5 class="fw-bold text-danger">
					Unable to load appointments
				</h5>

				<p class="text-muted mb-0">
					${escapeHtml(error)}
				</p>

			</div>
		`;

		return;
	}

	if (!list.length) {
		container.innerHTML = `
			<div class="my-appointments-empty-state">

				<div class="my-appointments-empty-icon">
					<i class="bi bi-calendar-x"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No appointments found
				</h5>

				<p class="text-muted mb-0">
					No ${currentType === "DOCTOR" ? "doctor" : "hospital"} appointments are available.
				</p>

			</div>
		`;

		return;
	}

	let html = "";

	list.forEach(function(a, index) {

		html += `
			<article class="order-card patient-appointment-card mb-3"
					 style="--card-delay:${Math.min(index * 65, 390)}ms">

				<div class="d-flex justify-content-between flex-wrap gap-4">

					<div class="flex-grow-1">

						<div class="patient-appointment-primary">

							<div class="patient-appointment-avatar">
								<i class="bi ${currentType === "DOCTOR" ? "bi-person-badge-fill" : "bi-hospital-fill"}"></i>
							</div>

							<div>

								<h5 class="fw-bold text-primary mb-1">
									${appointmentTitle(a)}
								</h5>

								${appointmentSubTitle(a)}

							</div>

						</div>

						<div class="patient-appointment-detail-grid">

							<div class="patient-appointment-detail">
								<i class="bi bi-calendar-event-fill"></i>
								<span>
									${formatDate(a.appointmentDate)}
								</span>
							</div>

							<div class="patient-appointment-detail">
								<i class="bi bi-clock-fill"></i>
								<span>
									${safe(a.appointmentTime)}
								</span>
							</div>

							<div class="patient-appointment-detail">
								<i class="bi bi-camera-video-fill"></i>
								<span>
									Consultation: ${consultationBadge(a.consultationType)}
								</span>
							</div>

							${a.paymentStatus ? `
								<div class="patient-appointment-detail">
									<i class="bi bi-credit-card-fill"></i>
									<span>
										Payment: ${paymentStatusInlineBadge(a.paymentStatus)}
									</span>
								</div>
							` : ""}

							${a.consultationFee !== null && a.consultationFee !== undefined ? `
								<div class="patient-appointment-detail">
									<i class="bi bi-currency-rupee"></i>
									<span>
										Fee: ₹${safe(a.consultationFee)}
									</span>
								</div>
							` : ""}

						</div>

						<div class="patient-appointment-symptoms">
							<strong>Symptoms:</strong>
							${safe(a.symptoms || a.purpose)}
						</div>

						${videoJoinButton(a)}

					</div>

					<div class="patient-appointment-action">

						${combinedStatusBadge(a)}
						${cancelButton(a)}

					</div>

				</div>

			</article>
		`;

	});

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
		<div class="my-appointments-loading-state">

			<div class="my-appointments-loading-icon">
				<i class="bi bi-calendar2-heart-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading appointments
			</h5>

			<p class="text-muted mb-0">
				Please wait while we prepare your appointments.
			</p>

		</div>
	`;
}

function updateAppointmentSummary() {
	const doctorAppointments =
		Array.isArray(myDoctorAppointments)
			? myDoctorAppointments
			: [];

	const hospitalAppointments =
		Array.isArray(myHospitalAppointments)
			? myHospitalAppointments
			: [];

	const allAppointments = [
		...doctorAppointments,
		...hospitalAppointments
	];

	const completedCount =
		allAppointments.filter(
			a => a.status === "COMPLETED"
		).length;

	setSummaryValue(
		"totalMyAppointmentCount",
		allAppointments.length
	);

	setSummaryValue(
		"doctorAppointmentCount",
		doctorAppointments.length
	);

	setSummaryValue(
		"hospitalAppointmentCount",
		hospitalAppointments.length
	);

	setSummaryValue(
		"completedMyAppointmentCount",
		completedCount
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

function appointmentTitle(a) {
	if (currentType === "DOCTOR") {
		if (a.doctorName) {
			return safe(a.doctorName);
		}

		return (
			"Doctor ID: " +
			safe(a.doctorAuthUserId)
		);
	}

	return safe(
		a.doctorName ||
		"Hospital Doctor"
	);
}

function appointmentSubTitle(a) {
	if (currentType === "DOCTOR") {
		return `
			<div class="text-muted small">
				Doctor ID: ${safe(a.doctorAuthUserId)}
			</div>
		`;
	}

	return `
		<div class="text-muted small">
			Hospital ID: ${safe(a.hospitalAuthUserId)}
			${a.hospitalDoctorId ? ` | Hospital Doctor ID: ${safe(a.hospitalDoctorId)}` : ""}
			${a.department ? ` | ${safe(a.department)}` : ""}
		</div>
	`;
}

function combinedStatusBadge(a) {
	if (a.status === "PAYMENT_PENDING") {
		return `
			<span class="badge bg-warning text-dark">
				PAYMENT PENDING
			</span>
		`;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
			<span class="badge bg-danger">
				PAYMENT FAILED
			</span>
		`;
	}

	let html =
		statusBadge(a.status);

	if (a.paymentStatus) {
		html +=
			paymentBadge(a.paymentStatus);
	}

	return html;
}

function videoJoinButton(a) {
	if (a.consultationType !== "ONLINE") {
		return "";
	}

	if (a.status === "PAYMENT_PENDING") {
		return `
			<div class="patient-appointment-message text-warning">
				<i class="bi bi-hourglass-split me-1"></i>
				Payment pending. Video link will be available after payment confirmation.
			</div>
		`;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
			<div class="patient-appointment-message text-danger">
				<i class="bi bi-exclamation-triangle-fill me-1"></i>
				Payment failed. Video consultation link is not available.
			</div>
		`;
	}

	if (
		(
			a.status === "CONFIRMED" ||
			a.status === "IN_CONSULTATION"
		) &&
		isValidMeetingUrl(a.meetingUrl)
	) {
		const buttonText =
			a.status === "IN_CONSULTATION"
				? "Rejoin Video Consultation"
				: "Join Video Consultation";

		return `
			<div class="mt-3">
				<button class="btn btn-success btn-sm"
						onclick="openMeeting('${escapeJs(a.meetingUrl)}')">

					<i class="bi bi-camera-video-fill me-1"></i>
					${buttonText}
				</button>
			</div>
		`;
	}

	if (
		(
			a.status === "CONFIRMED" ||
			a.status === "PENDING"
		) &&
		!isValidMeetingUrl(a.meetingUrl)
	) {
		return `
			<div class="patient-appointment-message text-muted">
				<i class="bi bi-link-45deg me-1"></i>
				Video link is not generated yet. Please refresh this page after payment success/confirmation.
			</div>
		`;
	}

	if (a.status === "COMPLETED") {
		return `
			<div class="patient-appointment-message text-success">
				<i class="bi bi-check2-circle me-1"></i>
				Consultation completed.
			</div>
		`;
	}

	if (a.status === "CANCELLED") {
		return `
			<div class="patient-appointment-message text-muted">
				<i class="bi bi-x-circle me-1"></i>
				Appointment cancelled.
			</div>
		`;
	}

	return "";
}

function openMeeting(url) {
	if (!isValidMeetingUrl(url)) {
		alert(
			"Video meeting link is not generated yet."
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

function paymentStatusInlineBadge(paymentStatus) {
	if (!paymentStatus) {
		return "";
	}

	if (paymentStatus === "NOT_REQUIRED") {
		return `
			<span class="badge bg-secondary">
				NOT REQUIRED
			</span>
		`;
	}

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

function paymentBadge(paymentStatus) {
	if (!paymentStatus) {
		return "";
	}

	if (paymentStatus === "NOT_REQUIRED") {
		return `
			<div class="mt-2">
				<span class="badge bg-secondary">
					PAYMENT NOT REQUIRED
				</span>
			</div>
		`;
	}

	if (paymentStatus === "SUCCESS") {
		return `
			<div class="mt-2">
				<span class="badge bg-success">
					PAYMENT SUCCESS
				</span>
			</div>
		`;
	}

	if (
		paymentStatus === "INITIATED" ||
		paymentStatus === "PENDING"
	) {
		return `
			<div class="mt-2">
				<span class="badge bg-warning text-dark">
					PAYMENT PENDING
				</span>
			</div>
		`;
	}

	if (paymentStatus === "FAILED") {
		return `
			<div class="mt-2">
				<span class="badge bg-danger">
					PAYMENT FAILED
				</span>
			</div>
		`;
	}

	return `
		<div class="mt-2">
			<span class="badge bg-secondary">
				${safe(paymentStatus)}
			</span>
		</div>
	`;
}

function statusBadge(status) {
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

	if (status === "PENDING") {
		return `
			<span class="badge bg-warning text-dark">
				PENDING
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

	if (status === "REJECTED") {
		return `
			<span class="badge bg-danger">
				REJECTED
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
			<span class="badge bg-secondary">
				CANCELLED
			</span>
		`;
	}

	return `
		<span class="badge bg-secondary">
			${safe(status)}
		</span>
	`;
}

function cancelButton(a) {
	if (
		a.status === "PENDING" ||
		a.status === "CONFIRMED" ||
		a.status === "PAYMENT_PENDING"
	) {
		if (currentType === "DOCTOR") {
			return `
				<div class="mt-3">
					<button class="btn btn-sm btn-outline-danger"
							onclick="cancelDoctorAppointment(${a.id})">

						<i class="bi bi-x-circle me-1"></i>
						Cancel
					</button>
				</div>
			`;
		}

		return `
			<div class="mt-3">
				<button class="btn btn-sm btn-outline-danger"
						onclick="cancelHospitalAppointment(${a.id})">

					<i class="bi bi-x-circle me-1"></i>
					Cancel
				</button>
			</div>
		`;
	}

	return "";
}

async function cancelDoctorAppointment(id) {
	if (!confirm("Cancel this appointment?")) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/appointments/${id}/cancel`, {
			method: "PUT",
			headers: {
				"Authorization":
					"Bearer " + token
			}
		});

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMsg(
				getErrorMessage(
					result,
					"Unable to cancel appointment"
				)
			);

			return;
		}

		showMsg(
			"Appointment cancelled successfully",
			"success"
		);

		loadMyAppointments();

	} catch (e) {
		console.error(e);

		showMsg(
			"Doctor service not reachable."
		);
	}
}

async function cancelHospitalAppointment(id) {
	if (!confirm("Cancel this hospital appointment?")) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/appointments/${id}/cancel`, {
			method: "PUT",
			headers: {
				"Authorization":
					"Bearer " + token
			}
		});

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMsg(
				getErrorMessage(
					result,
					"Unable to cancel hospital appointment"
				)
			);

			return;
		}

		showMsg(
			"Hospital appointment cancelled successfully",
			"success"
		);

		loadMyAppointments();

	} catch (e) {
		console.error(e);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

function normalizeList(data) {
	if (!data) {
		return [];
	}

	if (Array.isArray(data)) {
		return data;
	}

	if (Array.isArray(data.data)) {
		return data.data;
	}

	if (Array.isArray(data.content)) {
		return data.content;
	}

	return [];
}

function normalizeAppointment(a) {
	if (!a) {
		return {};
	}

	return {
		...a,
		status:
			normalizeStatus(a.status),

		consultationType:
			normalizeConsultationType(
				a.consultationType
			),

		paymentStatus:
			normalizePaymentStatus(
				a.paymentStatus
			)
	};
}

function normalizeStatus(status) {
	if (
		status === null ||
		status === undefined
	) {
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
	if (
		type === null ||
		type === undefined
	) {
		return "";
	}

	const value = String(type);

	if (value === "0") return "ONLINE";
	if (value === "1") return "OFFLINE";

	return value;
}

function normalizePaymentStatus(status) {
	if (
		status === null ||
		status === undefined
	) {
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

async function readJsonSafely(response) {
	try {
		return await response.json();
	} catch (e) {
		return null;
	}
}

function getErrorMessage(data, fallback) {
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

function showMsg(message, type = "danger") {
	const msgBox =
		document.getElementById("msg");

	if (!msgBox) {
		return;
	}

	msgBox.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function clearMsg() {
	const msgBox =
		document.getElementById("msg");

	if (msgBox) {
		msgBox.innerHTML = "";
	}
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	const date = new Date(value);

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

function safe(value) {
	return (
		value === null ||
		value === undefined ||
		value === ""
	)
		? "-"
		: escapeHtml(value);
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