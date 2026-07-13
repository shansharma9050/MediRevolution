let opdModal;
let allOpdVisits = [];

let opdPermissions = {
	create: false,
	update: false,
	delete: false,
	print: false
};

let isLoadingOpdVisits = false;
let isSavingOpdVisit = false;
let completingOpdIds = new Set();

document.addEventListener("DOMContentLoaded", async function() {
	const allowed =
		await protectSaasPage(
			"OPD",
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
		document.getElementById("opdModal");

	if (modalElement) {
		opdModal =
			bootstrap.Modal.getOrCreateInstance(
				modalElement
			);
	}

	await applyOpdButtonPermissions();

	await Promise.all([
		loadPatientsDropdown(),
		loadDoctorsDropdown()
	]);

	await loadOpdVisits();
});

async function loadOpdVisits() {
	if (isLoadingOpdVisits) {
		return;
	}

	isLoadingOpdVisits = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showOpdLoadingState();

	setButtonLoading(
		"refreshOpdBtn",
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
				`${API_BASE}/saas/opd?${query.toString()}`,
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
			allOpdVisits = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load OPD visits."
				);

			showMsg(message);
			showOpdErrorState(message);
			updateOpdSummary();

			return;
		}

		allOpdVisits =
			normalizeArrayResponse(result);

		allOpdVisits.sort(
			function(a, b) {
				return (
					safeDateTimestamp(
						b.visitDateTime
					) -
					safeDateTimestamp(
						a.visitDateTime
					)
				);
			}
		);

		renderOpdVisits(
			allOpdVisits
		);

		updateOpdSummary();

		await applyOpdButtonPermissions();

	} catch (error) {
		console.error(
			"Load OPD visits error:",
			error
		);

		allOpdVisits = [];

		showMsg(
			"SaaS service not reachable."
		);

		showOpdErrorState(
			"SaaS OPD service is currently unavailable."
		);

		updateOpdSummary();

	} finally {
		isLoadingOpdVisits = false;

		setButtonLoading(
			"refreshOpdBtn",
			"Refresh",
			false
		);
	}
}

function filterOpdVisits() {
	const keyword =
		getValue("opdSearchBox")
			.toLowerCase();

	const status =
		getValue("opdStatusFilter")
			.toUpperCase();

	const filtered =
		allOpdVisits.filter(
			function(visit) {
				const searchableText = [
					visit.opdNumber,
					visit.patientName,
					visit.patientMobile,
					visit.doctorName,
					visit.department,
					visit.diagnosis,
					visit.symptoms
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				const keywordMatches =
					!keyword ||
					searchableText.includes(
						keyword
					);

				const statusMatches =
					!status ||
					String(
						visit.status || ""
					).toUpperCase() === status;

				return (
					keywordMatches &&
					statusMatches
				);
			}
		);

	renderOpdVisits(filtered);
}

function renderOpdVisits(visits) {
	const tbody =
		document.getElementById(
			"opdTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(visits)
			? visits
			: [];

	if (!list.length) {
		tbody.innerHTML = `
			<tr>
				<td colspan="8">

					<div class="opd-state">

						<div class="opd-state-icon">
							<i class="bi bi-clipboard2-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No OPD visits found
						</h5>

						<p class="text-muted mb-0">
							Create an OPD visit or change the selected filters.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(visit, index) {
				const opdId =
					safeNumber(visit.id);

				const status =
					String(
						visit.status || ""
					).toUpperCase();

				return `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>
							<strong class="text-primary">
								${safe(visit.opdNumber)}
							</strong>
						</td>

						<td>
							${formatDateTime(visit.visitDateTime)}
						</td>

						<td>

							<div class="opd-person-cell">

								<div class="opd-person-icon">
									<i class="bi bi-person-fill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(visit.patientName)}
									</strong>

									<div class="text-muted small">
										${safe(visit.patientMobile)}
									</div>

								</div>

							</div>

						</td>

						<td>

							<div class="opd-person-cell">

								<div class="opd-person-icon">
									<i class="bi bi-person-badge-fill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(visit.doctorName)}
									</strong>

									<div class="text-muted small">
										${safe(visit.department)}
									</div>

								</div>

							</div>

						</td>

						<td>
							${safe(visit.diagnosis)}
						</td>

						<td>
							<strong>
								₹${formatAmount(visit.consultationFee)}
							</strong>
						</td>

						<td>
							${opdStatusBadge(status)}
						</td>

						<td>

							${status === "OPEN"
						? `
									<button type="button"
											id="completeOpdBtn_${opdId}"
											class="btn btn-sm btn-outline-success complete-opd-btn"
											onclick="completeOpd(${opdId})"
											${opdId ? "" : "disabled"}>

										<i class="bi bi-check-circle-fill me-1"></i>
										Complete
									</button>
								`
						: "-"
					}

						</td>

					</tr>
				`;
			}
		).join("");

	applyOpdButtonPermissions();
}

async function applyOpdButtonPermissions() {
	const [
		canCreate,
		canUpdate,
		canDelete,
		canPrint
	] =
		await Promise.all([
			hasSaasPermission(
				"OPD",
				"CREATE"
			),
			hasSaasPermission(
				"OPD",
				"UPDATE"
			),
			hasSaasPermission(
				"OPD",
				"DELETE"
			),
			hasSaasPermission(
				"OPD",
				"PRINT"
			)
		]);

	opdPermissions = {
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
		"addOpdBtn",
		opdPermissions.create
	);

	showOrHideByClass(
		"complete-opd-btn",
		opdPermissions.update
	);

	showOrHideByClass(
		"edit-opd-btn",
		opdPermissions.update
	);

	showOrHideByClass(
		"delete-opd-btn",
		opdPermissions.delete
	);

	showOrHideByClass(
		"print-opd-btn",
		opdPermissions.print
	);
}

function openCreateOpdModal() {
	if (!opdPermissions.create) {
		showMsg(
			"You do not have permission to create OPD visits."
		);

		return;
	}

	clearOpdForm();

	if (opdModal) {
		opdModal.show();
	}
}

async function saveOpdVisit() {
	if (isSavingOpdVisit) {
		return;
	}

	if (!opdPermissions.create) {
		showMsg(
			"You do not have permission to create OPD visits."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const payload = {
		tenantId:
			toPositiveNumberOrNull(
				tenantId
			),

		patientId:
			toPositiveNumberOrNull(
				getValue("patientId")
			),

		doctorProfileId:
			toPositiveNumberOrNull(
				getValue("doctorProfileId")
			),

		appointmentId:
			toPositiveNumberOrNull(
				getValue("appointmentId")
			),

		symptoms:
			getValue("symptoms"),

		diagnosis:
			getValue("diagnosis"),

		notes:
			getValue("notes"),

		consultationFee:
			toNonNegativeNumber(
				getValue("consultationFee")
			)
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

	if (!payload.doctorProfileId) {
		showMsg(
			"Please select doctor."
		);

		return;
	}

	isSavingOpdVisit = true;

	setButtonLoading(
		"saveOpdBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/saas/opd`,
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
					"Unable to save OPD visit."
				)
			);

			return;
		}

		if (opdModal) {
			opdModal.hide();
		}

		clearOpdForm();

		showMsg(
			"OPD visit created successfully.",
			"success"
		);

		await loadOpdVisits();

	} catch (error) {
		console.error(
			"Save OPD visit error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		isSavingOpdVisit = false;

		setButtonLoading(
			"saveOpdBtn",
			"Save OPD",
			false
		);
	}
}

async function completeOpd(opdId) {
	if (!opdPermissions.update) {
		showMsg(
			"You do not have permission to complete OPD visits."
		);

		return;
	}

	const numericId =
		Number(opdId);

	if (
		!Number.isFinite(numericId) ||
		numericId <= 0
	) {
		showMsg(
			"Invalid OPD visit selected."
		);

		return;
	}

	if (
		completingOpdIds.has(
			numericId
		)
	) {
		return;
	}

	if (
		!confirm(
			"Complete this OPD visit?"
		)
	) {
		return;
	}

	completingOpdIds.add(
		numericId
	);

	setButtonLoading(
		`completeOpdBtn_${numericId}`,
		"Completing...",
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
				`${API_BASE}/saas/opd/${encodeURIComponent(numericId)}/complete?${query.toString()}`,
				{
					method: "PUT",

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
					"Unable to complete OPD."
				)
			);

			return;
		}

		showMsg(
			"OPD completed successfully.",
			"success"
		);

		await loadOpdVisits();

	} catch (error) {
		console.error(
			"Complete OPD error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		completingOpdIds.delete(
			numericId
		);
	}
}

async function loadPatientsDropdown() {
	const select =
		document.getElementById(
			"patientId"
		);

	if (!select) {
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

		select.innerHTML = `
			<option value="">
				Select Patient
			</option>
		`;

		if (
			!response.ok ||
			!Array.isArray(result)
		) {
			return;
		}

		result.forEach(
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
					`${patient.patientName || "Patient"}` +
					`${patient.mobile ? ` (${patient.mobile})` : ""}`;

				select.appendChild(
					option
				);
			}
		);

	} catch (error) {
		console.error(
			"Patient dropdown error:",
			error
		);

		select.innerHTML = `
			<option value="">
				Service unavailable
			</option>
		`;
	}
}

async function loadDoctorsDropdown() {
	const select =
		document.getElementById(
			"doctorProfileId"
		);

	if (!select) {
		console.error(
			"Doctor dropdown #doctorProfileId not found."
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
				tenantId:
					localStorage.getItem(
						"tenantId"
					)
			});

		const response =
			await fetch(
				`${API_BASE}/saas/staff/doctors/for-clinical?${query.toString()}`,
				{
					method: "GET",

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
			select.innerHTML = `
				<option value="">
					Unable to load doctors
				</option>
			`;

			console.error(
				"Doctor list load failed:",
				response.status,
				result
			);

			return;
		}

		select.innerHTML = `
			<option value="">
				Select Doctor
			</option>
		`;

		if (
			!Array.isArray(result) ||
			result.length === 0
		) {
			select.innerHTML = `
				<option value="">
					No doctors found
				</option>
			`;

			return;
		}

		let addedDoctors = 0;

		result.forEach(
			function(staff) {
				if (
					!staff.id ||
					!staff.authUserId
				) {
					console.warn(
						"Doctor skipped because id/authUserId is missing:",
						staff
					);

					return;
				}

				const option =
					document.createElement(
						"option"
					);

				/*
				 * Element ID legacy doctorProfileId है,
				 * selected value SaasStaff.id ही रहेगा।
				 */
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

				select.appendChild(
					option
				);

				addedDoctors++;
			}
		);

		if (addedDoctors === 0) {
			select.innerHTML = `
				<option value="">
					Doctors found, but login IDs are missing
				</option>
			`;
		}

	} catch (error) {
		console.error(
			"Doctor dropdown load error:",
			error
		);

		select.innerHTML = `
			<option value="">
				Service not reachable
			</option>
		`;
	}
}

function clearOpdForm() {
	[
		"patientId",
		"doctorProfileId",
		"appointmentId",
		"symptoms",
		"diagnosis",
		"notes"
	].forEach(
		function(id) {
			setValue(id, "");
		}
	);

	setValue(
		"consultationFee",
		"0"
	);
}

function updateOpdSummary() {
	setAnimatedNumber(
		"totalOpdCount",
		allOpdVisits.length
	);

	setAnimatedNumber(
		"openOpdCount",
		allOpdVisits.filter(
			visit =>
				String(
					visit.status || ""
				).toUpperCase() === "OPEN"
		).length
	);

	setAnimatedNumber(
		"completedOpdCount",
		allOpdVisits.filter(
			visit =>
				String(
					visit.status || ""
				).toUpperCase() ===
				"COMPLETED"
		).length
	);

	const totalFee =
		allOpdVisits.reduce(
			(sum, visit) =>
				sum +
				toNonNegativeNumber(
					visit.consultationFee
				),
			0
		);

	setText(
		"totalOpdFee",
		formatShortMoney(totalFee)
	);
}

function showOpdLoadingState() {
	const tbody =
		document.getElementById(
			"opdTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="opd-state">

					<div class="opd-state-icon opd-loading">
						<i class="bi bi-hospital-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading OPD visits
					</h5>

					<p class="text-muted mb-0">
						Please wait while outpatient records are prepared.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showOpdErrorState(message) {
	const tbody =
		document.getElementById(
			"opdTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="opd-state">

					<div class="opd-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load OPD visits
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
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

function opdStatusBadge(status) {
	if (status === "OPEN") {
		return `
			<span class="opd-status-pill open">

				<i class="bi bi-hourglass-split"></i>
				Open

			</span>
		`;
	}

	if (status === "COMPLETED") {
		return `
			<span class="opd-status-pill completed">

				<i class="bi bi-check-circle-fill"></i>
				Completed

			</span>
		`;
	}

	return `
		<span class="opd-status-pill other">

			<i class="bi bi-info-circle-fill"></i>
			${escapeHtml(status || "UNKNOWN")}

		</span>
	`;
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
		document.getElementById("msg");

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

function toPositiveNumberOrNull(value) {
	const number =
		Number(value);

	return Number.isFinite(number) &&
		number > 0
		? number
		: null;
}

function toNonNegativeNumber(value) {
	const number =
		Number(value);

	return Number.isFinite(number) &&
		number >= 0
		? number
		: 0;
}

function safeDateTimestamp(value) {
	const date =
		new Date(value);

	return Number.isNaN(
		date.getTime()
	)
		? 0
		: date.getTime();
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

function formatAmount(value) {
	const number =
		Number(value);

	if (!Number.isFinite(number)) {
		return "0.00";
	}

	return number.toLocaleString(
		"en-IN",
		{
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}
	);
}

function formatShortMoney(value) {
	const amount =
		toNonNegativeNumber(value);

	if (amount >= 10000000) {
		return `₹${(amount / 10000000).toFixed(1)}Cr`;
	}

	if (amount >= 100000) {
		return `₹${(amount / 100000).toFixed(1)}L`;
	}

	if (amount >= 1000) {
		return `₹${(amount / 1000).toFixed(1)}K`;
	}

	return `₹${amount.toFixed(0)}`;
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