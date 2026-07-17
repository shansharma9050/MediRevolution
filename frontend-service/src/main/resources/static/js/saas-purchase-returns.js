const API_BASE =
	"http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let purchaseReturnList = [];
let purchaseReturnPurchases = [];
let purchaseReturnAvailability = [];

let isLoadingPurchaseReturns = false;
let isSavingPurchaseReturn = false;
let isLoadingReturnAvailability = false;

let purchaseReturnDetailsModal = null;

let purchaseReturnPermissions = {
	create: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"PURCHASE_RETURNS",
				"VIEW"
			);

		if (!allowed) {
			return;
		}

		const tenantId =
			localStorage.getItem(
				"tenantId"
			);

		if (!tenantId) {

			alert(
				"Please select SaaS workspace first."
			);

			window.location.href =
				"/saas/workspaces";

			return;
		}

		const tenantType =
			String(
				localStorage.getItem(
					"tenantType"
				) || ""
			)
				.trim()
				.toUpperCase();

		if (
			tenantType !== "WHOLESALER" &&
			tenantType !== "RETAILER"
		) {

			alert(
				"Purchase Returns module is available only for Wholesaler and Retailer workspaces."
			);

			window.location.href =
				"/saas/dashboard";

			return;
		}

		initializePurchaseReturnPage();

		initializePurchaseReturnModal();

		await loadPurchaseReturnPermissions();

		setDefaultPurchaseReturnDate();

		await Promise.all([
			loadPurchaseReturnPurchases(),
			loadPurchaseReturnSummary(),
			loadPurchaseReturns()
		]);

		const searchInput =
			document.getElementById(
				"purchaseReturnSearchKeyword"
			);

		if (searchInput) {

			searchInput.addEventListener(
				"keydown",
				function(event) {

					if (event.key === "Enter") {

						event.preventDefault();

						searchPurchaseReturns();
					}
				}
			);
		}
	}
);


function initializePurchaseReturnPage() {

	const tenantName =
		localStorage.getItem(
			"tenantName"
		) || "your workspace";

	const tenantType =
		localStorage.getItem(
			"tenantType"
		) || "Workspace";

	setText(
		"tenantNameText",
		tenantName
	);

	setText(
		"tenantTypeText",
		formatTenantType(
			tenantType
		)
	);

	setText(
		"sidebarTenantName",
		tenantName
	);

	setText(
		"navbarTenantName",
		tenantName
	);
}


function initializePurchaseReturnModal() {

	const modalElement =
		document.getElementById(
			"purchaseReturnDetailsModal"
		);

	if (modalElement) {

		purchaseReturnDetailsModal =
			new bootstrap.Modal(
				modalElement
			);
	}
}


async function loadPurchaseReturnPermissions() {

	const canCreate =
		await hasSaasPermission(
			"PURCHASE_RETURNS",
			"CREATE"
		);

	purchaseReturnPermissions.create =
		Boolean(canCreate);

	showOrHideById(
		"createPurchaseReturnBtn",
		purchaseReturnPermissions.create
	);
}


function setDefaultPurchaseReturnDate() {

	const today =
		new Date()
			.toISOString()
			.substring(0, 10);

	setValue(
		"purchaseReturnDate",
		today
	);
}


async function loadPurchaseReturnPurchases() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await purchaseReturnApiRequest(
			`${API_BASE}/saas/purchases` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		purchaseReturnPurchases = [];

		populatePurchaseReturnPurchaseDropdown();

		showMsg(
			getPurchaseReturnErrorMessage(
				result.data,
				"Unable to load purchase invoices."
			)
		);

		return;
	}

	purchaseReturnPurchases =
		(Array.isArray(result.data)
			? result.data
			: [])
			.filter(
				function(purchase) {

					return (
						String(
							purchase.purchaseStatus ||
							""
						).toUpperCase()
						!== "CANCELLED"
					);
				}
			);

	populatePurchaseReturnPurchaseDropdown();
}


function populatePurchaseReturnPurchaseDropdown() {

	const select =
		document.getElementById(
			"purchaseReturnPurchaseId"
		);

	if (!select) {
		return;
	}

	select.innerHTML = `
		<option value="">
			Select Purchase Invoice
		</option>
	`;

	purchaseReturnPurchases.forEach(
		function(purchase) {

			const option =
				document.createElement(
					"option"
				);

			option.value =
				purchase.id;

			const supplierInvoice =
				purchase.supplierInvoiceNumber
					? ` / ${purchase.supplierInvoiceNumber}`
					: "";

			option.textContent =
				`${purchase.purchaseNumber || "Purchase"}${supplierInvoice} — ${purchase.supplierName || "Supplier"}`;

			select.appendChild(option);
		}
	);
}


async function loadPurchaseReturnSummary() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await purchaseReturnApiRequest(
			`${API_BASE}/saas/purchase-returns/summary` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		resetPurchaseReturnSummary();

		return;
	}

	const summary =
		result.data || {};

	setAnimatedNumber(
		"totalPurchaseReturns",
		summary.totalReturns
	);

	setAnimatedNumber(
		"totalPurchaseReturnQuantity",
		summary.totalReturnedQuantity
	);

	setText(
		"totalPurchaseReturnAmount",
		formatCurrency(
			summary.totalReturnAmount
		)
	);
}


function resetPurchaseReturnSummary() {

	setText(
		"totalPurchaseReturns",
		"0"
	);

	setText(
		"totalPurchaseReturnQuantity",
		"0"
	);

	setText(
		"totalPurchaseReturnAmount",
		formatCurrency(0)
	);
}


async function loadPurchaseReturns() {

	if (isLoadingPurchaseReturns) {
		return;
	}

	isLoadingPurchaseReturns =
		true;

	showPurchaseReturnLoadingState();

	setButtonLoading(
		"refreshPurchaseReturnBtn",
		"Refreshing...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await purchaseReturnApiRequest(
			`${API_BASE}/saas/purchase-returns` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	isLoadingPurchaseReturns =
		false;

	setButtonLoading(
		"refreshPurchaseReturnBtn",
		"Refresh",
		false
	);

	if (!result.ok) {

		purchaseReturnList = [];

		const message =
			getPurchaseReturnErrorMessage(
				result.data,
				"Unable to load purchase returns."
			);

		showPurchaseReturnErrorState(
			message
		);

		showMsg(message);

		return;
	}

	purchaseReturnList =
		Array.isArray(result.data)
			? result.data
			: [];

	renderPurchaseReturns(
		purchaseReturnList
	);
}


async function searchPurchaseReturns() {

	const keyword =
		getValue(
			"purchaseReturnSearchKeyword"
		);

	if (!keyword) {

		await loadPurchaseReturns();

		return;
	}

	showPurchaseReturnLoadingState();

	setButtonLoading(
		"searchPurchaseReturnBtn",
		"Searching...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await purchaseReturnApiRequest(
			`${API_BASE}/saas/purchase-returns/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`
		);

	setButtonLoading(
		"searchPurchaseReturnBtn",
		"Search",
		false
	);

	if (!result.ok) {

		showPurchaseReturnErrorState(
			getPurchaseReturnErrorMessage(
				result.data,
				"Unable to search purchase returns."
			)
		);

		return;
	}

	renderPurchaseReturns(
		Array.isArray(result.data)
			? result.data
			: []
	);
}


function openPurchaseReturnForm() {

	if (!purchaseReturnPermissions.create) {

		showMsg(
			"You do not have permission to create purchase returns."
		);

		return;
	}

	if (!purchaseReturnPurchases.length) {

		showMsg(
			"No posted purchase invoice is available for return."
		);

		return;
	}

	const panel =
		document.getElementById(
			"purchaseReturnFormPanel"
		);

	if (!panel) {
		return;
	}

	panel.style.display =
		"block";

	panel.scrollIntoView({
		behavior:
			"smooth",

		block:
			"start"
	});
}


function closePurchaseReturnForm() {

	const panel =
		document.getElementById(
			"purchaseReturnFormPanel"
		);

	if (panel) {

		panel.style.display =
			"none";
	}
}


async function handlePurchaseReturnPurchaseChange() {

	const purchaseId =
		getNumberValue(
			"purchaseReturnPurchaseId"
		);

	purchaseReturnAvailability = [];

	if (!purchaseId) {

		hideSelectedPurchaseReturnInvoice();

		renderPurchaseReturnAvailability([]);

		calculatePurchaseReturnTotals();

		return;
	}

	const purchase =
		findPurchaseReturnPurchase(
			purchaseId
		);

	showSelectedPurchaseReturnInvoice(
		purchase
	);

	await loadPurchaseReturnAvailability(
		purchaseId
	);
}


async function loadPurchaseReturnAvailability(
	purchaseId
) {

	if (isLoadingReturnAvailability) {
		return;
	}

	isLoadingReturnAvailability =
		true;

	showPurchaseReturnAvailabilityLoading();

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await purchaseReturnApiRequest(
			`${API_BASE}/saas/purchase-returns/purchase/${encodeURIComponent(purchaseId)}/availability` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	isLoadingReturnAvailability =
		false;

	if (!result.ok) {

		purchaseReturnAvailability = [];

		showPurchaseReturnAvailabilityError(
			getPurchaseReturnErrorMessage(
				result.data,
				"Unable to load returnable purchase items."
			)
		);

		return;
	}

	purchaseReturnAvailability =
		Array.isArray(result.data)
			? result.data
			: [];

	renderPurchaseReturnAvailability(
		purchaseReturnAvailability
	);
}


function showSelectedPurchaseReturnInvoice(
	purchase
) {

	const card =
		document.getElementById(
			"purchaseReturnInvoiceCard"
		);

	if (!card || !purchase) {
		return;
	}

	card.classList.add(
		"active"
	);

	setText(
		"selectedReturnPurchaseNumber",
		purchase.purchaseNumber || "-"
	);

	setText(
		"selectedReturnSupplierName",
		purchase.supplierName || "-"
	);

	setText(
		"selectedReturnSupplierInvoice",
		purchase.supplierInvoiceNumber || "-"
	);

	setText(
		"selectedReturnPurchaseDate",
		formatDate(
			purchase.purchaseDate
		)
	);
}


function hideSelectedPurchaseReturnInvoice() {

	const card =
		document.getElementById(
			"purchaseReturnInvoiceCard"
		);

	if (card) {

		card.classList.remove(
			"active"
		);
	}
}


function renderPurchaseReturnAvailability(
	items
) {

	const tbody =
		document.getElementById(
			"purchaseReturnItemsBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(items)
			? items
			: [];

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="13">

					<div class="purchase-return-state">

						<div class="purchase-return-state-icon">

							<i class="bi bi-box-seam"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No returnable stock found
						</h5>

						<p class="text-muted mb-0">

							All items may already be returned,
							or current batch stock is unavailable.

						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(item, index) {

				const disabled =
					!item.stockId ||
					Number(
						item.maximumReturnQuantity || 0
					) <= 0;

				const maxReturn =
					Number(
						item.maximumReturnQuantity || 0
					);

				return `

					<tr data-purchase-item-id="${Number(item.purchaseItemId)}"
						data-stock-id="${item.stockId ? Number(item.stockId) : ""}"
						data-purchase-rate="${Number(item.purchaseRate || 0)}"
						data-discount-percentage="${Number(item.discountPercentage || 0)}"
						data-gst-percentage="${Number(item.gstPercentage || 0)}"
						data-max-return="${maxReturn}">

						<td>

							<input type="checkbox"
								   class="form-check-input purchase-return-select"
								   ${disabled ? "disabled" : ""}
								   onchange="handlePurchaseReturnRowSelection(this)">

						</td>

						<td>

							<strong class="text-primary">

								${escapeHtml(
					item.medicineName
				)}

							</strong>

							<div class="small text-muted">

								${escapeHtml(
					buildPurchaseReturnMedicineDetails(
						item
					)
				)}

							</div>

						</td>

						<td>

							<strong>
								${escapeHtml(item.batchNumber || "-")}
							</strong>

						</td>

						<td>

							${formatDate(item.expiryDate)}

						</td>

						<td>

							<span class="return-quantity-chip">

								${Number(item.totalReceivedQuantity || 0)}

							</span>

							<div class="small text-muted mt-1">

								Paid:
								${Number(item.purchasedQuantity || 0)}

								Free:
								${Number(item.freeQuantity || 0)}

							</div>

						</td>

						<td>

							<span class="return-quantity-chip warning">

								${Number(item.previouslyReturnedQuantity || 0)}

							</span>

						</td>

						<td>

							<span class="return-quantity-chip">

								${Number(item.currentStockQuantity || 0)}

							</span>

						</td>

						<td>

							<span class="return-quantity-chip ${maxReturn <= 0 ? "danger" : ""}">

								${maxReturn}

							</span>

						</td>

						<td>

							<input type="number"
								   class="form-control purchase-return-quantity"
								   value="${disabled ? 0 : 1}"
								   min="1"
								   max="${maxReturn}"
								   ${disabled ? "disabled" : ""}
								   oninput="calculatePurchaseReturnTotals()">

						</td>

						<td>

							<strong>

								${formatCurrency(
					item.purchaseRate
				)}

							</strong>

							<div class="small text-muted">

								Disc:
								${Number(
					item.discountPercentage || 0
				).toFixed(2)}%

								GST:
								${Number(
					item.gstPercentage || 0
				).toFixed(2)}%

							</div>

						</td>

						<td>

							<select class="form-select purchase-return-reason"
									${disabled ? "disabled" : ""}>

								<option value="">
									Select Reason
								</option>

								<option value="DAMAGED">
									Damaged
								</option>

								<option value="EXPIRED">
									Expired
								</option>

								<option value="NEAR_EXPIRY">
									Near Expiry
								</option>

								<option value="WRONG_ITEM">
									Wrong Item
								</option>

								<option value="EXCESS_SUPPLY">
									Excess Supply
								</option>

								<option value="QUALITY_ISSUE">
									Quality Issue
								</option>

								<option value="RATE_DIFFERENCE">
									Rate Difference
								</option>

								<option value="OTHER">
									Other
								</option>

							</select>

						</td>

						<td>

							<input type="text"
								   class="form-control purchase-return-reason-details"
								   maxlength="500"
								   placeholder="Optional details"
								   ${disabled ? "disabled" : ""}>

						</td>

						<td>

							<strong class="purchase-return-line-total text-primary">
								₹0
							</strong>

						</td>

					</tr>
				`;
			}
		)
			.join("");

	calculatePurchaseReturnTotals();
}


function handlePurchaseReturnRowSelection(
	checkbox
) {

	const row =
		checkbox.closest("tr");

	if (!row) {
		return;
	}

	row.classList.toggle(
		"table-info",
		checkbox.checked
	);

	calculatePurchaseReturnTotals();
}


function calculatePurchaseReturnTotals() {

	let grossAmount = 0;
	let discountAmount = 0;
	let taxableAmount = 0;
	let gstAmount = 0;

	document
		.querySelectorAll(
			"#purchaseReturnItemsBody tr[data-purchase-item-id]"
		)
		.forEach(
			function(row) {

				const selected =
					row.querySelector(
						".purchase-return-select"
					)?.checked;

				const quantity =
					selected
						? numberFromRow(
							row,
							".purchase-return-quantity"
						)
						: 0;

				const rate =
					Number(
						row.dataset.purchaseRate || 0
					);

				const discountPercentage =
					Number(
						row.dataset.discountPercentage || 0
					);

				const gstPercentage =
					Number(
						row.dataset.gstPercentage || 0
					);

				const rowGross =
					quantity * rate;

				const rowDiscount =
					rowGross *
					discountPercentage /
					100;

				const rowTaxable =
					rowGross -
					rowDiscount;

				const rowGst =
					rowTaxable *
					gstPercentage /
					100;

				const rowTotal =
					rowTaxable +
					rowGst;

				grossAmount +=
					rowGross;

				discountAmount +=
					rowDiscount;

				taxableAmount +=
					rowTaxable;

				gstAmount +=
					rowGst;

				const lineElement =
					row.querySelector(
						".purchase-return-line-total"
					);

				if (lineElement) {

					lineElement.textContent =
						formatCurrency(rowTotal);
				}
			}
		);

	const otherCharges =
		getNumberValue(
			"purchaseReturnOtherCharges"
		);

	const roundOff =
		getNumberValue(
			"purchaseReturnRoundOff"
		);

	const grandTotal =
		taxableAmount +
		gstAmount +
		otherCharges +
		roundOff;

	setText(
		"purchaseReturnGrossAmount",
		formatCurrency(grossAmount)
	);

	setText(
		"purchaseReturnDiscountAmount",
		formatCurrency(discountAmount)
	);

	setText(
		"purchaseReturnTaxableAmount",
		formatCurrency(taxableAmount)
	);

	setText(
		"purchaseReturnGstAmount",
		formatCurrency(gstAmount)
	);

	setText(
		"purchaseReturnGrandTotal",
		formatCurrency(grandTotal)
	);
}


async function savePurchaseReturn() {

	if (isSavingPurchaseReturn) {
		return;
	}

	if (!purchaseReturnPermissions.create) {

		showMsg(
			"You do not have permission to create purchase returns."
		);

		return;
	}

	const payload =
		buildPurchaseReturnPayload();

	const validationMessage =
		validatePurchaseReturnPayload(
			payload
		);

	if (validationMessage) {

		showMsg(validationMessage);

		return;
	}

	isSavingPurchaseReturn =
		true;

	setButtonLoading(
		"savePurchaseReturnBtn",
		"Saving Return...",
		true
	);

	const result =
		await purchaseReturnApiRequest(
			`${API_BASE}/saas/purchase-returns`,
			{
				method:
					"POST",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify(payload)
			}
		);

	isSavingPurchaseReturn =
		false;

	setButtonLoading(
		"savePurchaseReturnBtn",
		"Save Purchase Return",
		false
	);

	if (!result.ok) {

		showMsg(
			getPurchaseReturnErrorMessage(
				result.data,
				"Unable to save purchase return."
			)
		);

		return;
	}

	showMsg(
		"Purchase return saved and inventory deducted successfully.",
		"success"
	);

	clearPurchaseReturnForm();

	closePurchaseReturnForm();

	await Promise.all([
		loadPurchaseReturns(),
		loadPurchaseReturnSummary(),
		loadPurchaseReturnPurchases()
	]);
}


function buildPurchaseReturnPayload() {

	const items = [];

	document
		.querySelectorAll(
			"#purchaseReturnItemsBody tr[data-purchase-item-id]"
		)
		.forEach(
			function(row) {

				const selected =
					row.querySelector(
						".purchase-return-select"
					)?.checked;

				if (!selected) {
					return;
				}

				items.push({

					purchaseItemId:
						Number(
							row.dataset.purchaseItemId
						),

					stockId:
						Number(
							row.dataset.stockId
						),

					returnQuantity:
						numberFromRow(
							row,
							".purchase-return-quantity"
						),

					returnReason:
						String(
							row.querySelector(
								".purchase-return-reason"
							)?.value || ""
						).trim(),

					reasonDetails:
						String(
							row.querySelector(
								".purchase-return-reason-details"
							)?.value || ""
						).trim(),

					maximumReturnQuantity:
						Number(
							row.dataset.maxReturn || 0
						)
				});
			}
		);

	return {

		tenantId:
			Number(
				localStorage.getItem(
					"tenantId"
				)
			),

		purchaseId:
			getNumberValue(
				"purchaseReturnPurchaseId"
			),

		returnDate:
			getValue(
				"purchaseReturnDate"
			) || null,

		debitNoteNumber:
			getValue(
				"purchaseReturnDebitNoteNumber"
			),

		otherCharges:
			getNumberValue(
				"purchaseReturnOtherCharges"
			),

		roundOffAmount:
			getNumberValue(
				"purchaseReturnRoundOff"
			),

		remarks:
			getValue(
				"purchaseReturnRemarks"
			),

		items:
			items
	};
}


function validatePurchaseReturnPayload(
	payload
) {

	if (!payload.purchaseId) {

		return "Please select purchase invoice.";
	}

	if (!payload.returnDate) {

		return "Return date is required.";
	}

	const purchase =
		findPurchaseReturnPurchase(
			payload.purchaseId
		);

	if (
		purchase?.purchaseDate &&
		payload.returnDate <
		purchase.purchaseDate
	) {

		return "Return date cannot be before purchase date.";
	}

	if (!payload.items.length) {

		return "Select at least one purchase item for return.";
	}

	for (
		let index = 0;
		index < payload.items.length;
		index++
	) {

		const item =
			payload.items[index];

		const rowNumber =
			index + 1;

		if (!item.purchaseItemId) {

			return `Purchase item is missing in selected row ${rowNumber}.`;
		}

		if (!item.stockId) {

			return `Stock batch is unavailable in selected row ${rowNumber}.`;
		}

		if (
			!item.returnQuantity ||
			item.returnQuantity <= 0
		) {

			return `Return quantity must be greater than 0 in selected row ${rowNumber}.`;
		}

		if (
			item.returnQuantity >
			item.maximumReturnQuantity
		) {

			return `Return quantity exceeds maximum allowed quantity in selected row ${rowNumber}. Maximum: ${item.maximumReturnQuantity}.`;
		}

		if (!item.returnReason) {

			return `Please select return reason in selected row ${rowNumber}.`;
		}

		if (
			item.returnReason === "OTHER" &&
			!item.reasonDetails
		) {

			return `Reason details are required when reason is Other in selected row ${rowNumber}.`;
		}
	}

	if (payload.otherCharges < 0) {

		return "Other charges cannot be negative.";
	}

	return "";
}


function clearPurchaseReturnForm() {

	setDefaultPurchaseReturnDate();

	setValue(
		"purchaseReturnPurchaseId",
		""
	);

	setValue(
		"purchaseReturnDebitNoteNumber",
		""
	);

	setValue(
		"purchaseReturnOtherCharges",
		"0"
	);

	setValue(
		"purchaseReturnRoundOff",
		"0"
	);

	setValue(
		"purchaseReturnRemarks",
		""
	);

	purchaseReturnAvailability = [];

	hideSelectedPurchaseReturnInvoice();

	renderPurchaseReturnAvailability([]);

	calculatePurchaseReturnTotals();
}


async function refreshPurchaseReturns() {

	setValue(
		"purchaseReturnSearchKeyword",
		""
	);

	await Promise.all([
		loadPurchaseReturns(),
		loadPurchaseReturnSummary(),
		loadPurchaseReturnPurchases()
	]);
}


function renderPurchaseReturns(
	returns
) {

	const tbody =
		document.getElementById(
			"purchaseReturnTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(returns)
			? returns
			: [];

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="10">

					<div class="purchase-return-state">

						<div class="purchase-return-state-icon">

							<i class="bi bi-arrow-return-left"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No purchase returns found
						</h5>

						<p class="text-muted mb-0">

							Create your first supplier purchase return.

						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(item, index) {

				return `

					<tr>

						<td>

							<strong>
								${index + 1}
							</strong>

						</td>

						<td>

							<strong class="text-primary">

								${escapeHtml(
					item.returnNumber
				)}

							</strong>

							<div class="small text-muted">

								${formatDate(
					item.returnDate
				)}

							</div>

						</td>

						<td>

							<strong>

								${escapeHtml(
					item.purchaseNumber
				)}

							</strong>

							<div class="small text-muted">

								${escapeHtml(
					item.supplierInvoiceNumber || "-"
				)}

							</div>

						</td>

						<td>

							<strong>

								${escapeHtml(
					item.supplierName
				)}

							</strong>

							<div class="small text-muted">

								${escapeHtml(
					item.supplierCode || "-"
				)}

							</div>

						</td>

						<td>

							${escapeHtml(
					item.debitNoteNumber || "-"
				)}

						</td>

						<td>

							${Array.isArray(item.items)
						? item.items.length
						: 0
					}

							items

						</td>

						<td>

							${Number(
						item.totalQuantity || 0
					)}

						</td>

						<td>

							<strong>

								${formatCurrency(
						item.grandTotal
					)}

							</strong>

						</td>

						<td>

							${purchaseReturnStatusBadge(
						item.returnStatus
					)}

						</td>

						<td>

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="showPurchaseReturnDetails(${Number(item.id)})">

								<i class="bi bi-eye me-1"></i>
								View

							</button>

						</td>

					</tr>
				`;
			}
		)
			.join("");
}


function showPurchaseReturnDetails(
	returnId
) {

	const purchaseReturn =
		purchaseReturnList.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(returnId)
				);
			}
		);

	if (!purchaseReturn) {

		showMsg(
			"Purchase return details not found."
		);

		return;
	}

	const items =
		Array.isArray(
			purchaseReturn.items
		)
			? purchaseReturn.items
			: [];

	const content =
		document.getElementById(
			"purchaseReturnDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="row g-3 mb-4">

			<div class="col-md-4">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Return Number
					</span>

					<div class="purchase-return-detail-value">

						${escapeHtml(
		purchaseReturn.returnNumber
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Return Date
					</span>

					<div class="purchase-return-detail-value">

						${formatDate(
		purchaseReturn.returnDate
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Status
					</span>

					<div class="purchase-return-detail-value">

						${purchaseReturnStatusBadge(
		purchaseReturn.returnStatus
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Purchase Number
					</span>

					<div class="purchase-return-detail-value">

						${escapeHtml(
		purchaseReturn.purchaseNumber
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Supplier Invoice
					</span>

					<div class="purchase-return-detail-value">

						${escapeHtml(
		purchaseReturn.supplierInvoiceNumber || "-"
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Debit Note
					</span>

					<div class="purchase-return-detail-value">

						${escapeHtml(
		purchaseReturn.debitNoteNumber || "-"
	)}

					</div>

				</div>

			</div>

			<div class="col-md-8">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Supplier
					</span>

					<div class="purchase-return-detail-value">

						${escapeHtml(
		purchaseReturn.supplierName
	)}

						${purchaseReturn.supplierCode
			? ` (${escapeHtml(purchaseReturn.supplierCode)})`
			: ""
		}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Total Quantity
					</span>

					<div class="purchase-return-detail-value">

						${Number(
			purchaseReturn.totalQuantity || 0
		)}

					</div>

				</div>

			</div>

		</div>

		<div class="table-responsive mb-4">

			<table class="table table-bordered align-middle">

				<thead>

					<tr>

						<th>Medicine</th>
						<th>Batch</th>
						<th>Expiry</th>
						<th>Quantity</th>
						<th>Rate</th>
						<th>Discount</th>
						<th>GST</th>
						<th>Reason</th>
						<th>Total</th>

					</tr>

				</thead>

				<tbody>

					${items.map(
			function(item) {

				return `

								<tr>

									<td>

										<strong>

											${escapeHtml(
					item.medicineName
				)}

										</strong>

									</td>

									<td>

										${escapeHtml(
					item.batchNumber || "-"
				)}

									</td>

									<td>

										${formatDate(
					item.expiryDate
				)}

									</td>

									<td>

										${Number(
					item.returnQuantity || 0
				)}

									</td>

									<td>

										${formatCurrency(
					item.purchaseRate
				)}

									</td>

									<td>

										${Number(
					item.discountPercentage || 0
				).toFixed(2)}%

										<div class="small text-muted">

											${formatCurrency(
					item.discountAmount
				)}

										</div>

									</td>

									<td>

										${Number(
					item.gstPercentage || 0
				).toFixed(2)}%

										<div class="small text-muted">

											${formatCurrency(
					item.gstAmount
				)}

										</div>

									</td>

									<td>

										<strong>

											${formatReturnReason(
					item.returnReason
				)}

										</strong>

										${item.reasonDetails
						? `
												<div class="small text-muted">
													${escapeHtml(item.reasonDetails)}
												</div>
											`
						: ""
					}

									</td>

									<td>

										<strong>

											${formatCurrency(
						item.lineTotal
					)}

										</strong>

									</td>

								</tr>
							`;
			}
		).join("")}

				</tbody>

			</table>

		</div>

		<div class="row g-3">

			<div class="col-md-3">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Gross Amount
					</span>

					<div class="purchase-return-detail-value">

						${formatCurrency(
			purchaseReturn.grossAmount
		)}

					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Discount
					</span>

					<div class="purchase-return-detail-value">

						${formatCurrency(
			purchaseReturn.discountAmount
		)}

					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						GST Amount
					</span>

					<div class="purchase-return-detail-value">

						${formatCurrency(
			purchaseReturn.gstAmount
		)}

					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="purchase-return-detail-card">

					<span class="purchase-return-detail-label">
						Grand Total
					</span>

					<div class="purchase-return-detail-value">

						${formatCurrency(
			purchaseReturn.grandTotal
		)}

					</div>

				</div>

			</div>

		</div>

		${purchaseReturn.remarks
			? `
				<div class="purchase-return-detail-card mt-3">

					<span class="purchase-return-detail-label">
						Remarks
					</span>

					<div class="purchase-return-detail-value">

						${escapeHtml(
				purchaseReturn.remarks
			)}

					</div>

				</div>
			`
			: ""
		}
	`;

	if (purchaseReturnDetailsModal) {

		purchaseReturnDetailsModal.show();
	}
}


function findPurchaseReturnPurchase(
	purchaseId
) {

	return purchaseReturnPurchases.find(
		function(purchase) {

			return (
				Number(purchase.id) ===
				Number(purchaseId)
			);
		}
	) || null;
}


function purchaseReturnStatusBadge(
	status
) {

	const normalized =
		String(status || "")
			.toUpperCase();

	if (normalized === "CANCELLED") {

		return `

			<span class="purchase-return-status cancelled">

				<i class="bi bi-x-circle-fill"></i>
				Cancelled

			</span>
		`;
	}

	return `

		<span class="purchase-return-status">

			<i class="bi bi-check-circle-fill"></i>
			Posted

		</span>
	`;
}


function formatReturnReason(
	value
) {

	return String(value || "")
		.toLowerCase()
		.replace(
			/_/g,
			" "
		)
		.replace(
			/\b\w/g,
			function(character) {

				return character.toUpperCase();
			}
		);
}


function buildPurchaseReturnMedicineDetails(
	item
) {

	return [
		item.medicineType,
		item.manufacturer
	]
		.filter(
			function(value) {

				return Boolean(
					String(value || "").trim()
				);
			}
		)
		.join(" • ");
}


function showPurchaseReturnAvailabilityLoading() {

	const tbody =
		document.getElementById(
			"purchaseReturnItemsBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="13">

				<div class="purchase-return-state">

					<div class="spinner-border text-primary"
						 role="status">
					</div>

					<p class="text-muted mt-3 mb-0">
						Loading returnable purchase items...
					</p>

				</div>

			</td>

		</tr>
	`;
}


function showPurchaseReturnAvailabilityError(
	message
) {

	const tbody =
		document.getElementById(
			"purchaseReturnItemsBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="13">

				<div class="purchase-return-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<p class="text-muted mt-3 mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


function showPurchaseReturnLoadingState() {

	const tbody =
		document.getElementById(
			"purchaseReturnTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="10">

				<div class="purchase-return-state">

					<div class="spinner-border text-primary"
						 role="status">
					</div>

					<p class="text-muted mt-3 mb-0">
						Loading purchase returns...
					</p>

				</div>

			</td>

		</tr>
	`;
}


function showPurchaseReturnErrorState(
	message
) {

	const tbody =
		document.getElementById(
			"purchaseReturnTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="10">

				<div class="purchase-return-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<h5 class="fw-bold mt-3">
						Unable to load purchase returns
					</h5>

					<p class="text-muted mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


async function purchaseReturnApiRequest(
	url,
	options = {}
) {

	const token =
		localStorage.getItem(
			"token"
		);

	const headers = {

		"Authorization":
			"Bearer " + token,

		"Accept":
			"application/json",

		...(options.headers || {})
	};

	try {

		const response =
			await fetch(
				url,
				{
					...options,
					headers:
						headers
				}
			);

		const data =
			await readPurchaseReturnResponse(
				response
			);

		return {

			ok:
				response.ok,

			status:
				response.status,

			data:
				data
		};

	} catch (error) {

		console.error(
			"Purchase return API error:",
			error
		);

		return {

			ok:
				false,

			status:
				0,

			data: {

				message:
					"Purchase return service is not reachable."
			}
		};
	}
}


async function readPurchaseReturnResponse(
	response
) {

	try {

		const text =
			await response.text();

		if (!text.trim()) {
			return {};
		}

		try {

			return JSON.parse(text);

		} catch (error) {

			return {
				message:
					text
			};
		}

	} catch (error) {

		return {};
	}
}


function getPurchaseReturnErrorMessage(
	data,
	fallback
) {

	if (!data) {
		return fallback;
	}

	if (
		typeof data === "string"
	) {
		return data;
	}

	return (
		data.message ||
		data.error ||
		fallback
	);
}


function numberFromRow(
	row,
	selector
) {

	const value =
		Number(
			row.querySelector(
				selector
			)?.value || 0
		);

	return Number.isFinite(value)
		? value
		: 0;
}


function getNumberValue(
	id
) {

	const value =
		Number(
			getValue(id)
		);

	return Number.isFinite(value)
		? value
		: 0;
}


function getValue(
	id
) {

	const element =
		document.getElementById(id);

	return element
		? String(
			element.value || ""
		).trim()
		: "";
}


function setValue(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.value =
			value === null ||
				value === undefined
				? ""
				: value;
	}
}


function setText(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.textContent =
			value === null ||
				value === undefined
				? ""
				: value;
	}
}


function showOrHideById(
	id,
	visible
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.style.display =
			visible
				? ""
				: "none";
	}
}


function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {

	const button =
		document.getElementById(
			buttonId
		);

	if (!button) {
		return;
	}

	if (isLoading) {

		if (!button.dataset.originalHtml) {

			button.dataset.originalHtml =
				button.innerHTML;
		}

		button.innerHTML = `

			<span class="spinner-border spinner-border-sm me-2"
				  aria-hidden="true">
			</span>

			${escapeHtml(loadingText)}
		`;

		button.disabled =
			true;

		return;
	}

	button.innerHTML =
		button.dataset.originalHtml ||
		button.innerHTML;

	button.disabled =
		false;
}


function setAnimatedNumber(
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
		Number(
			element.textContent
		) || 0;

	const difference =
		target - start;

	const duration =
		450;

	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {

		element.textContent =
			target;

		return;
	}

	function update(
		currentTime
	) {

		const progress =
			Math.min(
				(currentTime - startTime) /
				duration,
				1
			);

		const eased =
			1 - Math.pow(
				1 - progress,
				3
			);

		element.textContent =
			Math.round(
				start +
				difference *
				eased
			);

		if (progress < 1) {

			requestAnimationFrame(
				update
			);
		}
	}

	requestAnimationFrame(
		update
	);
}


function formatTenantType(
	value
) {

	switch (
	String(value || "")
		.trim()
		.toUpperCase()
	) {

		case "WHOLESALER":
			return "Wholesaler";

		case "RETAILER":
			return "Retailer";

		default:
			return "Workspace";
	}
}


function formatCurrency(
	value
) {

	return new Intl.NumberFormat(
		"en-IN",
		{
			style:
				"currency",

			currency:
				"INR",

			maximumFractionDigits:
				2
		}
	).format(
		Number(value || 0)
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
			value + "T00:00:00"
		);

	if (
		Number.isNaN(
			date.getTime()
		)
	) {
		return "-";
	}

	return date.toLocaleDateString(
		"en-IN"
	);
}


function showMsg(
	message,
	type = "danger"
) {

	const element =
		document.getElementById(
			"msg"
		);

	if (!element) {

		alert(message);

		return;
	}

	element.innerHTML = `

		<div class="alert alert-${escapeHtml(type)} alert-dismissible fade show"
			 role="alert">

			${escapeHtml(message)}

			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert">
			</button>

		</div>
	`;

	window.scrollTo({

		top:
			0,

		behavior:
			"smooth"
	});
}


function escapeHtml(
	value
) {

	return String(value ?? "")
		.replace(
			/&/g,
			"&amp;"
		)
		.replace(
			/</g,
			"&lt;"
		)
		.replace(
			/>/g,
			"&gt;"
		)
		.replace(
			/"/g,
			"&quot;"
		)
		.replace(
			/'/g,
			"&#039;"
		);
}