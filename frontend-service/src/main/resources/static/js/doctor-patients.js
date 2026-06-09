let doctorPatients = [];
let registeredPatients = [];

document.addEventListener("DOMContentLoaded", function () {
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

	document.getElementById("patientFormPanel").style.display = "block";
	document.getElementById("formTitle").innerText = "Add New Patient";
	document.getElementById("saveBtn").innerText = "Save Patient";
	document.getElementById("cancelEditBtn").style.display = "none";

	enableRegisteredPatientSelect();

	setTimeout(() => {
		$("#registeredPatientSelect").select2("open");
	}, 200);
}

async function loadRegisteredPatients() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/auth/registered-patients`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await response.json();

		if (!response.ok) {
			showDoctorMsg(result.message || "Unable to load registered patients");
			return;
		}

		registeredPatients = result || [];

		renderRegisteredPatientSelect();

	} catch (e) {
		console.error(e);
		showDoctorMsg("Unable to load registered patient list.");
	}
}

function renderRegisteredPatientSelect() {
	const select = document.getElementById("registeredPatientSelect");

	if (!select) {
		return;
	}

	let html = `<option value="">Select registered patient</option>`;

	registeredPatients.forEach(patient => {
		html += `
			<option value="${patient.userId}">
				${safe(patient.fullName)} - ${safe(patient.email)} - ${safe(patient.mobile)}
			</option>
		`;
	});

	select.innerHTML = html;

	if ($.fn.select2 && $("#registeredPatientSelect").hasClass("select2-hidden-accessible")) {
		$("#registeredPatientSelect").select2("destroy");
	}

	$("#registeredPatientSelect").select2({
		placeholder: "Search patient by name, email or mobile",
		allowClear: true,
		width: "100%"
	});

	$("#registeredPatientSelect").off("change").on("change", function () {
		selectRegisteredPatient();
	});
}

function selectRegisteredPatient() {
	const selectedUserId = document.getElementById("registeredPatientSelect").value;

	if (!selectedUserId) {
		document.getElementById("patientAuthUserId").value = "";
		document.getElementById("patientName").value = "";
		document.getElementById("email").value = "";
		document.getElementById("mobile").value = "";
		return;
	}

	const selectedPatient = registeredPatients.find(patient =>
		Number(patient.userId) === Number(selectedUserId)
	);

	if (!selectedPatient) {
		showDoctorMsg("Selected patient not found");
		return;
	}

	document.getElementById("patientAuthUserId").value = selectedPatient.userId || "";
	document.getElementById("patientName").value = selectedPatient.fullName || "";
	document.getElementById("email").value = selectedPatient.email || "";
	document.getElementById("mobile").value = selectedPatient.mobile || "";
}

function enableRegisteredPatientSelect() {
	if ($("#registeredPatientSelect").length) {
		$("#registeredPatientSelect").prop("disabled", false);
		$("#registeredPatientSelect").val("").trigger("change");
	}
}

function disableRegisteredPatientSelect() {
	if ($("#registeredPatientSelect").length) {
		$("#registeredPatientSelect").prop("disabled", true);
	}
}

async function loadPatients() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await response.json();

		if (!response.ok) {
			showDoctorMsg(result.message || "Unable to load patients");
			return;
		}

		doctorPatients = result || [];
		renderPatients(doctorPatients);

	} catch (e) {
		console.error(e);
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

	if (!validatePatient(payload)) {
		return;
	}

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

		const result = await response.json();

		if (!response.ok) {
			showDoctorMsg(result.message || "Unable to create patient");
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

	document.getElementById("patientId").value = patient.id || "";
	document.getElementById("patientAuthUserId").value = patient.patientAuthUserId || "";
	document.getElementById("patientName").value = patient.patientName || "";

	if ($("#registeredPatientSelect").length) {
		$("#registeredPatientSelect")
			.val(String(patient.patientAuthUserId || ""))
			.trigger("change");

		disableRegisteredPatientSelect();
	}

	document.getElementById("mobile").value = patient.mobile || "";
	document.getElementById("email").value = patient.email || "";
	document.getElementById("gender").value = patient.gender || "";
	document.getElementById("dateOfBirth").value = patient.dateOfBirth || "";
	document.getElementById("bloodGroup").value = patient.bloodGroup || "";
	document.getElementById("address").value = patient.address || "";
	document.getElementById("medicalHistory").value = patient.medicalHistory || "";

	document.getElementById("patientFormPanel").style.display = "block";
	document.getElementById("formTitle").innerText = "Edit Patient";
	document.getElementById("saveBtn").innerText = "Update Patient";
	document.getElementById("cancelEditBtn").style.display = "inline-block";

	document.getElementById("patientFormPanel").scrollIntoView({
		behavior: "smooth",
		block: "start"
	});
}

async function updatePatient(patientId) {
	const payload = buildPatientPayload();

	if (!validatePatient(payload)) {
		return;
	}

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

		const result = await response.json();

		if (!response.ok) {
			showDoctorMsg(result.message || "Unable to update patient");
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
	const confirmDelete = confirm("Are you sure you want to delete this patient?");

	if (!confirmDelete) {
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/doctor/patients/${patientId}`, {
			method: "DELETE",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		let result = {};

		try {
			result = await response.json();
		} catch (e) {
			result = {};
		}

		if (!response.ok) {
			showDoctorMsg(result.message || "Unable to delete patient");
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

	if (!table) {
		return;
	}

	if (!patients || patients.length === 0) {
		table.innerHTML = `
			<tr>
				<td colspan="8" class="text-center text-muted py-4">
					No patients found
				</td>
			</tr>
		`;
		return;
	}

	let html = "";

	patients.forEach((p, index) => {
		html += `
            <tr>
                <td>${index + 1}</td>

                <td>
					<strong>${safe(p.patientName)}</strong><br>
					<span class="text-muted small">${safe(p.email)}</span>
				</td>

                <td>${safe(p.mobile)}</td>
                <td>${safe(p.gender)}</td>
                <td>${formatDate(p.dateOfBirth)}</td>
                <td>${safe(p.bloodGroup)}</td>
                <td>${safe(p.medicalHistory)}</td>

				<td>
					<button class="btn btn-sm btn-warning me-1" onclick="editPatient(${p.id})">
						Edit
					</button>

					<button class="btn btn-sm btn-danger" onclick="deletePatient(${p.id})">
						Delete
					</button>
				</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function filterPatients() {
	const searchBox = document.getElementById("searchBox");

	if (!searchBox) {
		return;
	}

	const keyword = searchBox.value.toLowerCase();

	const filtered = doctorPatients.filter(p =>
		JSON.stringify(p).toLowerCase().includes(keyword)
	);

	renderPatients(filtered);
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

		if ($("#registeredPatientSelect").length) {
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

	if (payload.mobile.length < 10) {
		showDoctorMsg("Please enter valid mobile number");
		return false;
	}

	return true;
}

function clearPatientForm() {
	[
		"patientId",
		"patientAuthUserId",
		"patientName",
		"mobile",
		"email",
		"gender",
		"dateOfBirth",
		"bloodGroup",
		"address",
		"medicalHistory"
	].forEach(id => {
		const element = document.getElementById(id);

		if (element) {
			element.value = "";
		}
	});

	if ($("#registeredPatientSelect").length) {
		$("#registeredPatientSelect").prop("disabled", false);
		$("#registeredPatientSelect").val("").trigger("change");
	}

	document.getElementById("formTitle").innerText = "Add New Patient";
	document.getElementById("saveBtn").innerText = "Save Patient";
	document.getElementById("cancelEditBtn").style.display = "none";
}

function cancelEdit() {
	clearPatientForm();
	document.getElementById("patientFormPanel").style.display = "none";
}

function getVal(id) {
	const element = document.getElementById(id);
	return element ? element.value.trim() : "";
}

function showDoctorMsg(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show">
			${message}
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
		</div>
	`;
}

function formatDate(value) {
	return value ? new Date(value).toLocaleDateString() : "-";
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