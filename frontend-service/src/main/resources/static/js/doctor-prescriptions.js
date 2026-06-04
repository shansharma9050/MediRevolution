let prescriptionPatients = [];
let prescriptions = [];

document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadPatientsForPrescription();
	loadPrescriptions();
});

function requireDoctorRole() {
	if (localStorage.getItem("role") !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

function togglePrescriptionForm() {
	const panel = document.getElementById("prescriptionFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function loadPatientsForPrescription() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients`, {
			headers: { "Authorization": "Bearer " + token }
		});

		prescriptionPatients = response.ok ? await response.json() : [];
		renderPatientDropdown();

	} catch (e) {
		showPrescriptionMsg("Unable to load patients");
	}
}

function renderPatientDropdown() {
	const dropdown = document.getElementById("patientId");

	if (!prescriptionPatients.length) {
		dropdown.innerHTML = `<option value="">No patients found</option>`;
		return;
	}

	let html = `<option value="">Select Patient</option>`;

	prescriptionPatients.forEach(p => {
		html += `<option value="${p.id}">${p.patientName} - ${p.mobile}</option>`;
	});

	dropdown.innerHTML = html;
}

async function loadPrescriptions() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/prescriptions`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showPrescriptionMsg(result.message || "Unable to load prescriptions");
			return;
		}

		prescriptions = result;
		renderPrescriptions();

	} catch (e) {
		showPrescriptionMsg("Doctor service not reachable.");
	}
}

async function createPrescription() {
	const patientId = document.getElementById("patientId").value;

	if (!patientId) {
		showPrescriptionMsg("Please select patient");
		return;
	}

	const payload = {
		symptoms: getVal("symptoms"),
		diagnosis: getVal("diagnosis"),
		medicines: getVal("medicines"),
		advice: getVal("advice")
	};

	if (!payload.symptoms || !payload.diagnosis || !payload.medicines) {
		showPrescriptionMsg("Symptoms, diagnosis and medicines are required");
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients/${patientId}/prescriptions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await response.json();

		if (!response.ok) {
			showPrescriptionMsg(result.message || "Unable to create prescription");
			return;
		}

		showPrescriptionMsg("Prescription created successfully", "success");
		clearPrescriptionForm();
		document.getElementById("prescriptionFormPanel").style.display = "none";
		loadPrescriptions();

	} catch (e) {
		showPrescriptionMsg("Doctor service not reachable.");
	}
}

function renderPrescriptions() {
	const container = document.getElementById("prescriptionList");

	if (!prescriptions.length) {
		container.innerHTML = `<div class="text-center text-muted py-4">No prescriptions found</div>`;
		return;
	}

	let html = "";

	prescriptions.forEach(p => {
		const patient = p.patient || {};

		html += `
            <div class="order-card mb-3">
                <div class="d-flex justify-content-between flex-wrap gap-3">
                    <div>
                        <h5 class="fw-bold text-primary">${safe(patient.patientName)}</h5>
                        <div class="text-muted small">Date: ${formatDateTime(p.prescriptionDate)}</div>
                    </div>
                    <span class="badge bg-info text-dark align-self-start">Prescription</span>
                </div>

                <hr>

                <div><strong>Symptoms:</strong> ${safe(p.symptoms)}</div>
                <div><strong>Diagnosis:</strong> ${safe(p.diagnosis)}</div>
                <div class="mt-2"><strong>Medicines:</strong><br>${safe(p.medicines)}</div>
                <div class="mt-2"><strong>Advice:</strong> ${safe(p.advice)}</div>
            </div>
        `;
	});

	container.innerHTML = html;
}

function clearPrescriptionForm() {
	["patientId", "symptoms", "diagnosis", "medicines", "advice"]
		.forEach(id => document.getElementById(id).value = "");
}

function getVal(id) {
	return document.getElementById(id).value.trim();
}

function showPrescriptionMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDateTime(value) {
	return value ? new Date(value).toLocaleString() : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}