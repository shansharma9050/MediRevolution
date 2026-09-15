"use strict";


let ipdTransferModal = null;

let ipdTransferAdmissionId = null;


/*
 * ============================================================
 * INIT
 * ============================================================
 */

document.addEventListener(
	"DOMContentLoaded",
	function() {

		createIpdTransferModal();

		installIpdLifecycleRenderer();
	}
);


/*
 * ============================================================
 * EXTEND EXISTING ADMISSION RENDERER
 * ============================================================
 */

function installIpdLifecycleRenderer() {

	if (
		typeof renderAdmissions
			!== "function"
	) {

		return;
	}


	const originalRenderAdmissions =
		renderAdmissions;


	renderAdmissions =
		function(admissions) {

			originalRenderAdmissions(
				admissions
			);


			if (
				!ipdPermissions
					?.update
			) {

				return;
			}


			const list =
				Array.isArray(admissions)
					? admissions
					: [];


			list.forEach(
				function(admission) {

					const status =
						String(
							admission.status || ""
						)
							.toUpperCase();


					if (
						status !== "ADMITTED"
						||
						!admission.id
					) {

						return;
					}


					const existing =
						document.getElementById(
							`transferBedBtn_${admission.id}`
						);


					if (existing) {
						return;
					}


					const dischargeButton =
						findDischargeButton(
							admission.id
						);


					if (!dischargeButton) {
						return;
					}


					dischargeButton
						.insertAdjacentHTML(
							"beforebegin",
							`
								<button
									type="button"
									id="transferBedBtn_${admission.id}"
									class="btn btn-sm btn-outline-info transfer-bed-btn"
									onclick="openIpdTransferModal(${Number(
										admission.id
									)})">

									<i class="bi bi-arrow-left-right me-1"></i>
									Transfer

								</button>
							`
						);
				}
			);
		};
}


/*
 * ============================================================
 * FIND EXISTING ACTION
 * ============================================================
 */

function findDischargeButton(
	admissionId
) {

	const buttons =
		document.querySelectorAll(
			".discharge-ipd-btn"
		);


	for (
		const button
		of buttons
	) {

		const onclick =
			button.getAttribute(
				"onclick"
			) || "";


		if (
			onclick.includes(
				`openDischargeModal(${admissionId})`
			)
		) {

			return button;
		}
	}


	return null;
}


/*
 * ============================================================
 * MODAL
 * ============================================================
 */

function createIpdTransferModal() {

	if (
		document.getElementById(
			"ipdTransferModal"
		)
	) {

		ipdTransferModal =
			bootstrap.Modal
				.getOrCreateInstance(
					document.getElementById(
						"ipdTransferModal"
					)
				);

		return;
	}


	document.body
		.insertAdjacentHTML(
			"beforeend",
			`
				<div
					class="modal fade"
					id="ipdTransferModal"
					tabindex="-1"
					aria-hidden="true">

					<div class="modal-dialog modal-dialog-centered">

						<div class="modal-content">

							<div class="modal-header">

								<h5 class="modal-title fw-bold text-primary">

									<i class="bi bi-arrow-left-right me-2"></i>
									Transfer Bed

								</h5>

								<button
									type="button"
									class="btn-close"
									data-bs-dismiss="modal">
								</button>

							</div>


							<div class="modal-body">

								<div
									class="alert alert-info py-2 small">

									Select an available destination bed.
									The current bed will automatically be released.

								</div>


								<label
									for="ipdTransferBedId"
									class="form-label">

									Available Bed

								</label>


								<select
									id="ipdTransferBedId"
									class="form-select">

									<option value="">
										Select Bed
									</option>

								</select>

							</div>


							<div class="modal-footer">

								<button
									type="button"
									class="btn btn-outline-secondary"
									data-bs-dismiss="modal">

									Cancel

								</button>


								<button
									type="button"
									id="saveIpdTransferBtn"
									class="btn btn-primary"
									onclick="transferIpdBed()">

									<i class="bi bi-arrow-left-right me-1"></i>
									Transfer Bed

								</button>

							</div>

						</div>

					</div>

				</div>
			`
		);


	ipdTransferModal =
		bootstrap.Modal
			.getOrCreateInstance(
				document.getElementById(
					"ipdTransferModal"
				)
			);
}


/*
 * ============================================================
 * OPEN TRANSFER
 * ============================================================
 */

async function openIpdTransferModal(
	admissionId
) {

	if (
		!ipdPermissions
			?.update
	) {

		showMsg(
			"You do not have permission to transfer beds."
		);

		return;
	}


	ipdTransferAdmissionId =
		Number(
			admissionId
		);


	if (
		!Number.isFinite(
			ipdTransferAdmissionId
		)
		||
		ipdTransferAdmissionId <= 0
	) {

		showMsg(
			"Invalid admission selected."
		);

		return;
	}


	await loadAvailableBeds();


	const admission =
		cachedAdmissions
			.find(
				item =>
					Number(
						item.id
					)
						===
					ipdTransferAdmissionId
			);


	const select =
		document.getElementById(
			"ipdTransferBedId"
		);


	if (!select) {
		return;
	}


	select.innerHTML = `
		<option value="">
			Select Bed
		</option>
	`;


	const availableBeds =
		Array.isArray(
			cachedAvailableBeds
		)
			? cachedAvailableBeds
			: [];


	availableBeds
		.filter(
			bed =>
				Number(
					bed.id
				)
					!==
				Number(
					admission?.bedId
				)
		)
		.forEach(
			function(bed) {

				const option =
					document.createElement(
						"option"
					);


				option.value =
					String(
						bed.id
					);


				option.dataset.wardId =
					String(
						bed.wardId || ""
					);


				option.textContent =
					`${bed.wardName || "Ward"} • Bed ${bed.bedNumber || "-"}`;


				select.appendChild(
					option
				);
			}
		);


	if (
		select.options.length <= 1
	) {

		showMsg(
			"No alternate available bed found."
		);

		return;
	}


	ipdTransferModal.show();
}


/*
 * ============================================================
 * TRANSFER
 * ============================================================
 */

async function transferIpdBed() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	const token =
		localStorage.getItem(
			"token"
		);


	const select =
		document.getElementById(
			"ipdTransferBedId"
		);


	const selectedOption =
		select?.options[
			select.selectedIndex
		];


	const bedId =
		toPositiveNumberOrNull(
			select?.value
		);


	const wardId =
		toPositiveNumberOrNull(
			selectedOption?.dataset
				?.wardId
		);


	if (
		!tenantId ||
		!bedId ||
		!wardId ||
		!ipdTransferAdmissionId
	) {

		showMsg(
			"Please select a valid destination bed."
		);

		return;
	}


	setButtonLoading(
		"saveIpdTransferBtn",
		"Transferring...",
		true
	);


	try {

		const response =
			await fetch(
				`${API_BASE}/saas/ipd/admissions/${encodeURIComponent(
					ipdTransferAdmissionId
				)}/bed`,
				{
					method:
						"PUT",

					headers: {

						"Authorization":
							"Bearer " + token,

						"Content-Type":
							"application/json",

						"Accept":
							"application/json"
					},

					body:
						JSON.stringify({
							tenantId:
								Number(
									tenantId
								),

							wardId:
								wardId,

							bedId:
								bedId
						})
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
					"Unable to transfer bed."
				)
			);

			return;
		}


		ipdTransferModal.hide();


		ipdTransferAdmissionId =
			null;


		await Promise.all([
			loadAvailableBeds(),
			loadAdmissions()
		]);


		showMsg(
			"Patient transferred to new bed successfully.",
			"success"
		);


	} catch (error) {

		console.error(
			"IPD bed transfer failed:",
			error
		);


		showMsg(
			"SaaS service is not reachable."
		);


	} finally {

		setButtonLoading(
			"saveIpdTransferBtn",
			"Transfer Bed",
			false
		);
	}
}