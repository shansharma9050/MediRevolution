let availabilityModal;
let doctorList = [];
let currentAvailabilityList = [];
let availabilityPermissions = {
	create: false,
	delete: false
};

let isLoadingDoctors = false;
let isLoadingAvailability = false;
let isSavingAvailability = false;
let isLoadingSlots = false;
let isDeletingAvailability = false;

document.addEventListener("DOMContentLoaded", async function() {
	const allowed =
		await protectSaasPage(
			"DOCTOR_AVAILABILITY",
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
			"availabilityModal"
		);

	if (modalElement) {
		availabilityModal =
			bootstrap.Modal.getOrCreateInstance(
				modalElement
			);
	}

	setTodayAsDefaultDate();
	setAvailabilityDateMinimum();

	await applyAvailabilityButtonPermissions();
	await loadDoctorsDropdown();
	await loadAvailability();
});

function setTodayAsDefaultDate() {
	const today =
		getLocalDateText(
			new Date()
		);

	const filterDate =
		document.getElementById(
			"filterDate"
		);

	const availableDate =
		document.getElementById(
			"availableDate"
		);

	if (
		filterDate &&
		!filterDate.value
	) {
		filterDate.value = today;
	}

	if (
		availableDate &&
		!availableDate.value
	) {
		availableDate.value = today;
	}
}

function setAvailabilityDateMinimum() {
	const availableDate =
		document.getElementById(
			"availableDate"
		);

	if (availableDate) {
		availableDate.min =
			getLocalDateText(
				new Date()
			);
	}
}

async function loadDoctorsDropdown() {
	if (isLoadingDoctors) {
		return;
	}

	isLoadingDoctors = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	if (!tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		isLoadingDoctors = false;
		return;
	}

	setDoctorDropdownLoadingState();

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/permissions/members?${query.toString()}`,
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
			doctorList = [];

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load doctors."
				)
			);

			renderDoctorDropdowns();
			updateAvailabilitySummary();

			return;
		}

		const members =
			Array.isArray(result)
				? result
				: [];

		doctorList =
			members.filter(
				function(member) {
					const role =
						String(
							member.memberRole ||
							member.role ||
							""
						)
							.trim()
							.toUpperCase();

					return (
						role === "DOCTOR" ||
						role === "OWNER" ||
						role === "ADMIN"
					);
				}
			);

		renderDoctorDropdowns();
		updateAvailabilitySummary();

	} catch (error) {
		console.error(
			"Load doctors error:",
			error
		);

		doctorList = [];

		renderDoctorDropdowns();

		showMsg(
			"SaaS service not reachable while loading doctors."
		);

		updateAvailabilitySummary();

	} finally {
		isLoadingDoctors = false;
	}
}

function setDoctorDropdownLoadingState() {
	const filterSelect =
		document.getElementById(
			"filterDoctorAuthUserId"
		);

	const formSelect =
		document.getElementById(
			"doctorAuthUserId"
		);

	if (filterSelect) {
		filterSelect.innerHTML = `
			<option value="">
				Loading doctors...
			</option>
		`;
	}

	if (formSelect) {
		formSelect.innerHTML = `
			<option value="">
				Loading doctors...
			</option>
		`;
	}
}

function renderDoctorDropdowns() {
	const filterSelect =
		document.getElementById(
			"filterDoctorAuthUserId"
		);

	const formSelect =
		document.getElementById(
			"doctorAuthUserId"
		);

	if (filterSelect) {
		filterSelect.innerHTML = `
			<option value="">
				Select Doctor
			</option>
		`;
	}

	if (formSelect) {
		formSelect.innerHTML = `
			<option value="">
				Select Doctor
			</option>
		`;
	}

	doctorList.forEach(
		function(doctor) {
			const authUserId =
				doctor.authUserId ||
				doctor.userId;

			const name =
				doctor.name ||
				doctor.fullName ||
				doctor.memberName ||
				"Doctor";

			const role =
				doctor.memberRole ||
				doctor.role ||
				"";

			if (!authUserId) {
				return;
			}

			[
				filterSelect,
				formSelect
			].forEach(
				function(select) {
					if (!select) {
						return;
					}

					const option =
						document.createElement(
							"option"
						);

					option.value =
						String(authUserId);

					option.dataset.name =
						String(name);

					option.textContent =
						`${name} (${role || "DOCTOR"})`;

					select.appendChild(
						option
					);
				}
			);
		}
	);
}

async function loadAvailability() {
	if (isLoadingAvailability) {
		return;
	}

	isLoadingAvailability = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const doctorAuthUserId =
		getValue(
			"filterDoctorAuthUserId"
		);

	const date =
		getValue("filterDate");

	showAvailabilityLoadingState();

	setButtonLoading(
		"searchAvailabilityBtn",
		"Searching...",
		true
	);

	if (!tenantId) {
		currentAvailabilityList = [];

		showAvailabilityErrorState(
			"Please select SaaS workspace first."
		);

		updateAvailabilitySummary();

		isLoadingAvailability = false;

		setButtonLoading(
			"searchAvailabilityBtn",
			"Search",
			false
		);

		return;
	}

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		if (doctorAuthUserId) {
			query.set(
				"doctorAuthUserId",
				doctorAuthUserId
			);
		}

		if (date) {
			query.set(
				"date",
				date
			);
		}

		const response =
			await fetch(
				`${API_BASE}/saas/doctor-availability?${query.toString()}`,
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
			currentAvailabilityList = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load availability."
				);

			showMsg(message);
			showAvailabilityErrorState(message);
			updateAvailabilitySummary();

			return;
		}

		currentAvailabilityList =
			Array.isArray(result)
				? result
				: [];

		currentAvailabilityList.sort(
			function(a, b) {
				return (
					getAvailabilityTimestamp(a) -
					getAvailabilityTimestamp(b)
				);
			}
		);

		renderAvailability(
			currentAvailabilityList
		);

		updateAvailabilitySummary();
		applyAvailabilityButtonPermissions();

	} catch (error) {
		console.error(
			"Load availability error:",
			error
		);

		currentAvailabilityList = [];

		showMsg(
			"SaaS service not reachable."
		);

		showAvailabilityErrorState(
			"SaaS doctor availability service is currently unavailable."
		);

		updateAvailabilitySummary();

	} finally {
		isLoadingAvailability = false;

		setButtonLoading(
			"searchAvailabilityBtn",
			"Search",
			false
		);
	}
}

function renderAvailability(list) {
	const tableBody =
		document.getElementById(
			"availabilityTableBody"
		);

	if (!tableBody) {
		return;
	}

	if (
		!Array.isArray(list) ||
		!list.length
	) {
		tableBody.innerHTML = `
			<tr>
				<td colspan="7">

					<div class="saas-availability-state">

						<div class="saas-availability-state-icon">
							<i class="bi bi-calendar-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No availability found
						</h5>

						<p class="text-muted mb-0">
							Create a doctor schedule or change the selected filters.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableBody.innerHTML =
		list.map(
			function(item, index) {
				const availabilityId =
					safeNumber(item.id);

				return `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>

							<div class="saas-availability-doctor">

								<div class="saas-availability-doctor-icon">
									<i class="bi bi-person-badge-fill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(item.doctorName)}
									</strong>

									<div class="text-muted small">
										Auth ID:
										${safe(item.doctorAuthUserId)}
									</div>

								</div>

							</div>

						</td>

						<td>
							${formatDate(item.availableDate)}
						</td>

						<td>
							${formatTime(item.startTime)}
						</td>

						<td>
							${formatTime(item.endTime)}
						</td>

						<td>
							<strong>
								${safe(item.slotDurationMinutes)} min
							</strong>
						</td>

						<td>
							${availabilityStatusBadge(item.status)}
						</td>

						<td>

							<button type="button"
									class="btn btn-sm btn-outline-danger delete-availability-btn"
									onclick="deleteAvailability(${availabilityId})"
									${availabilityId ? "" : "disabled"}>

								<i class="bi bi-trash-fill me-1"></i>
								Delete
							</button>

						</td>

					</tr>
				`;
			}
		).join("");
}

function openCreateAvailabilityModal() {
	if (!availabilityPermissions.create) {
		showMsg(
			"You do not have permission to create doctor availability."
		);

		return;
	}

	clearAvailabilityForm();

	setText(
		"availabilityModalTitle",
		"Add Doctor Availability"
	);

	const filterDoctorAuthUserId =
		getValue(
			"filterDoctorAuthUserId"
		);

	const filterDate =
		getValue("filterDate");

	if (filterDoctorAuthUserId) {
		setValue(
			"doctorAuthUserId",
			filterDoctorAuthUserId
		);
	}

	if (filterDate) {
		setValue(
			"availableDate",
			filterDate
		);
	}

	if (availabilityModal) {
		availabilityModal.show();
	}
}

function clearAvailabilityForm() {
	setValue(
		"availabilityId",
		""
	);

	setValue(
		"doctorAuthUserId",
		""
	);

	setValue(
		"availableDate",
		getLocalDateText(
			new Date()
		)
	);

	setValue(
		"startTime",
		""
	);

	setValue(
		"endTime",
		""
	);

	setValue(
		"slotDurationMinutes",
		"15"
	);
}

async function saveAvailability() {
	if (isSavingAvailability) {
		return;
	}

	if (!availabilityPermissions.create) {
		showMsg(
			"You do not have permission to create doctor availability."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const doctorAuthUserId =
		getValue(
			"doctorAuthUserId"
		);

	const doctorName =
		getSelectedDoctorName(
			"doctorAuthUserId"
		);

	const availableDate =
		getValue("availableDate");

	const startTime =
		getValue("startTime");

	const endTime =
		getValue("endTime");

	const slotDurationMinutes =
		getValue(
			"slotDurationMinutes"
		);

	if (!tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!doctorAuthUserId) {
		showMsg(
			"Please select doctor."
		);

		return;
	}

	if (!availableDate) {
		showMsg(
			"Please select available date."
		);

		return;
	}

	if (
		availableDate <
		getLocalDateText(new Date())
	) {
		showMsg(
			"Available date cannot be in the past."
		);

		return;
	}

	if (!startTime) {
		showMsg(
			"Please enter start time."
		);

		return;
	}

	if (!endTime) {
		showMsg(
			"Please enter end time."
		);

		return;
	}

	if (
		normalizeTime(endTime) <=
		normalizeTime(startTime)
	) {
		showMsg(
			"End time must be after start time."
		);

		return;
	}

	const slotDuration =
		Number(slotDurationMinutes);

	if (
		!Number.isFinite(slotDuration) ||
		slotDuration <= 0
	) {
		showMsg(
			"Please select valid slot duration."
		);

		return;
	}

	const scheduleMinutes =
		getTimeDifferenceMinutes(
			startTime,
			endTime
		);

	if (
		slotDuration >
		scheduleMinutes
	) {
		showMsg(
			"Slot duration cannot exceed available time range."
		);

		return;
	}

	const payload = {
		tenantId:
			Number(tenantId),

		doctorAuthUserId:
			Number(doctorAuthUserId),

		doctorName:
			doctorName,

		availableDate:
			availableDate,

		startTime:
			startTime,

		endTime:
			endTime,

		slotDurationMinutes:
			slotDuration
	};

	isSavingAvailability = true;

	setButtonLoading(
		"saveAvailabilityBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/saas/doctor-availability`,
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
					"Unable to save availability."
				)
			);

			return;
		}

		if (availabilityModal) {
			availabilityModal.hide();
		}

		showMsg(
			"Doctor availability saved successfully.",
			"success"
		);

		setValue(
			"filterDoctorAuthUserId",
			doctorAuthUserId
		);

		setValue(
			"filterDate",
			availableDate
		);

		await loadAvailability();
		await previewSlots();

	} catch (error) {
		console.error(
			"Save availability error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		isSavingAvailability = false;

		setButtonLoading(
			"saveAvailabilityBtn",
			"Save Availability",
			false
		);
	}
}

async function previewSlots() {
	if (isLoadingSlots) {
		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const doctorAuthUserId =
		getValue(
			"filterDoctorAuthUserId"
		);

	const date =
		getValue("filterDate");

	const box =
		document.getElementById(
			"slotsPreviewBox"
		);

	if (!box) {
		return;
	}

	if (!tenantId) {
		renderSlotsPreviewError(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!doctorAuthUserId) {
		renderSlotsPreviewError(
			"Please select doctor."
		);

		return;
	}

	if (!date) {
		renderSlotsPreviewError(
			"Please select date."
		);

		return;
	}

	isLoadingSlots = true;

	setButtonLoading(
		"previewSlotsBtn",
		"Loading...",
		true
	);

	box.innerHTML = `
		<div class="d-flex align-items-center gap-2 text-muted">
			<span class="spinner-border spinner-border-sm"></span>
			Loading slots...
		</div>
	`;

	try {
		const query =
			new URLSearchParams({
				tenantId:
					tenantId,

				doctorAuthUserId:
					doctorAuthUserId,

				date:
					date
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
			renderSlotsPreviewError(
				getApiErrorMessage(
					result,
					"Unable to load slots."
				)
			);

			setAnimatedNumber(
				"slotPreviewCount",
				0
			);

			return;
		}

		renderSlotsPreview(
			Array.isArray(result)
				? result
				: []
		);

	} catch (error) {
		console.error(
			"Preview slots error:",
			error
		);

		renderSlotsPreviewError(
			"SaaS service not reachable."
		);

		setAnimatedNumber(
			"slotPreviewCount",
			0
		);

	} finally {
		isLoadingSlots = false;

		setButtonLoading(
			"previewSlotsBtn",
			"Preview Slots",
			false
		);
	}
}

function renderSlotsPreview(slots) {
	const box =
		document.getElementById(
			"slotsPreviewBox"
		);

	if (!box) {
		return;
	}

	setAnimatedNumber(
		"slotPreviewCount",
		slots.length
	);

	if (!slots.length) {
		box.innerHTML = `
			<p class="text-muted mb-0">
				No slots available for selected doctor and date.
			</p>
		`;

		return;
	}

	box.innerHTML =
		slots.map(
			function(slot) {
				const className =
					slot.booked === true
						? "booked"
						: "available";

				const icon =
					slot.booked === true
						? "bi bi-x-circle-fill"
						: "bi bi-check-circle-fill";

				const label =
					slot.label ||
					`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;

				return `
					<span class="slot-chip ${className}">

						<i class="${icon}"></i>

						${safe(label)}
					</span>
				`;
			}
		).join("");
}

function renderSlotsPreviewError(message) {
	const box =
		document.getElementById(
			"slotsPreviewBox"
		);

	if (!box) {
		return;
	}

	box.innerHTML = `
		<p class="text-danger mb-0">
			<i class="bi bi-exclamation-triangle-fill me-1"></i>
			${escapeHtml(message)}
		</p>
	`;
}

async function deleteAvailability(
	availabilityId
) {
	if (isDeletingAvailability) {
		return;
	}

	if (!availabilityPermissions.delete) {
		showMsg(
			"You do not have permission to delete doctor availability."
		);

		return;
	}

	const numericId =
		Number(availabilityId);

	if (
		!Number.isFinite(numericId) ||
		numericId <= 0
	) {
		showMsg(
			"Invalid availability selected."
		);

		return;
	}

	if (
		!confirm(
			"Delete this doctor availability?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	isDeletingAvailability = true;

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/doctor-availability/${encodeURIComponent(numericId)}?${query.toString()}`,
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
					"Unable to delete availability."
				)
			);

			return;
		}

		showMsg(
			result.message ||
			"Availability deleted successfully.",
			"success"
		);

		await loadAvailability();
		await previewSlots();

	} catch (error) {
		console.error(
			"Delete availability error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		isDeletingAvailability = false;
	}
}

async function applyAvailabilityButtonPermissions() {
	const [
		canCreate,
		canDelete
	] =
		await Promise.all([
			hasSaasPermission(
				"DOCTOR_AVAILABILITY",
				"CREATE"
			),
			hasSaasPermission(
				"DOCTOR_AVAILABILITY",
				"DELETE"
			)
		]);

	availabilityPermissions = {
		create:
			Boolean(canCreate),

		delete:
			Boolean(canDelete)
	};

	showOrHideById(
		"addAvailabilityBtn",
		availabilityPermissions.create
	);

	showOrHideByClass(
		"delete-availability-btn",
		availabilityPermissions.delete
	);
}

async function clearFilters() {
	setValue(
		"filterDoctorAuthUserId",
		""
	);

	setValue(
		"filterDate",
		getLocalDateText(
			new Date()
		)
	);

	setAnimatedNumber(
		"slotPreviewCount",
		0
	);

	const box =
		document.getElementById(
			"slotsPreviewBox"
		);

	if (box) {
		box.innerHTML = `
			<p class="text-muted mb-0">
				Select doctor and date, then click Preview Slots.
			</p>
		`;
	}

	await loadAvailability();
}

function updateAvailabilitySummary() {
	setAnimatedNumber(
		"totalAvailabilityCount",
		currentAvailabilityList.length
	);

	setAnimatedNumber(
		"doctorCount",
		doctorList.length
	);
}

function showAvailabilityLoadingState() {
	const tableBody =
		document.getElementById(
			"availabilityTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="7">

				<div class="saas-availability-state">

					<div class="saas-availability-state-icon saas-availability-loading">
						<i class="bi bi-calendar2-week-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading availability
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare doctor schedules.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showAvailabilityErrorState(
	message
) {
	const tableBody =
		document.getElementById(
			"availabilityTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="7">

				<div class="saas-availability-state">

					<div class="saas-availability-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load availability
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function getSelectedDoctorName(
	selectId
) {
	const select =
		document.getElementById(
			selectId
		);

	if (
		!select ||
		!select.value
	) {
		return "";
	}

	const selectedOption =
		select.options[
			select.selectedIndex
		];

	if (!selectedOption) {
		return "";
	}

	return (
		selectedOption.dataset.name ||
		selectedOption.textContent ||
		""
	).trim();
}

function getAvailabilityTimestamp(item) {
	const date =
		item?.availableDate || "";

	const time =
		normalizeTime(
			item?.startTime
		) || "00:00";

	const parsed =
		new Date(
			`${date}T${time}:00`
		);

	return Number.isNaN(parsed.getTime())
		? Number.MAX_SAFE_INTEGER
		: parsed.getTime();
}

function getTimeDifferenceMinutes(
	startTime,
	endTime
) {
	const start =
		timeToMinutes(startTime);

	const end =
		timeToMinutes(endTime);

	return end - start;
}

function timeToMinutes(value) {
	const [
		hour,
		minute
	] =
		normalizeTime(value)
			.split(":")
			.map(Number);

	return (
		(hour * 60) +
		minute
	);
}

function normalizeTime(value) {
	if (!value) {
		return "";
	}

	const parts =
		String(value)
			.split(":");

	return (
		`${String(parts[0] || "00").padStart(2, "0")}:` +
		`${String(parts[1] || "00").padStart(2, "0")}`
	);
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

function availabilityStatusBadge(status) {
	const normalized =
		String(status || "ACTIVE")
			.toUpperCase();

	if (normalized === "ACTIVE") {
		return `
			<span class="saas-availability-status active">

				<i class="bi bi-check-circle-fill"></i>
				Active

			</span>
		`;
	}

	if (normalized === "INACTIVE") {
		return `
			<span class="saas-availability-status inactive">

				<i class="bi bi-pause-circle-fill"></i>
				Inactive

			</span>
		`;
	}

	return `
		<span class="saas-availability-status inactive">

			<i class="bi bi-info-circle-fill"></i>
			${escapeHtml(normalized)}

		</span>
	`;
}

function formatDate(dateValue) {
	if (!dateValue) {
		return "-";
	}

	const date =
		new Date(
			`${dateValue}T00:00:00`
		);

	if (Number.isNaN(date.getTime())) {
		return safe(dateValue);
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

function formatTime(timeValue) {
	if (!timeValue) {
		return "-";
	}

	const parts =
		String(timeValue)
			.split(":");

	let hours =
		Number(parts[0]);

	if (!Number.isFinite(hours)) {
		return safe(timeValue);
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