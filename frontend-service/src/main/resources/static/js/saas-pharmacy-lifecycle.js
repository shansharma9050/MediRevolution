"use strict";


let pharmacyPrescriptionOptions = [];


/*
 * ============================================================
 * INIT
 * ============================================================
 */

document.addEventListener(
	"DOMContentLoaded",
	async function() {

		installPrescriptionSelector();

		await loadPharmacyPrescriptions();
	}
);


/*
 * ============================================================
 * PRESCRIPTION SELECTOR
 * ============================================================
 */

function installPrescriptionSelector() {

	if (
		document.getElementById(
			"pharmacyPrescriptionId"
		)
	) {

		return;
	}


	const patientSelect =
		document.getElementById(
			"patientId"
		);


	const patientColumn =
		patientSelect
			?.closest(
				".pharmacy-control"
			);


	if (
		!patientColumn
	) {

		return;
	}


	const column =
		document.createElement(
			"div"
		);


	column.className =
		"col-lg-4 pharmacy-control";


	column.innerHTML = `
		<label
			class="form-label"
			for="pharmacyPrescriptionId">

			Prescription

		</label>

		<i class="bi bi-file-medical-fill"></i>

		<select
			id="pharmacyPrescriptionId"
			class="form-select">

			<option value="">
				Direct / OTC Sale
			</option>

		</select>

		<div
			id="pharmacyPrescriptionHint"
			class="small text-muted mt-1">
		</div>
	`;


	patientColumn
		.parentElement
		.insertBefore(
			column,
			patientColumn
		);


	const select =
		document.getElementById(
			"pharmacyPrescriptionId"
		);


	select.addEventListener(
		"change",
		function() {

			applySelectedPrescription(
				this.value
			);
		}
	);
}


/*
 * ============================================================
 * LOAD PRESCRIPTIONS
 * ============================================================
 */

async function loadPharmacyPrescriptions() {

	const select =
		document.getElementById(
			"pharmacyPrescriptionId"
		);


	if (!select) {
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
				`${API_BASE}/saas/pharmacy/prescriptions?tenantId=${encodeURIComponent(tenantId)}`,
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
			await pharmacySafeJson(
				response
			);


		if (
			!response.ok
			||
			!Array.isArray(
				result
			)
		) {

			pharmacyPrescriptionOptions =
				[];

			return;
		}


		pharmacyPrescriptionOptions =
			result;


		renderPrescriptionOptions();


	} catch (error) {

		console.error(
			"Load pharmacy prescriptions error:",
			error
		);


		pharmacyPrescriptionOptions =
			[];
	}
}


/*
 * ============================================================
 * OPTIONS
 * ============================================================
 */

function renderPrescriptionOptions() {

	const select =
		document.getElementById(
			"pharmacyPrescriptionId"
		);


	if (!select) {
		return;
	}


	select.innerHTML = `
		<option value="">
			Direct / OTC Sale
		</option>
	`;


	pharmacyPrescriptionOptions
		.forEach(
			function(prescription) {

				const option =
					document.createElement(
						"option"
					);


				option.value =
					String(
						prescription.id
					);


				const medicineCount =
					Array.isArray(
						prescription.medicineNames
					)
						?
						prescription
							.medicineNames
							.length
						:
						0;


				option.textContent =
					`RX-${prescription.id} • `
					+
					`${prescription.patientName || "Patient"}`
					+
					` • ${medicineCount} medicine${medicineCount === 1 ? "" : "s"}`;


				select.appendChild(
					option
				);
			}
		);
}


/*
 * ============================================================
 * APPLY PRESCRIPTION
 * ============================================================
 */

function applySelectedPrescription(
	prescriptionId
) {

	const id =
		Number(
			prescriptionId
		);


	const hint =
		document.getElementById(
			"pharmacyPrescriptionHint"
		);


	if (!id) {

		if (hint) {

			hint.textContent =
				"Direct sale without clinical prescription.";
		}

		return;
	}


	const prescription =
		pharmacyPrescriptionOptions
			.find(
				item =>
					Number(
						item.id
					)
						===
					id
			);


	if (!prescription) {
		return;
	}


	const patientSelect =
		document.getElementById(
			"patientId"
		);


	if (patientSelect) {

		patientSelect.value =
			String(
				prescription.patientId
			);


		/*
		 * Patient must remain tied to prescription.
		 */

		patientSelect.disabled =
			true;
	}


	if (hint) {

		const medicines =
			Array.isArray(
				prescription.medicineNames
			)
				?
				prescription
					.medicineNames
					.filter(Boolean)
				:
				[];


		hint.textContent =
			[
				prescription.doctorName
					?
					`Dr. ${prescription.doctorName}`
					:
					null,

				prescription.diagnosis
					?
					prescription.diagnosis
					:
					null,

				medicines.length
					?
					`Medicines: ${medicines.join(", ")}`
					:
					"No structured medicines"
			]
				.filter(Boolean)
				.join(" • ");
	}


	prefillPrescriptionMedicines(
		prescription
	);
}


/*
 * ============================================================
 * PREFILL AVAILABLE MATCHES
 * ============================================================
 *
 * Prescription stores medicine names, not medicine master IDs.
 * Therefore this is a UI convenience only.
 *
 * Backend does NOT guess medical substitution.
 */

function prefillPrescriptionMedicines(
	prescription
) {

	const names =
		Array.isArray(
			prescription.medicineNames
		)
			?
			prescription
				.medicineNames
				.filter(Boolean)
			:
			[];


	if (!names.length) {
		return;
	}


	const tbody =
		document.getElementById(
			"saleRows"
		);


	if (!tbody) {
		return;
	}


	tbody.innerHTML =
		"";


	let matched =
		0;


	names.forEach(
		function(medicineName) {

			const normalized =
				normalizeMedicineName(
					medicineName
				);


			const stock =
				getAvailableStockOptions()
					.find(
						item =>
							normalizeMedicineName(
								item.medicineName
							)
								===
							normalized
					);


			if (!stock) {
				return;
			}


			addSaleRow();


			const rows =
				tbody.querySelectorAll(
					"tr"
				);


			const row =
				rows[
					rows.length - 1
				];


			const stockSelect =
				row
					?.querySelector(
						".sale-stock"
					);


			if (!stockSelect) {
				return;
			}


			stockSelect.value =
				String(
					stock.id
				);


			updateSaleRowInfo(
				stockSelect
			);


			matched++;
		}
	);


	if (
		!tbody.querySelector(
			"tr"
		)
	) {

		addSaleRow();
	}


	updateSalePreview();


	if (
		matched < names.length
	) {

		showMsg(
			`${matched} of ${names.length} prescribed medicines were matched with available stock. `
			+
			"Please manually select batches for unmatched medicines.",
			"warning"
		);
	}
}


function normalizeMedicineName(
	value
) {

	return String(
		value || ""
	)
		.trim()
		.toLowerCase()
		.replace(
			/\s+/g,
			" "
		);
}


/*
 * ============================================================
 * CLEAR / MODAL COMPATIBILITY
 * ============================================================
 */

if (
	typeof clearSaleForm
		=== "function"
) {

	const baseClearSaleForm =
		clearSaleForm;


	clearSaleForm =
		function() {

			baseClearSaleForm();


			const prescriptionSelect =
				document.getElementById(
					"pharmacyPrescriptionId"
				);


			if (
				prescriptionSelect
			) {

				prescriptionSelect.value =
					"";
			}


			const patientSelect =
				document.getElementById(
					"patientId"
				);


			if (
				patientSelect
			) {

				patientSelect.disabled =
					false;
			}


			const hint =
				document.getElementById(
					"pharmacyPrescriptionHint"
				);


			if (hint) {

				hint.textContent =
					"";
			}
		};
}


/*
 * ============================================================
 * AFTER SUCCESS REFRESH DISPENSABLE RX
 * ============================================================
 */

if (
	typeof loadSales
		=== "function"
) {

	const baseLoadSales =
		loadSales;


	loadSales =
		async function() {

			const result =
				await baseLoadSales();


			await loadPharmacyPrescriptions();


			return result;
		};
}