let prescriptionModal;

document.addEventListener("DOMContentLoaded", async function() {
	const allowed = await protectSaasPage("PRESCRIPTIONS", "VIEW");
	if (!allowed) return;
	const tenantId = localStorage.getItem("tenantId");
	const tenantName = localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	document.getElementById("tenantNameText").innerText = tenantName || "your workspace";

	prescriptionModal = new bootstrap.Modal(document.getElementById("prescriptionModal"));

	loadPatientsDropdown();
	loadDoctorsDropdown();
	loadPrescriptions();
});

async function loadPrescriptions() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const tableBody = document.getElementById("prescriptionsTableBody");

	tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-muted py-4">
                Loading prescriptions...
            </td>
        </tr>
    `;

	try {
		const response = await fetch(`${API_BASE}/saas/prescriptions?tenantId=${tenantId}`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to load prescriptions.");
			renderPrescriptions([]);
			return;
		}

		renderPrescriptions(Array.isArray(result) ? result : []);

		await applyPrescriptionButtonPermissions();

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
		renderPrescriptions([]);
	}
}

function renderPrescriptions(prescriptions) {
	const tableBody = document.getElementById("prescriptionsTableBody");

	if (!prescriptions || prescriptions.length === 0) {
		tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    No prescriptions found.
                </td>
            </tr>
        `;
		return;
	}

	let html = "";

	prescriptions.forEach(prescription => {
		html += `
            <tr>
                <td>
                    <strong>${formatDate(prescription.createdAt)}</strong>
                    <div class="text-muted small">#${prescription.id}</div>
                </td>

                <td>
                    <strong>${safe(prescription.patientName)}</strong>
                    <div class="text-muted small">${safe(prescription.patientMobile)}</div>
                </td>

                <td>
                    <strong>${safe(prescription.doctorName)}</strong>
                    <div class="text-muted small">${safe(prescription.department)}</div>
                </td>

                <td>${safe(prescription.diagnosis)}</td>

                <td>${safe(prescription.followUpDate)}</td>

                <td>
                    <button class="btn btn-sm btn-outline-primary"
                            onclick="viewPrescription(${prescription.id})">
                        View
                    </button>

                    <button class="btn btn-sm btn-outline-secondary print-prescription-btn"
                            onclick="downloadPdf(${prescription.id})">
                        PDF
                    </button>

                    <button class="btn btn-sm btn-outline-danger delete-prescription-btn"
                            onclick="deletePrescription(${prescription.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
	});

	tableBody.innerHTML = html;
}

async function applyPrescriptionButtonPermissions() {
	const canCreate = await hasSaasPermission("PRESCRIPTIONS", "CREATE");
	const canUpdate = await hasSaasPermission("PRESCRIPTIONS", "UPDATE");
	const canDelete = await hasSaasPermission("PRESCRIPTIONS", "DELETE");
	const canPrint = await hasSaasPermission("PRESCRIPTIONS", "PRINT");

	showOrHideById("addPrescriptionBtn", canCreate);

	showOrHideByClass("edit-prescription-btn", canUpdate);
	showOrHideByClass("delete-prescription-btn", canDelete);
	showOrHideByClass("print-prescription-btn", canPrint);
}

async function applyFilters() {
	const tenantId = localStorage.getItem("tenantId");
	const patientId = document.getElementById("filterPatientId").value;
	const doctorProfileId = document.getElementById("filterDoctorProfileId").value;
	const token = localStorage.getItem("token");

	let url = `${API_BASE}/saas/prescriptions?tenantId=${tenantId}`;

	if (patientId) {
		url = `${API_BASE}/saas/prescriptions/patient?tenantId=${tenantId}&patientId=${patientId}`;
	}

	if (doctorProfileId) {
		url = `${API_BASE}/saas/prescriptions/doctor?tenantId=${tenantId}&doctorProfileId=${doctorProfileId}`;
	}

	if (patientId && doctorProfileId) {
		showMsg("Please filter either patient or doctor, not both.");
		return;
	}

	try {
		const response = await fetch(url, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to apply filter.");
			return;
		}

		renderPrescriptions(Array.isArray(result) ? result : []);

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

async function loadPatientsDropdown() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	try {
		const response = await fetch(`${API_BASE}/saas/patients?tenantId=${tenantId}`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		const patientSelect = document.getElementById("patientId");
		const filterPatientSelect = document.getElementById("filterPatientId");

		patientSelect.innerHTML = `<option value="">Select Patient</option>`;
		filterPatientSelect.innerHTML = `<option value="">All Patients</option>`;

		if (response.ok && Array.isArray(result)) {
			result.forEach(patient => {
				const option = `
                    <option value="${patient.id}">
                        ${safe(patient.patientName)} (${safe(patient.mobile)})
                    </option>
                `;

				patientSelect.innerHTML += option;
				filterPatientSelect.innerHTML += option;
			});
		}

	} catch (error) {
		console.error(error);
	}
}

async function loadDoctorsDropdown() {

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const doctorSelect =
		document.getElementById("doctorProfileId");

	const filterDoctorSelect =
		document.getElementById("filterDoctorProfileId");

	if (!doctorSelect && !filterDoctorSelect) {
		console.warn("Doctor dropdowns not found.");
		return;
	}

	if (doctorSelect) {
		doctorSelect.innerHTML =
			`<option value="">Loading doctors...</option>`;
	}

	if (filterDoctorSelect) {
		filterDoctorSelect.innerHTML =
			`<option value="">Loading doctors...</option>`;
	}

	try {

		const response = await fetch(
			`${API_BASE}/saas/staff/doctors/for-clinical?tenantId=${tenantId}`,
			{
				method: "GET",
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {

			if (doctorSelect) {
				doctorSelect.innerHTML =
					`<option value="">Unable to load doctors</option>`;
			}

			if (filterDoctorSelect) {
				filterDoctorSelect.innerHTML =
					`<option value="">Unable to load doctors</option>`;
			}

			showMsg(
				result.message ||
				`Unable to load doctors. HTTP ${response.status}`
			);

			return;
		}

		if (doctorSelect) {
			doctorSelect.innerHTML =
				`<option value="">Select Doctor</option>`;
		}

		if (filterDoctorSelect) {
			filterDoctorSelect.innerHTML =
				`<option value="">All Doctors</option>`;
		}

		if (!Array.isArray(result) || result.length === 0) {

			if (doctorSelect) {
				doctorSelect.innerHTML =
					`<option value="">No doctors found</option>`;
			}

			if (filterDoctorSelect) {
				filterDoctorSelect.innerHTML =
					`<option value="">No doctors found</option>`;
			}

			return;
		}

		result.forEach(staff => {

			if (!staff.id || !staff.authUserId) {
				return;
			}

			const optionText =
				(staff.staffName || "Doctor")
				+ (
					staff.department
						? ` - ${staff.department}`
						: ""
				)
				+ (
					staff.specialization
						? ` (${staff.specialization})`
						: ""
				);

			/*
			 * Main dropdown option
			 */
			if (doctorSelect) {

				const doctorOption =
					document.createElement("option");

				doctorOption.value =
					String(staff.id);

				doctorOption.dataset.authUserId =
					String(staff.authUserId);

				doctorOption.dataset.doctorName =
					staff.staffName || "";

				doctorOption.dataset.department =
					staff.department || "";

				doctorOption.dataset.specialization =
					staff.specialization || "";

				doctorOption.textContent =
					optionText;

				doctorSelect.appendChild(
					doctorOption
				);
			}

			/*
			 * Filter dropdown option
			 */
			if (filterDoctorSelect) {

				const filterOption =
					document.createElement("option");

				/*
				 * Decide carefully:
				 * staff.id = doctorStaffId
				 * staff.authUserId = doctorAuthUserId
				 */

				filterOption.value =
					String(staff.authUserId);

				filterOption.dataset.staffId =
					String(staff.id);

				filterOption.dataset.doctorName =
					staff.staffName || "";

				filterOption.dataset.department =
					staff.department || "";

				filterOption.dataset.specialization =
					staff.specialization || "";

				filterOption.textContent =
					optionText;

				filterDoctorSelect.appendChild(
					filterOption
				);
			}
		});

	} catch (error) {

		console.error(
			"Doctor dropdown load error:",
			error
		);

		if (doctorSelect) {
			doctorSelect.innerHTML =
				`<option value="">Service not reachable</option>`;
		}

		if (filterDoctorSelect) {
			filterDoctorSelect.innerHTML =
				`<option value="">Service not reachable</option>`;
		}
	}
}

function openCreatePrescriptionModal() {
	clearPrescriptionForm();
	addMedicineRow();
	document.getElementById("prescriptionModalTitle").innerText = "Create Prescription";
	prescriptionModal.show();
}

async function savePrescription() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const payload = {
		tenantId: Number(tenantId),
		patientId: getValue("patientId") ? Number(getValue("patientId")) : null,
		doctorProfileId: getValue("doctorProfileId") ? Number(getValue("doctorProfileId")) : null,
		appointmentId: getValue("appointmentId") ? Number(getValue("appointmentId")) : null,
		diagnosis: getValue("diagnosis"),
		clinicalNotes: getValue("clinicalNotes"),
		advice: getValue("advice"),
		labTests: getValue("labTests"),
		followUpAdvice: getValue("followUpAdvice"),
		followUpDate: getValue("followUpDate") || null,
		bloodPressure: getValue("bloodPressure"),
		pulse: getValue("pulse"),
		temperature: getValue("temperature"),
		spo2: getValue("spo2"),
		weight: getValue("weight"),
		height: getValue("height"),
		sugarLevel: getValue("sugarLevel"),
		medicines: collectMedicines()
	};

	if (!payload.patientId) {
		showMsg("Please select patient.");
		return;
	}

	if (!payload.doctorProfileId) {
		showMsg("Please select doctor.");
		return;
	}

	if (!payload.diagnosis) {
		showMsg("Diagnosis is required.");
		return;
	}

	try {
		const response = await fetch(`${API_BASE}/saas/prescriptions`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to save prescription.");
			return;
		}

		prescriptionModal.hide();

		showMsg("Prescription created successfully.", "success");

		loadPrescriptions();

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

async function viewPrescription(prescriptionId) {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	try {
		const response = await fetch(`${API_BASE}/saas/prescriptions/${prescriptionId}?tenantId=${tenantId}`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const prescription = await safeJson(response);

		if (!response.ok) {
			showMsg(prescription.message || "Unable to load prescription.");
			return;
		}

		let medicineText = "";

		if (prescription.medicines && prescription.medicines.length > 0) {
			medicineText = prescription.medicines.map(m => {
				return `${m.medicineName} | ${safe(m.dosage)} | ${safe(m.frequency)} | ${safe(m.duration)} | ${safe(m.instructions)}`;
			}).join("\n");
		} else {
			medicineText = "No medicines";
		}

		alert(
			"Prescription #" + prescription.id + "\n\n" +
			"Patient: " + safe(prescription.patientName) + "\n" +
			"Doctor: " + safe(prescription.doctorName) + "\n" +
			"Diagnosis: " + safe(prescription.diagnosis) + "\n\n" +
			"Vitals:\n" +
			"BP: " + safe(prescription.bloodPressure) + "\n" +
			"Pulse: " + safe(prescription.pulse) + "\n" +
			"Temp: " + safe(prescription.temperature) + "\n" +
			"SpO2: " + safe(prescription.spo2) + "\n\n" +
			"Medicines:\n" + medicineText + "\n\n" +
			"Advice: " + safe(prescription.advice)
		);

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

function downloadPdf(prescriptionId) {
	const tenantId = localStorage.getItem("tenantId");
	const token = localStorage.getItem("token");

	fetch(`${API_BASE}/saas/prescriptions/${prescriptionId}/pdf?tenantId=${tenantId}`, {
		headers: {
			"Authorization": "Bearer " + token
		}
	})
		.then(response => {
			if (!response.ok) {
				throw new Error("Unable to download PDF");
			}

			return response.blob();
		})
		.then(blob => {
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");

			a.href = url;
			a.download = "saas-prescription-" + prescriptionId + ".pdf";
			document.body.appendChild(a);
			a.click();

			a.remove();
			window.URL.revokeObjectURL(url);
		})
		.catch(error => {
			console.error(error);
			showMsg("Unable to download prescription PDF.");
		});
}

async function deletePrescription(prescriptionId) {
	if (!confirm("Delete this prescription?")) {
		return;
	}

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	try {
		const response = await fetch(`${API_BASE}/saas/prescriptions/${prescriptionId}?tenantId=${tenantId}`, {
			method: "DELETE",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to delete prescription.");
			return;
		}

		showMsg(result.message || "Prescription deleted successfully.", "success");

		loadPrescriptions();

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

function addMedicineRow() {
	const tbody = document.getElementById("medicineRows");

	const row = document.createElement("tr");

	row.innerHTML = `
        <td>
            <input type="text" class="form-control medicine-name" placeholder="Medicine name">
        </td>
        <td>
            <input type="text" class="form-control medicine-dosage" placeholder="1 tablet">
        </td>
        <td>
            <input type="text" class="form-control medicine-frequency" placeholder="Twice daily">
        </td>
        <td>
            <input type="text" class="form-control medicine-duration" placeholder="5 days">
        </td>
        <td>
            <input type="text" class="form-control medicine-instructions" placeholder="After food">
        </td>
        <td>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeMedicineRow(this)">
                X
            </button>
        </td>
    `;

	tbody.appendChild(row);
}

function removeMedicineRow(button) {
	button.closest("tr").remove();
}

function collectMedicines() {
	const rows = document.querySelectorAll("#medicineRows tr");
	const medicines = [];

	rows.forEach(row => {
		const medicineName = row.querySelector(".medicine-name").value.trim();

		if (!medicineName) {
			return;
		}

		medicines.push({
			medicineName: medicineName,
			dosage: row.querySelector(".medicine-dosage").value.trim(),
			frequency: row.querySelector(".medicine-frequency").value.trim(),
			duration: row.querySelector(".medicine-duration").value.trim(),
			instructions: row.querySelector(".medicine-instructions").value.trim()
		});
	});

	return medicines;
}

function clearPrescriptionForm() {
	[
		"patientId",
		"doctorProfileId",
		"appointmentId",
		"diagnosis",
		"clinicalNotes",
		"advice",
		"labTests",
		"followUpAdvice",
		"followUpDate",
		"bloodPressure",
		"pulse",
		"temperature",
		"spo2",
		"weight",
		"height",
		"sugarLevel"
	].forEach(id => setValue(id, ""));

	document.getElementById("medicineRows").innerHTML = "";
}

function getValue(id) {
	const element = document.getElementById(id);
	return element ? element.value.trim() : "";
}

function setValue(id, value) {
	const element = document.getElementById(id);
	if (element) {
		element.value = value === null || value === undefined ? "" : value;
	}
}

async function safeJson(response) {
	try {
		return await response.json();
	} catch (e) {
		return {};
	}
}

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	return String(value).replace("T", " ").substring(0, 16);
}