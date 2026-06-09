let patientPrescriptions = [];

document.addEventListener("DOMContentLoaded", function() {
	requirePatientRole();
	loadMyPrescriptions();
});

function requirePatientRole() {
	if (localStorage.getItem("role") !== "PATIENT") {
		alert("Access denied. Only PATIENT can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadMyPrescriptions() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patient/my-prescriptions`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await response.json();

		if (!response.ok) {
			showPatientPrescriptionMsg(result.message || "Unable to load prescriptions");
			return;
		}

		patientPrescriptions = result;
		renderPatientPrescriptions();

	} catch (e) {
		showPatientPrescriptionMsg("Doctor service not reachable.");
		console.error(e);
	}
}

function renderPatientPrescriptions() {
	const container = document.getElementById("patientPrescriptionList");

	if (!container) {
		return;
	}

	if (!patientPrescriptions.length) {
		container.innerHTML = `
            <div class="text-center text-muted py-4">
                No prescriptions found.
            </div>
        `;
		return;
	}

	let html = "";

	patientPrescriptions.forEach(p => {
		const patient = p.patient || {};
		const doctorName = p.doctorName || p.doctorEmail || "Doctor";

		html += `
            <div class="order-card mb-3">

                <div class="d-flex justify-content-between flex-wrap gap-3">
                    <div>
                        <h5 class="fw-bold text-primary">
                            Prescription
                        </h5>

                        <div class="text-muted small">
                            Patient: ${safe(patient.patientName)}
                        </div>

                        <div class="text-muted small">
                            Doctor: ${safe(doctorName)}
                        </div>

                        <div class="text-muted small">
                            Date: ${formatDateTime(p.prescriptionDate)}
                        </div>
                    </div>

                    <div class="d-flex flex-column gap-2 align-items-end">
                        <span class="badge bg-success">
                            Available
                        </span>

                        <button class="btn btn-sm btn-medi"
                                style="width:auto;"
                                onclick="downloadMyPrescriptionPdf(${p.id})">
                            PDF Download
                        </button>
                    </div>
                </div>

                <hr>

                <div>
                    <strong>Symptoms:</strong> ${safe(p.symptoms)}
                </div>

                <div>
                    <strong>Diagnosis:</strong> ${safe(p.diagnosis)}
                </div>

                <div class="mt-2">
                    <strong>Medicines:</strong><br>
                    ${safe(p.medicines)}
                </div>

                <div class="mt-2">
                    <strong>Advice:</strong> ${safe(p.advice)}
                </div>

            </div>
        `;
	});

	container.innerHTML = html;
}

async function downloadMyPrescriptionPdf(prescriptionId) {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/prescriptions/${prescriptionId}/download`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		if (!response.ok) {
			let errorMessage = "Unable to download prescription PDF";

			try {
				const result = await response.json();
				errorMessage = result.message || errorMessage;
			} catch (e) {
				// response is not json
			}

			showPatientPrescriptionMsg(errorMessage);
			return;
		}

		const blob = await response.blob();
		const url = window.URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = `prescription-${prescriptionId}.pdf`;

		document.body.appendChild(a);
		a.click();

		a.remove();
		window.URL.revokeObjectURL(url);

	} catch (e) {
		showPatientPrescriptionMsg("Doctor service not reachable.");
		console.error(e);
	}
}

function showPatientPrescriptionMsg(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML = `<div class="alert alert-${type}">${message}</div>`;

	setTimeout(() => {
		msg.innerHTML = "";
	}, 5000);
}

function formatDateTime(value) {
	return value ? new Date(value).toLocaleString() : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}