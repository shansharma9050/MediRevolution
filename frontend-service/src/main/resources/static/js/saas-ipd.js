let cachedWards = [];
let cachedAvailableBeds = [];
let cachedAdmissions = [];

let wardModal;
let bedModal;
let admissionModal;
let chargeModal;
let noteModal;
let dischargeModal;

let ipdPermissions = {
	create: false,
	update: false,
	delete: false,
	print: false
};

let isLoadingAdmissions = false;
let isSavingWard = false;
let isSavingBed = false;
let isAdmittingPatient = false;
let isSavingCharge = false;
let isSavingNote = false;
let isDischarging = false;

document.addEventListener("DOMContentLoaded", async function() {
	const allowed = await protectSaasPage("IPD", "VIEW");
	if (!allowed) return;

	const tenantId = localStorage.getItem("tenantId");
	const tenantName = localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText("tenantNameText", tenantName || "your workspace");

	wardModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("wardModal"));
	bedModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("bedModal"));
	admissionModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("admissionModal"));
	chargeModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("chargeModal"));
	noteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("noteModal"));
	dischargeModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("dischargeModal"));

	await applyIpdButtonPermissions();

	await Promise.all([
		loadPatientsDropdown(),
		loadDoctorsDropdown(),
		loadWards(),
		loadAvailableBeds()
	]);

	await loadAdmissions();
});

async function applyIpdButtonPermissions() {
	const [canCreate, canUpdate, canDelete, canPrint] = await Promise.all([
		hasSaasPermission("IPD", "CREATE"),
		hasSaasPermission("IPD", "UPDATE"),
		hasSaasPermission("IPD", "DELETE"),
		hasSaasPermission("IPD", "PRINT")
	]);

	ipdPermissions = {
		create: Boolean(canCreate),
		update: Boolean(canUpdate),
		delete: Boolean(canDelete),
		print: Boolean(canPrint)
	};

	showOrHideById("addWardBtn", ipdPermissions.create);
	showOrHideById("addBedBtn", ipdPermissions.create);
	showOrHideById("addIpdBtn", ipdPermissions.create);

	showOrHideByClass("edit-ipd-btn", ipdPermissions.update);
	showOrHideByClass("charge-ipd-btn", ipdPermissions.update);
	showOrHideByClass("note-ipd-btn", ipdPermissions.update);
	showOrHideByClass("discharge-ipd-btn", ipdPermissions.update);
	showOrHideByClass("delete-ipd-btn", ipdPermissions.delete);
	showOrHideByClass("print-ipd-btn", ipdPermissions.print);
}

async function loadAdmissions() {
	if (isLoadingAdmissions) return;

	isLoadingAdmissions = true;

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	showAdmissionsLoadingState();
	setButtonLoading("refreshIpdBtn", "Refreshing...", true);

	try {
		const query = new URLSearchParams({ tenantId });

		const response = await fetch(
			`${API_BASE}/saas/ipd/admissions?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			cachedAdmissions = [];
			const message = getApiErrorMessage(result, "Unable to load admissions.");
			showMsg(message);
			showAdmissionsErrorState(message);
			updateIpdSummary();
			return;
		}

		cachedAdmissions = Array.isArray(result) ? result : [];
		cachedAdmissions.sort((a, b) => safeDateTimestamp(b.admissionDateTime) - safeDateTimestamp(a.admissionDateTime));

		renderAdmissions(cachedAdmissions);
		updateIpdSummary();
		applyIpdButtonPermissions();

	} catch (error) {
		console.error("Load admissions error:", error);
		cachedAdmissions = [];
		showMsg("SaaS service not reachable.");
		showAdmissionsErrorState("SaaS IPD service is currently unavailable.");
		updateIpdSummary();
	} finally {
		isLoadingAdmissions = false;
		setButtonLoading("refreshIpdBtn", "Refresh", false);
	}
}

function filterAdmissions() {
	const keyword = getValue("ipdSearchBox").toLowerCase();
	const status = getValue("ipdStatusFilter").toUpperCase();

	const filtered = cachedAdmissions.filter(admission => {
		const searchable = [
			admission.ipdNumber,
			admission.patientName,
			admission.patientMobile,
			admission.doctorName,
			admission.department,
			admission.wardName,
			admission.bedNumber
		].filter(Boolean).join(" ").toLowerCase();

		const keywordMatches = !keyword || searchable.includes(keyword);
		const statusMatches = !status || String(admission.status || "").toUpperCase() === status;

		return keywordMatches && statusMatches;
	});

	renderAdmissions(filtered);
}

function renderAdmissions(admissions) {
	const tbody = document.getElementById("ipdTableBody");
	if (!tbody) return;

	const list = Array.isArray(admissions) ? admissions : [];

	if (!list.length) {
		tbody.innerHTML = `
			<tr>
				<td colspan="8">
					<div class="ipd-state">
						<div class="ipd-state-icon"><i class="bi bi-hospital"></i></div>
						<h5 class="fw-bold text-primary">No admissions found</h5>
						<p class="text-muted mb-0">Admit a patient or change the selected filters.</p>
					</div>
				</td>
			</tr>
		`;
		return;
	}

	tbody.innerHTML = list.map((admission, index) => {
		const admissionId = safeNumber(admission.id);
		const doctorProfileId = safeNumber(admission.doctorProfileId);
		const admitted = String(admission.status || "").toUpperCase() === "ADMITTED";

		return `
			<tr style="--row-delay:${Math.min(index * 55, 330)}ms">
				<td><strong class="text-primary">${safe(admission.ipdNumber)}</strong></td>

				<td>
					<div class="ipd-patient-cell">
						<div class="ipd-person-icon"><i class="bi bi-person-fill"></i></div>
						<div>
							<strong class="text-primary">${safe(admission.patientName)}</strong>
							<div class="text-muted small">${safe(admission.patientMobile)}</div>
						</div>
					</div>
				</td>

				<td>
					<div class="ipd-doctor-cell">
						<div class="ipd-person-icon"><i class="bi bi-person-badge-fill"></i></div>
						<div>
							<strong class="text-primary">${safe(admission.doctorName)}</strong>
							<div class="text-muted small">${safe(admission.department)}</div>
						</div>
					</div>
				</td>

				<td>
					<strong>${safe(admission.wardName)}</strong>
					<div class="text-muted small">Bed: ${safe(admission.bedNumber)}</div>
				</td>

				<td>${formatDateTime(admission.admissionDateTime)}</td>
				<td><strong>₹${formatAmount(admission.totalCharges)}</strong></td>
				<td>${statusBadge(admission.status)}</td>

				<td>
					${admitted ? `
						<div class="ipd-actions">
							<button type="button"
									class="btn btn-sm btn-outline-primary charge-ipd-btn"
									onclick="openChargeModal(${admissionId})">
								<i class="bi bi-plus-circle-fill me-1"></i>Charge
							</button>

							<button type="button"
									class="btn btn-sm btn-outline-secondary note-ipd-btn"
									onclick="openNoteModal(${admissionId}, ${doctorProfileId})">
								<i class="bi bi-journal-medical me-1"></i>Note
							</button>

							<button type="button"
									class="btn btn-sm btn-outline-success discharge-ipd-btn"
									onclick="openDischargeModal(${admissionId})">
								<i class="bi bi-box-arrow-right me-1"></i>Discharge
							</button>
						</div>
					` : "-"}
				</td>
			</tr>
		`;
	}).join("");

	applyIpdButtonPermissions();
}

function statusBadge(status) {
	const value = String(status || "UNKNOWN").toUpperCase();

	if (value === "ADMITTED") {
		return `<span class="ipd-status-pill admitted"><i class="bi bi-person-check-fill"></i>Admitted</span>`;
	}

	if (value === "DISCHARGED") {
		return `<span class="ipd-status-pill discharged"><i class="bi bi-check-circle-fill"></i>Discharged</span>`;
	}

	return `<span class="ipd-status-pill other"><i class="bi bi-info-circle-fill"></i>${escapeHtml(value)}</span>`;
}

function openWardModal() {
	if (!ipdPermissions.create) {
		showMsg("You do not have permission to create wards.");
		return;
	}

	resetFields(["wardName", "wardType", "wardDescription"]);
	wardModal.show();
}

function openBedModal() {
	if (!ipdPermissions.create) {
		showMsg("You do not have permission to create beds.");
		return;
	}

	if (!cachedWards.length) {
		showMsg("Please add a ward before creating a bed.");
		return;
	}

	resetFields(["bedWardId", "bedNumber"]);
	setValue("dailyCharge", "0");
	bedModal.show();
}

async function openAdmissionModal() {
	if (!ipdPermissions.create) {
		showMsg("You do not have permission to admit patients.");
		return;
	}

	await loadAvailableBeds();

	if (!cachedAvailableBeds.length) {
		showMsg("No available beds found. Please add or release a bed first.");
		return;
	}

	resetFields([
		"patientId",
		"doctorProfileId",
		"bedId",
		"reasonForAdmission",
		"provisionalDiagnosis"
	]);

	setValue("advanceAmount", "0");
	admissionModal.show();
}

async function saveWard() {
	if (isSavingWard) return;

	if (!ipdPermissions.create) {
		showMsg("You do not have permission to create wards.");
		return;
	}

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const payload = {
		tenantId: toPositiveNumberOrNull(tenantId),
		wardName: getValue("wardName"),
		wardType: getValue("wardType"),
		description: getValue("wardDescription")
	};

	if (!payload.tenantId) return showMsg("Please select SaaS workspace first.");
	if (!payload.wardName) return showMsg("Ward name is required.");
	if (isDuplicateWard(payload.wardName)) return showMsg("Ward already exists in this workspace.");

	isSavingWard = true;
	setButtonLoading("saveWardBtn", "Saving...", true);

	try {
		const response = await fetch(`${API_BASE}/saas/ipd/wards`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to save ward."));
			return;
		}

		wardModal.hide();
		resetFields(["wardName", "wardType", "wardDescription"]);

		await loadWards();
		await loadAvailableBeds();

		showMsg("Ward saved successfully.", "success");

	} catch (error) {
		console.error("Save ward error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingWard = false;
		setButtonLoading("saveWardBtn", "Save Ward", false);
	}
}

async function saveBed() {
	if (isSavingBed) return;

	if (!ipdPermissions.create) {
		showMsg("You do not have permission to create beds.");
		return;
	}

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const payload = {
		tenantId: toPositiveNumberOrNull(tenantId),
		wardId: toPositiveNumberOrNull(getValue("bedWardId")),
		bedNumber: getValue("bedNumber"),
		dailyCharge: toNonNegativeNumber(getValue("dailyCharge"))
	};

	if (!payload.tenantId) return showMsg("Please select SaaS workspace first.");
	if (!payload.wardId) return showMsg("Please select ward.");
	if (!payload.bedNumber) return showMsg("Bed number is required.");
	if (isDuplicateBed(payload.wardId, payload.bedNumber)) return showMsg("Bed number already exists in this ward.");

	isSavingBed = true;
	setButtonLoading("saveBedBtn", "Saving...", true);

	try {
		const response = await fetch(`${API_BASE}/saas/ipd/beds`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to save bed."));
			return;
		}

		bedModal.hide();
		resetFields(["bedWardId", "bedNumber"]);
		setValue("dailyCharge", "0");

		await loadAvailableBeds();
		showMsg("Bed saved successfully.", "success");

	} catch (error) {
		console.error("Save bed error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingBed = false;
		setButtonLoading("saveBedBtn", "Save Bed", false);
	}
}

async function admitPatient() {
	if (isAdmittingPatient) return;

	if (!ipdPermissions.create) {
		showMsg("You do not have permission to admit patients.");
		return;
	}

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const bedId = getValue("bedId");
	const bedOption = document.querySelector(`#bedId option[value="${cssEscape(bedId)}"]`);
	const wardId = bedOption ? bedOption.dataset.wardId : null;

	const payload = {
		tenantId: toPositiveNumberOrNull(tenantId),
		patientId: toPositiveNumberOrNull(getValue("patientId")),
		doctorProfileId: toPositiveNumberOrNull(getValue("doctorProfileId")),
		wardId: toPositiveNumberOrNull(wardId),
		bedId: toPositiveNumberOrNull(bedId),
		reasonForAdmission: getValue("reasonForAdmission"),
		provisionalDiagnosis: getValue("provisionalDiagnosis"),
		advanceAmount: toNonNegativeNumber(getValue("advanceAmount"))
	};

	if (!payload.tenantId) return showMsg("Please select SaaS workspace first.");
	if (!payload.patientId || !payload.doctorProfileId || !payload.wardId || !payload.bedId) {
		return showMsg("Patient, Doctor and Bed are required.");
	}

	isAdmittingPatient = true;
	setButtonLoading("admitPatientBtn", "Admitting...", true);

	try {
		const response = await fetch(`${API_BASE}/saas/ipd/admissions`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to admit patient."));
			return;
		}

		admissionModal.hide();

		resetFields([
			"patientId",
			"doctorProfileId",
			"bedId",
			"reasonForAdmission",
			"provisionalDiagnosis"
		]);

		setValue("advanceAmount", "0");

		await Promise.all([
			loadAdmissions(),
			loadAvailableBeds()
		]);

		showMsg("Patient admitted successfully.", "success");

	} catch (error) {
		console.error("Admit patient error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isAdmittingPatient = false;
		setButtonLoading("admitPatientBtn", "Admit Patient", false);
	}
}

function openChargeModal(admissionId) {
	if (!ipdPermissions.update) {
		showMsg("You do not have permission to add IPD charges.");
		return;
	}

	if (!isValidId(admissionId)) return showMsg("Invalid admission selected.");

	setValue("chargeAdmissionId", admissionId);
	setValue("chargeType", "BED");
	setValue("chargeDescription", "IPD Charge");
	setValue("chargeAmount", "");
	chargeModal.show();
}

async function submitCharge() {
	if (isSavingCharge) return;

	const payload = {
		tenantId: toPositiveNumberOrNull(localStorage.getItem("tenantId")),
		admissionId: toPositiveNumberOrNull(getValue("chargeAdmissionId")),
		chargeType: getValue("chargeType"),
		description: getValue("chargeDescription"),
		amount: toPositiveNumber(getValue("chargeAmount"))
	};

	const allowedTypes = ["BED", "DOCTOR_VISIT", "NURSING", "MEDICINE", "LAB", "PROCEDURE", "SURGERY", "OTHER"];

	if (!payload.admissionId) return showMsg("Invalid admission selected.");
	if (!allowedTypes.includes(payload.chargeType)) return showMsg("Please select valid charge type.");
	if (!payload.description) return showMsg("Charge description is required.");
	if (!payload.amount) return showMsg("Charge amount must be greater than 0.");

	isSavingCharge = true;
	setButtonLoading("saveChargeBtn", "Saving...", true);

	try {
		const response = await fetch(`${API_BASE}/saas/ipd/charges`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("token"),
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to add charge."));
			return;
		}

		chargeModal.hide();
		showMsg("Charge added successfully.", "success");
		await loadAdmissions();

	} catch (error) {
		console.error("Add charge error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingCharge = false;
		setButtonLoading("saveChargeBtn", "Add Charge", false);
	}
}

function openNoteModal(admissionId, doctorProfileId) {
	if (!ipdPermissions.update) {
		showMsg("You do not have permission to add IPD notes.");
		return;
	}

	if (!isValidId(admissionId)) return showMsg("Invalid admission selected.");

	setValue("noteAdmissionId", admissionId);
	setValue("noteDoctorProfileId", doctorProfileId || "");
	setValue("progressNote", "");
	setValue("treatmentPlan", "");
	setValue("vitals", "");
	noteModal.show();
}

async function submitDailyNote() {
	if (isSavingNote) return;

	const payload = {
		tenantId: toPositiveNumberOrNull(localStorage.getItem("tenantId")),
		admissionId: toPositiveNumberOrNull(getValue("noteAdmissionId")),
		doctorProfileId: toPositiveNumberOrNull(getValue("noteDoctorProfileId")),
		progressNote: getValue("progressNote"),
		treatmentPlan: getValue("treatmentPlan"),
		vitals: getValue("vitals")
	};

	if (!payload.admissionId) return showMsg("Invalid admission selected.");
	if (!payload.progressNote) return showMsg("Progress note is required.");

	isSavingNote = true;
	setButtonLoading("saveNoteBtn", "Saving...", true);

	try {
		const response = await fetch(`${API_BASE}/saas/ipd/daily-notes`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("token"),
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to add note."));
			return;
		}

		noteModal.hide();
		showMsg("Daily note added successfully.", "success");

	} catch (error) {
		console.error("Add note error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingNote = false;
		setButtonLoading("saveNoteBtn", "Save Note", false);
	}
}

function openDischargeModal(admissionId) {
	if (!ipdPermissions.update) {
		showMsg("You do not have permission to discharge patients.");
		return;
	}

	if (!isValidId(admissionId)) return showMsg("Invalid admission selected.");

	setValue("dischargeAdmissionId", admissionId);
	setValue("dischargeSummary", "");
	setValue("dischargeAdvice", "");
	dischargeModal.show();
}

async function submitDischarge() {
	if (isDischarging) return;

	const admissionId = toPositiveNumberOrNull(getValue("dischargeAdmissionId"));
	const payload = {
		tenantId: toPositiveNumberOrNull(localStorage.getItem("tenantId")),
		dischargeSummary: getValue("dischargeSummary"),
		dischargeAdvice: getValue("dischargeAdvice")
	};

	if (!admissionId) return showMsg("Invalid admission selected.");
	if (!payload.dischargeSummary) return showMsg("Discharge summary is required.");

	isDischarging = true;
	setButtonLoading("confirmDischargeBtn", "Discharging...", true);

	try {
		const response = await fetch(
			`${API_BASE}/saas/ipd/admissions/${encodeURIComponent(admissionId)}/discharge`,
			{
				method: "PUT",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Content-Type": "application/json",
					"Accept": "application/json"
				},
				body: JSON.stringify(payload)
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to discharge patient."));
			return;
		}

		dischargeModal.hide();
		showMsg("Patient discharged successfully.", "success");

		await Promise.all([
			loadAdmissions(),
			loadAvailableBeds()
		]);

	} catch (error) {
		console.error("Discharge error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isDischarging = false;
		setButtonLoading("confirmDischargeBtn", "Discharge Patient", false);
	}
}

async function loadPatientsDropdown() {
	const select = document.getElementById("patientId");
	if (!select) return;

	select.innerHTML = `<option value="">Loading patients...</option>`;

	try {
		const query = new URLSearchParams({ tenantId: localStorage.getItem("tenantId") });

		const response = await fetch(
			`${API_BASE}/saas/patients?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);
		select.innerHTML = `<option value="">Select Patient</option>`;

		if (!response.ok || !Array.isArray(result)) return;

		result.forEach(patient => {
			if (!patient.id) return;

			const option = document.createElement("option");
			option.value = String(patient.id);
			option.textContent = `${patient.patientName || "Patient"}${patient.mobile ? ` (${patient.mobile})` : ""}`;
			select.appendChild(option);
		});

	} catch (error) {
		console.error("Patient dropdown error:", error);
		select.innerHTML = `<option value="">Service unavailable</option>`;
	}
}

async function loadDoctorsDropdown() {
	const select = document.getElementById("doctorProfileId");
	if (!select) return;

	select.innerHTML = `<option value="">Loading doctors...</option>`;

	try {
		const query = new URLSearchParams({ tenantId: localStorage.getItem("tenantId") });

		const response = await fetch(
			`${API_BASE}/saas/staff/doctors/for-clinical?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			select.innerHTML = `<option value="">Unable to load doctors</option>`;
			return;
		}

		select.innerHTML = `<option value="">Select Doctor</option>`;

		if (!Array.isArray(result) || !result.length) {
			select.innerHTML = `<option value="">No doctors found</option>`;
			return;
		}

		result.forEach(staff => {
			if (!staff.id) return;

			const option = document.createElement("option");
			option.value = String(staff.id);
			option.dataset.authUserId = staff.authUserId ? String(staff.authUserId) : "";
			option.dataset.doctorName = staff.staffName || "";
			option.dataset.department = staff.department || "";
			option.dataset.specialization = staff.specialization || "";

			option.textContent =
				(staff.staffName || "Doctor") +
				(staff.department ? ` - ${staff.department}` : "") +
				(staff.specialization ? ` (${staff.specialization})` : "");

			select.appendChild(option);
		});

	} catch (error) {
		console.error("Doctor dropdown load error:", error);
		select.innerHTML = `<option value="">Service not reachable</option>`;
	}
}

async function loadWards() {
	const select = document.getElementById("bedWardId");
	if (!select) return;

	select.innerHTML = `<option value="">Loading wards...</option>`;

	try {
		const query = new URLSearchParams({ tenantId: localStorage.getItem("tenantId") });

		const response = await fetch(
			`${API_BASE}/saas/ipd/wards?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);
		cachedWards = response.ok && Array.isArray(result) ? result : [];

		select.innerHTML = `<option value="">Select Ward</option>`;

		cachedWards.forEach(ward => {
			if (!ward.id) return;

			const option = document.createElement("option");
			option.value = String(ward.id);
			option.textContent = `${ward.wardName || "Ward"} - ${ward.wardType || "General"}`;
			select.appendChild(option);
		});

	} catch (error) {
		console.error("Load wards error:", error);
		cachedWards = [];
		select.innerHTML = `<option value="">Service unavailable</option>`;
	}
}

async function loadAvailableBeds() {
	const select = document.getElementById("bedId");
	if (!select) return;

	select.innerHTML = `<option value="">Loading beds...</option>`;

	try {
		const query = new URLSearchParams({ tenantId: localStorage.getItem("tenantId") });

		const response = await fetch(
			`${API_BASE}/saas/ipd/beds/available?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);
		cachedAvailableBeds = response.ok && Array.isArray(result) ? result : [];

		select.innerHTML = `<option value="">Select Bed</option>`;

		cachedAvailableBeds.forEach(bed => {
			if (!bed.id) return;

			const option = document.createElement("option");
			option.value = String(bed.id);
			option.dataset.wardId = bed.wardId ? String(bed.wardId) : "";
			option.textContent = `${bed.wardName || "Ward"} / ${bed.bedNumber || "Bed"} - ₹${formatAmount(bed.dailyCharge)}`;
			select.appendChild(option);
		});

		setAnimatedNumber("availableBedCount", cachedAvailableBeds.length);

	} catch (error) {
		console.error("Load available beds error:", error);
		cachedAvailableBeds = [];
		select.innerHTML = `<option value="">Service unavailable</option>`;
		setAnimatedNumber("availableBedCount", 0);
	}
}

function updateIpdSummary() {
	setAnimatedNumber("totalAdmissionCount", cachedAdmissions.length);

	setAnimatedNumber(
		"activeAdmissionCount",
		cachedAdmissions.filter(a => String(a.status || "").toUpperCase() === "ADMITTED").length
	);

	const totalCharges = cachedAdmissions.reduce(
		(sum, admission) => sum + toNonNegativeNumber(admission.totalCharges),
		0
	);

	setText("totalChargesAmount", formatShortMoney(totalCharges));
}

function isDuplicateWard(wardName) {
	const normalized = normalizeText(wardName);
	return cachedWards.some(ward => normalizeText(ward.wardName) === normalized);
}

function isDuplicateBed(wardId, bedNumber) {
	const normalizedBed = normalizeText(bedNumber);
	const numericWardId = Number(wardId);

	return cachedAvailableBeds.some(bed =>
		Number(bed.wardId) === numericWardId &&
		normalizeText(bed.bedNumber) === normalizedBed
	);
}

function normalizeText(value) {
	return String(value || "").trim().toLowerCase();
}

function showAdmissionsLoadingState() {
	const tbody = document.getElementById("ipdTableBody");
	if (!tbody) return;

	tbody.innerHTML = `
		<tr>
			<td colspan="8">
				<div class="ipd-state">
					<div class="ipd-state-icon ipd-loading"><i class="bi bi-hospital-fill"></i></div>
					<h5 class="fw-bold text-primary">Loading admissions</h5>
					<p class="text-muted mb-0">Please wait while we prepare IPD records.</p>
				</div>
			</td>
		</tr>
	`;
}

function showAdmissionsErrorState(message) {
	const tbody = document.getElementById("ipdTableBody");
	if (!tbody) return;

	tbody.innerHTML = `
		<tr>
			<td colspan="8">
				<div class="ipd-state">
					<div class="ipd-state-icon bg-danger"><i class="bi bi-exclamation-triangle-fill"></i></div>
					<h5 class="fw-bold text-danger">Unable to load admissions</h5>
					<p class="text-muted mb-0">${escapeHtml(message)}</p>
				</div>
			</td>
		</tr>
	`;
}

function getValue(id) {
	const element = document.getElementById(id);
	return element ? String(element.value || "").trim() : "";
}

function setValue(id, value) {
	const element = document.getElementById(id);
	if (element) element.value = value == null ? "" : String(value);
}

function setText(id, value) {
	const element = document.getElementById(id);
	if (element) element.innerText = value ?? "";
}

function resetFields(ids) {
	ids.forEach(id => setValue(id, ""));
}

async function safeJson(response) {
	try {
		const text = await response.text();
		if (!text.trim()) return {};

		try {
			return JSON.parse(text);
		} catch {
			return { rawBody: text };
		}
	} catch {
		return {};
	}
}

function getApiErrorMessage(data, fallback) {
	if (!data) return fallback;
	if (data.message) return data.message;
	if (data.error) return data.error;
	if (data.rawBody) return data.rawBody;
	if (typeof data === "string") return data;
	return fallback;
}

function showMsg(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show" role="alert">
			${escapeHtml(message)}
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
		</div>
	`;

	setTimeout(() => {
		if (msg) msg.innerHTML = "";
	}, 5000);
}

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button = document.getElementById(buttonId);
	if (!button) return;

	if (isLoading) {
		button.dataset.originalHtml = button.innerHTML;
		button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${escapeHtml(loadingText)}`;
		button.disabled = true;
	} else {
		button.innerHTML = button.dataset.originalHtml || button.innerHTML;
		button.disabled = false;
	}
}

function setAnimatedNumber(id, value) {
	const element = document.getElementById(id);
	if (!element) return;

	const target = Number(value) || 0;
	const start = Number(element.textContent) || 0;
	const difference = target - start;
	const duration = 500;
	const startTime = performance.now();

	if (!difference || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		element.textContent = target;
		return;
	}

	function update(now) {
		const progress = Math.min((now - startTime) / duration, 1);
		const eased = 1 - Math.pow(1 - progress, 3);
		element.textContent = Math.round(start + difference * eased);
		if (progress < 1) requestAnimationFrame(update);
	}

	requestAnimationFrame(update);
}

function toPositiveNumberOrNull(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : null;
}

function toPositiveNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : 0;
}

function toNonNegativeNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) && number >= 0 ? number : 0;
}

function isValidId(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0;
}

function formatDateTime(value) {
	if (!value) return "-";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return safe(value);

	return date.toLocaleString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}

function safeDateTimestamp(value) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatAmount(value) {
	const number = Number(value);

	if (!Number.isFinite(number)) return "0.00";

	return number.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

function formatShortMoney(value) {
	const amount = toNonNegativeNumber(value);

	if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
	if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
	if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;

	return `₹${amount.toFixed(0)}`;
}

function cssEscape(value) {
	if (window.CSS && typeof window.CSS.escape === "function") {
		return window.CSS.escape(String(value ?? ""));
	}

	return String(value ?? "").replace(/["\\]/g, "\\$&");
}

function safeNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
}

function safe(value) {
	return value === null || value === undefined || value === ""
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