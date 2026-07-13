let hospitalStaff = [];
let editingStaffId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadStaff();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleStaffForm() {
	const panel =
		document.getElementById(
			"staffFormPanel"
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

function openCreateStaffForm() {
	clearForm();

	const title =
		document.getElementById(
			"staffFormTitle"
		);

	if (title) {
		title.innerText =
			"Add Staff";
	}

	setSaveStaffButtonLabel(
		"Save Staff"
	);

	const panel =
		document.getElementById(
			"staffFormPanel"
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

function closeStaffForm() {
	clearForm();

	const panel =
		document.getElementById(
			"staffFormPanel"
		);

	if (panel) {
		panel.style.display = "none";
	}
}

async function loadStaff() {
	const token =
		localStorage.getItem("token");

	showStaffLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/staff`,
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
			hospitalStaff = [];

			updateHospitalStaffSummary();

			showStaffErrorState(
				getErrorMessage(
					result,
					"Unable to load staff"
				)
			);

			showMsg(
				getErrorMessage(
					result,
					"Unable to load staff"
				)
			);

			return;
		}

		hospitalStaff =
			Array.isArray(result)
				? result
				: [];

		renderStaff(
			hospitalStaff
		);

		updateHospitalStaffSummary();

	} catch (e) {
		console.error(
			"Load hospital staff error:",
			e
		);

		hospitalStaff = [];

		updateHospitalStaffSummary();

		showStaffErrorState(
			"Hospital service not reachable."
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

async function createStaff() {
	const payload = {
		staffName:
			getVal("staffName"),

		designation:
			getVal("designation"),

		department:
			getVal("department"),

		mobile:
			getVal("mobile"),

		email:
			getVal("email"),

		salary:
			toDecimal(
				getVal("salary")
			)
	};

	if (
		!payload.staffName ||
		!payload.designation ||
		!payload.department
	) {
		showMsg(
			"Staff name, designation and department are required"
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

	const token =
		localStorage.getItem("token");

	const url =
		editingStaffId
			? `${API_BASE}/hospital/staff/${editingStaffId}`
			: `${API_BASE}/hospital/staff`;

	const method =
		editingStaffId
			? "PUT"
			: "POST";

	setButtonLoading(
		"saveHospitalStaffBtn",
		editingStaffId
			? "Updating Staff..."
			: "Saving Staff...",
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
					"Unable to save staff"
				)
			);

			return;
		}

		showMsg(
			editingStaffId
				? "Staff updated successfully"
				: "Staff saved successfully",
			"success"
		);

		clearForm();

		const panel =
			document.getElementById(
				"staffFormPanel"
			);

		if (panel) {
			panel.style.display = "none";
		}

		loadStaff();

	} catch (e) {
		console.error(
			"Save hospital staff error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);

	} finally {
		setButtonLoading(
			"saveHospitalStaffBtn",
			editingStaffId
				? "Update Staff"
				: "Save Staff",
			false
		);
	}
}

function filterStaff() {
	const keyword =
		document
			.getElementById("searchBox")
			?.value
			.trim()
			.toLowerCase() || "";

	const filtered =
		hospitalStaff.filter(
			staff =>
				JSON.stringify(staff)
					.toLowerCase()
					.includes(keyword)
		);

	renderStaff(filtered);
}

function renderStaff(staff) {
	const table =
		document.getElementById(
			"staffTable"
		);

	if (!table) {
		return;
	}

	const list =
		Array.isArray(staff)
			? staff
			: [];

	if (!list.length) {
		table.innerHTML = `
			<tr>
				<td colspan="8">

					<div class="hospital-staff-state">

						<div class="hospital-staff-state-icon">
							<i class="bi bi-person-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No staff found
						</h5>

						<p class="text-muted mb-0">
							Add the first staff record to begin hospital workforce management.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(staffMember, index) {

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<div class="hospital-staff-profile">

							<div class="hospital-staff-avatar">
								<i class="bi bi-person-fill"></i>
							</div>

							<strong class="text-primary">
								${safe(staffMember.staffName)}
							</strong>

						</div>
					</td>

					<td>
						<span class="hospital-staff-pill">
							<i class="bi bi-person-badge-fill"></i>
							${safe(staffMember.designation)}
						</span>
					</td>

					<td>
						<span class="hospital-staff-pill">
							<i class="bi bi-building-fill"></i>
							${safe(staffMember.department)}
						</span>
					</td>

					<td>
						<i class="bi bi-telephone-fill text-primary me-1"></i>
						${safe(staffMember.mobile)}
					</td>

					<td>
						<i class="bi bi-envelope-fill text-primary me-1"></i>
						${safe(staffMember.email)}
					</td>

					<td>
						<span class="hospital-staff-salary">
							₹${formatMoney(staffMember.salary)}
						</span>
					</td>

					<td>

						<div class="hospital-staff-actions">

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="editStaff(${safeNumber(staffMember.id)})">

								<i class="bi bi-pencil-square me-1"></i>
								Edit
							</button>

							<button type="button"
									class="btn btn-sm btn-outline-danger"
									onclick="deleteStaff(${safeNumber(staffMember.id)})">

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

function showStaffLoadingState() {
	const table =
		document.getElementById(
			"staffTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="hospital-staff-state">

					<div class="hospital-staff-state-icon hospital-staff-loading-icon">
						<i class="bi bi-people-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading staff
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare hospital staff records.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showStaffErrorState(message) {
	const table =
		document.getElementById(
			"staffTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="hospital-staff-state">

					<div class="hospital-staff-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load staff
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function editStaff(id) {
	const staffMember =
		hospitalStaff.find(
			item =>
				Number(item.id) ===
				Number(id)
		);

	if (!staffMember) {
		showMsg(
			"Staff not found"
		);

		return;
	}

	editingStaffId = id;

	setInputValue(
		"staffName",
		staffMember.staffName || ""
	);

	setInputValue(
		"designation",
		staffMember.designation || ""
	);

	setInputValue(
		"department",
		staffMember.department || ""
	);

	setInputValue(
		"mobile",
		staffMember.mobile || ""
	);

	setInputValue(
		"email",
		staffMember.email || ""
	);

	setInputValue(
		"salary",
		staffMember.salary ?? ""
	);

	const title =
		document.getElementById(
			"staffFormTitle"
		);

	if (title) {
		title.innerText =
			"Edit Staff";
	}

	setSaveStaffButtonLabel(
		"Update Staff"
	);

	const panel =
		document.getElementById(
			"staffFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		panel.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
}

async function deleteStaff(id) {
	if (
		!confirm(
			"Are you sure you want to delete this staff record?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/staff/${id}`,
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
				"Unable to delete staff"
			);

			return;
		}

		showMsg(
			"Staff deleted successfully",
			"success"
		);

		loadStaff();

	} catch (e) {
		console.error(
			"Delete hospital staff error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

function updateHospitalStaffSummary() {
	const list =
		Array.isArray(hospitalStaff)
			? hospitalStaff
			: [];

	const departments =
		new Set(
			list
				.map(
					staff =>
						String(
							staff.department || ""
						)
							.trim()
							.toLowerCase()
				)
				.filter(Boolean)
		);

	const designations =
		new Set(
			list
				.map(
					staff =>
						String(
							staff.designation || ""
						)
							.trim()
							.toLowerCase()
				)
				.filter(Boolean)
		);

	const salaryTotal =
		list.reduce(
			(total, staff) =>
				total +
				Number(
					staff.salary || 0
				),
			0
		);

	setSummaryValue(
		"totalHospitalStaffCount",
		list.length
	);

	setSummaryValue(
		"hospitalStaffDepartmentCount",
		departments.size
	);

	setSummaryValue(
		"hospitalStaffDesignationCount",
		designations.size
	);

	const salaryElement =
		document.getElementById(
			"hospitalStaffSalaryTotal"
		);

	if (salaryElement) {
		salaryElement.textContent =
			`₹${formatMoney(salaryTotal)}`;
	}
}

function clearForm() {
	editingStaffId = null;

	[
		"staffName",
		"designation",
		"department",
		"mobile",
		"email",
		"salary"
	].forEach(
		function(id) {
			setInputValue(id, "");
		}
	);

	const title =
		document.getElementById(
			"staffFormTitle"
		);

	if (title) {
		title.innerText =
			"Add Staff";
	}

	setSaveStaffButtonLabel(
		"Save Staff"
	);
}

function setInputValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value = value;
	}
}

function setSaveStaffButtonLabel(label) {
	const button =
		document.getElementById(
			"saveHospitalStaffBtn"
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

function toDecimal(value) {
	const numberValue =
		parseFloat(value);

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

function formatMoney(value) {
	return value === null ||
		value === undefined
		? "0.00"
		: Number(value).toFixed(2);
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