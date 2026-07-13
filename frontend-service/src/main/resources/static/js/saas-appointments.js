let appointmentModal = null;
let allAppointments = [];
let isLoadingAppointments = false;
let isSavingAppointment = false;
let appointmentPermissions = {
	create: false,
	update: false,
	delete: false,
	approve: false
};

document.addEventListener("DOMContentLoaded", async function() {
	const allowed =
		await protectSaasPage(
			"APPOINTMENTS",
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
			"appointmentModal"
		);

	if (modalElement) {
		appointmentModal =
			bootstrap.Modal.getOrCreateInstance(
				modalElement
			);
	}

	setAppointmentDateLimits();

	await loadAppointmentPermissions();

	await Promise.all([
		loadPatientsDropdown(),
		loadDoctorsDropdown()
	]);

	await loadAppointments();
});

function setAppointmentDateLimits() {
	const dateInput =
		document.getElementById(
			"appointmentDate"
		);

	if (!dateInput) {
		return;
	}

	dateInput.min =
		getLocalDateText(
			new Date()
		);
}

async function loadAppointmentPermissions() {
	const results =
		await Promise.all([
			hasSaasPermission(
				"APPOINTMENTS",
				"CREATE"
			),
			hasSaasPermission(
				"APPOINTMENTS",
				"UPDATE"
			),
			hasSaasPermission(
				"APPOINTMENTS",
				"DELETE"
			),
			hasSaasPermission(
				"APPOINTMENTS",
				"APPROVE"
			)
		]);

	appointmentPermissions = {
		create: Boolean(results[0]),
		update: Boolean(results[1]),
		delete: Boolean(results[2]),
		approve: Boolean(results[3])
	};

	applyAppointmentButtonPermissions();
}

async function loadAppointments() {
	if (isLoadingAppointments) {
		return;
	}

	isLoadingAppointments = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showAppointmentsLoadingState();

	setButtonLoading(
		"refreshAppointmentsBtn",
		"Refreshing...",
		true
	);

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/appointments?${query.toString()}`,
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
			allAppointments = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load appointments."
				);

			showMsg(message);
			showAppointmentsErrorState(message);
			updateAppointmentSummary([]);

			return;
		}

		allAppointments =
			Array.isArray(result)
				? result
				: [];

		sortAppointments();

		renderAppointments(
			allAppointments
		);

		updateAppointmentSummary(
			allAppointments
		);

		applyAppointmentButtonPermissions();

	} catch (error) {
		console.error(
			"Unable to load appointments:",
			error
		);

		allAppointments = [];

		showMsg(
			"SaaS service not reachable."
		);

		showAppointmentsErrorState(
			"SaaS appointment service is currently unavailable."
		);

		updateAppointmentSummary([]);

	} finally {
		isLoadingAppointments = false;

		setButtonLoading(
			"refreshAppointmentsBtn",
			"Refresh",
			false
		);
	}
}

function sortAppointments() {
	allAppointments.sort(
		function(a, b) {
			return (
				getAppointmentTimestamp(a) -
				getAppointmentTimestamp(b)
			);
		}
	);
}

function filterAppointments() {
	const status =
		getValue(
			"appointmentStatusFilter"
		);

	const keyword =
		getValue(
			"appointmentSearchBox"
		).toLowerCase();

	const filtered =
		allAppointments.filter(
			function(appointment) {
				const statusMatches =
					!status ||
					appointment.status === status;

				const searchableText = [
					appointment.patientName,
					appointment.patientMobile,
					appointment.doctorName,
					appointment.department,
					appointment.appointmentType,
					appointment.status
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				const keywordMatches =
					!keyword ||
					searchableText.includes(keyword);

				return (
					statusMatches &&
					keywordMatches
				);
			}
		);

	renderAppointments(filtered);
}

function renderAppointments(appointments) {
	const tableBody =
		document.getElementById(
			"appointmentsTableBody"
		);

	if (!tableBody) {
		return;
	}

	const list =
		Array.isArray(appointments)
			? appointments
			: [];

	if (!list.length) {
		tableBody.innerHTML = `
			<tr>
				<td colspan="7">

					<div class="saas-appointments-state">

						<div class="saas-appointments-state-icon">
							<i class="bi bi-calendar-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No appointments found
						</h5>

						<p class="text-muted mb-0">
							No appointment matches the current workspace filters.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(appointment, index) {
			const appointmentId =
				safeNumber(
					appointment.id
				);

			const meetingLink =
				buildSafeMeetingLink(
					appointment.meetingUrl
				);

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>

						<strong class="text-primary">
							${formatDate(appointment.appointmentDate)}
						</strong>

						<div class="text-muted small">
							<i class="bi bi-clock me-1"></i>
							${formatTime(appointment.appointmentTime)}
						</div>

					</td>

					<td>

						<div class="saas-appointment-person">

							<div class="saas-appointment-person-icon">
								<i class="bi bi-person-fill"></i>
							</div>

							<div>

								<strong class="text-primary">
									${safe(appointment.patientName)}
								</strong>

								<div class="text-muted small">
									${safe(appointment.patientMobile)}
								</div>

							</div>

						</div>

					</td>

					<td>

						<div class="saas-appointment-person">

							<div class="saas-appointment-person-icon">
								<i class="bi bi-person-badge-fill"></i>
							</div>

							<div>

								<strong class="text-primary">
									${safe(appointment.doctorName)}
								</strong>

								<div class="text-muted small">
									${safe(appointment.department)}
								</div>

							</div>

						</div>

					</td>

					<td>
						${appointmentTypeBadge(
				appointment.appointmentType
			)}
					</td>

					<td>
						${statusBadge(
				appointment.status
			)}
					</td>

					<td>
						${meetingLink}
					</td>

					<td>
						<div class="saas-appointment-actions">
							${getActionButtons(
				appointment,
				appointmentId
			)}
						</div>
					</td>

				</tr>
			`;
		}
	);

	tableBody.innerHTML = html;

	applyAppointmentButtonPermissions();
}

function getActionButtons(
	appointment,
	appointmentId
) {
	if (!appointmentId) {
		return "-";
	}

	let html = "";

	if (
		appointment.status === "PENDING" ||
		appointment.status === "PAYMENT_PENDING"
	) {
		html += `
			<button type="button"
					class="btn btn-sm btn-outline-success confirm-appointment-btn"
					onclick="updateStatus(${appointmentId}, 'CONFIRMED')">

				<i class="bi bi-check2-circle me-1"></i>
				Confirm
			</button>

			<button type="button"
					class="btn btn-sm btn-outline-warning reject-appointment-btn"
					onclick="updateStatus(${appointmentId}, 'REJECTED')">

				<i class="bi bi-x-circle me-1"></i>
				Reject
			</button>
		`;
	}

	if (appointment.status === "CONFIRMED") {
		html += `
			<button type="button"
					class="btn btn-sm btn-outline-info complete-appointment-btn"
					onclick="updateStatus(${appointmentId}, 'COMPLETED')">

				<i class="bi bi-clipboard2-check me-1"></i>
				Complete
			</button>

			<button type="button"
					class="btn btn-sm btn-outline-danger cancel-appointment-btn"
					onclick="updateStatus(${appointmentId}, 'CANCELLED')">

				<i class="bi bi-calendar-x me-1"></i>
				Cancel
			</button>
		`;
	}

	if (
		appointment.status !== "COMPLETED" &&
		appointment.status !== "CANCELLED" &&
		appointment.status !== "REJECTED"
	) {
		html += `
			<button type="button"
					class="btn btn-sm btn-outline-primary edit-appointment-btn"
					onclick="editAppointment(${appointmentId})">

				<i class="bi bi-pencil-square me-1"></i>
				Edit
			</button>
		`;
	}

	return html || "-";
}

function appointmentTypeBadge(type) {
	const normalized =
		String(type || "OPD")
			.toUpperCase();

	let icon =
		"bi bi-hospital-fill";

	if (normalized === "ONLINE") {
		icon =
			"bi bi-camera-video-fill";
	}

	if (normalized === "IPD") {
		icon =
			"bi bi-building-fill-add";
	}

	return `
		<span class="saas-appointment-type-pill">
			<i class="${icon}"></i>
			${escapeHtml(normalized)}
		</span>
	`;
}

function statusBadge(status) {
	const normalized =
		String(status || "PENDING")
			.toUpperCase();

	const cssClass =
		normalized
			.toLowerCase()
			.replace(/_/g, "-");

	let icon =
		"bi bi-hourglass-split";

	if (normalized === "CONFIRMED") {
		icon = "bi bi-check2-circle";
	}

	if (normalized === "COMPLETED") {
		icon = "bi bi-clipboard2-check-fill";
	}

	if (
		normalized === "REJECTED" ||
		normalized === "PAYMENT_FAILED"
	) {
		icon = "bi bi-x-circle-fill";
	}

	if (normalized === "CANCELLED") {
		icon = "bi bi-calendar-x-fill";
	}

	if (normalized === "PAYMENT_PENDING") {
		icon = "bi bi-credit-card-fill";
	}

	return `
		<span class="saas-appointment-status-pill ${escapeHtml(cssClass)}">

			<i class="${icon}"></i>

			${escapeHtml(
		normalized.replace(/_/g, " ")
	)}

		</span>
	`;
}

function buildSafeMeetingLink(url) {
	const safeUrl =
		getSafeHttpUrl(url);

	if (!safeUrl) {
		return "-";
	}

	return `
		<a href="${escapeAttribute(safeUrl)}"
		   target="_blank"
		   rel="noopener noreferrer"
		   class="saas-appointment-meeting-link">

			<i class="bi bi-camera-video-fill"></i>
			Join
		</a>
	`;
}

function getSafeHttpUrl(value) {
	if (!value) {
		return "";
	}

	try {
		const url =
			new URL(
				String(value),
				window.location.origin
			);

		if (
			url.protocol !== "http:" &&
			url.protocol !== "https:"
		) {
			return "";
		}

		return url.href;

	} catch (error) {
		return "";
	}
}

function applyAppointmentButtonPermissions() {
	showOrHideById(
		"addAppointmentBtn",
		appointmentPermissions.create
	);

	showOrHideByClass(
		"edit-appointment-btn",
		appointmentPermissions.update
	);

	showOrHideByClass(
		"cancel-appointment-btn",
		appointmentPermissions.delete
	);

	showOrHideByClass(
		"confirm-appointment-btn",
		appointmentPermissions.approve
	);

	showOrHideByClass(
		"reject-appointment-btn",
		appointmentPermissions.approve
	);

	showOrHideByClass(
		"complete-appointment-btn",
		appointmentPermissions.update
	);
}

async function loadPatientsDropdown() {
	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const select =
		document.getElementById(
			"patientId"
		);

	if (!select) {
		console.error(
			"Patient dropdown #patientId not found."
		);

		return;
	}

	select.innerHTML = `
		<option value="">
			Loading patients...
		</option>
	`;

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/patients?${query.toString()}`,
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
			select.innerHTML = `
				<option value="">
					Unable to load patients
				</option>
			`;

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

		if (!patients.length) {
			select.innerHTML = `
				<option value="">
					No patients found
				</option>
			`;

			return;
		}

		select.innerHTML = `
			<option value="">
				Select Patient
			</option>
		`;

		patients.forEach(
			function(patient) {
				if (!patient.id) {
					return;
				}

				const option =
					document.createElement(
						"option"
					);

				option.value =
					String(patient.id);

				option.textContent =
					(patient.patientName || "Patient") +
					(
						patient.mobile
							? ` (${patient.mobile})`
							: ""
					);

				select.appendChild(option);
			}
		);

	} catch (error) {
		console.error(
			"Unable to load patients:",
			error
		);

		select.innerHTML = `
			<option value="">
				Service not reachable
			</option>
		`;

		showMsg(
			"Unable to load patients."
		);
	}
}

async function loadDoctorsDropdown() {
	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const select =
		document.getElementById(
			"doctorStaffId"
		);

	if (!select) {
		console.error(
			"Doctor dropdown #doctorStaffId not found."
		);

		return;
	}

	select.innerHTML = `
		<option value="">
			Loading doctors...
		</option>
	`;

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/staff/doctors/for-appointments?${query.toString()}`,
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
			select.innerHTML = `
				<option value="">
					Unable to load doctors
				</option>
			`;

			showMsg(
				getApiErrorMessage(
					result,
					`Unable to load doctors. HTTP ${response.status}`
				)
			);

			return;
		}

		const doctors =
			Array.isArray(result)
				? result
				: [];

		if (!doctors.length) {
			select.innerHTML = `
				<option value="">
					No doctor staff found
				</option>
			`;

			return;
		}

		select.innerHTML = `
			<option value="">
				Select Doctor
			</option>
		`;

		let addedDoctors = 0;

		doctors.forEach(
			function(staff) {
				if (
					!staff.id ||
					!staff.authUserId
				) {
					console.warn(
						"Doctor skipped because required ID is missing:",
						staff
					);

					return;
				}

				const option =
					document.createElement(
						"option"
					);

				option.value =
					String(staff.id);

				option.dataset.authUserId =
					String(staff.authUserId);

				option.dataset.doctorName =
					staff.staffName || "";

				option.dataset.department =
					staff.department || "";

				option.dataset.specialization =
					staff.specialization || "";

				option.dataset.consultationFee =
					staff.consultationFee == null
						? ""
						: String(
							staff.consultationFee
						);

				option.dataset.onlineConsultationFee =
					staff.onlineConsultationFee == null
						? ""
						: String(
							staff.onlineConsultationFee
						);

				option.dataset.onlineEnabled =
					String(
						staff.onlineConsultationEnabled === true
					);

				option.textContent =
					(staff.staffName || "Doctor") +
					(
						staff.department
							? ` - ${staff.department}`
							: ""
					) +
					(
						staff.specialization
							? ` (${staff.specialization})`
							: ""
					);

				select.appendChild(option);
				addedDoctors += 1;
			}
		);

		if (!addedDoctors) {
			select.innerHTML = `
				<option value="">
					Doctors found, but login IDs are missing
				</option>
			`;

			showMsg(
				"Doctor staff records exist, but their authUserId is missing."
			);
		}

	} catch (error) {
		console.error(
			"Doctor dropdown error:",
			error
		);

		select.innerHTML = `
			<option value="">
				SaaS service not reachable
			</option>
		`;

		showMsg(
			"Unable to load doctors from SaaS Staff."
		);
	}
}

function handleDoctorSelectionChange() {
	updateSelectedDoctorInfo();
	loadDoctorSlotsForAppointment();
}

function handleAppointmentTypeChange() {
	updateSelectedDoctorInfo();
}

function updateSelectedDoctorInfo() {
	const option =
		getSelectedDoctorOption();

	const info =
		document.getElementById(
			"selectedDoctorInfo"
		);

	const text =
		document.getElementById(
			"selectedDoctorInfoText"
		);

	if (!info || !text) {
		return;
	}

	if (!option) {
		info.style.display = "none";
		text.innerHTML = "";
		return;
	}

	const appointmentType =
		getValue(
			"appointmentType"
		);

	const consultationFee =
		option.dataset.consultationFee;

	const onlineFee =
		option.dataset.onlineConsultationFee;

	const onlineEnabled =
		option.dataset.onlineEnabled === "true";

	const fee =
		appointmentType === "ONLINE"
			? onlineFee
			: consultationFee;

	text.innerHTML = `
		<strong>${escapeHtml(
		option.dataset.doctorName ||
		option.textContent
	)}</strong>

		${option.dataset.specialization
			? ` • ${escapeHtml(option.dataset.specialization)}`
			: ""
		}

		${fee
			? ` • Fee: ₹${escapeHtml(formatMoney(fee))}`
			: ""
		}

		${appointmentType === "ONLINE"
			? (
				onlineEnabled
					? ' • <span class="text-success fw-bold">Online enabled</span>'
					: ' • <span class="text-danger fw-bold">Online not enabled</span>'
			)
			: ""
		}
	`;

	info.style.display = "flex";
}

async function loadDoctorSlotsForAppointment() {
	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const doctorAuthUserId =
		getSelectedDoctorAuthUserId();

	const appointmentDate =
		getValue("appointmentDate");

	const slotSelect =
		document.getElementById(
			"appointmentTime"
		);

	if (!slotSelect) {
		return;
	}

	if (!tenantId) {
		slotSelect.innerHTML = `
			<option value="">
				Please select workspace first
			</option>
		`;

		return;
	}

	if (!doctorAuthUserId) {
		slotSelect.innerHTML = `
			<option value="">
				Select doctor first
			</option>
		`;

		return;
	}

	if (!appointmentDate) {
		slotSelect.innerHTML = `
			<option value="">
				Select date first
			</option>
		`;

		return;
	}

	slotSelect.innerHTML = `
		<option value="">
			Loading slots...
		</option>
	`;

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId,
				doctorAuthUserId:
					doctorAuthUserId,
				date:
					appointmentDate
			});

		const response =
			await fetch(
				`${API_BASE}/saas/doctor-availability/slots?${query.toString()}`,
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
			slotSelect.innerHTML = `
				<option value="">
					Unable to load slots
				</option>
			`;

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load doctor slots."
				)
			);

			return;
		}

		renderAppointmentSlots(
			Array.isArray(result)
				? result
				: []
		);

	} catch (error) {
		console.error(
			"Unable to load doctor slots:",
			error
		);

		slotSelect.innerHTML = `
			<option value="">
				SaaS service not reachable
			</option>
		`;

		showMsg(
			"SaaS service not reachable while loading slots."
		);
	}
}

function renderAppointmentSlots(slots) {
	const slotSelect =
		document.getElementById(
			"appointmentTime"
		);

	if (!slotSelect) {
		return;
	}

	if (!slots.length) {
		slotSelect.innerHTML = `
			<option value="">
				No slots available
			</option>
		`;

		return;
	}

	slotSelect.innerHTML = `
		<option value="">
			Select Slot
		</option>
	`;

	slots.forEach(
		function(slot) {
			const startTime =
				normalizeTime(
					slot.startTime
				);

			const label =
				slot.label ||
				`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;

			const option =
				document.createElement(
					"option"
				);

			option.value =
				startTime;

			if (
				slot.booked === true ||
				slot.available === false
			) {
				option.disabled = true;
				option.textContent =
					`${label} - Booked`;
			} else {
				option.textContent =
					label;
			}

			slotSelect.appendChild(option);
		}
	);
}

function resetAppointmentSlots() {
	const slotSelect =
		document.getElementById(
			"appointmentTime"
		);

	if (slotSelect) {
		slotSelect.innerHTML = `
			<option value="">
				Select doctor and date first
			</option>
		`;
	}
}

async function openCreateAppointmentModal() {
	if (!appointmentPermissions.create) {
		showMsg(
			"You do not have permission to create appointments."
		);

		return;
	}

	clearAppointmentForm();

	setText(
		"appointmentModalTitle",
		"Book Appointment"
	);

	if (appointmentModal) {
		appointmentModal.show();
	}
}

async function editAppointment(appointmentId) {
	if (!appointmentPermissions.update) {
		showMsg(
			"You do not have permission to update appointments."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/appointments/${encodeURIComponent(appointmentId)}?${query.toString()}`,
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

		const appointment =
			await safeJson(response);

		if (!response.ok) {
			showMsg(
				getApiErrorMessage(
					appointment,
					"Unable to load appointment."
				)
			);

			return;
		}

		setValue(
			"appointmentId",
			appointment.id
		);

		setValue(
			"patientId",
			appointment.patientId
		);

		setValue(
			"doctorStaffId",
			appointment.doctorStaffId
		);

		setValue(
			"appointmentType",
			appointment.appointmentType
		);

		setValue(
			"appointmentDate",
			appointment.appointmentDate
		);

		setValue(
			"symptoms",
			appointment.symptoms
		);

		setValue(
			"notes",
			appointment.notes
		);

		updateSelectedDoctorInfo();

		await loadDoctorSlotsForAppointment();

		addCurrentAppointmentSlotIfMissing(
			appointment.appointmentTime
		);

		setValue(
			"appointmentTime",
			normalizeTime(
				appointment.appointmentTime
			)
		);

		setText(
			"appointmentModalTitle",
			"Edit Appointment"
		);

		if (appointmentModal) {
			appointmentModal.show();
		}

	} catch (error) {
		console.error(
			"Unable to edit appointment:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);
	}
}

function addCurrentAppointmentSlotIfMissing(
	timeValue
) {
	const normalizedTime =
		normalizeTime(timeValue);

	if (!normalizedTime) {
		return;
	}

	const slotSelect =
		document.getElementById(
			"appointmentTime"
		);

	if (!slotSelect) {
		return;
	}

	const existingOption =
		Array.from(
			slotSelect.options
		)
			.find(
				option =>
					option.value === normalizedTime
			);

	if (!existingOption) {
		const option =
			document.createElement(
				"option"
			);

		option.value =
			normalizedTime;

		option.textContent =
			`${formatTime(normalizedTime)} - Current Slot`;

		slotSelect.appendChild(option);
	} else {
		existingOption.disabled = false;
	}
}

async function saveAppointment() {
	if (isSavingAppointment) {
		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const appointmentId =
		getValue("appointmentId");

	const isUpdate =
		Boolean(appointmentId);

	if (
		isUpdate &&
		!appointmentPermissions.update
	) {
		showMsg(
			"You do not have permission to update appointments."
		);

		return;
	}

	if (
		!isUpdate &&
		!appointmentPermissions.create
	) {
		showMsg(
			"You do not have permission to create appointments."
		);

		return;
	}

	const selectedDoctorStaffId =
		getValue("doctorStaffId");

	const selectedDoctorAuthUserId =
		getSelectedDoctorAuthUserId();

	const appointmentType =
		getValue("appointmentType");

	const payload = {
		tenantId:
			toNumberOrNull(tenantId),

		patientId:
			toNumberOrNull(
				getValue("patientId")
			),

		doctorStaffId:
			toNumberOrNull(
				selectedDoctorStaffId
			),

		doctorAuthUserId:
			toNumberOrNull(
				selectedDoctorAuthUserId
			),

		doctorName:
			getSelectedDoctorName(),

		department:
			getSelectedDoctorDepartment(),

		appointmentType:
			appointmentType,

		appointmentDate:
			getValue("appointmentDate"),

		appointmentTime:
			getValue("appointmentTime"),

		symptoms:
			getValue("symptoms"),

		notes:
			getValue("notes")
	};

	if (!payload.tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!payload.patientId) {
		showMsg(
			"Please select patient."
		);

		return;
	}

	if (!payload.doctorStaffId) {
		showMsg(
			"Please select doctor."
		);

		return;
	}

	if (!payload.doctorAuthUserId) {
		showMsg(
			"Selected doctor login ID is missing."
		);

		return;
	}

	if (!payload.appointmentType) {
		showMsg(
			"Please select appointment type."
		);

		return;
	}

	if (
		payload.appointmentType === "ONLINE" &&
		!isSelectedDoctorOnlineEnabled()
	) {
		showMsg(
			"Online consultation is not enabled for selected doctor."
		);

		return;
	}

	if (!payload.appointmentDate) {
		showMsg(
			"Please select appointment date."
		);

		return;
	}

	if (
		!isUpdate &&
		payload.appointmentDate <
		getLocalDateText(new Date())
	) {
		showMsg(
			"Appointment date cannot be in the past."
		);

		return;
	}

	if (!payload.appointmentTime) {
		showMsg(
			"Please select available slot."
		);

		return;
	}

	const url =
		isUpdate
			? `${API_BASE}/saas/appointments/${encodeURIComponent(appointmentId)}?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/appointments`;

	const method =
		isUpdate
			? "PUT"
			: "POST";

	isSavingAppointment = true;

	setButtonLoading(
		"saveAppointmentBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				url,
				{
					method: method,

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
			console.error(
				"Appointment save failed:",
				response.status,
				result
			);

			showMsg(
				getApiErrorMessage(
					result,
					`Unable to save appointment. HTTP status: ${response.status}`
				)
			);

			return;
		}

		if (appointmentModal) {
			appointmentModal.hide();
		}

		showMsg(
			isUpdate
				? "Appointment updated successfully."
				: "Appointment booked successfully.",
			"success"
		);

		await loadAppointments();

	} catch (error) {
		console.error(
			"Appointment save error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		isSavingAppointment = false;

		setButtonLoading(
			"saveAppointmentBtn",
			"Save Appointment",
			false
		);
	}
}

async function updateStatus(
	appointmentId,
	status
) {
	const normalizedStatus =
		String(status || "")
			.toUpperCase();

	const requiresApproval =
		normalizedStatus === "CONFIRMED" ||
		normalizedStatus === "REJECTED";

	const requiresUpdate =
		normalizedStatus === "COMPLETED";

	const requiresDelete =
		normalizedStatus === "CANCELLED";

	if (
		requiresApproval &&
		!appointmentPermissions.approve
	) {
		showMsg(
			"You do not have approval permission."
		);

		return;
	}

	if (
		requiresUpdate &&
		!appointmentPermissions.update
	) {
		showMsg(
			"You do not have update permission."
		);

		return;
	}

	if (
		requiresDelete &&
		!appointmentPermissions.delete
	) {
		showMsg(
			"You do not have cancel permission."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	if (
		!confirm(
			"Change appointment status to " +
			normalizedStatus +
			"?"
		)
	) {
		return;
	}

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId,
				status: normalizedStatus
			});

		const response =
			await fetch(
				`${API_BASE}/saas/appointments/${encodeURIComponent(appointmentId)}/status?${query.toString()}`,
				{
					method: "PUT",

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
					"Unable to update appointment status."
				)
			);

			return;
		}

		showMsg(
			"Appointment status updated successfully.",
			"success"
		);

		await loadAppointments();

	} catch (error) {
		console.error(
			"Unable to update appointment status:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);
	}
}

function clearAppointmentForm() {
	[
		"appointmentId",
		"patientId",
		"doctorStaffId",
		"appointmentDate",
		"appointmentTime",
		"symptoms",
		"notes"
	].forEach(
		function(id) {
			setValue(id, "");
		}
	);

	setValue(
		"appointmentType",
		"OPD"
	);

	resetAppointmentSlots();
	updateSelectedDoctorInfo();
}

function getSelectedDoctorOption() {
	const select =
		document.getElementById(
			"doctorStaffId"
		);

	if (
		!select ||
		!select.value
	) {
		return null;
	}

	return (
		select.options[
		select.selectedIndex
		] || null
	);
}

function getSelectedDoctorAuthUserId() {
	const option =
		getSelectedDoctorOption();

	return option
		? option.dataset.authUserId || ""
		: "";
}

function getSelectedDoctorName() {
	const option =
		getSelectedDoctorOption();

	return option
		? (
			option.dataset.doctorName ||
			option.textContent ||
			""
		)
		: "";
}

function getSelectedDoctorDepartment() {
	const option =
		getSelectedDoctorOption();

	return option
		? option.dataset.department || ""
		: "";
}

function isSelectedDoctorOnlineEnabled() {
	const option =
		getSelectedDoctorOption();

	return option
		? option.dataset.onlineEnabled === "true"
		: false;
}

function updateAppointmentSummary(
	appointments
) {
	const list =
		Array.isArray(appointments)
			? appointments
			: [];

	setSummaryValue(
		"totalAppointments",
		list.length
	);

	setSummaryValue(
		"pendingAppointments",
		list.filter(
			item =>
				item.status === "PENDING" ||
				item.status === "PAYMENT_PENDING"
		).length
	);

	setSummaryValue(
		"confirmedAppointments",
		list.filter(
			item =>
				item.status === "CONFIRMED"
		).length
	);

	setSummaryValue(
		"completedAppointments",
		list.filter(
			item =>
				item.status === "COMPLETED"
		).length
	);
}

function showAppointmentsLoadingState() {
	const tableBody =
		document.getElementById(
			"appointmentsTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="7">

				<div class="saas-appointments-state">

					<div class="saas-appointments-state-icon saas-appointments-loading-icon">
						<i class="bi bi-calendar2-check-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading appointments
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare the workspace schedule.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showAppointmentsErrorState(
	message
) {
	const tableBody =
		document.getElementById(
			"appointmentsTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="7">

				<div class="saas-appointments-state">

					<div class="saas-appointments-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load appointments
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function getAppointmentTimestamp(
	appointment
) {
	const date =
		appointment?.appointmentDate || "";

	const time =
		normalizeTime(
			appointment?.appointmentTime
		) || "00:00";

	const parsed =
		new Date(
			`${date}T${time}:00`
		);

	return Number.isNaN(parsed.getTime())
		? Number.MAX_SAFE_INTEGER
		: parsed.getTime();
}

function getValue(id) {
	const element =
		document.getElementById(id);

	return element
		? String(element.value || "").trim()
		: "";
}

function setValue(
	id,
	value
) {
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

function setText(
	id,
	value
) {
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

	window.setTimeout(
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
		button.dataset.originalHtml =
			button.innerHTML;

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

function setSummaryValue(
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

function normalizeTime(
	timeValue
) {
	if (!timeValue) {
		return "";
	}

	const parts =
		String(timeValue)
			.split(":");

	const hour =
		parts[0] || "00";

	const minute =
		parts[1] || "00";

	return (
		`${hour.padStart(2, "0")}:` +
		`${minute.padStart(2, "0")}`
	);
}

function formatDate(
	dateValue
) {
	if (!dateValue) {
		return "-";
	}

	const date =
		new Date(
			`${dateValue}T00:00:00`
		);

	if (Number.isNaN(date.getTime())) {
		return escapeHtml(dateValue);
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

function formatTime(
	timeValue
) {
	if (!timeValue) {
		return "-";
	}

	const parts =
		String(timeValue)
			.split(":");

	let hours =
		Number(parts[0]);

	if (!Number.isFinite(hours)) {
		return escapeHtml(timeValue);
	}

	const minutes =
		parts[1] || "00";

	const ampm =
		hours >= 12
			? "PM"
			: "AM";

	hours =
		hours % 12 || 12;

	return (
		`${String(hours).padStart(2, "0")}:` +
		`${minutes} ${ampm}`
	);
}

function formatMoney(value) {
	const numeric =
		Number(value);

	return Number.isFinite(numeric)
		? numeric.toFixed(2)
		: "0.00";
}

function getLocalDateText(date) {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0")
	].join("-");
}

function toNumberOrNull(value) {
	const numeric =
		Number(value);

	return Number.isFinite(numeric) &&
		numeric > 0
		? numeric
		: null;
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

function safeNumber(value) {
	const numeric =
		Number(value);

	return Number.isFinite(numeric)
		? numeric
		: 0;
}

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
	return escapeHtml(value);
}