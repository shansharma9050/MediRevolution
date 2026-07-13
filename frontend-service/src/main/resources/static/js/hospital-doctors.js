let hospitalDoctors = [];
let editingDoctorId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalDoctors();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleDoctorForm() {
	const panel =
		document.getElementById(
			"doctorFormPanel"
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

function openCreateDoctorForm() {
	clearDoctorForm();

	const panel =
		document.getElementById(
			"doctorFormPanel"
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

	const title =
		document.getElementById(
			"doctorFormTitle"
		);

	if (title) {
		title.innerText =
			"Doctor Details";
	}

	setSaveDoctorButtonLabel(
		"Save Doctor"
	);
}

function closeDoctorForm() {
	clearDoctorForm();

	const panel =
		document.getElementById(
			"doctorFormPanel"
		);

	if (panel) {
		panel.style.display = "none";
	}
}

async function loadHospitalDoctors() {
	const token =
		localStorage.getItem("token");

	showDoctorsLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/doctors/my`,
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
			hospitalDoctors = [];

			updateHospitalDoctorSummary();

			showDoctorsErrorState(
				getErrorMessage(
					result,
					"Unable to load doctors"
				)
			);

			showMsg(
				getErrorMessage(
					result,
					"Unable to load doctors"
				)
			);

			return;
		}

		hospitalDoctors =
			Array.isArray(result)
				? result
				: [];

		renderDoctors(
			hospitalDoctors
		);

		updateHospitalDoctorSummary();

	} catch (e) {
		console.error(
			"Load hospital doctors error:",
			e
		);

		hospitalDoctors = [];

		updateHospitalDoctorSummary();

		showDoctorsErrorState(
			"Hospital service not reachable."
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

async function saveHospitalDoctor() {
	const payload = {
		doctorName:
			getVal("doctorName"),

		specialization:
			getVal("specialization"),

		department:
			getVal("department"),

		qualification:
			getVal("qualification"),

		experienceYears:
			toInt(
				getVal("experienceYears")
			),

		consultationFee:
			toDecimal(
				getVal("consultationFee")
			),

		mobile:
			getVal("mobile"),

		email:
			getVal("email")
	};

	if (
		!payload.doctorName ||
		!payload.department
	) {
		showMsg(
			"Doctor name and department are required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const url =
		editingDoctorId
			? `${API_BASE}/hospital/doctors/${editingDoctorId}`
			: `${API_BASE}/hospital/doctors`;

	const method =
		editingDoctorId
			? "PUT"
			: "POST";

	setButtonLoading(
		"saveHospitalDoctorBtn",
		editingDoctorId
			? "Updating Doctor..."
			: "Saving Doctor...",
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
					"Unable to save doctor"
				)
			);

			return;
		}

		showMsg(
			editingDoctorId
				? "Doctor updated successfully"
				: "Doctor added successfully",
			"success"
		);

		clearDoctorForm();

		const panel =
			document.getElementById(
				"doctorFormPanel"
			);

		if (panel) {
			panel.style.display = "none";
		}

		loadHospitalDoctors();

	} catch (e) {
		console.error(
			"Save hospital doctor error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);

	} finally {
		setButtonLoading(
			"saveHospitalDoctorBtn",
			editingDoctorId
				? "Update Doctor"
				: "Save Doctor",
			false
		);
	}
}

function renderDoctors(list) {
	const table =
		document.getElementById(
			"doctorTable"
		);

	if (!table) {
		return;
	}

	const doctors =
		Array.isArray(list)
			? list
			: [];

	if (!doctors.length) {
		table.innerHTML = `
			<tr>
				<td colspan="8">

					<div class="hospital-doctors-state">

						<div class="hospital-doctors-state-icon">
							<i class="bi bi-person-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No hospital doctors found
						</h5>

						<p class="text-muted mb-0">
							Add the first doctor to begin managing your hospital medical team.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	doctors.forEach(
		function(d, index) {

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<div class="hospital-doctor-profile">

							<div class="hospital-doctor-avatar">
								<i class="bi bi-person-fill"></i>
							</div>

							<div>
								<strong class="text-primary">
									${safe(d.doctorName)}
								</strong>

								<div class="text-muted small">
									${safe(d.qualification)}
								</div>
							</div>

						</div>
					</td>

					<td>
						<span class="hospital-doctor-pill">
							<i class="bi bi-heart-pulse-fill"></i>
							${safe(d.specialization)}
						</span>
					</td>

					<td>
						<span class="hospital-doctor-pill">
							<i class="bi bi-building-fill"></i>
							${safe(d.department)}
						</span>
					</td>

					<td>
						${safe(d.experienceYears)} years
					</td>

					<td>
						<span class="hospital-doctor-fee">
							₹${formatMoney(d.consultationFee)}
						</span>
					</td>

					<td>
						<i class="bi bi-telephone-fill text-primary me-1"></i>
						${safe(d.mobile)}

						<br>

						<span class="text-muted small">
							<i class="bi bi-envelope-fill me-1"></i>
							${safe(d.email)}
						</span>
					</td>

					<td>

						<div class="hospital-doctor-actions">

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="editDoctor(${safeNumber(d.id)})">

								<i class="bi bi-pencil-square me-1"></i>
								Edit
							</button>

							<button type="button"
									class="btn btn-sm btn-outline-danger"
									onclick="deleteDoctor(${safeNumber(d.id)})">

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

function showDoctorsLoadingState() {
	const table =
		document.getElementById(
			"doctorTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="hospital-doctors-state">

					<div class="hospital-doctors-state-icon hospital-doctors-loading-icon">
						<i class="bi bi-people-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading doctors
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare the hospital doctor list.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showDoctorsErrorState(message) {
	const table =
		document.getElementById(
			"doctorTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="hospital-doctors-state">

					<div class="hospital-doctors-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load doctors
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function editDoctor(id) {
	const doctor =
		hospitalDoctors.find(
			item =>
				Number(item.id) ===
				Number(id)
		);

	if (!doctor) {
		showMsg(
			"Doctor not found"
		);

		return;
	}

	editingDoctorId = id;

	setInputValue(
		"doctorName",
		doctor.doctorName || ""
	);

	setInputValue(
		"specialization",
		doctor.specialization || ""
	);

	setInputValue(
		"department",
		doctor.department || ""
	);

	setInputValue(
		"qualification",
		doctor.qualification || ""
	);

	setInputValue(
		"experienceYears",
		doctor.experienceYears || ""
	);

	setInputValue(
		"consultationFee",
		doctor.consultationFee || ""
	);

	setInputValue(
		"mobile",
		doctor.mobile || ""
	);

	setInputValue(
		"email",
		doctor.email || ""
	);

	const title =
		document.getElementById(
			"doctorFormTitle"
		);

	if (title) {
		title.innerText =
			"Edit Doctor Details";
	}

	setSaveDoctorButtonLabel(
		"Update Doctor"
	);

	const panel =
		document.getElementById(
			"doctorFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		panel.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
}

async function deleteDoctor(id) {
	if (
		!confirm(
			"Delete this hospital doctor?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/doctors/${id}`,
				{
					method: "DELETE",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const text =
			await response.text();

		if (!response.ok) {
			showMsg(
				text ||
				"Unable to delete doctor"
			);

			return;
		}

		showMsg(
			"Doctor deleted successfully",
			"success"
		);

		loadHospitalDoctors();

	} catch (e) {
		console.error(
			"Delete hospital doctor error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

function filterDoctors() {
	const keyword =
		document
			.getElementById("searchBox")
			?.value
			.trim()
			.toLowerCase() || "";

	const filtered =
		hospitalDoctors.filter(
			d =>
				JSON.stringify(d)
					.toLowerCase()
					.includes(keyword)
		);

	renderDoctors(filtered);
}

function updateHospitalDoctorSummary() {
	const list =
		Array.isArray(hospitalDoctors)
			? hospitalDoctors
			: [];

	const departments =
		new Set(
			list
				.map(
					doctor =>
						String(
							doctor.department || ""
						)
							.trim()
							.toLowerCase()
				)
				.filter(Boolean)
		);

	const experiencedCount =
		list.filter(
			doctor =>
				Number(
					doctor.experienceYears || 0
				) >= 5
		).length;

	const feeValues =
		list
			.map(
				doctor =>
					Number(
						doctor.consultationFee
					)
			)
			.filter(
				value =>
					Number.isFinite(value)
			);

	const averageFee =
		feeValues.length
			? feeValues.reduce(
				(total, value) =>
					total + value,
				0
			) / feeValues.length
			: 0;

	setSummaryValue(
		"totalHospitalDoctorCount",
		list.length
	);

	setSummaryValue(
		"hospitalDoctorDepartmentCount",
		departments.size
	);

	setSummaryValue(
		"experiencedHospitalDoctorCount",
		experiencedCount
	);

	const averageFeeElement =
		document.getElementById(
			"hospitalDoctorAverageFee"
		);

	if (averageFeeElement) {
		averageFeeElement.textContent =
			`₹${formatMoney(averageFee)}`;
	}
}

function clearDoctorForm() {
	editingDoctorId = null;

	[
		"doctorName",
		"specialization",
		"department",
		"qualification",
		"experienceYears",
		"consultationFee",
		"mobile",
		"email"
	].forEach(
		function(id) {
			setInputValue(id, "");
		}
	);

	const title =
		document.getElementById(
			"doctorFormTitle"
		);

	if (title) {
		title.innerText =
			"Doctor Details";
	}

	setSaveDoctorButtonLabel(
		"Save Doctor"
	);
}

function setInputValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value = value;
	}
}

function setSaveDoctorButtonLabel(label) {
	const button =
		document.getElementById(
			"saveHospitalDoctorBtn"
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

function toDecimal(value) {
	const numberValue =
		parseFloat(value);

	return Number.isFinite(numberValue)
		? numberValue
		: null;
}

function formatMoney(value) {
	return value === null ||
		value === undefined
		? "0.00"
		: Number(value).toFixed(2);
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