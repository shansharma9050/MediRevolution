"use strict";

window.SAAS_EDITING_PRESCRIPTION_ID =
	window.SAAS_EDITING_PRESCRIPTION_ID || null;


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		await enhanceClinicalAppointmentSelector();

		applyAppointmentFromQueryString();

		enhanceOpdPrescriptionActions();
	}
);


/*
 * ============================================================
 * APPOINTMENT SELECTOR
 * ============================================================
 */

async function enhanceClinicalAppointmentSelector() {

	const currentElement =
		document.getElementById(
			"appointmentId"
		);


	if (!currentElement) {
		return;
	}


	/*
	 * Replace raw numeric appointment ID with a safe select.
	 */

	if (
		currentElement.tagName
			.toUpperCase() !== "SELECT"
	) {

		const select =
			document.createElement(
				"select"
			);


		select.id =
			"appointmentId";

		select.className =
			currentElement.className;


		currentElement.replaceWith(
			select
		);
	}


	const select =
		document.getElementById(
			"appointmentId"
		);


	select.innerHTML = `
		<option value="">
			Loading active consultations...
		</option>
	`;


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	const token =
		localStorage.getItem(
			"token"
		);


	if (
		!tenantId ||
		!token
	) {
		return;
	}


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/appointments?tenantId=${encodeURIComponent(tenantId)}`,
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
			await safeJson(
				response
			);


		select.innerHTML = `
			<option value="">
				Manual / No appointment
			</option>
		`;


		if (!response.ok) {

			console.warn(
				"Unable to load consultation appointments.",
				result
			);

			return;
		}


		const appointments =
			(
				Array.isArray(result)
					? result
					: []
			)
				.filter(
					item =>
						String(
							item.status || ""
						)
							.toUpperCase()
							=== "IN_CONSULTATION"
				);


		appointments.forEach(
			function(appointment) {

				const option =
					document.createElement(
						"option"
					);


				option.value =
					String(
						appointment.id
					);


				option.dataset.patientId =
					String(
						appointment.patientId || ""
					);


				option.dataset.doctorStaffId =
					String(
						appointment.doctorStaffId || ""
					);


				option.textContent =
					`#${appointment.id} • `
					+
					`${appointment.patientName || "Patient"} • `
					+
					`${appointment.doctorName || "Doctor"}`;


				select.appendChild(
					option
				);
			}
		);


		select.addEventListener(
			"change",
			applyClinicalAppointmentIdentity
		);


	} catch (error) {

		console.error(
			"Clinical appointment loading failed:",
			error
		);


		select.innerHTML = `
			<option value="">
				Manual / No appointment
			</option>
		`;
	}
}


function applyClinicalAppointmentIdentity() {

	const select =
		document.getElementById(
			"appointmentId"
		);


	if (
		!select ||
		!select.value
	) {

		return;
	}


	const option =
		select.options[
			select.selectedIndex
		];


	if (!option) {
		return;
	}


	const patientId =
		option.dataset.patientId;


	const doctorStaffId =
		option.dataset.doctorStaffId;


	if (patientId) {

		setValue(
			"patientId",
			patientId
		);
	}


	if (doctorStaffId) {

		setValue(
			"doctorProfileId",
			doctorStaffId
		);
	}
}


/*
 * ============================================================
 * QUERY STRING HANDOFF
 * ============================================================
 */

function applyAppointmentFromQueryString() {

	const params =
		new URLSearchParams(
			window.location.search
		);


	const appointmentId =
		params.get(
			"appointmentId"
		);


	if (!appointmentId) {
		return;
	}


	const attempt =
		function() {

			const select =
				document.getElementById(
					"appointmentId"
				);


			if (!select) {
				return;
			}


			const option =
				Array.from(
					select.options
				)
					.find(
						item =>
							String(
								item.value
							)
								===
							String(
								appointmentId
							)
					);


			if (!option) {
				return;
			}


			select.value =
				String(
					appointmentId
				);


			applyClinicalAppointmentIdentity();
		};


	window.setTimeout(
		attempt,
		400
	);
}


/*
 * ============================================================
 * OPD → PRESCRIPTION HANDOFF
 * ============================================================
 */

function enhanceOpdPrescriptionActions() {

	if (
		typeof renderOpdVisits
			!== "function"
	) {

		return;
	}


	const originalRender =
		renderOpdVisits;


	renderOpdVisits =
		function(visits) {

			originalRender(
				visits
			);


			const list =
				Array.isArray(visits)
					? visits
					: [];


			list.forEach(
				function(visit) {

					if (
						String(
							visit.status || ""
						)
							.toUpperCase()
							!== "OPEN"
						||
						!visit.appointmentId
					) {

						return;
					}


					const completeButton =
						document.getElementById(
							`completeOpdBtn_${visit.id}`
						);


					if (
						!completeButton ||
						document.getElementById(
							`opdPrescriptionBtn_${visit.id}`
						)
					) {

						return;
					}


					completeButton.insertAdjacentHTML(
						"beforebegin",
						`
							<a
								id="opdPrescriptionBtn_${visit.id}"
								href="/saas/prescriptions?appointmentId=${encodeURIComponent(
									visit.appointmentId
								)}"
								class="btn btn-sm btn-outline-primary me-1">

								<i class="bi bi-prescription2 me-1"></i>
								Prescription

							</a>
						`
					);
				}
			);
		};
}


/*
 * ============================================================
 * PRESCRIPTION EDIT SUPPORT
 * ============================================================
 */

if (
	typeof renderPrescriptions
		=== "function"
) {

	const originalPrescriptionRender =
		renderPrescriptions;


	renderPrescriptions =
		function(prescriptions) {

			originalPrescriptionRender(
				prescriptions
			);


			if (
				!prescriptionPagePermissions
					?.update
			) {

				return;
			}


			(
				Array.isArray(prescriptions)
					? prescriptions
					: []
			)
				.forEach(
					function(item) {

						if (!item.id) {
							return;
						}


						const viewButton =
							document.getElementById(
								`viewPrescriptionBtn_${item.id}`
							);


						const actions =
							viewButton
								?.closest(
									".saas-prescription-actions"
								);


						if (
							!actions ||
							document.getElementById(
								`editPrescriptionBtn_${item.id}`
							)
						) {

							return;
						}


						actions.insertAdjacentHTML(
							"beforeend",
							`
								<button
									type="button"
									id="editPrescriptionBtn_${item.id}"
									class="btn btn-sm btn-outline-info edit-prescription-btn"
									onclick="editSaasPrescription(${item.id})">

									<i class="bi bi-pencil-square me-1"></i>
									Edit

								</button>
							`
						);
					}
				);
		};
}


/*
 * ============================================================
 * CREATE MODE
 * ============================================================
 */

if (
	typeof openCreatePrescriptionModal
		=== "function"
) {

	const originalCreateModal =
		openCreatePrescriptionModal;


	openCreatePrescriptionModal =
		function() {

			window.SAAS_EDITING_PRESCRIPTION_ID =
				null;


			originalCreateModal();
		};
}


/*
 * ============================================================
 * EDIT
 * ============================================================
 */

async function editSaasPrescription(
	prescriptionId
) {

	if (
		!prescriptionPagePermissions
			?.update
	) {

		showMsg(
			"You do not have permission to update prescriptions."
		);

		return;
	}


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	const token =
		localStorage.getItem(
			"token"
		);


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/prescriptions/${prescriptionId}?tenantId=${encodeURIComponent(tenantId)}`,
				{
					headers: {
						"Authorization":
							"Bearer " + token,

						"Accept":
							"application/json"
					}
				}
			);


		const item =
			await safeJson(
				response
			);


		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					item,
					"Unable to load prescription."
				)
			);

			return;
		}


		window.SAAS_EDITING_PRESCRIPTION_ID =
			Number(
				prescriptionId
			);


		clearPrescriptionForm();


		setValue(
			"patientId",
			item.patientId
		);


		setValue(
			"doctorProfileId",
			item.doctorProfileId
		);


		ensureAppointmentOption(
			item
		);


		setValue(
			"appointmentId",
			item.appointmentId
		);


		[
			"diagnosis",
			"clinicalNotes",
			"advice",
			"labTests",
			"followUpAdvice",
			"followUpDate",
			"bloodPressure",
			"pulse",
			"temperature",
			"spo2",
			"weight",
			"height",
			"sugarLevel"
		]
			.forEach(
				function(field) {

					setValue(
						field,
						item[field] || ""
					);
				}
			);


		populatePrescriptionMedicines(
			item.medicines
		);


		setText(
			"prescriptionModalTitle",
			`Edit Prescription #${prescriptionId}`
		);


		if (prescriptionModal) {

			prescriptionModal.show();
		}


	} catch (error) {

		console.error(
			"Prescription edit failed:",
			error
		);


		showMsg(
			"SaaS service not reachable."
		);
	}
}


function ensureAppointmentOption(
	item
) {

	if (!item?.appointmentId) {
		return;
	}


	const select =
		document.getElementById(
			"appointmentId"
		);


	if (!select) {
		return;
	}


	const exists =
		Array.from(
			select.options
		)
			.some(
				option =>
					String(
						option.value
					)
						===
					String(
						item.appointmentId
					)
			);


	if (exists) {
		return;
	}


	const option =
		document.createElement(
			"option"
		);


	option.value =
		String(
			item.appointmentId
		);


	option.textContent =
		`#${item.appointmentId} • Existing consultation`;


	select.appendChild(
		option
	);
}


function populatePrescriptionMedicines(
	medicines
) {

	const rows =
		document.getElementById(
			"medicineRows"
		);


	if (!rows) {
		return;
	}


	rows.innerHTML = "";


	const list =
		Array.isArray(medicines)
			? medicines
			: [];


	if (!list.length) {

		addMedicineRow();
		return;
	}


	list.forEach(
		function(item) {

			addMedicineRow();


			const row =
				rows.lastElementChild;


			if (!row) {
				return;
			}


			row.querySelector(
				".medicine-name"
			).value =
				item.medicineName || "";


			row.querySelector(
				".medicine-dosage"
			).value =
				item.dosage || "";


			row.querySelector(
				".medicine-frequency"
			).value =
				item.frequency || "";


			row.querySelector(
				".medicine-duration"
			).value =
				item.duration || "";


			row.querySelector(
				".medicine-instructions"
			).value =
				item.instructions || "";
		}
	);
}


/*
 * ============================================================
 * CREATE / UPDATE
 * ============================================================
 */

if (
	typeof savePrescription
		=== "function"
) {

	savePrescription =
		async function() {

			if (isSavingPrescription) {
				return;
			}


			const editingId =
				window.SAAS_EDITING_PRESCRIPTION_ID;


			const allowed =
				editingId
					? prescriptionPagePermissions.update
					: prescriptionPagePermissions.create;


			if (!allowed) {

				showMsg(
					"You do not have permission to save this prescription."
				);

				return;
			}


			const tenantId =
				localStorage.getItem(
					"tenantId"
				);


			const token =
				localStorage.getItem(
					"token"
				);


			const payload = {

				tenantId:
					Number(
						tenantId
					),

				patientId:
					numberOrNull(
						getValue(
							"patientId"
						)
					),

				doctorProfileId:
					numberOrNull(
						getValue(
							"doctorProfileId"
						)
					),

				appointmentId:
					numberOrNull(
						getValue(
							"appointmentId"
						)
					),

				diagnosis:
					getValue(
						"diagnosis"
					),

				clinicalNotes:
					getValue(
						"clinicalNotes"
					),

				advice:
					getValue(
						"advice"
					),

				labTests:
					getValue(
						"labTests"
					),

				followUpAdvice:
					getValue(
						"followUpAdvice"
					),

				followUpDate:
					getValue(
						"followUpDate"
					) || null,

				bloodPressure:
					getValue(
						"bloodPressure"
					),

				pulse:
					getValue(
						"pulse"
					),

				temperature:
					getValue(
						"temperature"
					),

				spo2:
					getValue(
						"spo2"
					),

				weight:
					getValue(
						"weight"
					),

				height:
					getValue(
						"height"
					),

				sugarLevel:
					getValue(
						"sugarLevel"
					),

				medicines:
					collectMedicines()
			};


			if (
				!payload.patientId ||
				!payload.doctorProfileId ||
				!payload.diagnosis
			) {

				showModalFormError(
					document.getElementById(
						"prescriptionModal"
					),
					"Patient, doctor and diagnosis are required."
				);

				return;
			}


			const url =
				editingId
					? `${API_BASE}/saas/prescriptions/${editingId}?tenantId=${encodeURIComponent(tenantId)}`
					: `${API_BASE}/saas/prescriptions`;


			isSavingPrescription =
				true;


			setButtonLoading(
				"savePrescriptionBtn",
				editingId
					? "Updating..."
					: "Saving...",
				true
			);


			try {

				const response =
					await fetch(
						url,
						{
							method:
								editingId
									? "PUT"
									: "POST",

							headers: {
								"Authorization":
									"Bearer " + token,

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

					showMsg(
						getApiErrorMessage(
							result,
							"Unable to save prescription."
						)
					);

					return;
				}


				if (prescriptionModal) {

					prescriptionModal.hide();
				}


				window.SAAS_EDITING_PRESCRIPTION_ID =
					null;


				clearPrescriptionForm();


				showMsg(
					editingId
						? "Prescription updated successfully."
						: "Prescription created successfully.",
					"success"
				);


				await loadPrescriptions();


			} catch (error) {

				console.error(
					"Prescription save failed:",
					error
				);


				showMsg(
					"SaaS service not reachable."
				);


			} finally {

				isSavingPrescription =
					false;


				setButtonLoading(
					"savePrescriptionBtn",
					"Save Prescription",
					false
				);
			}
		};
}


function numberOrNull(
	value
) {

	const number =
		Number(
			value
		);


	return Number.isFinite(
		number
	)
		&&
		number > 0
			? number
			: null;
}