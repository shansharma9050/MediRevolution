let prescriptionPatients = [];
let prescriptions = [];

let editPrescriptionId = null;

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
	const panel =
		document.getElementById(
			"prescriptionFormPanel"
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
}

function openCreatePrescriptionForm() {
	editPrescriptionId = null;

	clearPrescriptionForm();

	const formTitle =
		document.getElementById("formTitle");

	if (formTitle) {
		formTitle.innerText =
			"New Prescription";
	}

	setSavePrescriptionButtonLabel(
		"Save Prescription"
	);

	const patientDropdown =
		document.getElementById("patientId");

	if (patientDropdown) {
		patientDropdown.disabled = false;
	}

	const panel =
		document.getElementById(
			"prescriptionFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		window.setTimeout(function() {
			panel.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		}, 80);
	}
}

function closePrescriptionForm() {
	cancelEditPrescription();

	const panel =
		document.getElementById(
			"prescriptionFormPanel"
		);

	if (panel) {
		panel.style.display = "none";
	}
}

async function loadPatientsForPrescription() {
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

		const result =
			await readJsonSafely(response);

		prescriptionPatients =
			response.ok &&
				Array.isArray(result)
				? result
				: [];

		renderPatientDropdown();
		updatePrescriptionSummary();

		if (!response.ok) {
			showPrescriptionMsg(
				getErrorMessage(
					result,
					"Unable to load patients"
				)
			);
		}

	} catch (e) {
		console.error(
			"Load patients for prescription error:",
			e
		);

		prescriptionPatients = [];
		renderPatientDropdown();
		updatePrescriptionSummary();

		showPrescriptionMsg(
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

	if (!prescriptionPatients.length) {
		dropdown.innerHTML =
			`<option value="">No patients found</option>`;

		return;
	}

	let html =
		`<option value="">Select Patient</option>`;

	prescriptionPatients.forEach(
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

async function loadPrescriptions() {
	const token =
		localStorage.getItem("token");

	showPrescriptionsLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/prescriptions`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			prescriptions = [];

			updatePrescriptionSummary();

			showPrescriptionsErrorState(
				getErrorMessage(
					result,
					"Unable to load prescriptions"
				)
			);

			showPrescriptionMsg(
				getErrorMessage(
					result,
					"Unable to load prescriptions"
				)
			);

			return;
		}

		prescriptions =
			Array.isArray(result)
				? result
				: [];

		renderPrescriptions();
		updatePrescriptionSummary();

	} catch (e) {
		console.error(
			"Load prescriptions error:",
			e
		);

		prescriptions = [];

		updatePrescriptionSummary();

		showPrescriptionsErrorState(
			"Doctor service not reachable."
		);

		showPrescriptionMsg(
			"Doctor service not reachable."
		);
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
	const patientId =
		document
			.getElementById("patientId")
			?.value || "";

	if (!patientId) {
		showPrescriptionMsg(
			"Please select patient"
		);

		return;
	}

	const payload = {
		symptoms:
			getVal("symptoms"),

		diagnosis:
			getVal("diagnosis"),

		medicines:
			getVal("medicines"),

		advice:
			getVal("advice")
	};

	if (
		!payload.symptoms ||
		!payload.diagnosis ||
		!payload.medicines
	) {
		showPrescriptionMsg(
			"Symptoms, diagnosis and medicines are required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	setButtonLoading(
		"savePrescriptionBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/patients/${patientId}/prescriptions`,
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

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showPrescriptionMsg(
				getErrorMessage(
					result,
					"Unable to create prescription"
				)
			);

			return;
		}

		showPrescriptionMsg(
			"Prescription created successfully",
			"success"
		);

		clearPrescriptionForm();

		const panel =
			document.getElementById(
				"prescriptionFormPanel"
			);

		if (panel) {
			panel.style.display = "none";
		}

		loadPrescriptions();

	} catch (e) {
		console.error(
			"Create prescription error:",
			e
		);

		showPrescriptionMsg(
			"Doctor service not reachable."
		);

	} finally {
		setButtonLoading(
			"savePrescriptionBtn",
			"Save Prescription",
			false
		);
	}
}

function editPrescription(prescriptionId) {
	const prescription =
		prescriptions.find(
			p =>
				Number(p.id) ===
				Number(prescriptionId)
		);

	if (!prescription) {
		showPrescriptionMsg(
			"Prescription not found"
		);

		return;
	}

	editPrescriptionId =
		prescription.id;

	const patient =
		prescription.patient || {};

	const formTitle =
		document.getElementById("formTitle");

	if (formTitle) {
		formTitle.innerText =
			"Edit Prescription";
	}

	setSavePrescriptionButtonLabel(
		"Update Prescription"
	);

	const patientDropdown =
		document.getElementById("patientId");

	if (patientDropdown) {
		patientDropdown.value =
			patient.id || "";

		patientDropdown.disabled = true;
	}

	setInputValue(
		"symptoms",
		prescription.symptoms || ""
	);

	setInputValue(
		"diagnosis",
		prescription.diagnosis || ""
	);

	setInputValue(
		"medicines",
		prescription.medicines || ""
	);

	setInputValue(
		"advice",
		prescription.advice || ""
	);

	const panel =
		document.getElementById(
			"prescriptionFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		panel.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
}

async function updatePrescription() {
	if (!editPrescriptionId) {
		showPrescriptionMsg(
			"No prescription selected for update"
		);

		return;
	}

	const payload = {
		symptoms:
			getVal("symptoms"),

		diagnosis:
			getVal("diagnosis"),

		medicines:
			getVal("medicines"),

		advice:
			getVal("advice")
	};

	if (
		!payload.symptoms ||
		!payload.diagnosis ||
		!payload.medicines
	) {
		showPrescriptionMsg(
			"Symptoms, diagnosis and medicines are required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	setButtonLoading(
		"savePrescriptionBtn",
		"Updating...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/prescriptions/${editPrescriptionId}`,
				{
					method: "PUT",

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

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showPrescriptionMsg(
				getErrorMessage(
					result,
					"Unable to update prescription"
				)
			);

			return;
		}

		showPrescriptionMsg(
			"Prescription updated successfully",
			"success"
		);

		closePrescriptionForm();
		loadPrescriptions();

	} catch (e) {
		console.error(
			"Update prescription error:",
			e
		);

		showPrescriptionMsg(
			"Doctor service not reachable."
		);

	} finally {
		setButtonLoading(
			"savePrescriptionBtn",
			"Update Prescription",
			false
		);
	}
}

function cancelEditPrescription() {
	editPrescriptionId = null;

	clearPrescriptionForm();

	const formTitle =
		document.getElementById("formTitle");

	if (formTitle) {
		formTitle.innerText =
			"New Prescription";
	}

	setSavePrescriptionButtonLabel(
		"Save Prescription"
	);

	const patientDropdown =
		document.getElementById("patientId");

	if (patientDropdown) {
		patientDropdown.disabled = false;
	}
}

function renderPrescriptions() {
	const container =
		document.getElementById(
			"prescriptionList"
		);

	if (!container) {
		return;
	}

	if (!prescriptions.length) {
		container.innerHTML = `
			<div class="prescriptions-empty-state">

				<div class="prescriptions-empty-icon">
					<i class="bi bi-file-earmark-x-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No prescriptions found
				</h5>

				<p class="text-muted mb-0">
					Create the first prescription for one of your patients.
				</p>

			</div>
		`;

		return;
	}

	let html = "";

	prescriptions.forEach(
		function(p, index) {

			const patient =
				p.patient || {};

			html += `
				<article class="order-card prescription-card mb-3"
						 style="--card-delay:${Math.min(index * 65, 390)}ms">

					<div class="d-flex justify-content-between flex-wrap gap-4">

						<div class="flex-grow-1">

							<div class="prescription-patient">

								<div class="prescription-patient-avatar">
									<i class="bi bi-person-fill"></i>
								</div>

								<div>

									<h5 class="fw-bold text-primary mb-1">
										${safe(patient.patientName)}
									</h5>

									<div class="text-muted small">
										<i class="bi bi-telephone-fill me-1"></i>
										${safe(patient.mobile)}
									</div>

									<div class="text-muted small mt-1">
										<i class="bi bi-calendar-event-fill me-1"></i>
										${formatDateTime(p.prescriptionDate)}
									</div>

								</div>

							</div>

							<div class="prescription-detail-grid">

								<div class="prescription-detail-block">
									<strong>Symptoms</strong>
									${safe(p.symptoms)}
								</div>

								<div class="prescription-detail-block">
									<strong>Diagnosis</strong>
									${safe(p.diagnosis)}
								</div>

								<div class="prescription-detail-block wide">
									<strong>Medicines</strong>
									${formatMultiline(p.medicines)}
								</div>

								<div class="prescription-detail-block wide">
									<strong>Advice</strong>
									${formatMultiline(p.advice)}
								</div>

							</div>

						</div>

						<div class="prescription-actions">

							<span class="badge bg-info text-dark">
								Prescription
							</span>

							<button type="button"
									class="btn btn-sm btn-warning"
									onclick="editPrescription(${safeNumber(p.id)})">

								<i class="bi bi-pencil-square me-1"></i>
								Edit
							</button>

							<button type="button"
									class="btn btn-sm btn-medi"
									style="width:auto;"
									onclick="downloadPrescriptionPdf(${safeNumber(p.id)})">

								<i class="bi bi-file-earmark-pdf-fill me-1"></i>
								PDF Download
							</button>

						</div>

					</div>

				</article>
			`;

		}
	);

	container.innerHTML = html;
}

function showPrescriptionsLoadingState() {
	const container =
		document.getElementById(
			"prescriptionList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="prescriptions-loading-state">

			<div class="prescriptions-loading-icon">
				<i class="bi bi-file-medical-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading prescriptions
			</h5>

			<p class="text-muted mb-0">
				Please wait while we prepare prescription records.
			</p>

		</div>
	`;
}

function showPrescriptionsErrorState(message) {
	const container =
		document.getElementById(
			"prescriptionList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="prescriptions-error-state">

			<div class="prescriptions-error-icon">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load prescriptions
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}

function updatePrescriptionSummary() {
	const list =
		Array.isArray(prescriptions)
			? prescriptions
			: [];

	const today =
		new Date();

	const todayKey =
		[
			today.getFullYear(),
			String(today.getMonth() + 1).padStart(2, "0"),
			String(today.getDate()).padStart(2, "0")
		].join("-");

	setSummaryValue(
		"totalPrescriptionCount",
		list.length
	);

	setSummaryValue(
		"prescriptionPatientCount",
		Array.isArray(prescriptionPatients)
			? prescriptionPatients.length
			: 0
	);

	setSummaryValue(
		"todayPrescriptionCount",
		list.filter(function(item) {

			if (!item.prescriptionDate) {
				return false;
			}

			const date =
				new Date(item.prescriptionDate);

			if (Number.isNaN(date.getTime())) {
				return false;
			}

			const dateKey =
				[
					date.getFullYear(),
					String(date.getMonth() + 1).padStart(2, "0"),
					String(date.getDate()).padStart(2, "0")
				].join("-");

			return dateKey === todayKey;

		}).length
	);

	setSummaryValue(
		"medicinePrescriptionCount",
		list.filter(
			item =>
				item.medicines &&
				String(item.medicines).trim()
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
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

async function downloadPrescriptionPdf(prescriptionId) {
	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/prescriptions/${prescriptionId}/download`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			let errorMessage =
				"Unable to download prescription PDF";

			const result =
				await readJsonSafely(response);

			if (result && result.message) {
				errorMessage =
					result.message;
			}

			showPrescriptionMsg(
				errorMessage
			);

			return;
		}

		const blob =
			await response.blob();

		const url =
			window.URL.createObjectURL(blob);

		const anchor =
			document.createElement("a");

		anchor.href = url;
		anchor.download =
			`prescription-${prescriptionId}.pdf`;

		document.body.appendChild(anchor);
		anchor.click();

		anchor.remove();
		window.URL.revokeObjectURL(url);

	} catch (e) {
		console.error(
			"Prescription PDF download error:",
			e
		);

		showPrescriptionMsg(
			"Doctor service not reachable."
		);
	}
}

function clearPrescriptionForm() {
	[
		"patientId",
		"symptoms",
		"diagnosis",
		"medicines",
		"advice"
	].forEach(
		function(id) {

			const element =
				document.getElementById(id);

			if (element) {
				element.value = "";
			}

		}
	);
}

function setInputValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value = value;
	}
}

function setSavePrescriptionButtonLabel(label) {
	const button =
		document.getElementById(
			"savePrescriptionBtn"
		);

	if (!button) {
		return;
	}

	button.innerHTML = `
		<i class="bi bi-check2-circle me-1"></i>
		${escapeHtml(label)}
	`;
}

function getVal(id) {
	const element =
		document.getElementById(id);

	return element
		? element.value.trim()
		: "";
}

function showPrescriptionMsg(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	setTimeout(function() {
		if (msg) {
			msg.innerHTML = "";
		}
	}, 5000);
}

function formatDateTime(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		}
	);
}

function formatMultiline(value) {
	if (
		value === null ||
		value === undefined ||
		value === ""
	) {
		return "-";
	}

	return escapeHtml(value)
		.replace(/\n/g, "<br>");
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
		button.dataset.originalText =
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
			button.dataset.originalText ||
			button.innerHTML;

		button.disabled = false;
	}
}

async function readJsonSafely(response) {
	try {
		return await response.json();
	} catch (error) {
		return null;
	}
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

function safeNumber(value) {
	const numberValue =
		Number(value);

	return Number.isFinite(numberValue)
		? numberValue
		: 0;
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}