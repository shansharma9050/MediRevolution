let patient360AllergyCache = [];

let patient360MergeHistoryCache = [];

let editingPatient360AllergyId = null;

let isSavingPatient360Allergy = false;

let isMergingPatient360 = false;


/*
 * ================================================================
 * INITIALIZE
 * ================================================================
 */

(function initializePatient360Closure() {

	if (
		typeof renderPatient360 !== "function"
	) {

		console.error(
			"Patient 360 renderer is unavailable."
		);

		return;
	}


	injectPatient360ClosureStyles();


	const previousRenderPatient360 =
		renderPatient360;


	renderPatient360 =
		function(data) {

			previousRenderPatient360(
				data
			);


			ensurePatient360ClosureWorkspace();


			patient360AllergyCache =
				Array.isArray(
					data?.allergyHistory
				)
					? data.allergyHistory
					: [];


			renderPatient360Allergies(
				patient360AllergyCache,
				data?.patient?.allergies
			);


			updatePatient360AllergyCount();


			applyPatient360ClosurePermissions();


			loadPatient360MergeHistory();
		};


	/*
	 * Extend longitudinal timeline styling.
	 */

	if (
		typeof getPatient360TimelineStyle === "function"
	) {

		const previousTimelineStyle =
			getPatient360TimelineStyle;


		getPatient360TimelineStyle =
			function(type) {

				const normalized =
					String(
						type || ""
					)
						.trim()
						.toUpperCase();


				if (
					normalized === "ALLERGY"
				) {

					return {
						icon:
							"bi-exclamation-triangle-fill",

						cssClass:
							"patient360-event-allergy"
					};
				}


				return previousTimelineStyle(
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

function ensurePatient360ClosureWorkspace() {

	const workspace =
		document.getElementById(
			"patient360ExtendedWorkspace"
		);


	if (!workspace) {

		return;
	}


	ensurePatient360AllergyCounter(
		workspace
	);


	ensurePatient360AllergyPanel(
		workspace
	);


	ensurePatient360MergePanel(
		workspace
	);


	ensurePatient360AllergyModal(
		workspace
	);


	ensurePatient360MergeModal(
		workspace
	);
}


function ensurePatient360AllergyCounter(
	workspace
) {

	if (
		document.getElementById(
			"patient360AllergyCount"
		)
	) {

		return;
	}


	const countContainer =
		workspace.querySelector(
			".patient360-extended-counts"
		);


	if (!countContainer) {

		return;
	}


	countContainer.insertAdjacentHTML(
		"afterbegin",
		`
			<span class="patient360-allergy-counter">
				<i class="bi bi-exclamation-triangle-fill"></i>

				<strong id="patient360AllergyCount">
					0
				</strong>

				Allergies
			</span>
		`
	);
}


function ensurePatient360AllergyPanel(
	workspace
) {

	if (
		document.getElementById(
			"patient360AllergyPanel"
		)
	) {

		return;
	}


	const documentPanel =
		workspace.querySelector(
			".patient360-document-panel"
		);


	const html = `

		<section id="patient360AllergyPanel"
			class="patient360-detail-panel patient360-allergy-panel">

			<div class="patient360-detail-panel-header">

				<div class="patient360-detail-title">

					<span class="patient360-detail-icon patient360-detail-icon-allergy">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</span>

					<div>
						<small>
							Clinical Safety
						</small>

						<h6>
							Structured Allergies
						</h6>
					</div>

				</div>


				<button type="button"
					id="patient360AddAllergyBtn"
					class="btn btn-sm btn-outline-danger"
					onclick="openPatient360AllergyModal()">

					<i class="bi bi-plus-lg me-1"></i>

					Add Allergy

				</button>

			</div>


			<div id="patient360AllergyHistory"
				class="patient360-allergy-grid">
			</div>

		</section>
	`;


	if (documentPanel) {

		documentPanel.insertAdjacentHTML(
			"beforebegin",
			html
		);

	} else {

		workspace.insertAdjacentHTML(
			"beforeend",
			html
		);
	}
}


function ensurePatient360MergePanel(
	workspace
) {

	if (
		document.getElementById(
			"patient360MergePanel"
		)
	) {

		return;
	}


	workspace.insertAdjacentHTML(
		"beforeend",
		`

		<section id="patient360MergePanel"
			class="patient360-detail-panel patient360-merge-panel">

			<div class="patient360-detail-panel-header">

				<div class="patient360-detail-title">

					<span class="patient360-detail-icon patient360-detail-icon-merge">
						<i class="bi bi-intersect"></i>
					</span>

					<div>
						<small>
							Identity Management
						</small>

						<h6>
							Duplicate Patient Merge History
						</h6>
					</div>

				</div>


				<button type="button"
					id="patient360MergePatientBtn"
					class="btn btn-sm btn-outline-primary"
					onclick="openPatient360MergeModal()">

					<i class="bi bi-intersect me-1"></i>

					Merge Duplicate

				</button>

			</div>


			<div id="patient360MergeHistory"
				class="patient360-merge-history">

				<div class="patient360-extended-empty">
					<i class="bi bi-hourglass-split"></i>
					<span>Loading merge history...</span>
				</div>

			</div>

		</section>
		`
	);
}


/*
 * ================================================================
 * ALLERGY MODAL
 * ================================================================
 */

function ensurePatient360AllergyModal(
	workspace
) {

	if (
		document.getElementById(
			"patient360AllergyModal"
		)
	) {

		return;
	}


	workspace.insertAdjacentHTML(
		"beforeend",
		`

		<div class="modal fade"
			id="patient360AllergyModal"
			tabindex="-1"
			aria-hidden="true">

			<div class="modal-dialog modal-dialog-centered">

				<div class="modal-content patient360-closure-modal">

					<div class="modal-header patient360-closure-modal-header">

						<div>
							<div class="small text-white-50 fw-bold text-uppercase">
								Clinical Safety Record
							</div>

							<h5 class="modal-title"
								id="patient360AllergyModalTitle">

								Add Allergy

							</h5>
						</div>


						<button type="button"
							class="btn-close btn-close-white"
							data-bs-dismiss="modal"
							aria-label="Close">
						</button>

					</div>


					<div class="modal-body">

						<form id="patient360AllergyForm"
							onsubmit="savePatient360Allergy(event)">

							<div class="mb-3">

								<label class="form-label fw-bold">
									Allergen
								</label>

								<input type="text"
									id="patient360Allergen"
									class="form-control"
									maxlength="160"
									required>

							</div>


							<div class="row g-3">

								<div class="col-md-6">

									<label class="form-label fw-bold">
										Type
									</label>

									<input type="text"
										id="patient360AllergyType"
										class="form-control"
										maxlength="80"
										placeholder="Drug, food, environmental...">

								</div>


								<div class="col-md-6">

									<label class="form-label fw-bold">
										Severity
									</label>

									<select id="patient360AllergySeverity"
										class="form-select">

										<option value="UNKNOWN">
											Unknown
										</option>

										<option value="MILD">
											Mild
										</option>

										<option value="MODERATE">
											Moderate
										</option>

										<option value="SEVERE">
											Severe
										</option>

										<option value="LIFE_THREATENING">
											Life Threatening
										</option>

									</select>

								</div>


								<div class="col-md-6">

									<label class="form-label fw-bold">
										Status
									</label>

									<select id="patient360AllergyStatus"
										class="form-select">

										<option value="ACTIVE">
											Active
										</option>

										<option value="INACTIVE">
											Inactive
										</option>

										<option value="RESOLVED">
											Resolved
										</option>

										<option value="ENTERED_IN_ERROR">
											Entered In Error
										</option>

									</select>

								</div>


								<div class="col-md-6">

									<label class="form-label fw-bold">
										Onset Date
									</label>

									<input type="date"
										id="patient360AllergyOnsetDate"
										class="form-control">

								</div>

							</div>


							<div class="mb-3 mt-3">

								<label class="form-label fw-bold">
									Reaction
								</label>

								<textarea id="patient360AllergyReaction"
									class="form-control"
									rows="2"
									maxlength="500"></textarea>

							</div>


							<div class="mb-3">

								<label class="form-label fw-bold">
									Notes
								</label>

								<textarea id="patient360AllergyNotes"
									class="form-control"
									rows="3"
									maxlength="1000"></textarea>

							</div>


							<div id="patient360AllergyMessage"
								class="alert d-none">
							</div>


							<div class="d-flex justify-content-end gap-2">

								<button type="button"
									class="btn btn-light"
									data-bs-dismiss="modal">

									Cancel

								</button>


								<button type="submit"
									id="patient360SaveAllergyBtn"
									class="btn btn-danger">

									<i class="bi bi-check2-circle me-1"></i>

									Save Allergy

								</button>

							</div>

						</form>

					</div>

				</div>

			</div>

		</div>
		`
	);
}


/*
 * ================================================================
 * MERGE MODAL
 * ================================================================
 */

function ensurePatient360MergeModal(
	workspace
) {

	if (
		document.getElementById(
			"patient360MergeModal"
		)
	) {

		return;
	}


	workspace.insertAdjacentHTML(
		"beforeend",
		`

		<div class="modal fade"
			id="patient360MergeModal"
			tabindex="-1"
			aria-hidden="true">

			<div class="modal-dialog modal-dialog-centered">

				<div class="modal-content patient360-closure-modal">

					<div class="modal-header patient360-closure-modal-header">

						<div>
							<div class="small text-white-50 fw-bold text-uppercase">
								Canonical Patient Identity
							</div>

							<h5 class="modal-title">
								Merge Duplicate Patient
							</h5>
						</div>


						<button type="button"
							class="btn-close btn-close-white"
							data-bs-dismiss="modal">
						</button>

					</div>


					<div class="modal-body">

						<div class="alert alert-warning small">

							The currently opened Patient 360 record will remain
							the canonical patient. The selected duplicate
							patient will be deactivated and its clinical
							records moved here.

						</div>


						<div class="mb-3">

							<label class="form-label fw-bold">
								Duplicate Patient
							</label>

							<select id="patient360MergeSourcePatient"
								class="form-select"
								required>
							</select>

						</div>


						<div class="mb-3">

							<label class="form-label fw-bold">
								Reason
							</label>

							<textarea id="patient360MergeReason"
								class="form-control"
								rows="3"
								maxlength="1000"
								placeholder="Why are these patient records duplicates?"></textarea>

						</div>


						<div id="patient360MergeMessage"
							class="alert d-none">
						</div>


						<div class="d-flex justify-content-end gap-2">

							<button type="button"
								class="btn btn-light"
								data-bs-dismiss="modal">

								Cancel

							</button>


							<button type="button"
								id="patient360ConfirmMergeBtn"
								class="btn btn-primary"
								onclick="mergePatient360Duplicate()">

								<i class="bi bi-intersect me-1"></i>

								Merge Patient

							</button>

						</div>

					</div>

				</div>

			</div>

		</div>
		`
	);
}


/*
 * ================================================================
 * ALLERGY RENDERING
 * ================================================================
 */

function renderPatient360Allergies(
	history,
	legacyAllergies
) {

	const container =
		document.getElementById(
			"patient360AllergyHistory"
		);


	if (!container) {

		return;
	}


	const allergies =
		Array.isArray(history)
			? history
			: [];


	if (!allergies.length) {

		container.innerHTML = `

			<div class="patient360-extended-empty">

				<i class="bi bi-shield-check"></i>

				<span>
					No structured allergy records.
				</span>

				${legacyAllergies
					? `
						<div class="patient360-legacy-allergy">
							<strong>Legacy note:</strong>
							${safe(legacyAllergies)}
						</div>
					`
					: ""
				}

			</div>
		`;

		return;
	}


	container.innerHTML =
		allergies
			.map(
				function(item) {

					const allergyId =
						safeNumber(
							item.allergyId
						);


					const severity =
						String(
							item.severity ||
							"UNKNOWN"
						)
							.toUpperCase();


					return `

						<div class="patient360-allergy-card
							patient360-allergy-severity-${safe(
								severity.toLowerCase()
							)}">

							<div class="patient360-allergy-card-top">

								<div>

									<div class="patient360-item-heading">
										<i class="bi bi-exclamation-triangle-fill me-1"></i>

										${safe(
											item.allergen ||
											"Allergen"
										)}
									</div>


									<div class="patient360-item-meta">

										${safe(
											formatLabel(
												item.allergyType ||
												"Allergy"
											)
										)}

									</div>

								</div>


								<div class="d-flex gap-1 flex-wrap">

									<span class="badge patient360-allergy-severity-badge">
										${safe(
											formatLabel(
												item.severity
											)
										)}
									</span>

									<span class="badge text-bg-light">
										${safe(
											formatLabel(
												item.status
											)
										)}
									</span>

								</div>

							</div>


							${item.reaction
								? `
									<div class="patient360-detail-note">
										<strong>Reaction:</strong>
										${safe(item.reaction)}
									</div>
								`
								: ""
							}


							<div class="patient360-allergy-meta">

								<span>
									<i class="bi bi-calendar3"></i>

									Onset:
									${safe(
										formatPatient360Date(
											item.onsetDate
										)
									)}
								</span>

							</div>


							${item.notes
								? `
									<div class="patient360-detail-note">
										${safe(item.notes)}
									</div>
								`
								: ""
							}


							<div class="patient360-allergy-actions">

								${patientPermissions?.update
									? `
										<button type="button"
											class="btn btn-sm btn-outline-primary"
											onclick="editPatient360Allergy(${allergyId})">

											<i class="bi bi-pencil"></i>

										</button>
									`
									: ""
								}


								${patientPermissions?.delete
									? `
										<button type="button"
											class="btn btn-sm btn-outline-danger"
											onclick="deletePatient360Allergy(${allergyId})">

											<i class="bi bi-trash"></i>

										</button>
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
 * ALLERGY CREATE / EDIT
 * ================================================================
 */

function openPatient360AllergyModal() {

	if (
		!patientPermissions?.create
	) {

		showMsg(
			"You do not have permission to add allergies."
		);

		return;
	}


	editingPatient360AllergyId =
		null;


	resetPatient360AllergyForm();


	setText(
		"patient360AllergyModalTitle",
		"Add Allergy"
	);


	showPatient360ClosureModal(
		"patient360AllergyModal"
	);
}


function editPatient360Allergy(
	allergyId
) {

	if (
		!patientPermissions?.update
	) {

		return;
	}


	const allergy =
		patient360AllergyCache.find(
			function(item) {

				return Number(
					item.allergyId
				) === Number(
					allergyId
				);
			}
		);


	if (!allergy) {

		showMsg(
			"Allergy record not found."
		);

		return;
	}


	editingPatient360AllergyId =
		allergyId;


	setValuePatient360Closure(
		"patient360Allergen",
		allergy.allergen
	);


	setValuePatient360Closure(
		"patient360AllergyType",
		allergy.allergyType
	);


	setValuePatient360Closure(
		"patient360AllergySeverity",
		allergy.severity || "UNKNOWN"
	);


	setValuePatient360Closure(
		"patient360AllergyStatus",
		allergy.status || "ACTIVE"
	);


	setValuePatient360Closure(
		"patient360AllergyOnsetDate",
		allergy.onsetDate
	);


	setValuePatient360Closure(
		"patient360AllergyReaction",
		allergy.reaction
	);


	setValuePatient360Closure(
		"patient360AllergyNotes",
		allergy.notes
	);


	setText(
		"patient360AllergyModalTitle",
		"Edit Allergy"
	);


	showPatient360ClosureModal(
		"patient360AllergyModal"
	);
}


async function savePatient360Allergy(
	event
) {

	event.preventDefault();


	if (
		isSavingPatient360Allergy
	) {

		return;
	}


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	if (
		!tenantId ||
		!currentPatient360PatientId
	) {

		return;
	}


	const allergen =
		getPatient360ClosureValue(
			"patient360Allergen"
		);


	if (!allergen) {

		showPatient360ClosureMessage(
			"patient360AllergyMessage",
			"Allergen is required.",
			"warning"
		);

		return;
	}


	const payload = {

		tenantId:
			Number(tenantId),

		patientId:
			Number(
				currentPatient360PatientId
			),

		allergen:
			allergen,

		allergyType:
			getPatient360ClosureValue(
				"patient360AllergyType"
			) || null,

		reaction:
			getPatient360ClosureValue(
				"patient360AllergyReaction"
			) || null,

		severity:
			getPatient360ClosureValue(
				"patient360AllergySeverity"
			) || "UNKNOWN",

		status:
			getPatient360ClosureValue(
				"patient360AllergyStatus"
			) || "ACTIVE",

		onsetDate:
			getPatient360ClosureValue(
				"patient360AllergyOnsetDate"
			) || null,

		notes:
			getPatient360ClosureValue(
				"patient360AllergyNotes"
			) || null
	};


	const editing =
		Boolean(
			editingPatient360AllergyId
		);


	const url =
		editing
			? `${API_BASE}/saas/patient-allergies/${editingPatient360AllergyId}?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/patient-allergies`;


	isSavingPatient360Allergy =
		true;


	setPatient360ClosureButtonLoading(
		"patient360SaveAllergyBtn",
		true,
		"Saving..."
	);


	try {

		const response =
			await fetch(
				url,
				{
					method:
						editing
							? "PUT"
							: "POST",

					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

						"Content-Type":
							"application/json",

						"Accept":
							"application/json"
					},

					body:
						JSON.stringify(
							payload
						)
				}
			);


		const result =
			await safeJson(
				response
			);


		if (!response.ok) {

			showPatient360ClosureMessage(
				"patient360AllergyMessage",
				getApiErrorMessage(
					result,
					"Unable to save allergy."
				),
				"danger"
			);

			return;
		}


		hidePatient360ClosureModal(
			"patient360AllergyModal"
		);


		await refreshCurrentPatient360();


	} catch (error) {

		console.error(
			"Save Patient 360 allergy error:",
			error
		);


		showPatient360ClosureMessage(
			"patient360AllergyMessage",
			"Unable to reach SaaS service.",
			"danger"
		);


	} finally {

		isSavingPatient360Allergy =
			false;


		setPatient360ClosureButtonLoading(
			"patient360SaveAllergyBtn",
			false,
			"Save Allergy"
		);
	}
}


/*
 * ================================================================
 * ALLERGY DELETE
 * ================================================================
 */

async function deletePatient360Allergy(
	allergyId
) {

	if (
		!patientPermissions?.delete
	) {

		return;
	}


	const confirmed =
		window.confirm(
			"Delete this allergy record?"
		);


	if (!confirmed) {

		return;
	}


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/patient-allergies/${allergyId}?tenantId=${encodeURIComponent(tenantId)}`,
				{
					method:
						"DELETE",

					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							)
					}
				}
			);


		const result =
			await safeJson(
				response
			);


		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to delete allergy."
				)
			);

			return;
		}


		await refreshCurrentPatient360();


	} catch (error) {

		console.error(
			"Delete allergy error:",
			error
		);


		showMsg(
			"Unable to delete allergy."
		);
	}
}


/*
 * ================================================================
 * MERGE
 * ================================================================
 */

function openPatient360MergeModal() {

	if (
		!patientPermissions?.update ||
		!patientPermissions?.delete
	) {

		showMsg(
			"You do not have permission to merge patients."
		);

		return;
	}


	const select =
		document.getElementById(
			"patient360MergeSourcePatient"
		);


	if (!select) {

		return;
	}


	const candidates =
		(
			Array.isArray(allPatients)
				? allPatients
				: []
		)
			.filter(
				function(patient) {

					return Number(
						patient.id
					) !== Number(
						currentPatient360PatientId
					);
				}
			);


	select.innerHTML =
		`
			<option value="">
				Select duplicate patient
			</option>
		`
		+
		candidates
			.map(
				function(patient) {

					return `
						<option value="${safeNumber(patient.id)}">

							${safe(
								patient.patientCode ||
								"Patient"
							)}
							-
							${safe(
								patient.patientName
							)}
							${patient.mobile
								? ` (${safe(patient.mobile)})`
								: ""
							}

						</option>
					`;
				}
			)
			.join("");


	setValuePatient360Closure(
		"patient360MergeReason",
		""
	);


	hidePatient360ClosureMessage(
		"patient360MergeMessage"
	);


	showPatient360ClosureModal(
		"patient360MergeModal"
	);
}


async function mergePatient360Duplicate() {

	if (
		isMergingPatient360
	) {

		return;
	}


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	const sourcePatientId =
		Number(
			getPatient360ClosureValue(
				"patient360MergeSourcePatient"
			)
		);


	if (
		!tenantId ||
		!sourcePatientId ||
		!currentPatient360PatientId
	) {

		showPatient360ClosureMessage(
			"patient360MergeMessage",
			"Please select a duplicate patient.",
			"warning"
		);

		return;
	}


	const confirmed =
		window.confirm(
			"Merge the selected duplicate patient into this canonical patient? This action can later be reversed using Unmerge."
		);


	if (!confirmed) {

		return;
	}


	const payload = {

		tenantId:
			Number(tenantId),

		targetPatientId:
			Number(
				currentPatient360PatientId
			),

		sourcePatientId:
			sourcePatientId,

		reason:
			getPatient360ClosureValue(
				"patient360MergeReason"
			) || null
	};


	isMergingPatient360 =
		true;


	setPatient360ClosureButtonLoading(
		"patient360ConfirmMergeBtn",
		true,
		"Merging..."
	);


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/patient-merges`,
				{
					method:
						"POST",

					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

						"Content-Type":
							"application/json",

						"Accept":
							"application/json"
					},

					body:
						JSON.stringify(
							payload
						)
				}
			);


		const result =
			await safeJson(
				response
			);


		if (!response.ok) {

			showPatient360ClosureMessage(
				"patient360MergeMessage",
				getApiErrorMessage(
					result,
					"Unable to merge patient."
				),
				"danger"
			);

			return;
		}


		hidePatient360ClosureModal(
			"patient360MergeModal"
		);


		await loadPatients();


		await refreshCurrentPatient360();


	} catch (error) {

		console.error(
			"Patient merge error:",
			error
		);


		showPatient360ClosureMessage(
			"patient360MergeMessage",
			"Unable to merge patient.",
			"danger"
		);


	} finally {

		isMergingPatient360 =
			false;


		setPatient360ClosureButtonLoading(
			"patient360ConfirmMergeBtn",
			false,
			"Merge Patient"
		);
	}
}


/*
 * ================================================================
 * MERGE HISTORY
 * ================================================================
 */

async function loadPatient360MergeHistory() {

	const container =
		document.getElementById(
			"patient360MergeHistory"
		);


	if (
		!container ||
		!currentPatient360PatientId
	) {

		return;
	}


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/patient-merges/patient/${currentPatient360PatientId}?tenantId=${encodeURIComponent(tenantId)}`,
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
			await safeJson(
				response
			);


		if (!response.ok) {

			container.innerHTML =
				buildPatient360ClosureEmpty(
					"bi-exclamation-circle",
					"Unable to load merge history."
				);

			return;
		}


		patient360MergeHistoryCache =
			Array.isArray(result)
				? result
				: [];


		renderPatient360MergeHistory();


	} catch (error) {

		console.error(
			"Load patient merge history error:",
			error
		);


		container.innerHTML =
			buildPatient360ClosureEmpty(
				"bi-exclamation-circle",
				"Unable to load merge history."
			);
	}
}


function renderPatient360MergeHistory() {

	const container =
		document.getElementById(
			"patient360MergeHistory"
		);


	if (!container) {

		return;
	}


	if (
		!patient360MergeHistoryCache.length
	) {

		container.innerHTML =
			buildPatient360ClosureEmpty(
				"bi-intersect",
				"No duplicate patient merges recorded."
			);

		return;
	}


	container.innerHTML =
		patient360MergeHistoryCache
			.map(
				function(item) {

					const movedCount =
						Number(item.appointmentCount || 0)
						+
						Number(item.prescriptionCount || 0)
						+
						Number(item.opdCount || 0)
						+
						Number(item.ipdCount || 0)
						+
						Number(item.diagnosticCount || 0)
						+
						Number(item.invoiceCount || 0)
						+
						Number(item.documentCount || 0)
						+
						Number(item.allergyCount || 0);


					const activeMerge =
						String(
							item.status || ""
						)
							.toUpperCase()
						=== "MERGED";


					return `

						<div class="patient360-merge-card">

							<div class="patient360-merge-card-main">

								<div>

									<div class="patient360-item-heading">

										${safe(
											item.sourcePatientCode ||
											"Duplicate"
										)}

										—

										${safe(
											item.sourcePatientName ||
											"Patient"
										)}

									</div>


									<div class="patient360-item-meta">

										${safe(movedCount)}
										related records moved

										•

										${safe(
											formatPatient360DateTime(
												item.mergedAt
											)
										)}

									</div>

								</div>


								<span class="badge ${activeMerge
									? "text-bg-primary"
									: "text-bg-secondary"
								}">

									${safe(
										formatLabel(
											item.status
										)
									)}

								</span>

							</div>


							${item.reason
								? `
									<div class="patient360-detail-note">
										${safe(item.reason)}
									</div>
								`
								: ""
							}


							<div class="patient360-merge-count-grid">

								${buildPatient360MergeCount(
									"Appointments",
									item.appointmentCount
								)}

								${buildPatient360MergeCount(
									"Prescriptions",
									item.prescriptionCount
								)}

								${buildPatient360MergeCount(
									"OPD",
									item.opdCount
								)}

								${buildPatient360MergeCount(
									"IPD",
									item.ipdCount
								)}

								${buildPatient360MergeCount(
									"Diagnostics",
									item.diagnosticCount
								)}

								${buildPatient360MergeCount(
									"Invoices",
									item.invoiceCount
								)}

								${buildPatient360MergeCount(
									"Documents",
									item.documentCount
								)}

								${buildPatient360MergeCount(
									"Allergies",
									item.allergyCount
								)}

							</div>


							${activeMerge &&
								patientPermissions?.update
									? `
										<div class="mt-3">

											<button type="button"
												class="btn btn-sm btn-outline-danger"
												onclick="unmergePatient360(${safeNumber(item.id)})">

												<i class="bi bi-arrow-counterclockwise me-1"></i>

												Unmerge

											</button>

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


async function unmergePatient360(
	mergeId
) {

	const confirmed =
		window.confirm(
			"Restore this duplicate patient and move only the originally merged records back?"
		);


	if (!confirmed) {

		return;
	}


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/patient-merges/${mergeId}/unmerge?tenantId=${encodeURIComponent(tenantId)}`,
				{
					method:
						"POST",

					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							)
					}
				}
			);


		const result =
			await safeJson(
				response
			);


		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to unmerge patient."
				)
			);

			return;
		}


		await loadPatients();


		await refreshCurrentPatient360();


	} catch (error) {

		console.error(
			"Patient unmerge error:",
			error
		);


		showMsg(
			"Unable to unmerge patient."
		);
	}
}


/*
 * ================================================================
 * PERMISSIONS
 * ================================================================
 */

function applyPatient360ClosurePermissions() {

	const allergyButton =
		document.getElementById(
			"patient360AddAllergyBtn"
		);


	if (allergyButton) {

		allergyButton.classList.toggle(
			"d-none",
			!patientPermissions?.create
		);
	}


	const mergeButton =
		document.getElementById(
			"patient360MergePatientBtn"
		);


	if (mergeButton) {

		const canMerge =
			Boolean(
				patientPermissions?.update &&
				patientPermissions?.delete
			);


		mergeButton.classList.toggle(
			"d-none",
			!canMerge
		);
	}
}


/*
 * ================================================================
 * REFRESH
 * ================================================================
 */

async function refreshCurrentPatient360() {

	if (
		!currentPatient360PatientId
	) {

		return;
	}


	await viewPatient360(
		currentPatient360PatientId
	);
}


/*
 * ================================================================
 * FORM HELPERS
 * ================================================================
 */

function resetPatient360AllergyForm() {

	const form =
		document.getElementById(
			"patient360AllergyForm"
		);


	if (form) {

		form.reset();
	}


	setValuePatient360Closure(
		"patient360AllergySeverity",
		"UNKNOWN"
	);


	setValuePatient360Closure(
		"patient360AllergyStatus",
		"ACTIVE"
	);


	hidePatient360ClosureMessage(
		"patient360AllergyMessage"
	);
}


function updatePatient360AllergyCount() {

	setText(
		"patient360AllergyCount",
		patient360AllergyCache.length
	);
}


function buildPatient360MergeCount(
	label,
	value
) {

	return `
		<span>
			<strong>
				${safe(
					Number(value || 0)
				)}
			</strong>

			${safe(label)}
		</span>
	`;
}


function buildPatient360ClosureEmpty(
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


function getPatient360ClosureValue(
	id
) {

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


function setValuePatient360Closure(
	id,
	value
) {

	const element =
		document.getElementById(
			id
		);


	if (element) {

		element.value =
			value || "";
	}
}


function showPatient360ClosureModal(
	id
) {

	const element =
		document.getElementById(
			id
		);


	if (!element) {

		return;
	}


	bootstrap.Modal
		.getOrCreateInstance(
			element
		)
		.show();
}


function hidePatient360ClosureModal(
	id
) {

	const element =
		document.getElementById(
			id
		);


	if (!element) {

		return;
	}


	bootstrap.Modal
		.getOrCreateInstance(
			element
		)
		.hide();
}


function showPatient360ClosureMessage(
	id,
	message,
	type
) {

	const element =
		document.getElementById(
			id
		);


	if (!element) {

		return;
	}


	element.className =
		`alert alert-${type || "info"}`;


	element.textContent =
		message || "";
}


function hidePatient360ClosureMessage(
	id
) {

	const element =
		document.getElementById(
			id
		);


	if (!element) {

		return;
	}


	element.className =
		"alert d-none";


	element.textContent =
		"";
}


function setPatient360ClosureButtonLoading(
	id,
	loading,
	text
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

		button.innerHTML =
			`
				<span class="spinner-border spinner-border-sm me-1"></span>
				${safe(text)}
			`;

	} else {

		const icon =
			id ===
			"patient360ConfirmMergeBtn"
				? "bi-intersect"
				: "bi-check2-circle";


		button.innerHTML =
			`
				<i class="bi ${icon} me-1"></i>
				${safe(text)}
			`;
	}
}


/*
 * ================================================================
 * CSS
 * ================================================================
 */

function injectPatient360ClosureStyles() {

	if (
		document.getElementById(
			"patient360ClosureStyles"
		)
	) {

		return;
	}


	const style =
		document.createElement(
			"style"
		);


	style.id =
		"patient360ClosureStyles";


	style.textContent = `

		.patient360-allergy-panel,
		.patient360-merge-panel {
			margin-bottom: 16px;
		}

		.patient360-detail-icon-allergy {
			background:
				linear-gradient(
					135deg,
					#b42318,
					#ef4444
				);
		}

		.patient360-detail-icon-merge {
			background:
				linear-gradient(
					135deg,
					#4338ca,
					#0891b2
				);
		}

		.patient360-allergy-counter {
			background:
				rgba(255, 95, 95, .15) !important;
		}

		.patient360-allergy-grid,
		.patient360-merge-history {
			display: grid;
			gap: 12px;
			padding: 15px;
		}

		.patient360-allergy-grid {
			grid-template-columns:
				repeat(
					2,
					minmax(0, 1fr)
				);
		}

		.patient360-allergy-card,
		.patient360-merge-card {
			padding: 15px;
			border: 1px solid #e5edf2;
			border-radius: 16px;
			background: #fff;
		}

		.patient360-allergy-card {
			border-left-width: 4px;
			border-left-color: #94a3b8;
		}

		.patient360-allergy-severity-mild {
			border-left-color: #22c55e;
		}

		.patient360-allergy-severity-moderate {
			border-left-color: #f59e0b;
		}

		.patient360-allergy-severity-severe,
		.patient360-allergy-severity-life_threatening {
			border-left-color: #dc2626;
		}

		.patient360-allergy-card-top,
		.patient360-merge-card-main {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 12px;
		}

		.patient360-allergy-severity-badge {
			color: #991b1b;
			background: #fee2e2;
		}

		.patient360-allergy-meta {
			display: flex;
			gap: 10px;
			margin-top: 10px;
			color: #718497;
			font-size: 10px;
		}

		.patient360-allergy-actions {
			display: flex;
			gap: 6px;
			margin-top: 12px;
		}

		.patient360-legacy-allergy {
			max-width: 600px;
			margin-top: 5px;
			padding: 9px 12px;
			border-radius: 11px;
			color: #8a4b10;
			background: #fff4dc;
			font-size: 11px;
		}

		.patient360-merge-count-grid {
			display: grid;
			grid-template-columns:
				repeat(
					4,
					minmax(0, 1fr)
				);
			gap: 7px;
			margin-top: 12px;
		}

		.patient360-merge-count-grid span {
			padding: 8px;
			border-radius: 10px;
			color: #607386;
			background: #f4f8fa;
			font-size: 9px;
			text-align: center;
		}

		.patient360-merge-count-grid strong {
			display: block;
			color: #05285f;
			font-size: 14px;
		}

		.patient360-closure-modal {
			overflow: hidden;
			border: 0;
			border-radius: 22px;
		}

		.patient360-closure-modal-header {
			color: #fff;
			background:
				linear-gradient(
					135deg,
					#05285f,
					#08739f
				);
		}

		.patient360-event-allergy {
			color: #b42318;
			background: #fee2e2;
		}

		@media (max-width: 767.98px) {

			.patient360-allergy-grid {
				grid-template-columns: 1fr;
			}

			.patient360-merge-count-grid {
				grid-template-columns:
					repeat(
						2,
						minmax(0, 1fr)
					);
			}

		}
	`;


	document.head.appendChild(
		style
	);
}