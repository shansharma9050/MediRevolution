"use strict";

let patientPrescriptions = [];

let isLoadingPatientPrescriptions = false;

const downloadingPrescriptionIds =
	new Set();


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		requirePatientRole();

		await loadMyPrescriptions();
	}
);


function requirePatientRole() {

	const role =
		String(
			localStorage.getItem(
				"role"
			) || ""
		)
			.toUpperCase()
			.replace(
				"ROLE_",
				""
			);


	if (
		role !== "PATIENT"
	) {

		alert(
			"Access denied. Only PATIENT can access this page."
		);


		window.location.href =
			"/dashboard";
	}
}


async function loadMyPrescriptions() {

	if (
		isLoadingPatientPrescriptions
	) {

		return;
	}


	const token =
		localStorage.getItem(
			"token"
		);


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	if (
		!token ||
		!tenantId
	) {

		showPatientPrescriptionMsg(
			"Please select your SaaS workspace first."
		);

		return;
	}


	isLoadingPatientPrescriptions =
		true;


	showPatientPrescriptionsLoadingState();


	setButtonLoading(
		"refreshPrescriptionsBtn",
		"Refreshing...",
		true
	);


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/prescriptions/my?tenantId=${encodeURIComponent(tenantId)}`,
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
			await readJsonSafely(
				response
			);


		if (!response.ok) {

			patientPrescriptions = [];


			const message =
				getErrorMessage(
					result,
					"Unable to load prescriptions."
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
			"Load SaaS patient prescriptions failed:",
			error
		);


		patientPrescriptions = [];


		showPatientPrescriptionsErrorState(
			"SaaS prescription service is currently unavailable."
		);


	} finally {

		isLoadingPatientPrescriptions =
			false;


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
					b.createdAt
				)
				-
				safeDateTimestamp(
					a.createdAt
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


	if (
		!patientPrescriptions.length
	) {

		container.innerHTML = `
			<div class="patient-prescriptions-state">

				<div class="patient-prescriptions-state-icon">
					<i class="bi bi-file-earmark-x-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No prescriptions found
				</h5>

				<p class="text-muted mb-0">
					Your SaaS workspace prescriptions will appear here.
				</p>

			</div>
		`;

		return;
	}


	container.innerHTML =
		patientPrescriptions
			.map(
				function(item, index) {

					const prescriptionId =
						Number(
							item.id
						);


					const medicines =
						Array.isArray(
							item.medicines
						)
							? item.medicines
							: [];


					const medicineHtml =
						medicines.length
							? medicines
								.map(
									medicine => `
											<div class="mb-2">

												<strong>
													${safe(
										medicine.medicineName
									)}
												</strong>

												<div class="text-muted small">
													${safe(
										medicine.dosage
									)}
													•
													${safe(
										medicine.frequency
									)}
													•
													${safe(
										medicine.duration
									)}
												</div>

											</div>
										`
								)
								.join("")
							: "No medicines prescribed";


					return `
						<article
							class="prescription-card"
							style="--card-delay:${Math.min(
						index * 65,
						390
					)}ms">

							<div class="prescription-card-header">

								<div>

									<div class="prescription-heading-wrap">

										<div class="prescription-icon">
											<i class="bi bi-prescription2"></i>
										</div>

										<div>

											<h5>
												Prescription #${prescriptionId}
											</h5>

											<div class="text-muted small mt-1">
												${formatDateTime(
						item.createdAt
					)}
											</div>

										</div>

									</div>

									<div class="prescription-meta">

										<span class="prescription-chip">
											<i class="bi bi-person-badge-fill"></i>
											${safe(
						item.doctorName
					)}
										</span>

										${item.department
							? `
												<span class="prescription-chip">
													${safe(item.department)}
												</span>
											`
							: ""
						}

									</div>

								</div>

								<span class="prescription-status">
									<i class="bi bi-check2-circle"></i>
									Available
								</span>

							</div>


							<div class="prescription-details-grid">

								<div class="prescription-detail-box">

									<small>Diagnosis</small>

									<strong>
										${safe(
							item.diagnosis
						)}
									</strong>

								</div>


								<div class="prescription-detail-box">

									<small>Follow Up</small>

									<strong>
										${formatDate(
							item.followUpDate
						)}
									</strong>

									<div class="text-muted small">
										${safe(
							item.followUpAdvice
						)}
									</div>

								</div>


								<div class="prescription-detail-box full">

									<small>Medicines</small>

									<div>
										${medicineHtml}
									</div>

								</div>


								<div class="prescription-detail-box full">

									<small>Doctor Advice</small>

									<strong>
										${safe(
							item.advice
						)}
									</strong>

								</div>

							</div>


							<div class="prescription-card-actions">

								<button
									type="button"
									id="downloadPrescriptionBtn_${prescriptionId}"
									class="btn btn-medi"
									style="width:auto;"
									onclick="downloadMyPrescriptionPdf(${prescriptionId})">

									<i class="bi bi-file-earmark-pdf-fill me-1"></i>
									Download PDF

								</button>

							</div>

						</article>
					`;
				}
			)
			.join("");
}


function updatePrescriptionSummary() {

	setSummaryValue(
		"totalPrescriptions",
		patientPrescriptions.length
	);


	const latest =
		patientPrescriptions.length
			? formatDate(
				patientPrescriptions[0]
					.createdAt
			)
			: "-";


	const element =
		document.getElementById(
			"latestPrescriptionDate"
		);


	if (element) {

		element.textContent =
			latest;
	}
}


async function downloadMyPrescriptionPdf(
	prescriptionId
) {

	const id =
		Number(
			prescriptionId
		);


	if (
		!Number.isFinite(id)
		||
		id <= 0
		||
		downloadingPrescriptionIds.has(
			id
		)
	) {

		return;
	}


	downloadingPrescriptionIds.add(
		id
	);


	const token =
		localStorage.getItem(
			"token"
		);


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	setButtonLoading(
		`downloadPrescriptionBtn_${id}`,
		"Downloading...",
		true
	);


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/prescriptions/my/${id}/pdf?tenantId=${encodeURIComponent(tenantId)}`,
				{
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
					"Unable to download prescription PDF."
				)
			);

			return;
		}


		const blob =
			await response.blob();


		const url =
			window.URL.createObjectURL(
				blob
			);


		const anchor =
			document.createElement(
				"a"
			);


		anchor.href =
			url;


		anchor.download =
			`saas-prescription-${id}.pdf`;


		document.body.appendChild(
			anchor
		);


		anchor.click();

		anchor.remove();


		window.setTimeout(
			() =>
				window.URL.revokeObjectURL(
					url
				),
			1000
		);


	} catch (error) {

		console.error(
			"Prescription PDF download failed:",
			error
		);


		showPatientPrescriptionMsg(
			"Unable to download prescription PDF."
		);


	} finally {

		downloadingPrescriptionIds.delete(
			id
		);


		setButtonLoading(
			`downloadPrescriptionBtn_${id}`,
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
				${safe(message)}
			</p>

		</div>
	`;
}


function showPatientPrescriptionMsg(
	message,
	type = "danger"
) {

	const element =
		document.getElementById(
			"msg"
		);


	if (!element) {
		return;
	}


	element.innerHTML = `
		<div class="alert alert-${type}">
			${safe(message)}
		</div>
	`;


	window.setTimeout(
		() => {
			element.innerHTML = "";
		},
		5000
	);
}


function readJsonSafely(
	response
) {

	return response
		.json()
		.catch(
			() => ({})
		);
}


function getErrorMessage(
	result,
	fallback
) {

	return result?.message
		||
		fallback;
}


function safeDateTimestamp(
	value
) {

	const timestamp =
		new Date(
			value
		)
			.getTime();


	return Number.isFinite(
		timestamp
	)
		? timestamp
		: 0;
}


function formatDateTime(
	value
) {

	if (!value) {
		return "-";
	}


	const date =
		new Date(
			value
		);


	if (
		Number.isNaN(
			date.getTime()
		)
	) {

		return safe(
			value
		);
	}


	return date.toLocaleString(
		"en-IN",
		{
			day:
				"2-digit",

			month:
				"short",

			year:
				"numeric",

			hour:
				"2-digit",

			minute:
				"2-digit"
		}
	);
}


function formatDate(
	value
) {

	if (!value) {
		return "-";
	}


	const date =
		new Date(
			value
		);


	if (
		Number.isNaN(
			date.getTime()
		)
	) {

		return safe(
			value
		);
	}


	return date.toLocaleDateString(
		"en-IN",
		{
			day:
				"2-digit",

			month:
				"short",

			year:
				"numeric"
		}
	);
}


function setSummaryValue(
	id,
	value
) {

	const element =
		document.getElementById(
			id
		);


	if (element) {

		element.textContent =
			String(
				value ?? "-"
			);
	}
}


function setButtonLoading(
	id,
	text,
	loading
) {

	const button =
		document.getElementById(
			id
		);


	if (!button) {
		return;
	}


	button.disabled =
		Boolean(
			loading
		);


	if (loading) {

		button.dataset.originalHtml =
			button.innerHTML;


		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-1"></span>
			${safe(text)}
		`;

		return;
	}


	if (
		button.dataset.originalHtml
	) {

		button.innerHTML =
			button.dataset.originalHtml;

		delete button.dataset.originalHtml;
	}
}


function safe(
	value
) {

	if (
		value === null
		||
		value === undefined
		||
		String(
			value
		).trim() === ""
	) {

		return "-";
	}


	return String(
		value
	)
		.replaceAll(
			"&",
			"&amp;"
		)
		.replaceAll(
			"<",
			"&lt;"
		)
		.replaceAll(
			">",
			"&gt;"
		)
		.replaceAll(
			"\"",
			"&quot;"
		)
		.replaceAll(
			"'",
			"&#039;"
		);
}