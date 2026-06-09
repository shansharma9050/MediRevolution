let prescriptionPatients = [];
let prescriptions = [];

let editPrescriptionId = null;

document.addEventListener("DOMContentLoaded", function () {
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

	if (!panel) {
		return;
	}

	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function openCreatePrescriptionForm() {
	editPrescriptionId = null;

	clearPrescriptionForm();

	document.getElementById("formTitle").innerText = "New Prescription";
	document.getElementById("savePrescriptionBtn").innerText = "Save Prescription";

	document.getElementById("patientId").disabled = false;
	document.getElementById("prescriptionFormPanel").style.display = "block";

	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}

async function loadPatientsForPrescription() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		prescriptionPatients = response.ok ? await response.json() : [];

		renderPatientDropdown();

	} catch (e) {
		showPrescriptionMsg("Unable to load patients");
	}
}

function renderPatientDropdown() {
	const dropdown = document.getElementById("patientId");

	if (!dropdown) {
		return;
	}

	if (!prescriptionPatients.length) {
		dropdown.innerHTML = `<option value="">No patients found</option>`;
		return;
	}

	let html = `<option value="">Select Patient</option>`;

	prescriptionPatients.forEach(p => {
		html += `<option value="${p.id}">${safe(p.patientName)} - ${safe(p.mobile)}</option>`;
	});

	dropdown.innerHTML = html;
}

async function loadPrescriptions() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/prescriptions`, {
			headers: {
				"Authorization": "Bearer " + token
			}
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

async function savePrescription() {
	if (editPrescriptionId) {
		await updatePrescription();
	} else {
		await createPrescription();
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

	setButtonLoading("savePrescriptionBtn", "Saving...", true);

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
	} finally {
		setButtonLoading("savePrescriptionBtn", "Save Prescription", false);
	}
}

function editPrescription(prescriptionId) {
	const prescription = prescriptions.find(p => Number(p.id) === Number(prescriptionId));

	if (!prescription) {
		showPrescriptionMsg("Prescription not found");
		return;
	}

	editPrescriptionId = prescription.id;

	const patient = prescription.patient || {};

	document.getElementById("formTitle").innerText = "Edit Prescription";
	document.getElementById("savePrescriptionBtn").innerText = "Update Prescription";

	document.getElementById("patientId").value = patient.id || "";
	document.getElementById("patientId").disabled = true;

	document.getElementById("symptoms").value = prescription.symptoms || "";
	document.getElementById("diagnosis").value = prescription.diagnosis || "";
	document.getElementById("medicines").value = prescription.medicines || "";
	document.getElementById("advice").value = prescription.advice || "";

	document.getElementById("prescriptionFormPanel").style.display = "block";

	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}

async function updatePrescription() {
	if (!editPrescriptionId) {
		showPrescriptionMsg("No prescription selected for update");
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

	setButtonLoading("savePrescriptionBtn", "Updating...", true);

	try {
		const response = await fetch(`${API_BASE}/doctor/prescriptions/${editPrescriptionId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await response.json();

		if (!response.ok) {
			showPrescriptionMsg(result.message || "Unable to update prescription");
			return;
		}

		showPrescriptionMsg("Prescription updated successfully", "success");

		cancelEditPrescription();

		document.getElementById("prescriptionFormPanel").style.display = "none";

		loadPrescriptions();

	} catch (e) {
		showPrescriptionMsg("Doctor service not reachable.");
	} finally {
		setButtonLoading("savePrescriptionBtn", "Update Prescription", false);
	}
}

function cancelEditPrescription() {
	editPrescriptionId = null;

	clearPrescriptionForm();

	document.getElementById("formTitle").innerText = "New Prescription";
	document.getElementById("savePrescriptionBtn").innerText = "Save Prescription";

	document.getElementById("patientId").disabled = false;
}

function renderPrescriptions() {
	const container = document.getElementById("prescriptionList");

	if (!container) {
		return;
	}

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
                        <div class="text-muted small">Mobile: ${safe(patient.mobile)}</div>
                        <div class="text-muted small">Date: ${formatDateTime(p.prescriptionDate)}</div>
                    </div>

                    <div class="d-flex flex-column gap-2 align-items-end">
                        <span class="badge bg-info text-dark align-self-start">Prescription</span>

                        <button class="btn btn-sm btn-warning" 
                                style="width:auto;" 
                                onclick="editPrescription(${p.id})">
                            Edit
                        </button>

                        <button class="btn btn-sm btn-medi" 
                                style="width:auto;" 
                                onclick="downloadPrescriptionPdf(${p.id})">
                            PDF Download
                        </button>
                    </div>
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

async function downloadPrescriptionPdf(prescriptionId) {
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

			showPrescriptionMsg(errorMessage);
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
		showPrescriptionMsg("Doctor service not reachable.");
	}
}

function clearPrescriptionForm() {
	["patientId", "symptoms", "diagnosis", "medicines", "advice"].forEach(id => {
		const element = document.getElementById(id);

		if (element) {
			element.value = "";
		}
	});
}

function getVal(id) {
	const element = document.getElementById(id);

	if (!element) {
		return "";
	}

	return element.value.trim();
}

function showPrescriptionMsg(message, type = "danger") {
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

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button = document.getElementById(buttonId);

	if (!button) {
		return;
	}

	if (isLoading) {
		button.dataset.originalText = button.innerHTML;
		button.innerHTML = loadingText;
		button.disabled = true;
	} else {
		button.innerHTML = button.dataset.originalText || button.innerHTML;
		button.disabled = false;
	}
}