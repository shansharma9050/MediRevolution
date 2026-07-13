let doctorPatients = [];
let registeredPatients = [];

document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadRegisteredPatients();
	loadPatients();
});

function requireDoctorRole() {
	if (localStorage.getItem("role") !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

function openCreateForm() {
	clearPatientForm();

	const panel = document.getElementById("patientFormPanel");
	if (panel) {
		panel.style.display = "block";
		panel.scrollIntoView({ behavior: "smooth", block: "center" });
	}

	document.getElementById("formTitle").innerText = "Add New Patient";
	setSaveButtonLabel("Save Patient");
	document.getElementById("cancelEditBtn").style.display = "none";

	enableRegisteredPatientSelect();

	setTimeout(() => {
		if (window.jQuery && $.fn.select2 && $("#registeredPatientSelect").length) {
			$("#registeredPatientSelect").select2("open");
		}
	}, 200);
}

async function loadRegisteredPatients() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/auth/registered-patients`, {
			method: "GET",
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await readJsonSafely(response);

		if (!response.ok) {
			registeredPatients = [];
			renderRegisteredPatientSelect();
			updatePatientSummary();
			showDoctorMsg(getErrorMessage(result, "Unable to load registered patients"));
			return;
		}

		registeredPatients = Array.isArray(result) ? result : [];
		renderRegisteredPatientSelect();
		updatePatientSummary();

	} catch (e) {
		console.error(e);
		registeredPatients = [];
		renderRegisteredPatientSelect();
		updatePatientSummary();
		showDoctorMsg("Unable to load registered patient list.");
	}
}

function renderRegisteredPatientSelect() {
	const select = document.getElementById("registeredPatientSelect");
	if (!select) return;

	let html = `<option value="">Select registered patient</option>`;

	registeredPatients.forEach(patient => {
		html += `
			<option value="${safeAttribute(patient.userId)}">
				${safe(patient.fullName)} - ${safe(patient.email)} - ${safe(patient.mobile)}
			</option>
		`;
	});

	select.innerHTML = html;

	if (window.jQuery && $.fn.select2) {
		if ($("#registeredPatientSelect").hasClass("select2-hidden-accessible")) {
			$("#registeredPatientSelect").select2("destroy");
		}

		$("#registeredPatientSelect").select2({
			placeholder: "Search patient by name, email or mobile",
			allowClear: true,
			width: "100%"
		});

		$("#registeredPatientSelect")
			.off("change")
			.on("change", selectRegisteredPatient);
	}
}

function selectRegisteredPatient() {
	const selectedUserId = document.getElementById("registeredPatientSelect")?.value || "";

	if (!selectedUserId) {
		setInputValue("patientAuthUserId", "");
		setInputValue("patientName", "");
		setInputValue("email", "");
		setInputValue("mobile", "");
		return;
	}

	const selectedPatient = registeredPatients.find(
		patient => Number(patient.userId) === Number(selectedUserId)
	);

	if (!selectedPatient) {
		showDoctorMsg("Selected patient not found");
		return;
	}

	setInputValue("patientAuthUserId", selectedPatient.userId || "");
	setInputValue("patientName", selectedPatient.fullName || "");
	setInputValue("email", selectedPatient.email || "");
	setInputValue("mobile", selectedPatient.mobile || "");
}

function enableRegisteredPatientSelect() {
	if (window.jQuery && $("#registeredPatientSelect").length) {
		$("#registeredPatientSelect").prop("disabled", false).val("").trigger("change");
	}
}

function disableRegisteredPatientSelect() {
	if (window.jQuery && $("#registeredPatientSelect").length) {
		$("#registeredPatientSelect").prop("disabled", true);
	}
}

async function loadPatients() {
	const token = localStorage.getItem("token");
	showPatientsLoadingState();

	try {
		const response = await fetch(`${API_BASE}/doctor/patients`, {
			method: "GET",
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await readJsonSafely(response);

		if (!response.ok) {
			doctorPatients = [];
			updatePatientSummary();
			showPatientsErrorState(getErrorMessage(result, "Unable to load patients"));
			showDoctorMsg(getErrorMessage(result, "Unable to load patients"));
			return;
		}

		doctorPatients = Array.isArray(result) ? result : [];
		renderPatients(doctorPatients);
		updatePatientSummary();

	} catch (e) {
		console.error(e);
		doctorPatients = [];
		updatePatientSummary();
		showPatientsErrorState("Doctor service not reachable.");
		showDoctorMsg("Doctor service not reachable.");
	}
}

async function savePatient() {
	const patientId = getVal("patientId");

	if (patientId) {
		await updatePatient(patientId);
	} else {
		await createPatient();
	}
}

async function createPatient() {
	const payload = buildPatientPayload();
	if (!validatePatient(payload)) return;

	const token = localStorage.getItem("token");
	setButtonLoading("saveBtn", "Saving...", true);

	try {
		const response = await fetch(`${API_BASE}/doctor/patients`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await readJsonSafely(response);

		if (!response.ok) {
			showDoctorMsg(getErrorMessage(result, "Unable to create patient"));
			return;
		}

		showDoctorMsg("Patient added successfully", "success");
		clearPatientForm();
		document.getElementById("patientFormPanel").style.display = "none";
		loadPatients();

	} catch (e) {
		console.error(e);
		showDoctorMsg("Doctor service not reachable.");
	} finally {
		setButtonLoading("saveBtn", "Save Patient", false);
	}
}

function editPatient(patientId) {
	const patient = doctorPatients.find(p => Number(p.id) === Number(patientId));

	if (!patient) {
		showDoctorMsg("Patient not found");
		return;
	}

	setInputValue("patientId", patient.id || "");
	setInputValue("patientAuthUserId", patient.patientAuthUserId || "");
	setInputValue("patientName", patient.patientName || "");

	if (window.jQuery && $("#registeredPatientSelect").length) {
		$("#registeredPatientSelect")
			.val(String(patient.patientAuthUserId || ""))
			.trigger("change");
		disableRegisteredPatientSelect();
	}

	setInputValue("mobile", patient.mobile || "");
	setInputValue("email", patient.email || "");
	setInputValue("gender", patient.gender || "");
	setInputValue("dateOfBirth", patient.dateOfBirth || "");
	setInputValue("bloodGroup", patient.bloodGroup || "");
	setInputValue("address", patient.address || "");
	setInputValue("medicalHistory", patient.medicalHistory || "");

	const panel = document.getElementById("patientFormPanel");
	panel.style.display = "block";
	document.getElementById("formTitle").innerText = "Edit Patient";
	setSaveButtonLabel("Update Patient");
	document.getElementById("cancelEditBtn").style.display = "inline-block";

	panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function updatePatient(patientId) {
	const payload = buildPatientPayload();
	if (!validatePatient(payload)) return;

	const token = localStorage.getItem("token");
	setButtonLoading("saveBtn", "Updating...", true);

	try {
		const response = await fetch(`${API_BASE}/doctor/patients/${patientId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await readJsonSafely(response);

		if (!response.ok) {
			showDoctorMsg(getErrorMessage(result, "Unable to update patient"));
			return;
		}

		showDoctorMsg("Patient updated successfully", "success");
		clearPatientForm();
		document.getElementById("patientFormPanel").style.display = "none";
		loadPatients();

	} catch (e) {
		console.error(e);
		showDoctorMsg("Doctor service not reachable.");
	} finally {
		setButtonLoading("saveBtn", "Update Patient", false);
	}
}

async function deletePatient(patientId) {
	if (!confirm("Are you sure you want to delete this patient?")) return;

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients/${patientId}`, {
			method: "DELETE",
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await readJsonSafely(response);

		if (!response.ok) {
			showDoctorMsg(getErrorMessage(result, "Unable to delete patient"));
			return;
		}

		showDoctorMsg("Patient deleted successfully", "success");
		loadPatients();

	} catch (e) {
		console.error(e);
		showDoctorMsg("Doctor service not reachable.");
	}
}

function renderPatients(patients) {
	const table = document.getElementById("patientTable");
	if (!table) return;

	const list = Array.isArray(patients) ? patients : [];

	if (!list.length) {
		table.innerHTML = `
			<tr>
				<td colspan="8">
					<div class="doctor-patients-state">
						<div class="doctor-patients-state-icon">
							<i class="bi bi-person-x-fill"></i>
						</div>
						<h5 class="fw-bold text-primary">No patients found</h5>
						<p class="text-muted mb-0">
							Add a registered patient to begin maintaining clinical records.
						</p>
					</div>
				</td>
			</tr>
		`;
		return;
	}

	table.innerHTML = list.map((p, index) => `
		<tr style="--row-delay:${Math.min(index * 55, 330)}ms">
			<td><strong>${index + 1}</strong></td>
			<td>
				<div class="doctor-patient-profile">
					<div class="doctor-patient-avatar">
						<i class="bi bi-person-fill"></i>
					</div>
					<div>
						<strong class="text-primary">${safe(p.patientName)}</strong>
						<div class="text-muted small">${safe(p.email)}</div>
					</div>
				</div>
			</td>
			<td><i class="bi bi-telephone-fill text-primary me-1"></i>${safe(p.mobile)}</td>
			<td>
				<span class="doctor-patient-gender-pill">
					<i class="bi bi-gender-ambiguous"></i>${safe(p.gender)}
				</span>
			</td>
			<td>${formatDate(p.dateOfBirth)}</td>
			<td>
				<span class="doctor-patient-blood-pill">
					<i class="bi bi-droplet-fill"></i>${safe(p.bloodGroup)}
				</span>
			</td>
			<td>
				<div class="doctor-patient-history" title="${safeAttribute(p.medicalHistory)}">
					${safe(p.medicalHistory)}
				</div>
			</td>
			<td>
				<div class="doctor-patient-action-group">
					<button type="button" class="btn btn-sm btn-warning"
							onclick="editPatient(${safeNumber(p.id)})">
						<i class="bi bi-pencil-square me-1"></i>Edit
					</button>
					<button type="button" class="btn btn-sm btn-danger"
							onclick="deletePatient(${safeNumber(p.id)})">
						<i class="bi bi-trash-fill me-1"></i>Delete
					</button>
				</div>
			</td>
		</tr>
	`).join("");
}

function showPatientsLoadingState() {
	const table = document.getElementById("patientTable");
	if (!table) return;

	table.innerHTML = `
		<tr>
			<td colspan="8">
				<div class="doctor-patients-state">
					<div class="doctor-patients-state-icon doctor-patients-loading-icon">
						<i class="bi bi-people-fill"></i>
					</div>
					<h5 class="fw-bold text-primary">Loading patients</h5>
					<p class="text-muted mb-0">Please wait while we prepare patient records.</p>
				</div>
			</td>
		</tr>
	`;
}

function showPatientsErrorState(message) {
	const table = document.getElementById("patientTable");
	if (!table) return;

	table.innerHTML = `
		<tr>
			<td colspan="8">
				<div class="doctor-patients-state">
					<div class="doctor-patients-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>
					<h5 class="fw-bold text-danger">Unable to load patients</h5>
					<p class="text-muted mb-0">${escapeHtml(message)}</p>
				</div>
			</td>
		</tr>
	`;
}

function filterPatients() {
	const keyword = document.getElementById("searchBox")?.value.trim().toLowerCase() || "";

	const filtered = doctorPatients.filter(
		p => JSON.stringify(p).toLowerCase().includes(keyword)
	);

	renderPatients(filtered);
}

function updatePatientSummary() {
	const list = Array.isArray(doctorPatients) ? doctorPatients : [];

	setSummaryValue("totalDoctorPatientCount", list.length);
	setSummaryValue("registeredPatientCount", Array.isArray(registeredPatients) ? registeredPatients.length : 0);
	setSummaryValue("bloodGroupPatientCount", list.filter(p => p.bloodGroup && String(p.bloodGroup).trim()).length);
	setSummaryValue("historyPatientCount", list.filter(p => p.medicalHistory && String(p.medicalHistory).trim()).length);
}

function setSummaryValue(id, value) {
	const element = document.getElementById(id);
	if (!element) return;

	const target = Number(value) || 0;
	const start = Number(element.textContent) || 0;
	const difference = target - start;

	if (
		difference === 0 ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		element.textContent = target;
		return;
	}

	const duration = 500;
	const startTime = performance.now();

	function update(currentTime) {
		const progress = Math.min((currentTime - startTime) / duration, 1);
		const eased = 1 - Math.pow(1 - progress, 3);
		element.textContent = Math.round(start + difference * eased);

		if (progress < 1) requestAnimationFrame(update);
	}

	requestAnimationFrame(update);
}

function buildPatientPayload() {
	return {
		patientAuthUserId: getVal("patientAuthUserId"),
		patientName: getVal("patientName"),
		mobile: getVal("mobile"),
		email: getVal("email"),
		gender: getVal("gender"),
		dateOfBirth: getVal("dateOfBirth"),
		bloodGroup: getVal("bloodGroup"),
		address: getVal("address"),
		medicalHistory: getVal("medicalHistory")
	};
}

function validatePatient(payload) {
	if (!payload.patientAuthUserId) {
		showDoctorMsg("Please select registered patient");

		if (window.jQuery && $.fn.select2 && $("#registeredPatientSelect").length) {
			$("#registeredPatientSelect").select2("open");
		}
		return false;
	}

	if (!payload.patientName) {
		showDoctorMsg("Patient name is required");
		return false;
	}

	if (!payload.mobile) {
		showDoctorMsg("Mobile number is required");
		return false;
	}

	if (String(payload.mobile).length < 10) {
		showDoctorMsg("Please enter valid mobile number");
		return false;
	}

	return true;
}

function clearPatientForm() {
	[
		"patientId", "patientAuthUserId", "patientName", "mobile", "email",
		"gender", "dateOfBirth", "bloodGroup", "address", "medicalHistory"
	].forEach(id => setInputValue(id, ""));

	if (window.jQuery && $("#registeredPatientSelect").length) {
		$("#registeredPatientSelect").prop("disabled", false).val("").trigger("change");
	}

	document.getElementById("formTitle").innerText = "Add New Patient";
	setSaveButtonLabel("Save Patient");
	document.getElementById("cancelEditBtn").style.display = "none";
}

function cancelEdit() {
	clearPatientForm();
	document.getElementById("patientFormPanel").style.display = "none";
}

function setInputValue(id, value) {
	const element = document.getElementById(id);
	if (element) element.value = value;
}

function setSaveButtonLabel(label) {
	const button = document.getElementById("saveBtn");
	if (!button) return;

	button.innerHTML = `
		<i class="bi bi-check2-circle me-1"></i>
		${escapeHtml(label)}
	`;
}

function getVal(id) {
	const element = document.getElementById(id);
	return element ? element.value.trim() : "";
}

function showDoctorMsg(message, type = "danger") {
	const msg = document.getElementById("msg");
	if (!msg) return;

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show">
			${escapeHtml(message)}
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
		</div>
	`;
}

function formatDate(value) {
	if (!value) return "-";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return safe(value);

	return date.toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	});
}

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button = document.getElementById(buttonId);
	if (!button) return;

	if (isLoading) {
		button.dataset.originalText = button.innerHTML;
		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
			${escapeHtml(loadingText)}
		`;
		button.disabled = true;
	} else {
		button.innerHTML = button.dataset.originalText || button.innerHTML;
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

function getErrorMessage(data, fallback) {
	if (!data) return fallback;
	if (data.message) return data.message;
	if (data.error) return data.error;
	if (typeof data === "string") return data;
	return fallback;
}

function safe(value) {
	return value === null || value === undefined || value === ""
		? "-"
		: escapeHtml(value);
}

function safeAttribute(value) {
	return escapeHtml(value).replace(/`/g, "&#96;");
}

function safeNumber(value) {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : 0;
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}