console.log("MY APPOINTMENTS JS LOADED - DOCTOR + HOSPITAL FIX");

let currentType = "DOCTOR";
let myDoctorAppointments = [];
let myHospitalAppointments = [];

let doctorLoadError = "";
let hospitalLoadError = "";

document.addEventListener("DOMContentLoaded", function () {
	requirePatientRole();
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

	document.getElementById("listTitle").innerText =
		type === "DOCTOR" ? "Doctor Appointments" : "Hospital Appointments";

	renderAppointments();
}

async function loadMyAppointments() {
	const token = localStorage.getItem("token");

	myDoctorAppointments = [];
	myHospitalAppointments = [];

	doctorLoadError = "";
	hospitalLoadError = "";

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
				doctorLoadError = getErrorMessage(doctorData, `Doctor appointment API failed. Status: ${doctorRes.status}`);
				console.error("Doctor appointment API failed:", doctorRes.status, doctorData);
			}
		} else {
			doctorLoadError = "Doctor appointment service not reachable.";
			console.error("Doctor appointment service error:", doctorResult.reason);
		}

		if (hospitalResult.status === "fulfilled") {
			const hospitalRes = hospitalResult.value;
			const hospitalData = await readJsonSafely(hospitalRes);

			if (hospitalRes.ok) {
				myHospitalAppointments = normalizeList(hospitalData).map(normalizeAppointment);
			} else {
				hospitalLoadError = getErrorMessage(hospitalData, `Hospital appointment API failed. Status: ${hospitalRes.status}`);
				console.error("Hospital appointment API failed:", hospitalRes.status, hospitalData);
			}
		} else {
			hospitalLoadError = "Hospital appointment service not reachable.";
			console.error("Hospital appointment service error:", hospitalResult.reason);
		}

		console.log("Doctor appointments:", myDoctorAppointments);
		console.log("Hospital appointments:", myHospitalAppointments);

		renderAppointments();

		if (!myDoctorAppointments.length && !myHospitalAppointments.length) {
			if (currentType === "DOCTOR" && doctorLoadError) {
				showMsg(doctorLoadError, "danger");
			} else if (currentType === "HOSPITAL" && hospitalLoadError) {
				showMsg(hospitalLoadError, "danger");
			} else {
				showMsg("No appointments found.", "warning");
			}
		} else {
			clearMsg();
		}

	} catch (e) {
		console.error("Appointment load error:", e);
		showMsg("Appointment services not reachable.");
	}
}

function renderAppointments() {
	const container = document.getElementById("appointmentList");

	if (!container) {
		return;
	}

	const list = currentType === "DOCTOR" ? myDoctorAppointments : myHospitalAppointments;
	const error = currentType === "DOCTOR" ? doctorLoadError : hospitalLoadError;

	if (error && !list.length) {
		container.innerHTML = `
			<div class="text-center text-danger py-5">
				${escapeHtml(error)}
			</div>
		`;
		return;
	}

	if (!list.length) {
		container.innerHTML = `<div class="text-center text-muted py-5">No appointments found</div>`;
		return;
	}

	let html = "";

	list.forEach(a => {
		html += `
            <div class="order-card mb-3">
                <div class="d-flex justify-content-between flex-wrap gap-3">

                    <div>
                        <h5 class="fw-bold text-primary">
                            ${appointmentTitle(a)}
                        </h5>

                        ${appointmentSubTitle(a)}

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

                        ${a.consultationFee !== null && a.consultationFee !== undefined ? `
                            <div class="text-muted small mt-1">
                                Fee: ₹${safe(a.consultationFee)}
                            </div>
                        ` : ""}

                        <div class="mt-2">
                            <strong>Symptoms:</strong> ${safe(a.symptoms || a.purpose)}
                        </div>

                        ${videoJoinButton(a)}
                    </div>

                    <div class="text-end">
   					 	${combinedStatusBadge(a)}
    					${cancelButton(a)}
					</div>

                </div>
            </div>
        `;
	});

	container.innerHTML = html;
}

function appointmentTitle(a) {
	if (currentType === "DOCTOR") {
		if (a.doctorName) {
			return safe(a.doctorName);
		}

		return "Doctor ID: " + safe(a.doctorAuthUserId);
	}

	return safe(a.doctorName || "Hospital Doctor");
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
		return `<span class="badge bg-warning text-dark">PAYMENT PENDING</span>`;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `<span class="badge bg-danger">PAYMENT FAILED</span>`;
	}

	let html = statusBadge(a.status);

	if (a.paymentStatus) {
		html += paymentBadge(a.paymentStatus);
	}

	return html;
}

function videoJoinButton(a) {
	if (a.consultationType !== "ONLINE") {
		return "";
	}

	if (a.status === "PAYMENT_PENDING") {
		return `
            <div class="mt-3 text-warning small">
                Payment pending. Video link will be available after payment confirmation.
            </div>
        `;
	}

	if (a.status === "PAYMENT_FAILED") {
		return `
            <div class="mt-3 text-danger small">
                Payment failed. Video consultation link is not available.
            </div>
        `;
	}

	if ((a.status === "CONFIRMED" || a.status === "IN_CONSULTATION") && isValidMeetingUrl(a.meetingUrl)) {
		const buttonText = a.status === "IN_CONSULTATION"
			? "Rejoin Video Consultation"
			: "Join Video Consultation";

		return `
            <div class="mt-3">
                <button class="btn btn-success btn-sm"
                        onclick="openMeeting('${escapeJs(a.meetingUrl)}')">
                    ${buttonText}
                </button>
            </div>
        `;
	}

	if ((a.status === "CONFIRMED" || a.status === "PENDING") && !isValidMeetingUrl(a.meetingUrl)) {
		return `
            <div class="mt-3 text-muted small">
                Video link is not generated yet. Please refresh this page after payment success/confirmation.
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

	if (a.status === "CANCELLED") {
		return `
            <div class="mt-3 text-muted small">
                Appointment cancelled.
            </div>
        `;
	}

	return "";
}

function openMeeting(url) {
	if (!isValidMeetingUrl(url)) {
		alert("Video meeting link is not generated yet.");
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
	if (!paymentStatus) {
		return "";
	}

	if (paymentStatus === "NOT_REQUIRED") {
		return `<div class="mt-2"><span class="badge bg-secondary">PAYMENT NOT REQUIRED</span></div>`;
	}

	if (paymentStatus === "SUCCESS") {
		return `<div class="mt-2"><span class="badge bg-success">PAYMENT SUCCESS</span></div>`;
	}

	if (paymentStatus === "INITIATED" || paymentStatus === "PENDING") {
		return `<div class="mt-2"><span class="badge bg-warning text-dark">PAYMENT PENDING</span></div>`;
	}

	if (paymentStatus === "FAILED") {
		return `<div class="mt-2"><span class="badge bg-danger">PAYMENT FAILED</span></div>`;
	}

	return `<div class="mt-2"><span class="badge bg-secondary">${safe(paymentStatus)}</span></div>`;
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

function cancelButton(a) {
	if (
		a.status === "PENDING" ||
		a.status === "CONFIRMED" ||
		a.status === "PAYMENT_PENDING"
	) {
		if (currentType === "DOCTOR") {
			return `
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-danger"
                            onclick="cancelDoctorAppointment(${a.id})">
                        Cancel
                    </button>
                </div>
            `;
		}

		return `
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-danger"
                        onclick="cancelHospitalAppointment(${a.id})">
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

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/appointments/${id}/cancel`, {
			method: "PUT",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await readJsonSafely(response);

		if (!response.ok) {
			showMsg(getErrorMessage(result, "Unable to cancel appointment"));
			return;
		}

		showMsg("Appointment cancelled successfully", "success");
		loadMyAppointments();

	} catch (e) {
		console.error(e);
		showMsg("Doctor service not reachable.");
	}
}

async function cancelHospitalAppointment(id) {
	if (!confirm("Cancel this hospital appointment?")) {
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/appointments/${id}/cancel`, {
			method: "PUT",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await readJsonSafely(response);

		if (!response.ok) {
			showMsg(getErrorMessage(result, "Unable to cancel hospital appointment"));
			return;
		}

		showMsg("Hospital appointment cancelled successfully", "success");
		loadMyAppointments();

	} catch (e) {
		console.error(e);
		showMsg("Hospital service not reachable.");
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
	const msgBox = document.getElementById("msg");

	if (!msgBox) {
		return;
	}

	msgBox.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function clearMsg() {
	const msgBox = document.getElementById("msg");

	if (msgBox) {
		msgBox.innerHTML = "";
	}
}

function formatDate(value) {
	return value ? new Date(value).toLocaleDateString() : "-";
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