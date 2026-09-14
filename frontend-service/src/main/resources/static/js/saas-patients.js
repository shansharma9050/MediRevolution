let patientModal;
let patient360Modal;
let allPatients = [];

let patientPermissions = {
	create: false,
	update: false,
	delete: false
};

let isLoadingPatients = false;
let isSearchingPatients = false;
let isLoadingPatientDetail = false;
let isSavingPatient = false;
let deletingPatientIds = new Set();
let patientSearchTimer = null;
let isLoadingPatient360 = false;

document.addEventListener("DOMContentLoaded", async function() {
	const allowed =
		await protectSaasPage(
			"PATIENTS",
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

	const modalElement =
		document.getElementById(
			"patientModal"
		);

	if (modalElement) {
		patientModal =
			bootstrap.Modal.getOrCreateInstance(
				modalElement
			);
	}

	const patient360ModalElement =
		document.getElementById(
			"patient360Modal"
		);

	if (patient360ModalElement) {
		patient360Modal =
			bootstrap.Modal.getOrCreateInstance(
				patient360ModalElement
			);
	}

	setMaximumDateOfBirth();

	await applyPatientButtonPermissions();
	await loadPatients();

	const searchInput =
		document.getElementById(
			"searchKeyword"
		);

	if (searchInput) {
		searchInput.addEventListener(
			"keydown",
			function(event) {
				if (event.key === "Enter") {
					event.preventDefault();
					searchPatients();
				}
			}
		);
	}
});

async function applyPatientButtonPermissions() {
	const [
		canCreate,
		canUpdate,
		canDelete
	] =
		await Promise.all([
			hasSaasPermission(
				"PATIENTS",
				"CREATE"
			),
			hasSaasPermission(
				"PATIENTS",
				"UPDATE"
			),
			hasSaasPermission(
				"PATIENTS",
				"DELETE"
			)
		]);

	patientPermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete)
	};

	showOrHideById(
		"addPatientBtn",
		patientPermissions.create
	);

	showOrHideByClass(
		"edit-patient-btn",
		patientPermissions.update
	);

	showOrHideByClass(
		"delete-patient-btn",
		patientPermissions.delete
	);
}

async function loadPatients() {
	if (isLoadingPatients) {
		return;
	}

	isLoadingPatients = true;

	setButtonLoading(
		"refreshPatientsBtn",
		"Refreshing...",
		true
	);

	showPatientsLoadingState();

	try {
		const query =
			new URLSearchParams({
				tenantId:
					localStorage.getItem(
						"tenantId"
					)
			});

		const response =
			await fetch(
				`${API_BASE}/saas/patients?${query.toString()}`,
				{
					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

						"Accept":
							"application/json"
					}
				}
			);

		const result =
			await safeJson(response);

		if (!response.ok) {
			allPatients = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load patients."
				);

			showMsg(message);
			showPatientsErrorState(message);
			updatePatientSummary();

			return;
		}

		allPatients =
			normalizeArrayResponse(result);

		sortPatients();
		renderPatients(allPatients);
		updatePatientSummary();

		await applyPatientButtonPermissions();

	} catch (error) {
		console.error(
			"Load patients error:",
			error
		);

		allPatients = [];

		showMsg(
			"SaaS service not reachable."
		);

		showPatientsErrorState(
			"SaaS patient service is currently unavailable."
		);

		updatePatientSummary();

	} finally {
		isLoadingPatients = false;

		setButtonLoading(
			"refreshPatientsBtn",
			"Refresh",
			false
		);
	}
}

function handlePatientSearchInput() {
	clearTimeout(
		patientSearchTimer
	);

	patientSearchTimer =
		setTimeout(
			function() {
				const keyword =
					getValue(
						"searchKeyword"
					);

				if (
					keyword.length === 0
				) {
					renderPatients(
						filterPatientsLocally(
							allPatients
						)
					);

					return;
				}

				if (
					keyword.length >= 2
				) {
					searchPatients();
				}
			},
			450
		);
}

async function searchPatients() {
	if (isSearchingPatients) {
		return;
	}

	const keyword =
		getValue(
			"searchKeyword"
		);

	if (!keyword) {
		renderPatients(
			filterPatientsLocally(
				allPatients
			)
		);

		return;
	}

	isSearchingPatients = true;

	setButtonLoading(
		"searchPatientsBtn",
		"Searching...",
		true
	);

	showPatientsLoadingState();

	try {
		const query =
			new URLSearchParams({
				tenantId:
					localStorage.getItem(
						"tenantId"
					),

				keyword:
					keyword
			});

		const response =
			await fetch(
				`${API_BASE}/saas/patients/search?${query.toString()}`,
				{
					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

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
					"Unable to search patients."
				);

			showMsg(message);
			showPatientsErrorState(message);

			return;
		}

		const searchedPatients =
			normalizeArrayResponse(result);

		renderPatients(
			filterPatientsLocally(
				searchedPatients
			)
		);

		await applyPatientButtonPermissions();

	} catch (error) {
		console.error(
			"Search patients error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

		showPatientsErrorState(
			"Unable to search patients."
		);

	} finally {
		isSearchingPatients = false;

		setButtonLoading(
			"searchPatientsBtn",
			"Search",
			false
		);
	}
}

function filterPatientsClientSide() {
	renderPatients(
		filterPatientsLocally(
			allPatients
		)
	);

	applyPatientButtonPermissions();
}

function filterPatientsLocally(source) {
	const gender =
		getValue(
			"genderFilter"
		).toUpperCase();

	const keyword =
		getValue(
			"searchKeyword"
		).toLowerCase();

	return (
		Array.isArray(source)
			? source
			: []
	).filter(
		function(patient) {
			const searchableText = [
				patient.patientCode,
				patient.patientName,
				patient.mobile,
				patient.email,
				patient.city,
				patient.state,
				patient.bloodGroup
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			const keywordMatches =
				!keyword ||
				searchableText.includes(
					keyword
				);

			const genderMatches =
				!gender ||
				String(
					patient.gender || ""
				).toUpperCase() === gender;

			return (
				keywordMatches &&
				genderMatches
			);
		}
	);
}

function sortPatients() {
	allPatients.sort(
		function(a, b) {
			return String(
				a.patientName || ""
			).localeCompare(
				String(
					b.patientName || ""
				),
				"en",
				{
					sensitivity: "base"
				}
			);
		}
	);
}

function renderPatients(patients) {
	const tableBody =
		document.getElementById(
			"patientsTableBody"
		);

	if (!tableBody) {
		return;
	}

	const list =
		Array.isArray(patients)
			? patients
			: [];

	if (!list.length) {
		tableBody.innerHTML = `
			<tr>
				<td colspan="8">

					<div class="patient-state">

						<div class="patient-state-icon">
							<i class="bi bi-person-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No patients found
						</h5>

						<p class="text-muted mb-0">
							Add a patient or change the selected search filters.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableBody.innerHTML =
		list.map(
			function(patient, index) {
				const patientId =
					safeNumber(
						patient.id
					);

				return `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>
							<strong class="text-primary">
								${safe(patient.patientCode)}
							</strong>
						</td>

						<td>

							<div class="patient-profile-cell">

								<div class="patient-avatar">
									${getPatientInitial(patient.patientName)}
								</div>

								<div>

									<strong class="text-primary">
										${safe(patient.patientName)}
									</strong>

									<div class="text-muted small">
										${safe(patient.email)}
									</div>

								</div>

							</div>

						</td>

						<td>
							${safe(patient.mobile)}
						</td>

						<td>
							<span class="patient-gender-pill">
								<i class="bi bi-gender-ambiguous"></i>
								${safe(formatLabel(patient.gender))}
							</span>
						</td>

						<td>
							${safe(patient.age)}
						</td>

						<td>
							<span class="patient-blood-pill">
								<i class="bi bi-droplet-fill"></i>
								${safe(patient.bloodGroup)}
							</span>
						</td>

						<td>
							${safe(patient.city)}
						</td>

						<td>

							<div class="patient-actions">

									<button type="button"
        id="viewPatient360Btn_${patientId}"
        class="btn btn-sm btn-outline-info"
        onclick="viewPatient360(${patientId})"
        ${patientId ? "" : "disabled"}>

    <i class="bi bi-heart-pulse-fill me-1"></i>
    360Â°
</button>

								<button type="button"
										id="editPatientBtn_${patientId}"
										class="btn btn-sm btn-outline-primary edit-patient-btn"
										onclick="editPatient(${patientId})"
										${patientId ? "" : "disabled"}>

									<i class="bi bi-pencil-square me-1"></i>
									Edit
								</button>

								<button type="button"
										id="deletePatientBtn_${patientId}"
										class="btn btn-sm btn-outline-danger delete-patient-btn"
										onclick="deletePatient(${patientId})"
										${patientId ? "" : "disabled"}>

									<i class="bi bi-trash-fill me-1"></i>
									Delete
								</button>

							</div>

						</td>

					</tr>
				`;
			}
		).join("");

	applyPatientButtonPermissions();
}

function openCreatePatientModal() {

	if (!patientPermissions.create) {

		showMsg(
			"You do not have permission to create patients."
		);

		return;
	}

	clearPatientForm();

	// Show password field while creating a patient
	const passwordField =
		document.getElementById(
			"patientPasswordField"
		);

	if (passwordField) {

		passwordField.style.display = "";
	}

	setText(
		"patientModalTitle",
		"Add Patient"
	);

	if (patientModal) {

		patientModal.show();
	}
}

async function viewPatient360(patientId) {

	if (isLoadingPatient360) {
		return;
	}

	const numericId =
		Number(patientId);

	if (
		!Number.isFinite(numericId) ||
		numericId <= 0
	) {
		showMsg(
			"Invalid patient selected."
		);

		return;
	}

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	if (!tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	isLoadingPatient360 = true;

	setButtonLoading(
		`viewPatient360Btn_${numericId}`,
		"Loading...",
		true
	);

	showPatient360Loading();

	if (patient360Modal) {
		patient360Modal.show();
	}

	try {

		const query =
			new URLSearchParams({
				tenantId:
					tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/patients/${encodeURIComponent(numericId)}/360?${query.toString()}`,
				{
					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

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
					"Unable to load Patient 360."
				);

			showPatient360Error(
				message
			);

			return;
		}

		renderPatient360(
			result
		);

	} catch (error) {

		console.error(
			"Patient 360 error:",
			error
		);

		showPatient360Error(
			"Patient 360 service is currently unavailable."
		);

	} finally {

		isLoadingPatient360 = false;

		setButtonLoading(
			`viewPatient360Btn_${numericId}`,
			"360Â°",
			false
		);
	}
}

function renderPatient360(data) {

	const loading =
		document.getElementById(
			"patient360Loading"
		);

	const content =
		document.getElementById(
			"patient360MainContent"
		);

	const error =
		document.getElementById(
			"patient360Error"
		);

	if (loading) {
		loading.classList.add(
			"d-none"
		);
	}

	if (error) {
		error.classList.add(
			"d-none"
		);
	}

	if (content) {
		content.classList.remove(
			"d-none"
		);
	}

	const patient =
		data?.patient || {};

	setText(
		"patient360Name",
		patient.patientName ||
		"Patient"
	);

	setText(
		"patient360Code",
		patient.patientCode ||
		"-"
	);

	setText(
		"patient360Age",
		patient.age ?? "-"
	);

	setText(
		"patient360Gender",
		formatLabel(
			patient.gender
		) || "-"
	);

	setText(
		"patient360BloodGroup",
		patient.bloodGroup ||
		"-"
	);

	setText(
		"patient360Mobile",
		patient.mobile ||
		"-"
	);

	setText(
		"patient360Email",
		patient.email ||
		"-"
	);

	setText(
		"patient360Location",
		[
			patient.city,
			patient.state
		]
			.filter(Boolean)
			.join(", ") || "-"
	);

	setText(
		"patient360Allergies",
		patient.allergies ||
		"No allergies recorded"
	);

	setText(
		"patient360Diseases",
		patient.existingDiseases ||
		"No existing diseases recorded"
	);

	setText(
		"patient360AppointmentCount",
		data?.appointmentCount ?? 0
	);

	setText(
		"patient360PrescriptionCount",
		data?.prescriptionCount ?? 0
	);

	setText(
		"patient360Diagnosis",
		data?.latestDiagnosis ||
		"No diagnosis recorded"
	);

	setText(
		"patient360NextFollowUp",
		formatPatient360Date(
			data?.nextFollowUpDate
		)
	);

	renderPatient360Vitals(
		data?.latestVitals
	);

	renderPatient360LatestAppointment(
		data?.latestAppointment
	);

	renderPatient360LatestPrescription(
		data?.latestPrescription
	);

	renderPatient360Timeline(
		data?.timeline
	);
}

function renderPatient360Vitals(vitals) {

	setText(
		"patient360Bp",
		vitals?.bloodPressure || "-"
	);

	setText(
		"patient360Pulse",
		vitals?.pulse || "-"
	);

	setText(
		"patient360Temperature",
		vitals?.temperature || "-"
	);

	setText(
		"patient360Spo2",
		vitals?.spo2 || "-"
	);

	setText(
		"patient360Weight",
		vitals?.weight || "-"
	);

	setText(
		"patient360Height",
		vitals?.height || "-"
	);

	setText(
		"patient360Sugar",
		vitals?.sugarLevel || "-"
	);
}

function renderPatient360LatestAppointment(appointment) {

	const container =
		document.getElementById(
			"patient360LatestAppointment"
		);

	if (!container) {
		return;
	}

	if (!appointment) {

		container.innerHTML = `
            <div class="text-muted">
                No appointment history available.
            </div>
        `;

		return;
	}

	container.innerHTML = `
        <div class="patient360-record-title">
            ${safe(
		appointment.doctorName ||
		"Doctor"
	)}
        </div>

        <div class="patient360-record-meta">
            ${safe(
		appointment.specialization ||
		appointment.department ||
		"-"
	)}
        </div>

        <div class="patient360-record-meta">
            ${safe(
		formatPatient360Date(
			appointment.appointmentDate
		)
	)}
            ${safe(
		formatPatient360Time(
			appointment.appointmentTime
		)
	)}
        </div>

        <span class="badge text-bg-primary mt-2">
            ${safe(
		formatLabel(
			appointment.status
		)
	)}
        </span>
    `;
}

function renderPatient360LatestPrescription(prescription) {

	const container =
		document.getElementById(
			"patient360LatestPrescription"
		);

	if (!container) {
		return;
	}

	if (!prescription) {

		container.innerHTML = `
            <div class="text-muted">
                No prescription history available.
            </div>
        `;

		return;
	}

	container.innerHTML = `
        <div class="patient360-record-title">
            ${safe(
		prescription.diagnosis ||
		"Clinical Prescription"
	)}
        </div>

        <div class="patient360-record-meta mt-2">
            ${safe(
		prescription.clinicalNotes ||
		prescription.advice ||
		"No clinical notes recorded."
	)}
        </div>

        <div class="patient360-record-meta mt-2">
            Follow-up:
            <strong>
                ${safe(
		formatPatient360Date(
			prescription.followUpDate
		)
	)}
            </strong>
        </div>
    `;
}

function renderPatient360Timeline(timeline) {

	const container =
		document.getElementById(
			"patient360Timeline"
		);

	if (!container) {
		return;
	}

	const items =
		Array.isArray(timeline)
			? timeline
			: [];

	if (!items.length) {

		container.innerHTML = `
            <div class="patient360-empty">
                <i class="bi bi-clock-history"></i>
                <div>
                    No clinical timeline available yet.
                </div>
            </div>
        `;

		return;
	}

	container.innerHTML =
		items.map(
			function(item) {

				const eventStyle =
					getPatient360TimelineStyle(
						item.type
					);

				const icon =
					eventStyle.icon;

				return `
                    <div class="patient360-timeline-item">

                        <div class="patient360-timeline-icon ${safe(eventStyle.cssClass)}">
    <i class="bi ${safe(icon)}"></i>
</div>

                        <div class="patient360-timeline-content">

                            <div class="patient360-timeline-date">
                                ${safe(
					formatPatient360DateTime(
						item.eventAt
					)
				)}
                            </div>

                            <div class="patient360-timeline-title">
                                ${safe(
					item.title ||
					formatLabel(
						item.type
					)
				)}
                            </div>

                            <div class="patient360-timeline-subtitle">
                                ${safe(
					item.subtitle ||
					"-"
				)}
                            </div>

                            ${item.detail
						? `
                                        <div class="patient360-timeline-detail">
                                            ${safe(
							item.detail
						)}
                                        </div>
                                    `
						: ""
					}

                            ${item.status
						? `
                                        <span class="badge text-bg-light mt-2">
                                            ${safe(
							formatPatient360Status(
								item.status
							)
						)}
                                        </span>
                                    `
						: ""
					}

                        </div>

                    </div>
                `;
			}
		).join("");
}

function getPatient360TimelineStyle(type) {

	const normalizedType =
		String(type || "")
			.trim()
			.toUpperCase();

	const styles = {

		APPOINTMENT: {
			icon:
				"bi-calendar2-check-fill",
			cssClass:
				"patient360-event-appointment"
		},

		PRESCRIPTION: {
			icon:
				"bi-file-medical-fill",
			cssClass:
				"patient360-event-prescription"
		},

		OPD: {
			icon:
				"bi-person-walking",
			cssClass:
				"patient360-event-opd"
		},

		IPD: {
			icon:
				"bi-hospital-fill",
			cssClass:
				"patient360-event-ipd"
		},

		LAB: {
			icon:
				"bi-droplet-half",
			cssClass:
				"patient360-event-lab"
		},

		RADIOLOGY: {
			icon:
				"bi-radioactive",
			cssClass:
				"patient360-event-radiology"
		},

		DIAGNOSTIC: {
			icon:
				"bi-clipboard2-pulse-fill",
			cssClass:
				"patient360-event-diagnostic"
		},

		BILLING: {
			icon:
				"bi-receipt-cutoff",
			cssClass:
				"patient360-event-billing"
		}

	};

	return (
		styles[normalizedType] || {
			icon:
				"bi-activity",
			cssClass:
				"patient360-event-default"
		}
	);
}

function showPatient360Loading() {

	const loading =
		document.getElementById(
			"patient360Loading"
		);

	const content =
		document.getElementById(
			"patient360MainContent"
		);

	const error =
		document.getElementById(
			"patient360Error"
		);

	if (loading) {
		loading.classList.remove(
			"d-none"
		);
	}

	if (content) {
		content.classList.add(
			"d-none"
		);
	}

	if (error) {
		error.classList.add(
			"d-none"
		);
	}
}

function showPatient360Error(message) {

	const loading =
		document.getElementById(
			"patient360Loading"
		);

	const content =
		document.getElementById(
			"patient360MainContent"
		);

	const error =
		document.getElementById(
			"patient360Error"
		);

	if (loading) {
		loading.classList.add(
			"d-none"
		);
	}

	if (content) {
		content.classList.add(
			"d-none"
		);
	}

	if (error) {

		error.classList.remove(
			"d-none"
		);

		error.textContent =
			message ||
			"Unable to load Patient 360.";
	}
}

function formatPatient360Date(value) {

	if (!value) {
		return "-";
	}

	const date =
		new Date(
			value + "T00:00:00"
		);

	if (
		Number.isNaN(
			date.getTime()
		)
	) {
		return value;
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


function formatPatient360Time(value) {

	if (!value) {
		return "";
	}

	const parts =
		String(value)
			.split(":");

	const hour =
		Number(parts[0]);

	const minute =
		Number(parts[1] || 0);

	if (!Number.isFinite(hour)) {
		return value;
	}

	const date =
		new Date();

	date.setHours(
		hour,
		minute,
		0,
		0
	);

	return date.toLocaleTimeString(
		"en-IN",
		{
			hour: "2-digit",
			minute: "2-digit"
		}
	);
}


function formatPatient360DateTime(value) {

	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (
		Number.isNaN(
			date.getTime()
		)
	) {
		return value;
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

async function editPatient(patientId) {
	if (isLoadingPatientDetail) {
		return;
	}

	if (!patientPermissions.update) {
		showMsg(
			"You do not have permission to update patients."
		);

		return;
	}

	const numericId =
		Number(patientId);

	if (
		!Number.isFinite(numericId) ||
		numericId <= 0
	) {
		showMsg(
			"Invalid patient selected."
		);

		return;
	}

	isLoadingPatientDetail = true;

	setButtonLoading(
		`editPatientBtn_${numericId}`,
		"Loading...",
		true
	);

	try {
		const query =
			new URLSearchParams({
				tenantId:
					localStorage.getItem(
						"tenantId"
					)
			});

		const response =
			await fetch(
				`${API_BASE}/saas/patients/${encodeURIComponent(numericId)}?${query.toString()}`,
				{
					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

						"Accept":
							"application/json"
					}
				}
			);

		const patient =
			await safeJson(response);

		if (!response.ok) {
			showMsg(
				getApiErrorMessage(
					patient,
					"Unable to load patient."
				)
			);

			return;
		}

		fillPatientForm(patient);

		// Hide login password field while editing
		const passwordField =
			document.getElementById(
				"patientPasswordField"
			);

		if (passwordField) {

			passwordField.style.display = "none";
		}

		setValue("password", "");

		setText(
			"patientModalTitle",
			"Edit Patient"
		);

		if (patientModal) {

			patientModal.show();
		}

	} catch (error) {
		console.error(
			"Load patient detail error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		isLoadingPatientDetail = false;

		setButtonLoading(
			`editPatientBtn_${numericId}`,
			"Edit",
			false
		);
	}
}

async function savePatient() {
	if (isSavingPatient) {
		return;
	}

	const patientId =
		getValue(
			"patientId"
		);

	const isUpdate =
		Boolean(patientId);

	if (
		isUpdate &&
		!patientPermissions.update
	) {
		showMsg(
			"You do not have permission to update patients."
		);

		return;
	}

	if (
		!isUpdate &&
		!patientPermissions.create
	) {
		showMsg(
			"You do not have permission to create patients."
		);

		return;
	}

	const tenantId =
		toPositiveNumberOrNull(
			localStorage.getItem(
				"tenantId"
			)
		);

	const payload = {
		tenantId:
			tenantId,

		patientName:
			getValue("patientName"),

		mobile:
			normalizePhone(
				getValue("mobile")
			),

		email:
			getValue("email"),

		password:
			getValue("password"),

		gender:
			getValue("gender"),

		dateOfBirth:
			getValue("dateOfBirth") || null,

		age:
			toNullableInteger(
				getValue("age")
			),

		bloodGroup:
			getValue("bloodGroup"),

		address:
			getValue("address"),

		city:
			getValue("city"),

		state:
			getValue("state"),

		pincode:
			getValue("pincode"),

		emergencyContactName:
			getValue(
				"emergencyContactName"
			),

		emergencyContactMobile:
			normalizePhone(
				getValue(
					"emergencyContactMobile"
				)
			),

		allergies:
			getValue("allergies"),

		existingDiseases:
			getValue(
				"existingDiseases"
			),

		notes:
			getValue("notes")
	};

	if (!tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!payload.patientName) {
		showModalFormError(
			document.getElementById("patientModal"),
			"Patient name is required."
		);

		return;
	}

	if (
		!payload.mobile &&
		!payload.email
	) {
		showModalFormError(
			document.getElementById("patientModal"),
			"Patient mobile or email is required."
		);

		return;
	}

	if (
		payload.email &&
		!isValidEmail(payload.email)
	) {
		showModalFormError(
			document.getElementById("patientModal"),
			"Please enter a valid email address."
		);

		return;
	}

	if (password.length < 6) {

		showModalFormError(
			document.getElementById("patientModal"),
			"Patient password must be at least 6 characters."
		);

		return;
	}

	if (
		payload.mobile &&
		!isValidPhone(payload.mobile)
	) {
		showModalFormError(
			document.getElementById("patientModal"),
			"Please enter a valid patient mobile number."
		);

		return;
	}

	if (
		payload.emergencyContactMobile &&
		!isValidPhone(
			payload.emergencyContactMobile
		)
	) {
		showModalFormError(
			document.getElementById("patientModal"),
			"Please enter a valid emergency contact mobile number."
		);

		return;
	}

	if (
		payload.age !== null &&
		(
			payload.age < 0 ||
			payload.age > 150
		)
	) {
		showModalFormError(
			document.getElementById("patientModal"),
			"Age must be between 0 and 150."
		);

		return;
	}

	if (
		payload.dateOfBirth &&
		payload.dateOfBirth >
		getLocalDateText(
			new Date()
		)
	) {
		showModalFormError(
			document.getElementById("patientModal"),
			"Date of birth cannot be in the future."
		);

		return;
	}
	const numericPatientId =
		isUpdate
			? toPositiveNumberOrNull(
				patientId
			)
			: null;

	if (
		isUpdate &&
		!numericPatientId
	) {
		showMsg(
			"Invalid patient selected."
		);

		return;
	}

	const query =
		new URLSearchParams({
			tenantId:
				String(tenantId)
		});

	const url =
		isUpdate
			? `${API_BASE}/saas/patients/${encodeURIComponent(numericPatientId)}?${query.toString()}`
			: `${API_BASE}/saas/patients`;

	const method =
		isUpdate
			? "PUT"
			: "POST";

	isSavingPatient = true;

	setButtonLoading(
		"savePatientBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				url,
				{
					method:
						method,

					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

						"Content-Type":
							"application/json",

						"Accept":
							"application/json"
					},

					body:
						JSON.stringify(
							payload
						)
				}
			);

		const result =
			await safeJson(response);

		if (!response.ok) {
			showMsg(
				getApiErrorMessage(
					result,
					"Unable to save patient."
				)
			);

			return;
		}

		if (patientModal) {
			patientModal.hide();
		}

		clearPatientForm();

		showMsg(
			isUpdate
				? "Patient updated successfully."
				: "Patient added successfully.",
			"success"
		);

		await loadPatients();

	} catch (error) {
		console.error(
			"Save patient error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		isSavingPatient = false;

		setButtonLoading(
			"savePatientBtn",
			"Save Patient",
			false
		);
	}
}

async function deletePatient(patientId) {
	if (!patientPermissions.delete) {
		showMsg(
			"You do not have permission to delete patients."
		);

		return;
	}

	const numericId =
		Number(patientId);

	if (
		!Number.isFinite(numericId) ||
		numericId <= 0
	) {
		showMsg(
			"Invalid patient selected."
		);

		return;
	}

	if (
		deletingPatientIds.has(
			numericId
		)
	) {
		return;
	}

	if (
		!confirm(
			"Delete this patient?"
		)
	) {
		return;
	}

	deletingPatientIds.add(
		numericId
	);

	setButtonLoading(
		`deletePatientBtn_${numericId}`,
		"Deleting...",
		true
	);

	try {
		const query =
			new URLSearchParams({
				tenantId:
					localStorage.getItem(
						"tenantId"
					)
			});

		const response =
			await fetch(
				`${API_BASE}/saas/patients/${encodeURIComponent(numericId)}?${query.toString()}`,
				{
					method:
						"DELETE",

					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

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
					"Unable to delete patient."
				)
			);

			return;
		}

		showMsg(
			getApiErrorMessage(
				result,
				"Patient deleted successfully."
			),
			"success"
		);

		await loadPatients();

	} catch (error) {
		console.error(
			"Delete patient error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		deletingPatientIds.delete(
			numericId
		);
	}
}

function fillPatientForm(patient) {
	setValue(
		"patientId",
		patient.id
	);

	setValue(
		"patientName",
		patient.patientName
	);

	setValue(
		"mobile",
		patient.mobile
	);

	setValue(
		"email",
		patient.email
	);

	setValue(
		"gender",
		patient.gender
	);

	setValue(
		"dateOfBirth",
		patient.dateOfBirth
	);

	setValue(
		"age",
		patient.age
	);

	setValue(
		"bloodGroup",
		patient.bloodGroup
	);

	setValue(
		"address",
		patient.address
	);

	setValue(
		"city",
		patient.city
	);

	setValue(
		"state",
		patient.state
	);

	setValue(
		"pincode",
		patient.pincode
	);

	setValue(
		"emergencyContactName",
		patient.emergencyContactName
	);

	setValue(
		"emergencyContactMobile",
		patient.emergencyContactMobile
	);

	setValue(
		"allergies",
		patient.allergies
	);

	setValue(
		"existingDiseases",
		patient.existingDiseases
	);

	setValue(
		"notes",
		patient.notes
	);
}

function clearPatientForm() {
	[
		"patientId",
		"patientName",
		"mobile",
		"email",
		"password",
		"gender",
		"dateOfBirth",
		"age",
		"bloodGroup",
		"address",
		"city",
		"state",
		"pincode",
		"emergencyContactName",
		"emergencyContactMobile",
		"allergies",
		"existingDiseases",
		"notes"
	].forEach(
		function(id) {
			setValue(id, "");
		}
	);
}

function syncAgeFromDateOfBirth() {
	const dateOfBirth =
		getValue(
			"dateOfBirth"
		);

	if (!dateOfBirth) {
		return;
	}

	const birthDate =
		new Date(
			`${dateOfBirth}T00:00:00`
		);

	if (
		Number.isNaN(
			birthDate.getTime()
		)
	) {
		return;
	}

	const today =
		new Date();

	let age =
		today.getFullYear() -
		birthDate.getFullYear();

	const monthDifference =
		today.getMonth() -
		birthDate.getMonth();

	if (
		monthDifference < 0 ||
		(
			monthDifference === 0 &&
			today.getDate() <
			birthDate.getDate()
		)
	) {
		age--;
	}

	if (
		age >= 0 &&
		age <= 150
	) {
		setValue(
			"age",
			age
		);
	}
}

function setMaximumDateOfBirth() {
	const dateInput =
		document.getElementById(
			"dateOfBirth"
		);

	if (dateInput) {
		dateInput.max =
			getLocalDateText(
				new Date()
			);
	}
}

function updatePatientSummary() {
	setAnimatedNumber(
		"totalPatientCount",
		allPatients.length
	);

	setAnimatedNumber(
		"femalePatientCount",
		allPatients.filter(
			patient =>
				String(
					patient.gender || ""
				).toUpperCase() ===
				"FEMALE"
		).length
	);

	const cities =
		new Set(
			allPatients
				.map(
					patient =>
						String(
							patient.city || ""
						)
							.trim()
							.toLowerCase()
				)
				.filter(Boolean)
		);

	setAnimatedNumber(
		"patientCityCount",
		cities.size
	);

	setAnimatedNumber(
		"medicalHistoryCount",
		allPatients.filter(
			patient =>
				Boolean(
					String(
						patient.allergies || ""
					).trim() ||
					String(
						patient.existingDiseases || ""
					).trim()
				)
		).length
	);
}

function showPatientsLoadingState() {
	const tableBody =
		document.getElementById(
			"patientsTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="patient-state">

					<div class="patient-state-icon patient-loading">
						<i class="bi bi-people-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading patients
					</h5>

					<p class="text-muted mb-0">
						Please wait while the patient registry is prepared.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showPatientsErrorState(message) {
	const tableBody =
		document.getElementById(
			"patientsTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="patient-state">

					<div class="patient-state-icon bg-danger">
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

function formatPatient360Status(status) {

	if (!status) {
		return "-";
	}

	return String(status)
		.replaceAll("_", " ")
		.toLowerCase()
		.replace(/\b\w/g, function(char) {
			return char.toUpperCase();
		});
}

function normalizeArrayResponse(result) {
	if (Array.isArray(result)) {
		return result;
	}

	if (Array.isArray(result?.data)) {
		return result.data;
	}

	if (Array.isArray(result?.content)) {
		return result.content;
	}

	return [];
}

function getPatientInitial(name) {
	const normalized =
		String(name || "")
			.trim();

	if (!normalized) {
		return '<i class="bi bi-person-fill"></i>';
	}

	return escapeHtml(
		normalized.charAt(0)
			.toUpperCase()
	);
}

function formatLabel(value) {
	return String(value || "")
		.toLowerCase()
		.replace(
			/\b\w/g,
			character =>
				character.toUpperCase()
		);
}

function normalizePhone(value) {
	return String(value || "")
		.replace(/[^\d+]/g, "");
}

function isValidPhone(value) {
	return /^[+]?[0-9]{7,15}$/.test(
		String(value || "")
	);
}

function isValidEmail(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
		String(value || "")
	);
}

function toPositiveNumberOrNull(value) {
	const number =
		Number(value);

	return Number.isFinite(number) &&
		number > 0
		? number
		: null;
}

function toNullableInteger(value) {
	if (
		value === null ||
		value === undefined ||
		value === ""
	) {
		return null;
	}

	const number =
		Number(value);

	return Number.isInteger(number)
		? number
		: null;
}

function getLocalDateText(date) {
	return [
		date.getFullYear(),
		String(
			date.getMonth() + 1
		).padStart(2, "0"),
		String(
			date.getDate()
		).padStart(2, "0")
	].join("-");
}

function getValue(id) {
	const element =
		document.getElementById(id);

	return element
		? String(element.value || "")
			.trim()
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
				: String(value);
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

function getApiErrorMessage(
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

	if (data.rawBody) {
		return data.rawBody;
	}

	if (typeof data === "string") {
		return data;
	}

	return fallback;
}

function showMsg(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById(
			"msg"
		);

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show"
			 role="alert">

			${escapeHtml(message)}

			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert"></button>

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
		document.getElementById(
			buttonId
		);

	if (!button) {
		return;
	}

	if (isLoading) {
		if (
			!button.dataset.originalHtml
		) {
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

function setAnimatedNumber(
	id,
	value
) {
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
			1 - Math.pow(
				1 - progress,
				3
			);

		element.textContent =
			Math.round(
				start +
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(
				update
			);
		}
	}

	requestAnimationFrame(
		update
	);
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
