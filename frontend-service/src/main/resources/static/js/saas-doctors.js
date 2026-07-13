let allDoctors = [];
let isLoadingDoctors = false;

let doctorPagePermissions = {
	create: false,
	update: false,
	viewAvailability: false
};

document.addEventListener("DOMContentLoaded", async function() {
	const allowed =
		await protectSaasPage(
			"STAFF",
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

	await applyDoctorPagePermissions();
	await loadDoctorsFromStaff();
});

async function loadDoctorsFromStaff() {
	if (isLoadingDoctors) {
		return;
	}

	isLoadingDoctors = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showDoctorsLoadingState();

	setButtonLoading(
		"refreshDoctorsBtn",
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
				`${API_BASE}/saas/staff/doctors?${query.toString()}`,
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
			allDoctors = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load doctors."
				);

			showMsg(message);
			showDoctorsErrorState(message);
			updateDoctorSummary();

			return;
		}

		allDoctors =
			Array.isArray(result)
				? result
				: [];

		allDoctors.sort(
			function(a, b) {
				return String(
					a.staffName || ""
				).localeCompare(
					String(
						b.staffName || ""
					),
					"en",
					{
						sensitivity: "base"
					}
				);
			}
		);

		renderDoctors(allDoctors);
		updateDoctorSummary();
		applyDoctorPagePermissions();

	} catch (error) {
		console.error(
			"Unable to load staff doctors:",
			error
		);

		allDoctors = [];

		showMsg(
			"SaaS service not reachable."
		);

		showDoctorsErrorState(
			"SaaS staff service is currently unavailable."
		);

		updateDoctorSummary();

	} finally {
		isLoadingDoctors = false;

		setButtonLoading(
			"refreshDoctorsBtn",
			"Refresh",
			false
		);
	}
}

function filterDoctors() {
	const keyword =
		getValue(
			"doctorSearchBox"
		).toLowerCase();

	const onlineStatus =
		getValue(
			"onlineStatusFilter"
		);

	const filtered =
		allDoctors.filter(
			function(doctor) {
				const searchableText = [
					doctor.staffName,
					doctor.mobile,
					doctor.email,
					doctor.staffCode,
					doctor.department,
					doctor.designation,
					doctor.specialization,
					doctor.qualification,
					doctor.registrationNumber,
					doctor.medicalCouncil
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				const keywordMatches =
					!keyword ||
					searchableText.includes(keyword);

				const onlineEnabled =
					doctor.onlineConsultationEnabled === true;

				const onlineMatches =
					!onlineStatus ||
					(
						onlineStatus === "ENABLED" &&
						onlineEnabled
					) ||
					(
						onlineStatus === "DISABLED" &&
						!onlineEnabled
					);

				return (
					keywordMatches &&
					onlineMatches
				);
			}
		);

	renderDoctors(filtered);
}

function renderDoctors(doctors) {
	const tableBody =
		document.getElementById(
			"doctorsTableBody"
		);

	if (!tableBody) {
		return;
	}

	const list =
		Array.isArray(doctors)
			? doctors
			: [];

	if (!list.length) {
		tableBody.innerHTML = `
			<tr>
				<td colspan="7">

					<div class="saas-doctors-state">

						<div class="saas-doctors-state-icon">
							<i class="bi bi-person-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No doctor staff found
						</h5>

						<p class="text-muted mb-2">
							Create a staff member with role
							<strong>DOCTOR</strong>
							from the Staff module.
						</p>

						<button type="button"
								class="btn btn-sm btn-outline-primary"
								onclick="openStaffDoctorPage()">

							<i class="bi bi-people-fill me-1"></i>
							Open Staff Module
						</button>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableBody.innerHTML =
		list.map(
			function(doctor, index) {
				const staffId =
					safeNumber(doctor.id);

				const authUserId =
					safeNumber(
						doctor.authUserId
					);

				return `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>

							<div class="saas-doctor-profile">

								<div class="saas-doctor-avatar">
									<i class="bi bi-person-badge-fill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(doctor.staffName)}
									</strong>

									<div class="text-muted small">
										${safe(doctor.mobile)}
										${doctor.email
						? ` • ${safe(doctor.email)}`
						: ""
					}
									</div>

									<div class="text-muted small">
										Staff Code:
										${safe(doctor.staffCode)}
									</div>

								</div>

							</div>

						</td>

						<td>

							${safe(doctor.department)}

							${doctor.designation
						? `
									<div class="text-muted small">
										${safe(doctor.designation)}
									</div>
								`
						: ""
					}

						</td>

						<td>
							${safe(doctor.specialization)}
						</td>

						<td>

							${safe(doctor.qualification)}

							${doctor.experienceYears !== null &&
						doctor.experienceYears !== undefined
						? `
									<div class="text-muted small">
										${escapeHtml(doctor.experienceYears)}
										year(s) experience
									</div>
								`
						: ""
					}

						</td>

						<td>

							${doctor.consultationFee !== null &&
						doctor.consultationFee !== undefined
						? `
									<strong class="text-primary">
										₹${formatAmount(doctor.consultationFee)}
									</strong>
								`
						: "-"
					}

							${doctor.onlineConsultationEnabled === true &&
						doctor.onlineConsultationFee !== null &&
						doctor.onlineConsultationFee !== undefined
						? `
									<div class="text-muted small">
										Online:
										₹${formatAmount(doctor.onlineConsultationFee)}
									</div>
								`
						: ""
					}

						</td>

						<td>

							${doctor.onlineConsultationEnabled === true
						? `
									<span class="saas-doctor-pill enabled">
										<i class="bi bi-camera-video-fill"></i>
										Enabled
									</span>
								`
						: `
									<span class="saas-doctor-pill disabled">
										<i class="bi bi-camera-video-off-fill"></i>
										Disabled
									</span>
								`
					}

						</td>

						<td>

							<div class="saas-doctor-actions">

								<button type="button"
										class="btn btn-sm btn-outline-primary edit-doctor-btn"
										onclick="editDoctorStaff(${staffId})"
										${staffId ? "" : "disabled"}>

									<i class="bi bi-pencil-square me-1"></i>
									Edit
								</button>

								<button type="button"
										class="btn btn-sm btn-outline-info availability-doctor-btn"
										onclick="openDoctorAvailability(${authUserId})"
										${authUserId ? "" : "disabled"}>

									<i class="bi bi-calendar2-week-fill me-1"></i>
									Availability
								</button>

							</div>

						</td>

					</tr>
				`;
			}
		).join("");

	applyDoctorPagePermissions();
}

function openCreateDoctorModal() {
	if (!doctorPagePermissions.create) {
		showMsg(
			"You do not have permission to create doctor staff."
		);

		return;
	}

	window.location.href =
		"/saas/staff?role=DOCTOR";
}

function openStaffDoctorPage() {
	window.location.href =
		"/saas/staff?role=DOCTOR";
}

function editDoctorStaff(staffId) {
	if (!doctorPagePermissions.update) {
		showMsg(
			"You do not have permission to update doctor staff."
		);

		return;
	}

	const numericStaffId =
		Number(staffId);

	if (
		!Number.isFinite(numericStaffId) ||
		numericStaffId <= 0
	) {
		showMsg(
			"Invalid doctor staff selected."
		);

		return;
	}

	window.location.href =
		`/saas/staff?editStaffId=${encodeURIComponent(numericStaffId)}`;
}

function openDoctorAvailability(
	doctorAuthUserId
) {
	if (
		!doctorPagePermissions.viewAvailability
	) {
		showMsg(
			"You do not have permission to view doctor availability."
		);

		return;
	}

	const numericAuthUserId =
		Number(doctorAuthUserId);

	if (
		!Number.isFinite(numericAuthUserId) ||
		numericAuthUserId <= 0
	) {
		showMsg(
			"Doctor login user is missing."
		);

		return;
	}

	window.location.href =
		`/saas/doctor-availability?doctorAuthUserId=${encodeURIComponent(numericAuthUserId)}`;
}

async function applyDoctorPagePermissions() {
	const [
		canCreate,
		canUpdate,
		canViewAvailability
	] =
		await Promise.all([
			hasSaasPermission(
				"STAFF",
				"CREATE"
			),
			hasSaasPermission(
				"STAFF",
				"UPDATE"
			),
			hasSaasPermission(
				"DOCTOR_AVAILABILITY",
				"VIEW"
			)
		]);

	doctorPagePermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		viewAvailability:
			Boolean(canViewAvailability)
	};

	showOrHideById(
		"addDoctorBtn",
		doctorPagePermissions.create
	);

	showOrHideByClass(
		"edit-doctor-btn",
		doctorPagePermissions.update
	);

	showOrHideByClass(
		"availability-doctor-btn",
		doctorPagePermissions.viewAvailability
	);
}

async function refreshDoctors() {
	await loadDoctorsFromStaff();
}

function updateDoctorSummary() {
	setAnimatedNumber(
		"totalDoctorCount",
		allDoctors.length
	);

	setAnimatedNumber(
		"onlineDoctorCount",
		allDoctors.filter(
			doctor =>
				doctor.onlineConsultationEnabled === true
		).length
	);

	const departments =
		new Set(
			allDoctors
				.map(
					doctor =>
						String(
							doctor.department || ""
						).trim().toLowerCase()
				)
				.filter(Boolean)
		);

	setAnimatedNumber(
		"departmentCount",
		departments.size
	);
}

function showDoctorsLoadingState() {
	const tableBody =
		document.getElementById(
			"doctorsTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="7">

				<div class="saas-doctors-state">

					<div class="saas-doctors-state-icon saas-doctors-loading">
						<i class="bi bi-person-badge-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading doctors
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare the doctor directory.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showDoctorsErrorState(
	message
) {
	const tableBody =
		document.getElementById(
			"doctorsTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="7">

				<div class="saas-doctors-state">

					<div class="saas-doctors-state-icon bg-danger">
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

function getValue(id) {
	const element =
		document.getElementById(id);

	return element
		? String(element.value || "").trim()
		: "";
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

function formatAmount(value) {
	const numberValue =
		Number(value);

	if (!Number.isFinite(numberValue)) {
		return "-";
	}

	return numberValue.toLocaleString(
		"en-IN",
		{
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}
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