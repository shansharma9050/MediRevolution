let patientPrescriptions = [];
let isLoadingPatientPrescriptions = false;
const downloadingPrescriptionIds = new Set();

document.addEventListener("DOMContentLoaded", function() {
	requirePatientRole();
	loadMyPrescriptions();
});

function requirePatientRole() {
	if (
		localStorage.getItem("role") !==
		"PATIENT"
	) {
		alert(
			"Access denied. Only PATIENT can access this page."
		);

		window.location.href =
			"/dashboard";
	}
}

async function loadMyPrescriptions() {
	if (isLoadingPatientPrescriptions) {
		return;
	}

	isLoadingPatientPrescriptions = true;

	const token =
		localStorage.getItem("token");

	showPatientPrescriptionsLoadingState();

	setButtonLoading(
		"refreshPrescriptionsBtn",
		"Refreshing...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/patient/my-prescriptions`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			patientPrescriptions = [];

			const message =
				getErrorMessage(
					result,
					"Unable to load prescriptions"
				);

			showPatientPrescriptionMsg(
				message
			);

			showPatientPrescriptionsErrorState(
				message
			);

			updatePrescriptionSummary();

			return;
		}

		patientPrescriptions =
			Array.isArray(result)
				? result
				: [];

		sortPrescriptionsByDate();

		renderPatientPrescriptions();
		updatePrescriptionSummary();

	} catch (error) {
		console.error(
			"Load patient prescriptions error:",
			error
		);

		patientPrescriptions = [];

		showPatientPrescriptionMsg(
			"Doctor service not reachable."
		);

		showPatientPrescriptionsErrorState(
			"Doctor service is currently unavailable."
		);

		updatePrescriptionSummary();

	} finally {
		isLoadingPatientPrescriptions = false;

		setButtonLoading(
			"refreshPrescriptionsBtn",
			"Refresh",
			false
		);
	}
}

function sortPrescriptionsByDate() {
	patientPrescriptions.sort(
		function(a, b) {
			return (
				safeDateTimestamp(
					b.prescriptionDate
				) -
				safeDateTimestamp(
					a.prescriptionDate
				)
			);
		}
	);
}

function renderPatientPrescriptions() {
	const container =
		document.getElementById(
			"patientPrescriptionList"
		);

	if (!container) {
		return;
	}

	if (!patientPrescriptions.length) {
		container.innerHTML = `
			<div class="patient-prescriptions-state">

				<div class="patient-prescriptions-state-icon">
					<i class="bi bi-file-earmark-x-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No prescriptions found
				</h5>

				<p class="text-muted mb-0">
					Your doctor-created prescriptions will appear here.
				</p>

			</div>
		`;

		return;
	}

	let html = "";

	patientPrescriptions.forEach(
		function(prescription, index) {

			const patient =
				prescription.patient || {};

			const doctorName =
				prescription.doctorName ||
				prescription.doctorEmail ||
				"Doctor";

			const prescriptionId =
				safeNumber(
					prescription.id
				);

			html += `
				<article class="prescription-card"
						 style="--card-delay:${Math.min(index * 65, 390)}ms">

					<div class="prescription-card-header">

						<div>

							<div class="prescription-heading-wrap">

								<div class="prescription-icon">
									<i class="bi bi-prescription2"></i>
								</div>

								<div>

									<h5>
										Prescription
										${prescriptionId ? "#" + prescriptionId : ""}
									</h5>

									<div class="text-muted small mt-1">
										Created:
										${formatDateTime(prescription.prescriptionDate)}
									</div>

								</div>

							</div>

							<div class="prescription-meta">

								<span class="prescription-chip">
									<i class="bi bi-person-fill"></i>
									${safe(patient.patientName)}
								</span>

								<span class="prescription-chip">
									<i class="bi bi-person-badge-fill"></i>
									${safe(doctorName)}
								</span>

							</div>

						</div>

						<div class="text-end">

							<span class="prescription-status">
								<i class="bi bi-check2-circle"></i>
								Available
							</span>

						</div>

					</div>

					<div class="prescription-details-grid">

						<div class="prescription-detail-box">

							<small>Symptoms</small>

							<strong>
								${safe(prescription.symptoms)}
							</strong>

						</div>

						<div class="prescription-detail-box">

							<small>Diagnosis</small>

							<strong>
								${safe(prescription.diagnosis)}
							</strong>

						</div>

						<div class="prescription-detail-box full">

							<small>Medicines</small>

							<strong>
								${safe(prescription.medicines)}
							</strong>

						</div>

						<div class="prescription-detail-box full">

							<small>Doctor Advice</small>

							<strong>
								${safe(prescription.advice)}
							</strong>

						</div>

					</div>

					<div class="prescription-card-actions">

						<button type="button"
								id="downloadPrescriptionBtn_${prescriptionId}"
								class="btn btn-medi"
								style="width:auto;"
								onclick="downloadMyPrescriptionPdf(${prescriptionId})"
								${prescriptionId ? "" : "disabled"}>

							<i class="bi bi-file-earmark-pdf-fill me-1"></i>
							Download PDF
						</button>

					</div>

				</article>
			`;

		}
	);

	container.innerHTML = html;
}

function updatePrescriptionSummary() {
	setSummaryValue(
		"totalPrescriptions",
		patientPrescriptions.length
	);

	const latestDate =
		patientPrescriptions.length
			? formatDate(
				patientPrescriptions[0]
					.prescriptionDate
			)
			: "-";

	const latestElement =
		document.getElementById(
			"latestPrescriptionDate"
		);

	if (latestElement) {
		latestElement.innerText =
			latestDate;
	}
}

async function downloadMyPrescriptionPdf(
	prescriptionId
) {
	const numericId =
		Number(prescriptionId);

	if (
		!Number.isFinite(numericId) ||
		numericId <= 0
	) {
		showPatientPrescriptionMsg(
			"Invalid prescription ID"
		);

		return;
	}

	if (
		downloadingPrescriptionIds.has(
			numericId
		)
	) {
		return;
	}

	downloadingPrescriptionIds.add(
		numericId
	);

	const token =
		localStorage.getItem("token");

	const buttonId =
		`downloadPrescriptionBtn_${numericId}`;

	setButtonLoading(
		buttonId,
		"Downloading...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/doctor/prescriptions/${encodeURIComponent(numericId)}/download`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			const result =
				await readJsonSafely(
					response
				);

			showPatientPrescriptionMsg(
				getErrorMessage(
					result,
					"Unable to download prescription PDF"
				)
			);

			return;
		}

		const blob =
			await response.blob();

		if (!blob.size) {
			showPatientPrescriptionMsg(
				"Prescription PDF is empty"
			);

			return;
		}

		const url =
			window.URL.createObjectURL(
				blob
			);

		const anchor =
			document.createElement("a");

		anchor.href = url;
		anchor.download =
			`prescription-${numericId}.pdf`;

		document.body.appendChild(
			anchor
		);

		anchor.click();
		anchor.remove();

		window.setTimeout(
			function() {
				window.URL.revokeObjectURL(
					url
				);
			},
			1000
		);

		showPatientPrescriptionMsg(
			"Prescription PDF downloaded successfully",
			"success"
		);

	} catch (error) {
		console.error(
			"Download patient prescription error:",
			error
		);

		showPatientPrescriptionMsg(
			"Doctor service not reachable."
		);

	} finally {
		downloadingPrescriptionIds.delete(
			numericId
		);

		setButtonLoading(
			buttonId,
			"Download PDF",
			false
		);
	}
}

function showPatientPrescriptionsLoadingState() {
	const container =
		document.getElementById(
			"patientPrescriptionList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="patient-prescriptions-state">

			<div class="patient-prescriptions-state-icon patient-prescriptions-loading-icon">
				<i class="bi bi-file-earmark-medical-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading prescriptions
			</h5>

			<p class="text-muted mb-0">
				Please wait while we prepare your prescription history.
			</p>

		</div>
	`;
}

function showPatientPrescriptionsErrorState(
	message
) {
	const container =
		document.getElementById(
			"patientPrescriptionList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="patient-prescriptions-state">

			<div class="patient-prescriptions-state-icon bg-danger">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load prescriptions
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}

function showPatientPrescriptionMsg(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
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

function safeDateTimestamp(value) {
	const date =
		new Date(value);

	return Number.isNaN(date.getTime())
		? 0
		: date.getTime();
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
	const numericValue =
		Number(value);

	return Number.isFinite(numericValue)
		? numericValue
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