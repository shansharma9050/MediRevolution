let hospitalPatients = [];
let editingPatientId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	setPatientDateLimits();
	loadHospitalPatients();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function setPatientDateLimits() {
	const today = new Date();

	const dateValue = [
		today.getFullYear(),
		String(today.getMonth() + 1).padStart(2, "0"),
		String(today.getDate()).padStart(2, "0")
	].join("-");

	const admissionDate =
		document.getElementById("admissionDate");

	const dischargeDate =
		document.getElementById("dischargeDate");

	if (admissionDate) {
		admissionDate.max = dateValue;
	}

	if (dischargeDate) {
		dischargeDate.max = dateValue;
	}
}

function togglePatientForm() {
	const panel =
		document.getElementById(
			"patientFormPanel"
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

function openCreatePatientForm() {
	clearForm();

	const title =
		document.getElementById(
			"patientFormTitle"
		);

	if (title) {
		title.innerText =
			"Add OPD/IPD Patient";
	}

	setSavePatientButtonLabel(
		"Save Patient"
	);

	const panel =
		document.getElementById(
			"patientFormPanel"
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

function closePatientForm() {
	clearForm();

	const panel =
		document.getElementById(
			"patientFormPanel"
		);

	if (panel) {
		panel.style.display = "none";
	}
}

async function loadHospitalPatients() {
	const token =
		localStorage.getItem("token");

	showPatientsLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/patients`,
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
			hospitalPatients = [];

			updateHospitalPatientSummary();

			showPatientsErrorState(
				getErrorMessage(
					result,
					"Unable to load patients"
				)
			);

			showMsg(
				getErrorMessage(
					result,
					"Unable to load patients"
				)
			);

			return;
		}

		hospitalPatients =
			Array.isArray(result)
				? result
				: [];

		renderPatients(
			hospitalPatients
		);

		updateHospitalPatientSummary();

	} catch (e) {
		console.error(
			"Load hospital patients error:",
			e
		);

		hospitalPatients = [];

		updateHospitalPatientSummary();

		showPatientsErrorState(
			"Hospital service not reachable."
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

async function createHospitalPatient() {
	const payload = {
		patientName:
			getVal("patientName"),

		mobile:
			getVal("mobile"),

		gender:
			getVal("gender"),

		age:
			toInt(
				getVal("age")
			),

		patientType:
			getVal("patientType"),

		department:
			getVal("department"),

		doctorName:
			getVal("doctorName"),

		admissionDate:
			getVal("admissionDate"),

		dischargeDate:
			getVal("dischargeDate") ||
			null,

		diagnosis:
			getVal("diagnosis")
	};

	if (
		!payload.patientName ||
		!payload.mobile ||
		!payload.patientType
	) {
		showMsg(
			"Patient name, mobile and patient type are required"
		);

		return;
	}

	if (
		payload.mobile &&
		String(payload.mobile).length < 10
	) {
		showMsg(
			"Please enter valid mobile number"
		);

		return;
	}

	if (
		payload.admissionDate &&
		payload.dischargeDate &&
		new Date(payload.dischargeDate) <
		new Date(payload.admissionDate)
	) {
		showMsg(
			"Discharge date cannot be before admission date"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const url =
		editingPatientId
			? `${API_BASE}/hospital/patients/${editingPatientId}`
			: `${API_BASE}/hospital/patients`;

	const method =
		editingPatientId
			? "PUT"
			: "POST";

	setButtonLoading(
		"saveHospitalPatientBtn",
		editingPatientId
			? "Updating Patient..."
			: "Saving Patient...",
		true
	);

	try {
		const response =
			await fetch(
				url,
				{
					method: method,

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
			showMsg(
				getErrorMessage(
					result,
					"Unable to save patient"
				)
			);

			return;
		}

		showMsg(
			editingPatientId
				? "Patient updated successfully"
				: "Patient saved successfully",
			"success"
		);

		clearForm();

		const panel =
			document.getElementById(
				"patientFormPanel"
			);

		if (panel) {
			panel.style.display = "none";
		}

		loadHospitalPatients();

	} catch (e) {
		console.error(
			"Save hospital patient error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);

	} finally {
		setButtonLoading(
			"saveHospitalPatientBtn",
			editingPatientId
				? "Update Patient"
				: "Save Patient",
			false
		);
	}
}

function filterPatients() {
	const type =
		document
			.getElementById("typeFilter")
			?.value || "";

	const keyword =
		document
			.getElementById("searchBox")
			?.value
			.trim()
			.toLowerCase() || "";

	const filtered =
		hospitalPatients.filter(
			function(patient) {

				const typeMatch =
					!type ||
					patient.patientType === type;

				const textMatch =
					!keyword ||
					JSON.stringify(patient)
						.toLowerCase()
						.includes(keyword);

				return typeMatch && textMatch;

			}
		);

	renderPatients(filtered);
}

function renderPatients(patients) {
	const table =
		document.getElementById(
			"patientTable"
		);

	if (!table) {
		return;
	}

	const list =
		Array.isArray(patients)
			? patients
			: [];

	if (!list.length) {
		table.innerHTML = `
			<tr>
				<td colspan="9">

					<div class="hospital-patients-state">

						<div class="hospital-patients-state-icon">
							<i class="bi bi-person-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No patients found
						</h5>

						<p class="text-muted mb-0">
							Add the first OPD or IPD patient to begin hospital patient management.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(patient, index) {

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<div class="hospital-patient-profile">

							<div class="hospital-patient-avatar">
								<i class="bi bi-person-fill"></i>
							</div>

							<div>
								<strong class="text-primary">
									${safe(patient.patientName)}
								</strong>

								<div class="text-muted small">
									${safe(patient.mobile)} |
									${safe(patient.gender)} |
									Age: ${safe(patient.age)}
								</div>
							</div>

						</div>
					</td>

					<td>
						${patientTypeBadge(patient.patientType)}
					</td>

					<td>
						<i class="bi bi-building-fill text-primary me-1"></i>
						${safe(patient.department)}
					</td>

					<td>
						<i class="bi bi-person-badge-fill text-primary me-1"></i>
						${safe(patient.doctorName)}
					</td>

					<td>
						${formatDate(patient.admissionDate)}
					</td>

					<td>
						${formatDate(patient.dischargeDate)}
					</td>

					<td>
						<div class="hospital-patient-diagnosis"
							 title="${safeAttribute(patient.diagnosis)}">

							${safe(patient.diagnosis)}
						</div>
					</td>

					<td>

						<div class="hospital-patient-actions">

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="editPatient(${safeNumber(patient.id)})">

								<i class="bi bi-pencil-square me-1"></i>
								Edit
							</button>

							<button type="button"
									class="btn btn-sm btn-outline-danger"
									onclick="deletePatient(${safeNumber(patient.id)})">

								<i class="bi bi-trash-fill me-1"></i>
								Delete
							</button>

						</div>

					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function showPatientsLoadingState() {
	const table =
		document.getElementById(
			"patientTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="9">

				<div class="hospital-patients-state">

					<div class="hospital-patients-state-icon hospital-patients-loading-icon">
						<i class="bi bi-people-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading patients
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare hospital patient records.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showPatientsErrorState(message) {
	const table =
		document.getElementById(
			"patientTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="9">

				<div class="hospital-patients-state">

					<div class="hospital-patients-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load patients
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function editPatient(id) {
	const patient =
		hospitalPatients.find(
			item =>
				Number(item.id) ===
				Number(id)
		);

	if (!patient) {
		showMsg(
			"Patient not found"
		);

		return;
	}

	editingPatientId = id;

	setInputValue(
		"patientName",
		patient.patientName || ""
	);

	setInputValue(
		"mobile",
		patient.mobile || ""
	);

	setInputValue(
		"gender",
		patient.gender || ""
	);

	setInputValue(
		"age",
		patient.age ?? ""
	);

	setInputValue(
		"patientType",
		patient.patientType || ""
	);

	setInputValue(
		"department",
		patient.department || ""
	);

	setInputValue(
		"doctorName",
		patient.doctorName || ""
	);

	setInputValue(
		"admissionDate",
		patient.admissionDate || ""
	);

	setInputValue(
		"dischargeDate",
		patient.dischargeDate || ""
	);

	setInputValue(
		"diagnosis",
		patient.diagnosis || ""
	);

	const title =
		document.getElementById(
			"patientFormTitle"
		);

	if (title) {
		title.innerText =
			"Edit Hospital Patient";
	}

	setSavePatientButtonLabel(
		"Update Patient"
	);

	const panel =
		document.getElementById(
			"patientFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		panel.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
}

async function deletePatient(id) {
	if (
		!confirm(
			"Are you sure you want to delete this patient?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/patients/${id}`,
				{
					method: "DELETE",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const resultText =
			await response.text();

		if (!response.ok) {
			showMsg(
				resultText ||
				"Unable to delete patient"
			);

			return;
		}

		showMsg(
			"Patient deleted successfully",
			"success"
		);

		loadHospitalPatients();

	} catch (e) {
		console.error(
			"Delete hospital patient error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

function patientTypeBadge(type) {
	if (type === "OPD") {
		return `
			<span class="hospital-patient-type opd">
				<i class="bi bi-person-walking"></i>
				OPD
			</span>
		`;
	}

	if (type === "IPD") {
		return `
			<span class="hospital-patient-type ipd">
				<i class="bi bi-hospital-fill"></i>
				IPD
			</span>
		`;
	}

	return `
		<span class="badge bg-secondary">
			${safe(type)}
		</span>
	`;
}

function updateHospitalPatientSummary() {
	const list =
		Array.isArray(hospitalPatients)
			? hospitalPatients
			: [];

	const opdCount =
		list.filter(
			patient =>
				patient.patientType === "OPD"
		).length;

	const ipdCount =
		list.filter(
			patient =>
				patient.patientType === "IPD"
		).length;

	const admittedCount =
		list.filter(
			patient =>
				patient.patientType === "IPD" &&
				!patient.dischargeDate
		).length;

	setSummaryValue(
		"totalHospitalPatientCount",
		list.length
	);

	setSummaryValue(
		"opdHospitalPatientCount",
		opdCount
	);

	setSummaryValue(
		"ipdHospitalPatientCount",
		ipdCount
	);

	setSummaryValue(
		"admittedHospitalPatientCount",
		admittedCount
	);
}

function clearForm() {
	editingPatientId = null;

	[
		"patientName",
		"mobile",
		"gender",
		"age",
		"patientType",
		"department",
		"doctorName",
		"admissionDate",
		"dischargeDate",
		"diagnosis"
	].forEach(
		function(id) {
			setInputValue(id, "");
		}
	);

	const title =
		document.getElementById(
			"patientFormTitle"
		);

	if (title) {
		title.innerText =
			"Add OPD/IPD Patient";
	}

	setSavePatientButtonLabel(
		"Save Patient"
	);
}

function setInputValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value = value;
	}
}

function setSavePatientButtonLabel(label) {
	const button =
		document.getElementById(
			"saveHospitalPatientBtn"
		);

	if (!button) {
		return;
	}

	button.innerHTML = `
		<i class="bi bi-check2-circle me-1"></i>
		${escapeHtml(label)}
	`;
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
		button.dataset.originalHtml =
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
			button.dataset.originalHtml ||
			button.innerHTML;

		button.disabled = false;
	}
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

function getVal(id) {
	const element =
		document.getElementById(id);

	return element
		? element.value.trim()
		: "";
}

function toInt(value) {
	const numberValue =
		parseInt(value, 10);

	return Number.isFinite(numberValue)
		? numberValue
		: null;
}

function showMsg(
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
	}, 4000);
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

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