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

	try {
		const response = await fetch(`${API_BASE}/hospital/appointments/hospital`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to load appointments");
			return;
		}

		hospitalAppointmentsOnline = result;
		renderAppointments(hospitalAppointmentsOnline);

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function filterAppointments() {
	const status = document.getElementById("statusFilter").value;

	if (!status) {
		renderAppointments(hospitalAppointmentsOnline);
		return;
	}

	renderAppointments(hospitalAppointmentsOnline.filter(a => a.status === status));
}

function renderAppointments(list) {
	const container = document.getElementById("appointmentList");

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
                        <h5 class="fw-bold text-primary">${safe(a.patientName)}</h5>
                        <div class="text-muted small">Mobile: ${safe(a.patientMobile)}</div>
                        <div class="text-muted small">Doctor: ${safe(a.doctorName)} | ${safe(a.department)}</div>
                        <div class="text-muted small">Date: ${formatDate(a.appointmentDate)} | Time: ${safe(a.appointmentTime)}</div>
                        <div class="mt-2"><strong>Symptoms:</strong> ${safe(a.symptoms)}</div>
                    </div>

                    <div class="text-end">
                        ${statusBadge(a.status)}
                        <div class="mt-2">${actionButtons(a)}</div>
                    </div>
                </div>
            </div>
        `;
	});

	container.innerHTML = html;
}

function actionButtons(a) {
	if (a.status === "PENDING") {
		return `
            <button class="btn btn-sm btn-success me-1" onclick="updateStatus(${a.id}, 'CONFIRMED')">Confirm</button>
            <button class="btn btn-sm btn-danger" onclick="updateStatus(${a.id}, 'REJECTED')">Reject</button>
        `;
	}

	if (a.status === "CONFIRMED") {
		return `
            <button class="btn btn-sm btn-medi me-1" style="width:auto;" onclick="updateStatus(${a.id}, 'COMPLETED')">Complete</button>
            <button class="btn btn-sm btn-outline-danger" onclick="updateStatus(${a.id}, 'CANCELLED')">Cancel</button>
        `;
	}

	return "";
}

async function updateStatus(id, status) {
	if (!confirm("Update appointment status to " + status + "?")) {
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/appointments/${id}/status?status=${status}`, {
			method: "PUT",
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to update appointment");
			return;
		}

		showMsg("Appointment updated successfully", "success");
		loadHospitalAppointments();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function statusBadge(status) {
	if (status === "PENDING") return `<span class="badge bg-warning text-dark">PENDING</span>`;
	if (status === "CONFIRMED") return `<span class="badge bg-info text-dark">CONFIRMED</span>`;
	if (status === "REJECTED") return `<span class="badge bg-danger">REJECTED</span>`;
	if (status === "COMPLETED") return `<span class="badge bg-success">COMPLETED</span>`;
	if (status === "CANCELLED") return `<span class="badge bg-secondary">CANCELLED</span>`;
	return `<span class="badge bg-secondary">${safe(status)}</span>`;
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