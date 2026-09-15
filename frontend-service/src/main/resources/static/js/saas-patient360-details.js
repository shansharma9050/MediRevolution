let currentPatient360PatientId = null;

let isUploadingPatient360Document = false;


/*
 * ================================================================
 * INITIALIZE PATIENT 360 EXTENSION
 * ================================================================
 */

(function initializePatient360DetailsExtension() {

	if (
		typeof renderPatient360 !== "function"
	) {
		console.error(
			"Patient 360 base renderer is not available."
		);

		return;
	}


	injectPatient360DetailStyles();


	const baseRenderPatient360 =
		renderPatient360;


	renderPatient360 =
		function(data) {

			baseRenderPatient360(
				data
			);


			currentPatient360PatientId =
				safeNumber(
					data?.patient?.id
				);


			ensurePatient360DetailWorkspace();


			renderPatient360MedicationHistory(
				data?.medicationHistory
			);


			renderPatient360InvestigationHistory(
				data?.investigationHistory
			);


			renderPatient360DocumentHistory(
				data?.documentHistory
			);


			updatePatient360DetailCounters(
				data
			);


			applyPatient360DocumentPermissions();
		};


	/*
	 * Extend timeline style without changing the original
	 * Patient 360 renderer.
	 */
	if (
		typeof getPatient360TimelineStyle === "function"
	) {

		const baseTimelineStyle =
			getPatient360TimelineStyle;


		getPatient360TimelineStyle =
			function(type) {

				const normalizedType =
					String(
						type || ""
					)
						.trim()
						.toUpperCase();


				if (
					normalizedType === "DOCUMENT"
				) {

					return {
						icon:
							"bi-folder2-open",

						cssClass:
							"patient360-event-document"
					};
				}


				return baseTimelineStyle(
					type
				);
			};
	}

})();


/*
 * ================================================================
 * WORKSPACE
 * ================================================================
 */

function ensurePatient360DetailWorkspace() {

	const mainContent =
		document.getElementById(
			"patient360MainContent"
		);


	if (!mainContent) {

		return;
	}


	let workspace =
		document.getElementById(
			"patient360ExtendedWorkspace"
		);


	if (workspace) {

		return;
	}


	workspace =
		document.createElement(
			"div"
		);


	workspace.id =
		"patient360ExtendedWorkspace";


	workspace.className =
		"patient360-extended-workspace";


	workspace.innerHTML = `

		<div class="patient360-extended-heading">

			<div>

				<div class="patient360-extended-kicker">
					Longitudinal Clinical Workspace
				</div>

				<h5>
					Complete Patient History
				</h5>

				<p>
					Medication, investigations, reports and secure clinical documents in one unified view.
				</p>

			</div>

			<div class="patient360-extended-counts">

				<span>
					<i class="bi bi-capsule-pill"></i>

					<strong id="patient360MedicationCount">
						0
					</strong>

					Medicines
				</span>

				<span>
					<i class="bi bi-clipboard2-pulse"></i>

					<strong id="patient360InvestigationCount">
						0
					</strong>

					Investigations
				</span>

				<span>
					<i class="bi bi-folder2-open"></i>

					<strong id="patient360DocumentCount">
						0
					</strong>

					Documents
				</span>

			</div>

		</div>


		<div class="patient360-detail-grid">

			<section class="patient360-detail-panel">

				<div class="patient360-detail-panel-header">

					<div class="patient360-detail-title">

						<span class="patient360-detail-icon patient360-detail-icon-medication">
							<i class="bi bi-capsule-pill"></i>
						</span>

						<div>

							<small>
								Treatment History
							</small>

							<h6>
								Medication History
							</h6>

						</div>

					</div>

				</div>

				<div id="patient360MedicationHistory"
					class="patient360-detail-body">
				</div>

			</section>


			<section class="patient360-detail-panel">

				<div class="patient360-detail-panel-header">

					<div class="patient360-detail-title">

						<span class="patient360-detail-icon patient360-detail-icon-investigation">
							<i class="bi bi-clipboard2-pulse-fill"></i>
						</span>

						<div>

							<small>
								Diagnostics
							</small>

							<h6>
								Investigations & Reports
							</h6>

						</div>

					</div>

				</div>

				<div id="patient360InvestigationHistory"
					class="patient360-detail-body">
				</div>

			</section>

		</div>


		<section class="patient360-detail-panel patient360-document-panel">

			<div class="patient360-detail-panel-header">

				<div class="patient360-detail-title">

					<span class="patient360-detail-icon patient360-detail-icon-document">
						<i class="bi bi-shield-lock-fill"></i>
					</span>

					<div>

						<small>
							Secure Health Record
						</small>

						<h6>
							Document Vault
						</h6>

					</div>

				</div>


				<button type="button"
					id="patient360UploadDocumentBtn"
					class="btn btn-sm btn-primary patient360-upload-document-btn"
					onclick="openPatient360DocumentUpload()">

					<i class="bi bi-cloud-arrow-up-fill me-1"></i>

					Upload Document

				</button>

			</div>


			<div id="patient360DocumentHistory"
				class="patient360-document-grid">
			</div>

		</section>


		<div class="modal fade"
			id="patient360DocumentUploadModal"
			tabindex="-1"
			aria-hidden="true">

			<div class="modal-dialog modal-dialog-centered">

				<div class="modal-content patient360-upload-modal-content">

					<div class="modal-header patient360-upload-modal-header">

						<div>

							<div class="small text-white-50 fw-bold text-uppercase">
								Secure Patient Vault
							</div>

							<h5 class="modal-title">
								Upload Clinical Document
							</h5>

						</div>

						<button type="button"
							class="btn-close btn-close-white"
							data-bs-dismiss="modal"
							aria-label="Close">
						</button>

					</div>


					<div class="modal-body">

						<form id="patient360DocumentUploadForm"
							onsubmit="uploadPatient360Document(event)">

							<div class="mb-3">

								<label class="form-label fw-bold">
									Document Type
								</label>

								<select id="patient360DocumentType"
									class="form-select"
									required>

									<option value="">
										Select document type
									</option>

									<option value="PRESCRIPTION">
										Prescription
									</option>

									<option value="LAB_REPORT">
										Lab Report
									</option>

									<option value="RADIOLOGY_REPORT">
										Radiology Report
									</option>

									<option value="DISCHARGE_SUMMARY">
										Discharge Summary
									</option>

									<option value="OPD_DOCUMENT">
										OPD Document
									</option>

									<option value="IPD_DOCUMENT">
										IPD Document
									</option>

									<option value="INVOICE">
										Invoice
									</option>

									<option value="INSURANCE">
										Insurance
									</option>

									<option value="CONSENT">
										Consent
									</option>

									<option value="IDENTITY">
										Identity
									</option>

									<option value="REFERRAL">
										Referral
									</option>

									<option value="CERTIFICATE">
										Certificate
									</option>

									<option value="OTHER">
										Other
									</option>

								</select>

							</div>


							<div class="mb-3">

								<label class="form-label fw-bold">
									Title
								</label>

								<input type="text"
									id="patient360DocumentTitle"
									class="form-control"
									maxlength="200"
									required>

							</div>


							<div class="mb-3">

								<label class="form-label fw-bold">
									Document Date
								</label>

								<input type="date"
									id="patient360DocumentDate"
									class="form-control">

							</div>


							<div class="mb-3">

								<label class="form-label fw-bold">
									Description
								</label>

								<textarea id="patient360DocumentDescription"
									class="form-control"
									rows="3"
									maxlength="1000"></textarea>

							</div>


							<div class="mb-3">

								<label class="form-label fw-bold">
									File
								</label>

								<input type="file"
									id="patient360DocumentFile"
									class="form-control"
									accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
									required>

								<div class="form-text">
									PDF, JPG, JPEG or PNG. Maximum 10 MB.
								</div>

							</div>


							<div id="patient360DocumentUploadMessage"
								class="alert d-none"
								role="alert">
							</div>


							<div class="d-flex justify-content-end gap-2">

								<button type="button"
									class="btn btn-light"
									data-bs-dismiss="modal">

									Cancel

								</button>


								<button type="submit"
									id="patient360DocumentUploadSubmitBtn"
									class="btn btn-primary">

									<i class="bi bi-cloud-arrow-up me-1"></i>

									Upload

								</button>

							</div>

						</form>

					</div>

				</div>

			</div>

		</div>
	`;


	mainContent.appendChild(
		workspace
	);
}


/*
 * ================================================================
 * COUNTERS
 * ================================================================
 */

function updatePatient360DetailCounters(data) {

	setText(
		"patient360MedicationCount",
		Array.isArray(
			data?.medicationHistory
		)
			? data.medicationHistory.length
			: 0
	);


	setText(
		"patient360InvestigationCount",
		Array.isArray(
			data?.investigationHistory
		)
			? data.investigationHistory.length
			: 0
	);


	setText(
		"patient360DocumentCount",
		Array.isArray(
			data?.documentHistory
		)
			? data.documentHistory.length
			: 0
	);
}


/*
 * ================================================================
 * MEDICATION HISTORY
 * ================================================================
 */

function renderPatient360MedicationHistory(history) {

	const container =
		document.getElementById(
			"patient360MedicationHistory"
		);


	if (!container) {

		return;
	}


	const medications =
		Array.isArray(history)
			? history
			: [];


	if (!medications.length) {

		container.innerHTML =
			buildPatient360ExtendedEmptyState(
				"bi-capsule",
				"No medication history recorded."
			);

		return;
	}


	container.innerHTML =
		medications
			.map(
				function(item) {

					const schedule =
						[
							item.dosage,
							item.frequency,
							item.duration
						]
							.filter(
								function(value) {
									return Boolean(
										value
									);
								}
							)
							.join(
								" • "
							);


					return `

						<div class="patient360-medication-item">

							<div class="patient360-medication-main">

								<div class="patient360-medication-icon">
									<i class="bi bi-capsule"></i>
								</div>

								<div class="flex-grow-1">

									<div class="patient360-item-heading">
										${safe(
											item.medicineName ||
											"Medicine"
										)}
									</div>

									<div class="patient360-item-meta">
										${safe(
											schedule ||
											"Dosage details not recorded"
										)}
									</div>

								</div>

							</div>


							<div class="patient360-item-date">
								${safe(
									formatPatient360DateTime(
										item.prescribedAt
									)
								)}
							</div>


							${item.diagnosis
								? `
									<div class="patient360-detail-note">
										<strong>Diagnosis:</strong>
										${safe(item.diagnosis)}
									</div>
								`
								: ""
							}


							${item.instructions
								? `
									<div class="patient360-detail-note">
										<strong>Instructions:</strong>
										${safe(item.instructions)}
									</div>
								`
								: ""
							}

						</div>
					`;
				}
			)
			.join("");
}


/*
 * ================================================================
 * INVESTIGATION HISTORY
 * ================================================================
 */

function renderPatient360InvestigationHistory(history) {

	const container =
		document.getElementById(
			"patient360InvestigationHistory"
		);


	if (!container) {

		return;
	}


	const investigations =
		Array.isArray(history)
			? history
			: [];


	if (!investigations.length) {

		container.innerHTML =
			buildPatient360ExtendedEmptyState(
				"bi-clipboard2-pulse",
				"No investigation history recorded."
			);

		return;
	}


	container.innerHTML =
		investigations
			.map(
				function(item) {

					const diagnosticType =
						String(
							item.diagnosticType ||
							"DIAGNOSTIC"
						)
							.trim()
							.toUpperCase();


					const tests =
						Array.isArray(
							item.tests
						)
							? item.tests
							: [];


					const testsHtml =
						tests.length
							? `
								<div class="patient360-test-list">

									${tests
										.map(
											function(test) {

												return `
													<span class="patient360-test-chip">

														<i class="bi bi-check2-circle"></i>

														${safe(
															test.testName ||
															"Test"
														)}

														${test.testCode
															? `
																<small>
																	(${safe(test.testCode)})
																</small>
															`
															: ""
														}

													</span>
												`;
											}
										)
										.join("")
									}

								</div>
							`
							: "";


					return `

						<div class="patient360-investigation-item">

							<div class="patient360-investigation-top">

								<div>

									<div class="d-flex align-items-center gap-2 flex-wrap">

										<span class="patient360-investigation-type
											${diagnosticType === "LAB"
												? "is-lab"
												: diagnosticType === "RADIOLOGY"
													? "is-radiology"
													: ""
											}">

											${safe(
												formatLabel(
													diagnosticType
												)
											)}

										</span>


										${item.status
											? `
												<span class="badge text-bg-light">
													${safe(
														formatPatient360Status(
															item.status
														)
													)}
												</span>
											`
											: ""
										}

									</div>


									<div class="patient360-item-heading mt-2">
										${safe(
											item.orderNumber ||
											"Diagnostic Order"
										)}
									</div>

								</div>


								<div class="patient360-item-date">
									${safe(
										formatPatient360DateTime(
											item.orderedAt
										)
									)}
								</div>

							</div>


							${testsHtml}


							${item.resultSummary
								? `
									<div class="patient360-result-box">

										<div class="patient360-result-label">
											Result Summary
										</div>

										${safe(
											item.resultSummary
										)}

									</div>
								`
								: ""
							}


							${item.resultDetails
								? `
									<div class="patient360-detail-note">
										${safe(
											item.resultDetails
										)}
									</div>
								`
								: ""
							}


							<div class="patient360-investigation-dates">

								${item.sampleCollectedAt
									? `
										<span>
											<i class="bi bi-droplet-half"></i>

											Sample:
											${safe(
												formatPatient360DateTime(
													item.sampleCollectedAt
												)
											)}
										</span>
									`
									: ""
								}


								${item.reportReadyAt
									? `
										<span>
											<i class="bi bi-file-earmark-check"></i>

											Report:
											${safe(
												formatPatient360DateTime(
													item.reportReadyAt
												)
											)}
										</span>
									`
									: ""
								}

							</div>

						</div>
					`;
				}
			)
			.join("");
}


/*
 * ================================================================
 * DOCUMENT HISTORY
 * ================================================================
 */

function renderPatient360DocumentHistory(history) {

	const container =
		document.getElementById(
			"patient360DocumentHistory"
		);


	if (!container) {

		return;
	}


	const documents =
		Array.isArray(history)
			? history
			: [];


	if (!documents.length) {

		container.innerHTML =
			buildPatient360ExtendedEmptyState(
				"bi-folder2-open",
				"No documents uploaded to the patient vault."
			);

		return;
	}


	container.innerHTML =
		documents
			.map(
				function(documentItem) {

					const documentId =
						safeNumber(
							documentItem.documentId
						);


					return `

						<div class="patient360-document-card">

							<div class="patient360-document-card-top">

								<div class="patient360-document-file-icon">
									<i class="${safe(
										getPatient360DocumentIcon(
											documentItem.fileExtension
										)
									)}"></i>
								</div>


								<div class="flex-grow-1">

									<div class="patient360-item-heading">
										${safe(
											documentItem.title ||
											"Patient Document"
										)}
									</div>


									<div class="patient360-item-meta">
										${safe(
											formatLabel(
												documentItem.documentType
											)
										)}
									</div>

								</div>

							</div>


							<div class="patient360-document-file-name">
								<i class="bi bi-paperclip"></i>

								${safe(
									documentItem.fileName ||
									"Clinical document"
								)}
							</div>


							<div class="patient360-document-meta-row">

								<span>
									<i class="bi bi-calendar3"></i>

									${safe(
										formatPatient360Date(
											documentItem.documentDate
										)
									)}
								</span>


								<span>
									<i class="bi bi-hdd"></i>

									${safe(
										formatPatient360FileSize(
											documentItem.fileSizeBytes
										)
									)}
								</span>

							</div>


							${documentItem.description
								? `
									<div class="patient360-detail-note">
										${safe(
											documentItem.description
										)}
									</div>
								`
								: ""
							}


							<div class="patient360-document-actions">

								<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="downloadPatient360Document(
										${documentId},
										'${escapePatient360JsString(
											documentItem.fileName ||
											"patient-document"
										)}'
									)"
									${documentId ? "" : "disabled"}>

									<i class="bi bi-download me-1"></i>

									Download

								</button>

							</div>

						</div>
					`;
				}
			)
			.join("");
}


/*
 * ================================================================
 * DOCUMENT DOWNLOAD
 * ================================================================
 */

async function downloadPatient360Document(
	documentId,
	fileName
) {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	if (
		!tenantId ||
		!documentId
	) {

		showMsg(
			"Unable to download document."
		);

		return;
	}


	try {

		const query =
			new URLSearchParams({
				tenantId:
					tenantId
			});


		const response =
			await fetch(
				`${API_BASE}/saas/patient-documents/${documentId}/download?${query.toString()}`,
				{
					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							)
					}
				}
			);


		if (!response.ok) {

			let message =
				"Unable to download document.";


			try {

				const errorResult =
					await safeJson(
						response
					);


				message =
					getApiErrorMessage(
						errorResult,
						message
					);

			} catch (ignore) {
			}


			showMsg(
				message
			);

			return;
		}


		const blob =
			await response.blob();


		const objectUrl =
			URL.createObjectURL(
				blob
			);


		const link =
			document.createElement(
				"a"
			);


		link.href =
			objectUrl;


		link.download =
			fileName ||
			"patient-document";


		document.body.appendChild(
			link
		);


		link.click();


		link.remove();


		URL.revokeObjectURL(
			objectUrl
		);


	} catch (error) {

		console.error(
			"Patient document download error:",
			error
		);


		showMsg(
			"Unable to download patient document."
		);
	}
}


/*
 * ================================================================
 * DOCUMENT UPLOAD
 * ================================================================
 */

function openPatient360DocumentUpload() {

	if (
		!patientPermissions?.create
	) {

		showMsg(
			"You do not have permission to upload patient documents."
		);

		return;
	}


	if (
		!currentPatient360PatientId
	) {

		showMsg(
			"Patient information is unavailable."
		);

		return;
	}


	const form =
		document.getElementById(
			"patient360DocumentUploadForm"
		);


	if (form) {

		form.reset();
	}


	hidePatient360UploadMessage();


	const modalElement =
		document.getElementById(
			"patient360DocumentUploadModal"
		);


	if (!modalElement) {

		return;
	}


	bootstrap.Modal
		.getOrCreateInstance(
			modalElement
		)
		.show();
}


async function uploadPatient360Document(event) {

	event.preventDefault();


	if (
		isUploadingPatient360Document
	) {

		return;
	}


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	const patientId =
		currentPatient360PatientId;


	const documentType =
		getPatient360FieldValue(
			"patient360DocumentType"
		);


	const title =
		getPatient360FieldValue(
			"patient360DocumentTitle"
		);


	const documentDate =
		getPatient360FieldValue(
			"patient360DocumentDate"
		);


	const description =
		getPatient360FieldValue(
			"patient360DocumentDescription"
		);


	const fileInput =
		document.getElementById(
			"patient360DocumentFile"
		);


	const file =
		fileInput?.files?.[0];


	if (
		!tenantId ||
		!patientId
	) {

		showPatient360UploadMessage(
			"Patient workspace information is unavailable.",
			"danger"
		);

		return;
	}


	if (
		!documentType ||
		!title ||
		!file
	) {

		showPatient360UploadMessage(
			"Document type, title and file are required.",
			"warning"
		);

		return;
	}


	if (
		file.size >
		10 * 1024 * 1024
	) {

		showPatient360UploadMessage(
			"Document file cannot exceed 10 MB.",
			"warning"
		);

		return;
	}


	isUploadingPatient360Document =
		true;


	setPatient360UploadButtonLoading(
		true
	);


	try {

		const formData =
			new FormData();


		formData.append(
			"tenantId",
			tenantId
		);


		formData.append(
			"patientId",
			patientId
		);


		formData.append(
			"documentType",
			documentType
		);


		formData.append(
			"title",
			title
		);


		if (documentDate) {

			formData.append(
				"documentDate",
				documentDate
			);
		}


		if (description) {

			formData.append(
				"description",
				description
			);
		}


		formData.append(
			"file",
			file
		);


		const response =
			await fetch(
				`${API_BASE}/saas/patient-documents/upload`,
				{
					method:
						"POST",

					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							)
					},

					body:
						formData
				}
			);


		const result =
			await safeJson(
				response
			);


		if (!response.ok) {

			showPatient360UploadMessage(
				getApiErrorMessage(
					result,
					"Unable to upload patient document."
				),
				"danger"
			);

			return;
		}


		showPatient360UploadMessage(
			"Document uploaded successfully.",
			"success"
		);


		const uploadedPatientId =
			currentPatient360PatientId;


		window.setTimeout(
			function() {

				const modalElement =
					document.getElementById(
						"patient360DocumentUploadModal"
					);


				if (modalElement) {

					bootstrap.Modal
						.getOrCreateInstance(
							modalElement
						)
						.hide();
				}


				if (
					uploadedPatientId
				) {

					viewPatient360(
						uploadedPatientId
					);
				}

			},
			350
		);


	} catch (error) {

		console.error(
			"Patient document upload error:",
			error
		);


		showPatient360UploadMessage(
			"Unable to reach document service.",
			"danger"
		);


	} finally {

		isUploadingPatient360Document =
			false;


		setPatient360UploadButtonLoading(
			false
		);
	}
}


/*
 * ================================================================
 * PERMISSION UI
 * ================================================================
 */

function applyPatient360DocumentPermissions() {

	const button =
		document.getElementById(
			"patient360UploadDocumentBtn"
		);


	if (!button) {

		return;
	}


	const allowed =
		Boolean(
			patientPermissions?.create
		);


	button.classList.toggle(
		"d-none",
		!allowed
	);
}


/*
 * ================================================================
 * SMALL HELPERS
 * ================================================================
 */

function buildPatient360ExtendedEmptyState(
	icon,
	message
) {

	return `

		<div class="patient360-extended-empty">

			<i class="bi ${safe(icon)}"></i>

			<span>
				${safe(message)}
			</span>

		</div>
	`;
}


function getPatient360DocumentIcon(extension) {

	switch (
		String(
			extension || ""
		)
			.trim()
			.toLowerCase()
	) {

		case "pdf":
			return "bi bi-file-earmark-pdf-fill";

		case "jpg":
		case "jpeg":
		case "png":
			return "bi bi-file-earmark-image-fill";

		default:
			return "bi bi-file-earmark-medical-fill";
	}
}


function formatPatient360FileSize(bytes) {

	const size =
		Number(
			bytes
		);


	if (
		!Number.isFinite(size) ||
		size < 0
	) {

		return "-";
	}


	if (size < 1024) {

		return `${Math.round(size)} B`;
	}


	const kilobytes =
		size / 1024;


	if (kilobytes < 1024) {

		return `${kilobytes.toFixed(1)} KB`;
	}


	const megabytes =
		kilobytes / 1024;


	return `${megabytes.toFixed(1)} MB`;
}


function escapePatient360JsString(value) {

	return String(
		value || ""
	)
		.replace(
			/\\/g,
			"\\\\"
		)
		.replace(
			/'/g,
			"\\'"
		)
		.replace(
			/\r/g,
			""
		)
		.replace(
			/\n/g,
			" "
		);
}


function getPatient360FieldValue(id) {

	const element =
		document.getElementById(
			id
		);


	return element
		? String(
			element.value || ""
		).trim()
		: "";
}


function showPatient360UploadMessage(
	message,
	type
) {

	const element =
		document.getElementById(
			"patient360DocumentUploadMessage"
		);


	if (!element) {

		return;
	}


	element.className =
		`alert alert-${type || "info"}`;


	element.textContent =
		message || "";
}


function hidePatient360UploadMessage() {

	const element =
		document.getElementById(
			"patient360DocumentUploadMessage"
		);


	if (!element) {

		return;
	}


	element.className =
		"alert d-none";


	element.textContent =
		"";
}


function setPatient360UploadButtonLoading(
	loading
) {

	const button =
		document.getElementById(
			"patient360DocumentUploadSubmitBtn"
		);


	if (!button) {

		return;
	}


	button.disabled =
		Boolean(
			loading
		);


	button.innerHTML =
		loading
			? `
				<span class="spinner-border spinner-border-sm me-1"></span>
				Uploading...
			`
			: `
				<i class="bi bi-cloud-arrow-up me-1"></i>
				Upload
			`;
}


/*
 * ================================================================
 * STYLES
 * ================================================================
 */

function injectPatient360DetailStyles() {

	if (
		document.getElementById(
			"patient360ExtendedStyles"
		)
	) {

		return;
	}


	const style =
		document.createElement(
			"style"
		);


	style.id =
		"patient360ExtendedStyles";


	style.textContent = `

		.patient360-extended-workspace {
			margin-top: 24px;
		}


		.patient360-extended-heading {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 20px;
			margin-bottom: 18px;
			padding: 21px 22px;
			border: 1px solid rgba(8, 199, 212, .16);
			border-radius: 22px;
			background:
				linear-gradient(
					135deg,
					rgba(5, 40, 95, .98),
					rgba(8, 115, 159, .96)
				);
			color: #fff;
			box-shadow: 0 16px 36px rgba(5, 40, 95, .15);
		}


		.patient360-extended-kicker {
			margin-bottom: 4px;
			color: #b8f267;
			font-size: 10px;
			font-weight: 900;
			letter-spacing: 1.15px;
			text-transform: uppercase;
		}


		.patient360-extended-heading h5 {
			margin: 0;
			font-weight: 900;
		}


		.patient360-extended-heading p {
			max-width: 690px;
			margin: 7px 0 0;
			color: rgba(255, 255, 255, .74);
			font-size: 12px;
		}


		.patient360-extended-counts {
			display: flex;
			flex-wrap: wrap;
			justify-content: flex-end;
			gap: 8px;
		}


		.patient360-extended-counts span {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 8px 11px;
			border: 1px solid rgba(255, 255, 255, .14);
			border-radius: 999px;
			background: rgba(255, 255, 255, .1);
			font-size: 10px;
			font-weight: 800;
		}


		.patient360-detail-grid {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 16px;
			margin-bottom: 16px;
		}


		.patient360-detail-panel {
			overflow: hidden;
			border: 1px solid #e3edf3;
			border-radius: 20px;
			background: #fff;
			box-shadow: 0 10px 30px rgba(5, 40, 95, .07);
		}


		.patient360-detail-panel-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			padding: 17px 18px;
			border-bottom: 1px solid #edf3f6;
			background: #f9fcfd;
		}


		.patient360-detail-title {
			display: flex;
			align-items: center;
			gap: 11px;
		}


		.patient360-detail-title small {
			display: block;
			color: #7a8d9f;
			font-size: 9px;
			font-weight: 900;
			letter-spacing: .8px;
			text-transform: uppercase;
		}


		.patient360-detail-title h6 {
			margin: 3px 0 0;
			color: #05285f;
			font-weight: 900;
		}


		.patient360-detail-icon {
			display: flex;
			width: 42px;
			height: 42px;
			align-items: center;
			justify-content: center;
			border-radius: 14px;
			color: #fff;
			font-size: 18px;
		}


		.patient360-detail-icon-medication {
			background: linear-gradient(135deg, #0b8f6a, #24c88a);
		}


		.patient360-detail-icon-investigation {
			background: linear-gradient(135deg, #0577b8, #08c7d4);
		}


		.patient360-detail-icon-document {
			background: linear-gradient(135deg, #05285f, #08739f);
		}


		.patient360-detail-body {
			max-height: 420px;
			overflow-y: auto;
			padding: 15px;
		}


		.patient360-medication-item,
		.patient360-investigation-item {
			margin-bottom: 12px;
			padding: 15px;
			border: 1px solid #e7eff4;
			border-radius: 16px;
			background: #fff;
		}


		.patient360-medication-item:last-child,
		.patient360-investigation-item:last-child {
			margin-bottom: 0;
		}


		.patient360-medication-main,
		.patient360-investigation-top,
		.patient360-document-card-top {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 11px;
		}


		.patient360-medication-icon {
			display: flex;
			width: 38px;
			height: 38px;
			flex: 0 0 38px;
			align-items: center;
			justify-content: center;
			border-radius: 13px;
			color: #087b61;
			background: #ddf8ef;
			font-size: 17px;
		}


		.patient360-item-heading {
			color: #05285f;
			font-size: 13px;
			font-weight: 900;
		}


		.patient360-item-meta,
		.patient360-item-date {
			margin-top: 3px;
			color: #718497;
			font-size: 11px;
			line-height: 1.55;
		}


		.patient360-item-date {
			white-space: nowrap;
		}


		.patient360-detail-note {
			margin-top: 10px;
			padding: 9px 11px;
			border-radius: 11px;
			color: #526a80;
			background: #f4f8fa;
			font-size: 11px;
			line-height: 1.6;
		}


		.patient360-investigation-type {
			display: inline-flex;
			padding: 5px 9px;
			border-radius: 999px;
			color: #394b5d;
			background: #edf2f5;
			font-size: 9px;
			font-weight: 900;
		}


		.patient360-investigation-type.is-lab {
			color: #08664f;
			background: #dcf7ed;
		}


		.patient360-investigation-type.is-radiology {
			color: #075b89;
			background: #def4fb;
		}


		.patient360-test-list {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
			margin-top: 12px;
		}


		.patient360-test-chip {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			padding: 6px 9px;
			border-radius: 999px;
			color: #426073;
			background: #eef7fa;
			font-size: 10px;
			font-weight: 700;
		}


		.patient360-result-box {
			margin-top: 12px;
			padding: 11px 12px;
			border-left: 3px solid #08c7d4;
			border-radius: 10px;
			color: #425c70;
			background: #eefbfc;
			font-size: 11px;
			line-height: 1.6;
		}


		.patient360-result-label {
			margin-bottom: 4px;
			color: #0577b8;
			font-size: 9px;
			font-weight: 900;
			letter-spacing: .6px;
			text-transform: uppercase;
		}


		.patient360-investigation-dates {
			display: flex;
			flex-wrap: wrap;
			gap: 7px 12px;
			margin-top: 10px;
			color: #74889a;
			font-size: 10px;
		}


		.patient360-document-panel {
			margin-bottom: 18px;
		}


		.patient360-document-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 12px;
			padding: 15px;
		}


		.patient360-document-card {
			padding: 15px;
			border: 1px solid #e6eef4;
			border-radius: 16px;
			background: linear-gradient(180deg, #fff, #fbfdfe);
			transition: .25s;
		}


		.patient360-document-card:hover {
			transform: translateY(-3px);
			box-shadow: 0 13px 28px rgba(5, 40, 95, .09);
		}


		.patient360-document-file-icon {
			display: flex;
			width: 40px;
			height: 40px;
			flex: 0 0 40px;
			align-items: center;
			justify-content: center;
			border-radius: 13px;
			color: #0878aa;
			background: #e4f6fb;
			font-size: 19px;
		}


		.patient360-document-file-name {
			margin-top: 12px;
			overflow: hidden;
			color: #526a80;
			font-size: 11px;
			text-overflow: ellipsis;
			white-space: nowrap;
		}


		.patient360-document-meta-row {
			display: flex;
			flex-wrap: wrap;
			gap: 7px 12px;
			margin-top: 9px;
			color: #788b9c;
			font-size: 10px;
		}


		.patient360-document-actions {
			margin-top: 13px;
		}


		.patient360-extended-empty {
			display: flex;
			min-height: 105px;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 8px;
			padding: 18px;
			color: #8192a2;
			text-align: center;
			font-size: 11px;
		}


		.patient360-extended-empty i {
			color: #08a7bd;
			font-size: 25px;
		}


		.patient360-upload-document-btn {
			border-radius: 11px;
			font-size: 11px;
			font-weight: 800;
		}


		.patient360-upload-modal-content {
			overflow: hidden;
			border: none;
			border-radius: 22px;
		}


		.patient360-upload-modal-header {
			color: #fff;
			background: linear-gradient(135deg, #05285f, #08739f);
		}


		.patient360-event-document {
			color: #08739f;
			background: #def5fa;
		}


		@media (max-width: 991.98px) {

			.patient360-detail-grid {
				grid-template-columns: 1fr;
			}

			.patient360-document-grid {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}

			.patient360-extended-heading {
				flex-direction: column;
			}

			.patient360-extended-counts {
				justify-content: flex-start;
			}
		}


		@media (max-width: 575.98px) {

			.patient360-document-grid {
				grid-template-columns: 1fr;
			}

			.patient360-detail-panel-header {
				align-items: flex-start;
				flex-direction: column;
			}

			.patient360-extended-counts span {
				width: 100%;
				justify-content: center;
			}

			.patient360-item-date {
				white-space: normal;
			}
		}
	`;


	document.head.appendChild(
		style
	);
}