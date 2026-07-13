let hospitalAvailability = [];
let hospitalDoctors = [];

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	setMinimumAvailabilityDate();
	loadHospitalDoctors();
	loadHospitalAvailability();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function setMinimumAvailabilityDate() {
	const dateInput =
		document.getElementById("availableDate");

	if (!dateInput) {
		return;
	}

	const today = new Date();

	const year =
		today.getFullYear();

	const month =
		String(today.getMonth() + 1)
			.padStart(2, "0");

	const day =
		String(today.getDate())
			.padStart(2, "0");

	dateInput.min =
		`${year}-${month}-${day}`;
}

async function loadHospitalDoctors() {
	const token =
		localStorage.getItem("token");

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

		let result = [];

		try {
			result =
				await response.json();
		} catch (e) {
			result = [];
		}

		hospitalDoctors =
			response.ok &&
				Array.isArray(result)
				? result
				: [];

		renderDoctorDropdown();
		updateHospitalAvailabilitySummary();

		if (!response.ok) {
			showMsg(
				result.message ||
				"Unable to load hospital doctors."
			);
		}

	} catch (e) {
		console.error(
			"Load hospital doctors error:",
			e
		);

		hospitalDoctors = [];
		renderDoctorDropdown();
		updateHospitalAvailabilitySummary();

		showMsg(
			"Unable to load hospital doctors."
		);
	}
}

function renderDoctorDropdown() {
	const dropdown =
		document.getElementById(
			"hospitalDoctorId"
		);

	if (!dropdown) {
		return;
	}

	if (!hospitalDoctors.length) {
		dropdown.innerHTML =
			`<option value="">No doctors found. Add doctor first.</option>`;

		fillDoctorDepartment();

		return;
	}

	let html =
		`<option value="">Select Doctor</option>`;

	hospitalDoctors.forEach(function(d) {

		html += `
			<option value="${safeAttribute(d.id)}">
				${safe(d.doctorName)} - ${safe(d.department)}
			</option>
		`;

	});

	dropdown.innerHTML = html;
}

function fillDoctorDepartment() {
	const doctorDropdown =
		document.getElementById(
			"hospitalDoctorId"
		);

	const departmentInput =
		document.getElementById(
			"department"
		);

	if (!doctorDropdown || !departmentInput) {
		return;
	}

	const doctorId =
		Number(doctorDropdown.value);

	const doctor =
		hospitalDoctors.find(
			d =>
				Number(d.id) === doctorId
		);

	departmentInput.value =
		doctor
			? doctor.department || ""
			: "";
}

function toggleAvailabilityForm() {
	const panel =
		document.getElementById(
			"availabilityFormPanel"
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

	if (isHidden) {
		window.setTimeout(function() {

			panel.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});

		}, 80);
	}
}

async function saveHospitalAvailability() {
	const startTime =
		getVal("startTime");

	const endTime =
		getVal("endTime");

	const payload = {
		hospitalDoctorId:
			Number(getVal("hospitalDoctorId")),

		availableDate:
			getVal("availableDate"),

		startTime:
			startTime + ":00",

		endTime:
			endTime + ":00",

		slotDuration:
			parseInt(
				getVal("slotDuration")
			)
	};

	if (
		!payload.hospitalDoctorId ||
		!payload.availableDate ||
		!startTime ||
		!endTime
	) {
		showMsg(
			"Doctor, date, start time and end time are required"
		);

		return;
	}

	if (
		timeToMinutes(endTime) <=
		timeToMinutes(startTime)
	) {
		showMsg(
			"End time must be greater than start time"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	setButtonLoading(
		"saveHospitalAvailabilityBtn",
		"Saving Availability...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/doctor-availability`,
				{
					method: "POST",

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

		let result = {};

		try {
			result =
				await response.json();
		} catch (e) {
			result = {};
		}

		if (!response.ok) {
			showMsg(
				result.message ||
				"Unable to save availability"
			);

			return;
		}

		showMsg(
			"Doctor availability saved successfully",
			"success"
		);

		clearForm();

		const panel =
			document.getElementById(
				"availabilityFormPanel"
			);

		if (panel) {
			panel.style.display = "none";
		}

		loadHospitalAvailability();

	} catch (e) {
		console.error(
			"Save hospital availability error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);
	} finally {
		setButtonLoading(
			"saveHospitalAvailabilityBtn",
			"Save Availability",
			false
		);
	}
}

async function loadHospitalAvailability() {
	const token =
		localStorage.getItem("token");

	showHospitalAvailabilityLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/doctor-availability/my`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		let result = [];

		try {
			result =
				await response.json();
		} catch (e) {
			result = [];
		}

		if (!response.ok) {
			showMsg(
				result.message ||
				"Unable to load availability"
			);

			hospitalAvailability = [];
			renderAvailability();
			updateHospitalAvailabilitySummary();

			return;
		}

		hospitalAvailability =
			Array.isArray(result)
				? result
				: [];

		renderAvailability();
		updateHospitalAvailabilitySummary();

	} catch (e) {
		console.error(
			"Load hospital availability error:",
			e
		);

		hospitalAvailability = [];
		renderAvailability();
		updateHospitalAvailabilitySummary();

		showMsg(
			"Hospital service not reachable."
		);
	}
}

function renderAvailability() {
	const table =
		document.getElementById(
			"availabilityTable"
		);

	if (!table) {
		return;
	}

	if (!hospitalAvailability.length) {
		table.innerHTML = `
			<tr>
				<td colspan="8">

					<div class="hospital-availability-empty-state">

						<div class="hospital-availability-empty-icon">
							<i class="bi bi-calendar-x"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No availability found
						</h5>

						<p class="text-muted mb-0">
							Add the first doctor schedule to start accepting appointments.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	hospitalAvailability.forEach(
		function(a, index) {

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<span class="hospital-doctor-pill">
							<i class="bi bi-person-badge-fill"></i>
							${safe(a.doctorName)}
						</span>
					</td>

					<td>
						<span class="hospital-department-pill">
							<i class="bi bi-building"></i>
							${safe(a.department)}
						</span>
					</td>

					<td>
						<span class="hospital-date-pill">
							<i class="bi bi-calendar3"></i>
							${formatDate(a.availableDate)}
						</span>
					</td>

					<td>
						<i class="bi bi-clock-fill text-primary me-1"></i>
						${formatTime(a.startTime)}
					</td>

					<td>
						<i class="bi bi-clock-history text-primary me-1"></i>
						${formatTime(a.endTime)}
					</td>

					<td>
						${safe(a.slotDuration)} min
					</td>

					<td>
						<strong>
							${calculateSlotCount(a)}
						</strong>
					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function showHospitalAvailabilityLoadingState() {
	const table =
		document.getElementById(
			"availabilityTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="hospital-availability-loading-state">

					<div class="hospital-availability-loading-icon">
						<i class="bi bi-calendar2-week-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading availability
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare hospital doctor schedules.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function updateHospitalAvailabilitySummary() {
	const availabilityList =
		Array.isArray(hospitalAvailability)
			? hospitalAvailability
			: [];

	const doctorList =
		Array.isArray(hospitalDoctors)
			? hospitalDoctors
			: [];

	const totalSlots =
		availabilityList.reduce(
			function(total, item) {
				return (
					total +
					calculateSlotCount(item)
				);
			},
			0
		);

	const today = new Date();

	today.setHours(0, 0, 0, 0);

	const upcomingCount =
		availabilityList.filter(
			function(item) {

				if (!item.availableDate) {
					return false;
				}

				const itemDate =
					new Date(
						item.availableDate
					);

				itemDate.setHours(
					0,
					0,
					0,
					0
				);

				return itemDate >= today;

			}
		).length;

	setSummaryValue(
		"totalHospitalDoctorCount",
		doctorList.length
	);

	setSummaryValue(
		"totalHospitalAvailabilityCount",
		availabilityList.length
	);

	setSummaryValue(
		"totalHospitalGeneratedSlots",
		totalSlots
	);

	setSummaryValue(
		"upcomingHospitalAvailabilityCount",
		upcomingCount
	);
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
				difference *
				eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function calculateSlotCount(a) {
	if (
		!a.startTime ||
		!a.endTime ||
		!a.slotDuration
	) {
		return 0;
	}

	const start =
		timeToMinutes(a.startTime);

	const end =
		timeToMinutes(a.endTime);

	const duration =
		Number(a.slotDuration);

	if (
		!Number.isFinite(start) ||
		!Number.isFinite(end) ||
		!Number.isFinite(duration) ||
		duration <= 0 ||
		end <= start
	) {
		return 0;
	}

	return Math.floor(
		(end - start) / duration
	);
}

function timeToMinutes(time) {
	if (!time) {
		return NaN;
	}

	const parts =
		String(time).split(":");

	if (parts.length < 2) {
		return NaN;
	}

	return (
		Number(parts[0]) * 60 +
		Number(parts[1])
	);
}

function clearForm() {
	[
		"hospitalDoctorId",
		"department",
		"availableDate",
		"startTime",
		"endTime"
	].forEach(function(id) {

		const element =
			document.getElementById(id);

		if (element) {
			element.value = "";
		}

	});

	const slotDuration =
		document.getElementById(
			"slotDuration"
		);

	if (slotDuration) {
		slotDuration.value = "30";
	}
}

function getVal(id) {
	const element =
		document.getElementById(id);

	return element
		? element.value.trim()
		: "";
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
			`
				<i class="bi bi-check2-circle me-1"></i>
				${escapeHtml(loadingText)}
			`;

		button.disabled = false;
	}
}

function showMsg(message, type = "danger") {
	const msgBox =
		document.getElementById("msg");

	if (!msgBox) {
		return;
	}

	msgBox.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	window.setTimeout(function() {

		if (msgBox) {
			msgBox.innerHTML = "";
		}

	}, 4000);
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
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

function formatTime(value) {
	if (!value) {
		return "-";
	}

	const parts =
		String(value).split(":");

	if (parts.length < 2) {
		return safe(value);
	}

	const date =
		new Date();

	date.setHours(
		Number(parts[0]),
		Number(parts[1]),
		0,
		0
	);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleTimeString(
		"en-IN",
		{
			hour: "2-digit",
			minute: "2-digit"
		}
	);
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

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}