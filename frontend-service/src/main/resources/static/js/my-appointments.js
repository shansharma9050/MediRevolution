let currentType = "DOCTOR";
let myDoctorAppointments = [];
let myHospitalAppointments = [];

document.addEventListener("DOMContentLoaded", function() {
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

	try {
		const doctorPromise = fetch(`${API_BASE}/doctor/appointments/patient`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const hospitalPromise = fetch(`${API_BASE}/hospital/appointments/patient`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const [doctorResult, hospitalResult] = await Promise.allSettled([
			doctorPromise,
			hospitalPromise
		]);

		if (doctorResult.status === "fulfilled") {
			const doctorRes = doctorResult.value;

			if (doctorRes.ok) {
				myDoctorAppointments = await doctorRes.json();
			} else {
				console.error("Doctor appointment API failed:", doctorRes.status);
			}
		} else {
			console.error("Doctor appointment service error:", doctorResult.reason);
		}

		if (hospitalResult.status === "fulfilled") {
			const hospitalRes = hospitalResult.value;

			if (hospitalRes.ok) {
				myHospitalAppointments = await hospitalRes.json();
			} else {
				console.error("Hospital appointment API failed:", hospitalRes.status);
			}
		} else {
			console.error("Hospital appointment service error:", hospitalResult.reason);
		}

		renderAppointments();

		if (!myDoctorAppointments.length && !myHospitalAppointments.length) {
			showMsg("No appointments found or appointment services are not responding.", "warning");
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
	const list = currentType === "DOCTOR" ? myDoctorAppointments : myHospitalAppointments;

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
                            ${currentType === "DOCTOR"
				? "Doctor ID: " + safe(a.doctorAuthUserId)
				: safe(a.doctorName)
			}
                        </h5>

                        ${currentType === "HOSPITAL"
				? `<div class="text-muted small">
                                    Hospital ID: ${safe(a.hospitalAuthUserId)} | ${safe(a.department)}
                               </div>`
				: ""
			}

                        <div class="text-muted small">
                            Date: ${formatDate(a.appointmentDate)} | Time: ${safe(a.appointmentTime)}
                        </div>

                        <div class="text-muted small mt-1">
                            Consultation Type: ${consultationBadge(a.consultationType)}
                        </div>

                        <div class="mt-2">
                            <strong>Symptoms:</strong> ${safe(a.symptoms)}
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

function combinedStatusBadge(a) {
    if (a.status === "PAYMENT_PENDING") {
        return `<span class="badge bg-warning text-dark">PAYMENT PENDING</span>`;
    }

    if (a.status === "PAYMENT_FAILED") {
        return `<span class="badge bg-danger">PAYMENT FAILED</span>`;
    }

    if (a.paymentStatus === "SUCCESS" && a.status === "CONFIRMED") {
        return `
            <span class="badge bg-info text-dark">CONFIRMED</span>
            <div class="mt-2">
                <span class="badge bg-success">PAYMENT SUCCESS</span>
            </div>
        `;
    }

    if (a.paymentStatus === "SUCCESS" && a.status === "COMPLETED") {
        return `
            <span class="badge bg-success">COMPLETED</span>
            <div class="mt-2">
                <span class="badge bg-success">PAYMENT SUCCESS</span>
            </div>
        `;
    }

    return statusBadge(a.status);
}

function videoJoinButton(a) {
	if (currentType !== "DOCTOR") {
		return "";
	}

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

	if (a.status === "CONFIRMED" && !isValidMeetingUrl(a.meetingUrl)) {
		return `
            <div class="mt-3 text-muted small">
                Video link is not generated yet. Please refresh this page after payment success.
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

function escapeJs(value) {
	return String(value || "")
		.replace(/\\/g, "\\\\")
		.replace(/'/g, "\\'")
		.replace(/"/g, "&quot;");
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
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to cancel appointment");
			return;
		}

		showMsg("Appointment cancelled successfully", "success");
		loadMyAppointments();

	} catch (e) {
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
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to cancel hospital appointment");
			return;
		}

		showMsg("Hospital appointment cancelled successfully", "success");
		loadMyAppointments();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
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
	return value === null || value === undefined || value === "" ? "-" : value;
}
