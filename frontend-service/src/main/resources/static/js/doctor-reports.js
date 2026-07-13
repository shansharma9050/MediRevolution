let doctorReportRows = [];

document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadDoctorReports();
});

function requireDoctorRole() {
	if (localStorage.getItem("role") !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadDoctorReports() {
	const token =
		localStorage.getItem("token");

	showDoctorReportLoadingState();

	try {
		const [
			patientsRes,
			prescriptionsRes,
			appointmentsRes
		] = await Promise.all([
			fetch(
				`${API_BASE}/doctor/patients`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			),

			fetch(
				`${API_BASE}/doctor/prescriptions`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			),

			fetch(
				`${API_BASE}/doctor/appointments`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			)
		]);

		const patients =
			patientsRes.ok
				? await readJsonListSafely(
					patientsRes
				)
				: [];

		const prescriptions =
			prescriptionsRes.ok
				? await readJsonListSafely(
					prescriptionsRes
				)
				: [];

		const appointments =
			appointmentsRes.ok
				? await readJsonListSafely(
					appointmentsRes
				)
				: [];

		setSummaryValue(
			"reportPatients",
			patients.length
		);

		setSummaryValue(
			"reportPrescriptions",
			prescriptions.length
		);

		setSummaryValue(
			"reportCompleted",
			appointments.filter(
				a => a.status === "COMPLETED"
			).length
		);

		setSummaryValue(
			"reportCancelled",
			appointments.filter(
				a => a.status === "CANCELLED"
			).length
		);

		renderAppointmentReport(
			appointments
		);

		if (
			!patientsRes.ok ||
			!prescriptionsRes.ok ||
			!appointmentsRes.ok
		) {
			showDoctorReportMessage(
				"Some report data could not be loaded.",
				"warning"
			);
		}

	} catch (e) {
		console.error(
			"Doctor report load error:",
			e
		);

		setSummaryValue(
			"reportPatients",
			0
		);

		setSummaryValue(
			"reportPrescriptions",
			0
		);

		setSummaryValue(
			"reportCompleted",
			0
		);

		setSummaryValue(
			"reportCancelled",
			0
		);

		doctorReportRows = [];

		showDoctorReportErrorState(
			"Doctor service not reachable."
		);

		showDoctorReportMessage(
			"Doctor service not reachable."
		);
	}
}

function renderAppointmentReport(appointments) {
	const table =
		document.getElementById(
			"doctorReportTable"
		);

	if (!table) {
		return;
	}

	const list =
		Array.isArray(appointments)
			? appointments
			: [];

	doctorReportRows =
		list.map(function(a) {

			const patient =
				a.patient || {};

			return {
				patient:
					patient.patientName ||
					a.patientName ||
					"",

				date:
					a.appointmentDate,

				time:
					a.appointmentTime,

				purpose:
					a.purpose ||
					a.symptoms ||
					"",

				status:
					a.status
			};

		});

	if (!list.length) {
		table.innerHTML = `
			<tr>
				<td colspan="6">

					<div class="doctor-reports-empty-state">

						<div class="doctor-reports-empty-icon">
							<i class="bi bi-bar-chart-line-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No appointment data found
						</h5>

						<p class="text-muted mb-0">
							Appointment analytics will appear after appointments are created.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(a, index) {

			const patient =
				a.patient || {};

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<div class="doctor-report-patient">

							<div class="doctor-report-avatar">
								<i class="bi bi-person-fill"></i>
							</div>

							<strong class="text-primary">
								${safe(patient.patientName || a.patientName)}
							</strong>

						</div>
					</td>

					<td>
						<i class="bi bi-calendar-event-fill text-primary me-1"></i>
						${formatDate(a.appointmentDate)}
					</td>

					<td>
						<i class="bi bi-clock-fill text-primary me-1"></i>
						${formatTime(a.appointmentTime)}
					</td>

					<td>
						<div class="doctor-report-purpose"
							 title="${safeAttribute(a.purpose || a.symptoms)}">

							${safe(a.purpose || a.symptoms)}
						</div>
					</td>

					<td>
						${statusBadge(a.status)}
					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function showDoctorReportLoadingState() {
	const table =
		document.getElementById(
			"doctorReportTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="6">

				<div class="doctor-reports-loading-state">

					<div class="doctor-reports-loading-icon">
						<i class="bi bi-bar-chart-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading report
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare appointment analytics.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showDoctorReportErrorState(message) {
	const table =
		document.getElementById(
			"doctorReportTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="6">

				<div class="doctor-reports-error-state">

					<div class="doctor-reports-error-icon">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load report
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function exportDoctorReportCsv() {
	if (!doctorReportRows.length) {
		alert("No data to export");
		return;
	}

	const headers =
		Object.keys(
			doctorReportRows[0]
		);

	const csvRows = [
		headers
			.map(csvEscape)
			.join(","),

		...doctorReportRows.map(
			row =>
				headers
					.map(
						header =>
							csvEscape(
								row[header]
							)
					)
					.join(",")
		)
	];

	const csv =
		"\uFEFF" +
		csvRows.join("\n");

	const blob =
		new Blob(
			[csv],
			{
				type:
					"text/csv;charset=utf-8;"
			}
		);

	const url =
		URL.createObjectURL(blob);

	const anchor =
		document.createElement("a");

	anchor.href = url;
	anchor.download =
		`doctor-report-${getTodayFileName()}.csv`;

	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();

	URL.revokeObjectURL(url);
}

function csvEscape(value) {
	const text =
		value === null ||
			value === undefined
			? ""
			: String(value);

	return `"${text.replace(/"/g, '""')}"`;
}

function getTodayFileName() {
	const today =
		new Date();

	return [
		today.getFullYear(),
		String(
			today.getMonth() + 1
		).padStart(2, "0"),
		String(
			today.getDate()
		).padStart(2, "0")
	].join("-");
}

function statusBadge(status) {
	const value =
		String(status || "")
			.toUpperCase();

	const cssClass =
		value === "COMPLETED"
			? "completed"
			: value === "CANCELLED"
				? "cancelled"
				: value === "REJECTED"
					? "rejected"
					: value === "PENDING"
						? "pending"
						: value === "REQUESTED"
							? "requested"
							: value === "CONFIRMED"
								? "confirmed"
								: "default";

	return `
		<span class="doctor-report-status ${cssClass}">
			${safe(value)}
		</span>
	`;
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

async function readJsonListSafely(response) {
	try {
		const result =
			await response.json();

		if (Array.isArray(result)) {
			return result;
		}

		if (
			result &&
			Array.isArray(result.data)
		) {
			return result.data;
		}

		if (
			result &&
			Array.isArray(result.content)
		) {
			return result.content;
		}

		return [];

	} catch (error) {
		return [];
	}
}

function showDoctorReportMessage(
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