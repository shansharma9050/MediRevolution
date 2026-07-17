let prescriptionModal;
let prescriptionViewModal;

let allPrescriptions = [];
let isLoadingPrescriptions = false;
let isFilteringPrescriptions = false;
let isSavingPrescription = false;
let isViewingPrescription = false;
let isDownloadingPrescription = false;

let prescriptionPagePermissions = {
	create: false,
	update: false,
	delete: false,
	print: false
};

const deletingPrescriptionIds = new Set();

document.addEventListener("DOMContentLoaded", async function() {

	const allowed =
		await protectSaasPage(
			"PRESCRIPTIONS",
			"VIEW"
		);

	if (!allowed) {
		return;
	}

	const tenantId =
		localStorage.getItem("tenantId");

	const tenantName =
		localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText(
		"tenantNameText",
		tenantName || "your workspace"
	);

	const prescriptionModalElement =
		document.getElementById("prescriptionModal");

	if (prescriptionModalElement) {
		prescriptionModal =
			bootstrap.Modal.getOrCreateInstance(
				prescriptionModalElement
			);
	}

	const prescriptionViewModalElement =
		document.getElementById("prescriptionViewModal");

	if (prescriptionViewModalElement) {
		prescriptionViewModal =
			bootstrap.Modal.getOrCreateInstance(
				prescriptionViewModalElement
			);
	}

	await applyPrescriptionPagePermissions();

	await Promise.all([
		loadPatientsDropdown(),
		loadDoctorsDropdown()
	]);

	await loadPrescriptions();
});


async function loadPrescriptions() {

	if (isLoadingPrescriptions) {
		return;
	}

	isLoadingPrescriptions = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showPrescriptionsLoadingState();

	setButtonLoading(
		"refreshPrescriptionsBtn",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/prescriptions?tenantId=${encodeURIComponent(tenantId)}`,
			{
				headers: {
					"Authorization":
						"Bearer " + token,
					"Accept":
						"application/json"
				}
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			allPrescriptions = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load prescriptions."
				);

			showMsg(message);
			showPrescriptionsErrorState(message);
			updatePrescriptionSummary();

			return;
		}

		allPrescriptions =
			Array.isArray(result)
				? result
				: [];

		renderPrescriptions(allPrescriptions);
		updatePrescriptionSummary();
		applyPrescriptionPagePermissions();

	} catch (error) {

		console.error(
			"Unable to load prescriptions:",
			error
		);

		allPrescriptions = [];

		showMsg(
			"SaaS service not reachable."
		);

		showPrescriptionsErrorState(
			"SaaS prescription service is currently unavailable."
		);

		updatePrescriptionSummary();

	} finally {

		isLoadingPrescriptions = false;

		setButtonLoading(
			"refreshPrescriptionsBtn",
			"Refresh",
			false
		);
	}
}


function filterPrescriptions() {

	const keyword =
		getValue(
			"prescriptionSearchBox"
		).toLowerCase();

	const filtered =
		allPrescriptions.filter(
			function(prescription) {

				const searchableText = [
					prescription.patientName,
					prescription.patientMobile,
					prescription.doctorName,
					prescription.department,
					prescription.diagnosis,
					prescription.followUpDate
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return (
					!keyword ||
					searchableText.includes(keyword)
				);
			}
		);

	renderPrescriptions(filtered);
}


function handleExclusivePrescriptionFilter(source) {

	const patientSelect =
		document.getElementById("filterPatientId");

	const doctorSelect =
		document.getElementById("filterDoctorProfileId");

	if (
		source === "patient" &&
		patientSelect &&
		patientSelect.value &&
		doctorSelect
	) {
		doctorSelect.value = "";
	}

	if (
		source === "doctor" &&
		doctorSelect &&
		doctorSelect.value &&
		patientSelect
	) {
		patientSelect.value = "";
	}
}


function renderPrescriptions(prescriptions) {

	const tableBody =
		document.getElementById(
			"prescriptionsTableBody"
		);

	if (!tableBody) {
		return;
	}

	const list =
		Array.isArray(prescriptions)
			? prescriptions
			: [];

	if (!list.length) {

		tableBody.innerHTML = `
			<tr>
				<td colspan="6">

					<div class="saas-prescriptions-state">

						<div class="saas-prescriptions-state-icon">
							<i class="bi bi-file-earmark-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No prescriptions found
						</h5>

						<p class="text-muted mb-0">
							Create a prescription or change the selected filters.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableBody.innerHTML =
		list.map(
			function(prescription, index) {

				const prescriptionId =
					safeNumber(
						prescription.id
					);

				return `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>

							<strong class="text-primary">
								${formatDate(prescription.createdAt)}
							</strong>

							<div class="text-muted small">
								#${prescriptionId || "-"}
							</div>

						</td>

						<td>

							<div class="saas-prescription-person">

								<div class="saas-prescription-avatar">
									<i class="bi bi-person-fill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(prescription.patientName)}
									</strong>

									<div class="text-muted small">
										${safe(prescription.patientMobile)}
									</div>

								</div>

							</div>

						</td>

						<td>

							<div class="saas-prescription-person">

								<div class="saas-prescription-avatar">
									<i class="bi bi-person-badge-fill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(prescription.doctorName)}
									</strong>

									<div class="text-muted small">
										${safe(prescription.department)}
									</div>

								</div>

							</div>

						</td>

						<td>
							${safe(prescription.diagnosis)}
						</td>

						<td>
							${formatDateOnly(prescription.followUpDate)}
						</td>

						<td>

							<div class="saas-prescription-actions">

								<button type="button"
										id="viewPrescriptionBtn_${prescriptionId}"
										class="btn btn-sm btn-outline-primary"
										onclick="viewPrescription(${prescriptionId})"
										${prescriptionId ? "" : "disabled"}>

									<i class="bi bi-eye-fill me-1"></i>
									View
								</button>

								<button type="button"
										id="downloadPrescriptionBtn_${prescriptionId}"
										class="btn btn-sm btn-outline-secondary print-prescription-btn"
										onclick="downloadPdf(${prescriptionId})"
										${prescriptionId ? "" : "disabled"}>

									<i class="bi bi-file-earmark-pdf-fill me-1"></i>
									PDF
								</button>

								<button type="button"
										id="deletePrescriptionBtn_${prescriptionId}"
										class="btn btn-sm btn-outline-danger delete-prescription-btn"
										onclick="deletePrescription(${prescriptionId})"
										${prescriptionId ? "" : "disabled"}>

									<i class="bi bi-trash-fill me-1"></i>
									Delete
								</button>

							</div>

						</td>

					</tr>
				`;
			}
		).join("");

	applyPrescriptionPagePermissions();
}


async function applyPrescriptionPagePermissions() {

	const [
		canCreate,
		canUpdate,
		canDelete,
		canPrint
	] =
		await Promise.all([
			hasSaasPermission(
				"PRESCRIPTIONS",
				"CREATE"
			),
			hasSaasPermission(
				"PRESCRIPTIONS",
				"UPDATE"
			),
			hasSaasPermission(
				"PRESCRIPTIONS",
				"DELETE"
			),
			hasSaasPermission(
				"PRESCRIPTIONS",
				"PRINT"
			)
		]);

	prescriptionPagePermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete),

		print:
			Boolean(canPrint)
	};

	showOrHideById(
		"addPrescriptionBtn",
		prescriptionPagePermissions.create
	);

	showOrHideByClass(
		"edit-prescription-btn",
		prescriptionPagePermissions.update
	);

	showOrHideByClass(
		"delete-prescription-btn",
		prescriptionPagePermissions.delete
	);

	showOrHideByClass(
		"print-prescription-btn",
		prescriptionPagePermissions.print
	);
}


async function applyFilters() {

	if (isFilteringPrescriptions) {
		return;
	}

	const tenantId =
		localStorage.getItem("tenantId");

	const token =
		localStorage.getItem("token");

	const patientId =
		getValue("filterPatientId");

	const doctorProfileId =
		getValue("filterDoctorProfileId");

	if (patientId && doctorProfileId) {

		showMsg(
			"Please filter either patient or doctor, not both."
		);

		return;
	}

	isFilteringPrescriptions = true;

	setButtonLoading(
		"applyFilterBtn",
		"Applying...",
		true
	);

	showPrescriptionsLoadingState();

	let url =
		`${API_BASE}/saas/prescriptions?tenantId=${encodeURIComponent(tenantId)}`;

	if (patientId) {

		url =
			`${API_BASE}/saas/prescriptions/patient` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&patientId=${encodeURIComponent(patientId)}`;
	}

	if (doctorProfileId) {

		url =
			`${API_BASE}/saas/prescriptions/doctor` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&doctorProfileId=${encodeURIComponent(doctorProfileId)}`;
	}

	try {

		const response = await fetch(
			url,
			{
				headers: {
					"Authorization":
						"Bearer " + token,
					"Accept":
						"application/json"
				}
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			const message =
				getApiErrorMessage(
					result,
					"Unable to apply filter."
				);

			showMsg(message);
			showPrescriptionsErrorState(message);

			return;
		}

		renderPrescriptions(
			Array.isArray(result)
				? result
				: []
		);

	} catch (error) {

		console.error(
			"Unable to apply prescription filter:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

		showPrescriptionsErrorState(
			"Unable to apply prescription filter."
		);

	} finally {

		isFilteringPrescriptions = false;

		setButtonLoading(
			"applyFilterBtn",
			"Apply",
			false
		);
	}
}


async function loadPatientsDropdown() {

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const patientSelect =
		document.getElementById("patientId");

	const filterPatientSelect =
		document.getElementById("filterPatientId");

	if (!patientSelect || !filterPatientSelect) {
		return;
	}

	patientSelect.innerHTML =
		`<option value="">Loading patients...</option>`;

	filterPatientSelect.innerHTML =
		`<option value="">Loading patients...</option>`;

	try {

		const response = await fetch(
			`${API_BASE}/saas/patients?tenantId=${encodeURIComponent(tenantId)}`,
			{
				headers: {
					"Authorization":
						"Bearer " + token,
					"Accept":
						"application/json"
				}
			}
		);

		const result =
			await safeJson(response);

		patientSelect.innerHTML =
			`<option value="">Select Patient</option>`;

		filterPatientSelect.innerHTML =
			`<option value="">All Patients</option>`;

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load patients."
				)
			);

			return;
		}

		const patients =
			Array.isArray(result)
				? result
				: [];

		patients.forEach(
			function(patient) {

				if (!patient.id) {
					return;
				}

				const optionText =
					(patient.patientName || "Patient")
					+
					(
						patient.mobile
							? ` (${patient.mobile})`
							: ""
					);

				const patientOption =
					document.createElement("option");

				patientOption.value =
					String(patient.id);

				patientOption.textContent =
					optionText;

				patientSelect.appendChild(
					patientOption
				);

				const filterOption =
					document.createElement("option");

				filterOption.value =
					String(patient.id);

				filterOption.textContent =
					optionText;

				filterPatientSelect.appendChild(
					filterOption
				);
			}
		);

	} catch (error) {

		console.error(
			"Unable to load patients:",
			error
		);

		patientSelect.innerHTML =
			`<option value="">Service not reachable</option>`;

		filterPatientSelect.innerHTML =
			`<option value="">Service not reachable</option>`;
	}
}


async function loadDoctorsDropdown() {

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const doctorSelect =
		document.getElementById("doctorProfileId");

	const filterDoctorSelect =
		document.getElementById("filterDoctorProfileId");

	if (!doctorSelect && !filterDoctorSelect) {
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
			`${API_BASE}/saas/staff/doctors/for-clinical?tenantId=${encodeURIComponent(tenantId)}`,
			{
				method: "GET",

				headers: {
					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
				}
			}
		);

		const result =
			await safeJson(response);

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
				getApiErrorMessage(
					result,
					`Unable to load doctors. HTTP ${response.status}`
				)
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

		const doctors =
			Array.isArray(result)
				? result
				: [];

		if (!doctors.length) {

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

		doctors.forEach(
			function(staff) {

				if (!staff.id || !staff.authUserId) {
					return;
				}

				const optionText =
					(staff.staffName || "Doctor")
					+
					(
						staff.department
							? ` - ${staff.department}`
							: ""
					)
					+
					(
						staff.specialization
							? ` (${staff.specialization})`
							: ""
					);

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

				if (filterDoctorSelect) {

					const filterOption =
						document.createElement("option");

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
			}
		);

	} catch (error) {

		console.error(
			"Unable to load doctors:",
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

	if (!prescriptionPagePermissions.create) {

		showMsg(
			"You do not have permission to create prescriptions."
		);

		return;
	}

	clearPrescriptionForm();
	addMedicineRow();

	setText(
		"prescriptionModalTitle",
		"Create Prescription"
	);

	if (prescriptionModal) {
		prescriptionModal.show();
	}
}


async function savePrescription() {

	if (isSavingPrescription) {
		return;
	}

	if (!prescriptionPagePermissions.create) {

		showMsg(
			"You do not have permission to create prescriptions."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const payload = {
		tenantId:
			Number(tenantId),

		patientId:
			getValue("patientId")
				? Number(getValue("patientId"))
				: null,

		doctorProfileId:
			getValue("doctorProfileId")
				? Number(getValue("doctorProfileId"))
				: null,

		appointmentId:
			getValue("appointmentId")
				? Number(getValue("appointmentId"))
				: null,

		diagnosis:
			getValue("diagnosis"),

		clinicalNotes:
			getValue("clinicalNotes"),

		advice:
			getValue("advice"),

		labTests:
			getValue("labTests"),

		followUpAdvice:
			getValue("followUpAdvice"),

		followUpDate:
			getValue("followUpDate") || null,

		bloodPressure:
			getValue("bloodPressure"),

		pulse:
			getValue("pulse"),

		temperature:
			getValue("temperature"),

		spo2:
			getValue("spo2"),

		weight:
			getValue("weight"),

		height:
			getValue("height"),

		sugarLevel:
			getValue("sugarLevel"),

		medicines:
			collectMedicines()
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

	isSavingPrescription = true;

	setButtonLoading(
		"savePrescriptionBtn",
		"Saving...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/prescriptions`,
			{
				method: "POST",

				headers: {
					"Authorization":
						"Bearer " + token,

					"Content-Type":
						"application/json",

					"Accept":
						"application/json"
				},

				body:
					JSON.stringify(payload)
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to save prescription."
				)
			);

			return;
		}

		if (prescriptionModal) {
			prescriptionModal.hide();
		}

		clearPrescriptionForm();

		showMsg(
			"Prescription created successfully.",
			"success"
		);

		await loadPrescriptions();

	} catch (error) {

		console.error(
			"Unable to save prescription:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {

		isSavingPrescription = false;

		setButtonLoading(
			"savePrescriptionBtn",
			"Save Prescription",
			false
		);
	}
}


async function viewPrescription(prescriptionId) {

	if (isViewingPrescription) {
		return;
	}

	const numericPrescriptionId =
		safeNumber(prescriptionId);

	if (!numericPrescriptionId) {

		showMsg(
			"Invalid prescription selected."
		);

		return;
	}

	isViewingPrescription = true;

	setButtonLoading(
		`viewPrescriptionBtn_${numericPrescriptionId}`,
		"Loading...",
		true
	);

	showPrescriptionViewLoadingState();

	if (prescriptionViewModal) {
		prescriptionViewModal.show();
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	try {

		const response = await fetch(
			`${API_BASE}/saas/prescriptions/${numericPrescriptionId}` +
			`?tenantId=${encodeURIComponent(tenantId)}`,
			{
				headers: {
					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
				}
			}
		);

		const prescription =
			await safeJson(response);

		if (!response.ok) {

			const message =
				getApiErrorMessage(
					prescription,
					"Unable to load prescription."
				);

			showMsg(message);
			showPrescriptionViewErrorState(message);

			return;
		}

		renderPrescriptionDetails(
			prescription
		);

	} catch (error) {

		console.error(
			"Unable to view prescription:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

		showPrescriptionViewErrorState(
			"Unable to load prescription details."
		);

	} finally {

		isViewingPrescription = false;

		setButtonLoading(
			`viewPrescriptionBtn_${numericPrescriptionId}`,
			"View",
			false
		);
	}
}


function renderPrescriptionDetails(prescription) {

	const viewBody =
		document.getElementById(
			"prescriptionViewBody"
		);

	if (!viewBody) {
		return;
	}

	setText(
		"prescriptionViewModalTitle",
		`Prescription #${prescription.id || "-"}`
	);

	const medicines =
		Array.isArray(prescription.medicines)
			? prescription.medicines
			: [];

	let medicineRows = "";

	if (!medicines.length) {

		medicineRows = `
			<tr>
				<td colspan="5"
					class="text-center text-muted">
					No medicines
				</td>
			</tr>
		`;

	} else {

		medicines.forEach(
			function(medicine) {

				medicineRows += `
					<tr>
						<td>${safe(medicine.medicineName)}</td>
						<td>${safe(medicine.dosage)}</td>
						<td>${safe(medicine.frequency)}</td>
						<td>${safe(medicine.duration)}</td>
						<td>${safe(medicine.instructions)}</td>
					</tr>
				`;
			}
		);
	}

	viewBody.innerHTML = `
		<div class="saas-prescriptions-detail-grid">

			<div class="saas-prescriptions-detail-box">
				<small>Patient</small>
				<strong>${safe(prescription.patientName)}</strong>
				<p>${safe(prescription.patientMobile)}</p>
			</div>

			<div class="saas-prescriptions-detail-box">
				<small>Doctor</small>
				<strong>${safe(prescription.doctorName)}</strong>
				<p>${safe(prescription.department)}</p>
			</div>

			<div class="saas-prescriptions-detail-box">
				<small>Diagnosis</small>
				<p>${safe(prescription.diagnosis)}</p>
			</div>

			<div class="saas-prescriptions-detail-box">
				<small>Follow Up</small>
				<strong>${formatDateOnly(prescription.followUpDate)}</strong>
				<p>${safe(prescription.followUpAdvice)}</p>
			</div>

			<div class="saas-prescriptions-detail-box">
				<small>Vitals</small>
				<p>
					BP: ${safe(prescription.bloodPressure)} |
					Pulse: ${safe(prescription.pulse)} |
					Temp: ${safe(prescription.temperature)} |
					SpO2: ${safe(prescription.spo2)}
				</p>
			</div>

			<div class="saas-prescriptions-detail-box">
				<small>Measurements</small>
				<p>
					Weight: ${safe(prescription.weight)} |
					Height: ${safe(prescription.height)} |
					Sugar: ${safe(prescription.sugarLevel)}
				</p>
			</div>

			<div class="saas-prescriptions-detail-box">
				<small>Clinical Notes</small>
				<p>${safe(prescription.clinicalNotes)}</p>
			</div>

			<div class="saas-prescriptions-detail-box">
				<small>Advice / Lab Tests</small>
				<p>
					${safe(prescription.advice)}<br>
					${safe(prescription.labTests)}
				</p>
			</div>

		</div>

		<div class="table-responsive saas-prescriptions-medicine-table mt-3">

			<table class="table table-bordered align-middle">

				<thead>
					<tr>
						<th>Medicine</th>
						<th>Dosage</th>
						<th>Frequency</th>
						<th>Duration</th>
						<th>Instructions</th>
					</tr>
				</thead>

				<tbody>
					${medicineRows}
				</tbody>

			</table>

		</div>
	`;
}


async function downloadPdf(prescriptionId) {

	if (isDownloadingPrescription) {
		return;
	}

	if (!prescriptionPagePermissions.print) {

		showMsg(
			"You do not have permission to print prescriptions."
		);

		return;
	}

	const numericPrescriptionId =
		safeNumber(prescriptionId);

	if (!numericPrescriptionId) {

		showMsg(
			"Invalid prescription selected."
		);

		return;
	}

	isDownloadingPrescription = true;

	setButtonLoading(
		`downloadPrescriptionBtn_${numericPrescriptionId}`,
		"Downloading...",
		true
	);

	const tenantId =
		localStorage.getItem("tenantId");

	const token =
		localStorage.getItem("token");

	try {

		const response = await fetch(
			`${API_BASE}/saas/prescriptions/${numericPrescriptionId}/pdf` +
			`?tenantId=${encodeURIComponent(tenantId)}`,
			{
				headers: {
					"Authorization":
						"Bearer " + token
				}
			}
		);

		if (!response.ok) {

			const result =
				await safeJson(response);

			throw new Error(
				getApiErrorMessage(
					result,
					"Unable to download prescription PDF."
				)
			);
		}

		const blob =
			await response.blob();

		const url =
			window.URL.createObjectURL(blob);

		const anchor =
			document.createElement("a");

		anchor.href = url;

		anchor.download =
			`saas-prescription-${numericPrescriptionId}.pdf`;

		document.body.appendChild(anchor);

		anchor.click();
		anchor.remove();

		setTimeout(
			function() {
				window.URL.revokeObjectURL(url);
			},
			1000
		);

		showMsg(
			"Prescription PDF downloaded successfully.",
			"success"
		);

	} catch (error) {

		console.error(
			"Unable to download prescription PDF:",
			error
		);

		showMsg(
			error.message ||
			"Unable to download prescription PDF."
		);

	} finally {

		isDownloadingPrescription = false;

		setButtonLoading(
			`downloadPrescriptionBtn_${numericPrescriptionId}`,
			"PDF",
			false
		);
	}
}


async function deletePrescription(prescriptionId) {

	if (!prescriptionPagePermissions.delete) {

		showMsg(
			"You do not have permission to delete prescriptions."
		);

		return;
	}

	const numericPrescriptionId =
		safeNumber(prescriptionId);

	if (!numericPrescriptionId) {

		showMsg(
			"Invalid prescription selected."
		);

		return;
	}

	if (
		deletingPrescriptionIds.has(
			numericPrescriptionId
		)
	) {
		return;
	}

	if (!confirm("Delete this prescription?")) {
		return;
	}

	deletingPrescriptionIds.add(
		numericPrescriptionId
	);

	setButtonLoading(
		`deletePrescriptionBtn_${numericPrescriptionId}`,
		"Deleting...",
		true
	);

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	try {

		const response = await fetch(
			`${API_BASE}/saas/prescriptions/${numericPrescriptionId}` +
			`?tenantId=${encodeURIComponent(tenantId)}`,
			{
				method: "DELETE",

				headers: {
					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
				}
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to delete prescription."
				)
			);

			return;
		}

		showMsg(
			getApiErrorMessage(
				result,
				"Prescription deleted successfully."
			),
			"success"
		);

		await loadPrescriptions();

	} catch (error) {

		console.error(
			"Unable to delete prescription:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {

		deletingPrescriptionIds.delete(
			numericPrescriptionId
		);

		setButtonLoading(
			`deletePrescriptionBtn_${numericPrescriptionId}`,
			"Delete",
			false
		);
	}
}


function addMedicineRow() {

	const medicineRows =
		document.getElementById("medicineRows");

	if (!medicineRows) {
		return;
	}

	const row =
		document.createElement("tr");

	row.innerHTML = `
		<td>
			<input type="text"
				   class="form-control medicine-name"
				   placeholder="Medicine name">
		</td>

		<td>
			<input type="text"
				   class="form-control medicine-dosage"
				   placeholder="1 tablet">
		</td>

		<td>
			<input type="text"
				   class="form-control medicine-frequency"
				   placeholder="Twice daily">
		</td>

		<td>
			<input type="text"
				   class="form-control medicine-duration"
				   placeholder="5 days">
		</td>

		<td>
			<input type="text"
				   class="form-control medicine-instructions"
				   placeholder="After food">
		</td>

		<td>
			<button type="button"
					class="btn btn-sm btn-outline-danger"
					onclick="removeMedicineRow(this)">

				<i class="bi bi-trash-fill"></i>
			</button>
		</td>
	`;

	medicineRows.appendChild(row);
}


function removeMedicineRow(button) {

	const row =
		button
			? button.closest("tr")
			: null;

	if (row) {
		row.remove();
	}
}


function collectMedicines() {

	const rows =
		document.querySelectorAll(
			"#medicineRows tr"
		);

	const medicines = [];

	rows.forEach(
		function(row) {

			const medicineName =
				row.querySelector(
					".medicine-name"
				).value.trim();

			if (!medicineName) {
				return;
			}

			medicines.push({
				medicineName:
					medicineName,

				dosage:
					row.querySelector(
						".medicine-dosage"
					).value.trim(),

				frequency:
					row.querySelector(
						".medicine-frequency"
					).value.trim(),

				duration:
					row.querySelector(
						".medicine-duration"
					).value.trim(),

				instructions:
					row.querySelector(
						".medicine-instructions"
					).value.trim()
			});
		}
	);

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
	].forEach(
		function(id) {
			setValue(id, "");
		}
	);

	const medicineRows =
		document.getElementById("medicineRows");

	if (medicineRows) {
		medicineRows.innerHTML = "";
	}
}


async function refreshPrescriptions() {

	setValue(
		"prescriptionSearchBox",
		""
	);

	setValue(
		"filterPatientId",
		""
	);

	setValue(
		"filterDoctorProfileId",
		""
	);

	await loadPrescriptions();
}


function updatePrescriptionSummary() {

	setAnimatedNumber(
		"totalPrescriptionCount",
		allPrescriptions.length
	);

	const patients =
		new Set(
			allPrescriptions
				.map(
					function(prescription) {
						return (
							prescription.patientId ||
							prescription.patientName
						);
					}
				)
				.filter(Boolean)
		);

	const doctors =
		new Set(
			allPrescriptions
				.map(
					function(prescription) {
						return (
							prescription.doctorProfileId ||
							prescription.doctorName
						);
					}
				)
				.filter(Boolean)
		);

	setAnimatedNumber(
		"uniquePatientCount",
		patients.size
	);

	setAnimatedNumber(
		"uniqueDoctorCount",
		doctors.size
	);

	setAnimatedNumber(
		"followUpCount",
		allPrescriptions.filter(
			function(prescription) {
				return Boolean(
					prescription.followUpDate
				);
			}
		).length
	);
}


function showPrescriptionsLoadingState() {

	const tableBody =
		document.getElementById(
			"prescriptionsTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="6">

				<div class="saas-prescriptions-state">

					<div class="saas-prescriptions-state-icon saas-prescriptions-loading">
						<i class="bi bi-file-medical-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading prescriptions
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare the EMR history.
					</p>

				</div>

			</td>
		</tr>
	`;
}


function showPrescriptionsErrorState(message) {

	const tableBody =
		document.getElementById(
			"prescriptionsTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="6">

				<div class="saas-prescriptions-state">

					<div class="saas-prescriptions-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load prescriptions
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}


function showPrescriptionViewLoadingState() {

	const viewBody =
		document.getElementById(
			"prescriptionViewBody"
		);

	if (!viewBody) {
		return;
	}

	viewBody.innerHTML = `
		<div class="saas-prescriptions-state">

			<div class="saas-prescriptions-state-icon saas-prescriptions-loading">
				<i class="bi bi-file-medical-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading prescription
			</h5>

		</div>
	`;
}


function showPrescriptionViewErrorState(message) {

	const viewBody =
		document.getElementById(
			"prescriptionViewBody"
		);

	if (!viewBody) {
		return;
	}

	viewBody.innerHTML = `
		<div class="saas-prescriptions-state">

			<div class="saas-prescriptions-state-icon bg-danger">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load prescription
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}


async function safeJson(response) {

	try {

		const text =
			await response.text();

		if (!text.trim()) {
			return {};
		}

		try {
			return JSON.parse(text);
		} catch (error) {
			return {
				rawBody: text
			};
		}

	} catch (error) {
		return {};
	}
}


function getApiErrorMessage(data, fallback) {

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

	const msg =
		document.getElementById("msg");

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type}">
			${escapeHtml(message)}
		</div>
	`;

	setTimeout(
		function() {
			if (msg) {
				msg.innerHTML = "";
			}
		},
		5000
	);
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

		if (!button.dataset.originalHtml) {
			button.dataset.originalHtml =
				button.innerHTML;
		}

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"
				  role="status"
				  aria-hidden="true"></span>

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


function setAnimatedNumber(id, value) {

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

	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
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
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}


function getValue(id) {

	const element =
		document.getElementById(id);

	return element
		? String(element.value || "").trim()
		: "";
}


function setValue(id, value) {

	const element =
		document.getElementById(id);

	if (element) {
		element.value =
			value === null ||
				value === undefined
				? ""
				: value;
	}
}


function setText(id, value) {

	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
}


function safeNumber(value) {

	const number =
		Number(value);

	return Number.isFinite(number)
		? number
		: 0;
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

	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}


function formatDate(value) {

	if (!value) {
		return "-";
	}

	return escapeHtml(
		String(value)
			.replace("T", " ")
			.substring(0, 16)
	);
}


function formatDateOnly(value) {

	if (!value) {
		return "-";
	}

	return escapeHtml(
		String(value).substring(0, 10)
	);
}