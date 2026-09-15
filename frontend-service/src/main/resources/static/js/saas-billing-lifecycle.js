"use strict";


let billingReceiptModal = null;


/*
 * ============================================================
 * INIT
 * ============================================================
 */

document.addEventListener(
	"DOMContentLoaded",
	function() {

		createBillingReceiptModal();

		installBillingLifecycleEnhancements();
	}
);


/*
 * ============================================================
 * FINAL IPD ADMISSION DROPDOWN
 * ============================================================
 */

loadAdmissionsDropdown =
	async function() {

		const token =
			localStorage.getItem(
				"token"
			);


		const tenantId =
			localStorage.getItem(
				"tenantId"
			);


		const select =
			document.getElementById(
				"filterAdmissionId"
			);


		if (!select) {
			return;
		}


		select.innerHTML = `
			<option value="">
				Loading discharged admissions...
			</option>
		`;


		try {

			const response =
				await fetch(
					`${API_BASE}/saas/ipd/admissions?tenantId=${encodeURIComponent(tenantId)}`,
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
					Select Discharged IPD Admission
				</option>
			`;


			if (
				!response.ok
				||
				!Array.isArray(
					result
				)
			) {

				return;
			}


			result
				.filter(
					admission =>
						String(
							admission.status || ""
						)
							.toUpperCase()
							=== "DISCHARGED"
				)
				.forEach(
					function(admission) {

						if (!admission.id) {
							return;
						}


						const option =
							document.createElement(
								"option"
							);


						option.value =
							String(
								admission.id
							);


						option.textContent =
							`${admission.ipdNumber || "IPD"} - `
							+
							`${admission.patientName || "Patient"} - DISCHARGED`;


						select.appendChild(
							option
						);
					}
				);


		} catch (error) {

			console.error(
				"Load discharged admissions failed:",
				error
			);


			select.innerHTML = `
				<option value="">
					Service unavailable
				</option>
			`;
		}
	};


/*
 * ============================================================
 * FINAL IPD BILL
 * ============================================================
 */

createIpdFinalBill =
	async function() {

		if (
			isGeneratingIpdBill
		) {

			return;
		}


		if (
			!billingPermissions.create
		) {

			showMsg(
				"You do not have permission to generate IPD bills."
			);

			return;
		}


		const admissionId =
			toPositiveNumberOrNull(
				getValue(
					"filterAdmissionId"
				)
			);


		if (!admissionId) {

			showMsg(
				"Please select a discharged IPD admission."
			);

			return;
		}


		if (
			!window.confirm(
				"Generate the final IPD invoice?\n\n"
				+
				"This uses the frozen IPD charge ledger and applies the recorded advance."
			)
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


		isGeneratingIpdBill =
			true;


		setButtonLoading(
			"createIpdBillBtn",
			"Generating...",
			true
		);


		try {

			const query =
				new URLSearchParams({

					tenantId:
						tenantId,

					admissionId:
						String(
							admissionId
						)
				});


			const response =
				await fetch(
					`${API_BASE}/saas/billing/invoices/ipd-final?${query.toString()}`,
					{
						method:
							"POST",

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


			if (!response.ok) {

				showMsg(
					getApiErrorMessage(
						result,
						"Unable to generate final IPD invoice."
					)
				);

				return;
			}


			showMsg(
				"Final IPD invoice generated successfully.",
				"success"
			);


			await Promise.all([
				loadInvoices(),
				loadAdmissionsDropdown()
			]);


		} catch (error) {

			console.error(
				"Generate final IPD invoice failed:",
				error
			);


			showMsg(
				"SaaS billing service is not reachable."
			);


		} finally {

			isGeneratingIpdBill =
				false;


			setButtonLoading(
				"createIpdBillBtn",
				"IPD Bill",
				false
			);
		}
	};


/*
 * ============================================================
 * PAYMENT MODAL
 * ============================================================
 */

openPaymentModal =
	function(
		invoiceId,
		dueAmount
	) {

		if (
			!billingPermissions.update
		) {

			showMsg(
				"You do not have permission to record payments."
			);

			return;
		}


		const due =
			toMoneyNumber(
				dueAmount
			);


		if (
			!invoiceId
			||
			due <= 0
		) {

			showMsg(
				"This invoice has no outstanding balance."
			);

			return;
		}


		setValue(
			"paymentInvoiceId",
			invoiceId
		);


		setValue(
			"paymentAmountInput",
			formatMoney(
				due
			)
		);


		const amountInput =
			document.getElementById(
				"paymentAmountInput"
			);


		if (amountInput) {

			amountInput.max =
				String(
					due
				);
		}


		setValue(
			"paymentModeInput",
			"CASH"
		);


		setValue(
			"paymentTransactionIdInput",
			""
		);


		paymentModal.show();
	};


/*
 * ============================================================
 * RECORD INCREMENTAL PAYMENT
 * ============================================================
 */

submitInvoicePayment =
	async function() {

		if (
			isSavingPayment
		) {

			return;
		}


		if (
			!billingPermissions.update
		) {

			showMsg(
				"You do not have permission to record invoice payments."
			);

			return;
		}


		const invoiceId =
			toPositiveNumberOrNull(
				getValue(
					"paymentInvoiceId"
				)
			);


		const receivedAmount =
			toNonNegativeNumber(
				getValue(
					"paymentAmountInput"
				)
			);


		const paymentMode =
			getValue(
				"paymentModeInput"
			)
				.toUpperCase();


		const transactionId =
			getValue(
				"paymentTransactionIdInput"
			);


		if (!invoiceId) {

			showMsg(
				"Invalid invoice."
			);

			return;
		}


		if (
			receivedAmount <= 0
		) {

			showMsg(
				"Please enter the amount received in this transaction."
			);

			return;
		}


		const allowedModes = [
			"CASH",
			"UPI",
			"CARD",
			"BANK_TRANSFER",
			"ONLINE",
			"OTHER",
			"CHEQUE",
			"NEFT",
			"RTGS",
			"IMPS",
			"WALLET"
		];


		if (
			!allowedModes.includes(
				paymentMode
			)
		) {

			showMsg(
				"Please select a valid payment mode."
			);

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


		const query =
			new URLSearchParams({

				tenantId:
					tenantId,

				paymentMode:
					paymentMode,

				paidAmount:
					String(
						receivedAmount
					),

				transactionId:
					transactionId
			});


		isSavingPayment =
			true;


		setButtonLoading(
			"savePaymentBtn",
			"Recording...",
			true
		);


		try {

			const response =
				await fetch(
					`${API_BASE}/saas/billing/invoices/${encodeURIComponent(invoiceId)}/payment?${query.toString()}`,
					{
						method:
							"PUT",

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


			if (!response.ok) {

				showMsg(
					getApiErrorMessage(
						result,
						"Unable to record payment."
					)
				);

				return;
			}


			paymentModal.hide();


			showMsg(
				"Payment recorded and receipt created successfully.",
				"success"
			);


			await loadInvoices();


		} catch (error) {

			console.error(
				"Record invoice payment failed:",
				error
			);


			showMsg(
				"SaaS billing service is not reachable."
			);


		} finally {

			isSavingPayment =
				false;


			setButtonLoading(
				"savePaymentBtn",
				"Update Payment",
				false
			);
		}
	};


/*
 * ============================================================
 * RECEIPT ACTION
 * ============================================================
 */

function installBillingLifecycleEnhancements() {

	if (
		typeof renderInvoices
			!== "function"
	) {

		return;
	}


	const originalRenderInvoices =
		renderInvoices;


	renderInvoices =
		function(invoices) {

			originalRenderInvoices(
				invoices
			);


			const list =
				Array.isArray(invoices)
					? invoices
					: [];


			list.forEach(
				function(invoice) {

					if (!invoice.id) {
						return;
					}


					const rowButtons =
						Array.from(
							document.querySelectorAll(
								".billing-actions"
							)
						);


					const matchingActions =
						rowButtons.find(
							actions =>
								actions.innerHTML.includes(
									`viewInvoice(${invoice.id})`
								)
						);


					if (
						!matchingActions
						||
						document.getElementById(
							`invoiceReceiptsBtn_${invoice.id}`
						)
					) {

						return;
					}


					matchingActions
						.insertAdjacentHTML(
							"beforeend",
							`
								<button
									type="button"
									id="invoiceReceiptsBtn_${invoice.id}"
									class="btn btn-sm btn-outline-success"
									onclick="openInvoiceReceipts(${Number(invoice.id)})">

									<i class="bi bi-cash-coin me-1"></i>
									Receipts

								</button>
							`
						);
				}
			);
		};
}


/*
 * ============================================================
 * RECEIPTS MODAL
 * ============================================================
 */

function createBillingReceiptModal() {

	if (
		document.getElementById(
			"billingReceiptModal"
		)
	) {

		billingReceiptModal =
			bootstrap.Modal
				.getOrCreateInstance(
					document.getElementById(
						"billingReceiptModal"
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
					id="billingReceiptModal"
					tabindex="-1"
					aria-hidden="true">

					<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">

						<div class="modal-content">

							<div class="modal-header">

								<h5 class="modal-title fw-bold text-primary">

									<i class="bi bi-cash-coin me-2"></i>
									Payment Receipts

								</h5>

								<button
									type="button"
									class="btn-close"
									data-bs-dismiss="modal">
								</button>

							</div>


							<div class="modal-body">

								<div id="billingReceiptContent">
								</div>

							</div>

						</div>

					</div>

				</div>
			`
		);


	billingReceiptModal =
		bootstrap.Modal
			.getOrCreateInstance(
				document.getElementById(
					"billingReceiptModal"
				)
			);
}


/*
 * ============================================================
 * LOAD RECEIPTS
 * ============================================================
 */

async function openInvoiceReceipts(
	invoiceId
) {

	const content =
		document.getElementById(
			"billingReceiptContent"
		);


	if (!content) {
		return;
	}


	content.innerHTML = `
		<div class="text-center py-5 text-muted">
			<div class="spinner-border spinner-border-sm me-2"></div>
			Loading payment receipts...
		</div>
	`;


	billingReceiptModal.show();


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
				`${API_BASE}/saas/billing/invoices/${encodeURIComponent(invoiceId)}/receipts?tenantId=${encodeURIComponent(tenantId)}`,
				{
					headers: {
						"Authorization":
							"Bearer " + token,

						"Accept":
							"application/json"
					}
				}
			);


		const receipts =
			await safeJson(
				response
			);


		if (!response.ok) {

			content.innerHTML = `
				<div class="alert alert-danger">
					${escapeHtml(
						getApiErrorMessage(
							receipts,
							"Unable to load receipts."
						)
					)}
				</div>
			`;

			return;
		}


		const list =
			Array.isArray(receipts)
				? receipts
				: [];


		if (!list.length) {

			content.innerHTML = `
				<div class="text-center py-5 text-muted">

					<i
						class="bi bi-receipt"
						style="font-size:36px;">
					</i>

					<div class="mt-2">
						No payment receipts yet.
					</div>

				</div>
			`;

			return;
		}


		const totalReceived =
			list.reduce(
				(sum, receipt) =>
					sum
					+
					toMoneyNumber(
						receipt.paidAmount
					),
				0
			);


		content.innerHTML = `
			<div class="alert alert-success">

				<strong>
					Receipt Ledger Total:
				</strong>

				₹${formatMoney(totalReceived)}

			</div>


			<div class="table-responsive">

				<table class="table table-bordered align-middle mb-0">

					<thead>

						<tr>
							<th>Receipt</th>
							<th>Date</th>
							<th>Amount</th>
							<th>Mode</th>
							<th>Transaction</th>
							<th>Remarks</th>
						</tr>

					</thead>

					<tbody>

						${list
							.map(
								receipt => `
									<tr>

										<td>
											<strong>
												${safe(receipt.receiptNumber)}
											</strong>
										</td>

										<td>
											${formatDate(receipt.receiptDateTime)}
										</td>

										<td>
											<strong class="text-success">
												₹${formatMoney(receipt.paidAmount)}
											</strong>
										</td>

										<td>
											${safe(receipt.paymentMode)}
										</td>

										<td>
											${safe(receipt.transactionId)}
										</td>

										<td>
											${safe(receipt.remarks)}
										</td>

									</tr>
								`
							)
							.join("")}

					</tbody>

				</table>

			</div>
		`;


	} catch (error) {

		console.error(
			"Load payment receipts failed:",
			error
		);


		content.innerHTML = `
			<div class="alert alert-danger">
				Unable to load payment receipts.
			</div>
		`;
	}
}