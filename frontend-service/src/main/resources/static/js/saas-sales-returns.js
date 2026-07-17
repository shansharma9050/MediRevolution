const API_BASE =
	"http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let salesReturnList = [];
let salesReturnSales = [];
let salesReturnAvailability = [];

let isLoadingSalesReturns = false;
let isLoadingSalesReturnAvailability = false;
let isSavingSalesReturn = false;

let salesReturnDetailsModal = null;

let salesReturnPermissions = {
	create: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"SALES_RETURNS",
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
				"Sales Returns module is available only for Wholesaler and Retailer workspaces."
			);

			window.location.href =
				"/saas/dashboard";

			return;
		}

		initializeSalesReturnPage();

		initializeSalesReturnModal();

		await loadSalesReturnPermissions();

		setDefaultSalesReturnDate();

		await Promise.all([
			loadSalesReturnSales(),
			loadSalesReturnSummary(),
			loadSalesReturns()
		]);

		const searchInput =
			document.getElementById(
				"salesReturnSearchKeyword"
			);

		if (searchInput) {

			searchInput.addEventListener(
				"keydown",
				function(event) {

					if (event.key === "Enter") {

						event.preventDefault();

						searchSalesReturns();
					}
				}
			);
		}
	}
);


function initializeSalesReturnPage() {

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


function initializeSalesReturnModal() {

	const modalElement =
		document.getElementById(
			"salesReturnDetailsModal"
		);

	if (modalElement) {

		salesReturnDetailsModal =
			new bootstrap.Modal(
				modalElement
			);
	}
}


async function loadSalesReturnPermissions() {

	const canCreate =
		await hasSaasPermission(
			"SALES_RETURNS",
			"CREATE"
		);

	salesReturnPermissions.create =
		Boolean(canCreate);

	showOrHideById(
		"createSalesReturnBtn",
		salesReturnPermissions.create
	);
}


function setDefaultSalesReturnDate() {

	const today =
		new Date()
			.toISOString()
			.substring(0, 10);

	setValue(
		"salesReturnDate",
		today
	);
}


async function loadSalesReturnSales() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesReturnApiRequest(
			`${API_BASE}/saas/sales` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		salesReturnSales = [];

		populateSalesReturnSaleDropdown();

		showMsg(
			getSalesReturnErrorMessage(
				result.data,
				"Unable to load original sales."
			)
		);

		return;
	}

	salesReturnSales =
		(Array.isArray(result.data)
			? result.data
			: [])
			.filter(
				function(sale) {

					return (
						String(
							sale.saleStatus || ""
						)
							.trim()
							.toUpperCase()
						!== "CANCELLED"
					);
				}
			);

	populateSalesReturnSaleDropdown();
}


function populateSalesReturnSaleDropdown() {

	const select =
		document.getElementById(
			"salesReturnSaleId"
		);

	if (!select) {
		return;
	}

	select.innerHTML = `
		<option value="">
			Select Original Sale
		</option>
	`;

	salesReturnSales.forEach(
		function(sale) {

			const option =
				document.createElement(
					"option"
				);

			option.value =
				sale.id;

			option.textContent =
				`${sale.saleNumber || "Sale"} — ` +
				`${sale.customerName || "Customer"} — ` +
				`${formatCurrency(sale.grandTotal)}`;

			select.appendChild(option);
		}
	);
}


async function loadSalesReturnSummary() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesReturnApiRequest(
			`${API_BASE}/saas/sales-returns/summary` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		resetSalesReturnSummary();

		return;
	}

	const summary =
		result.data || {};

	setAnimatedNumber(
		"totalSalesReturns",
		summary.totalReturns
	);

	setAnimatedNumber(
		"totalSalesReturnQuantity",
		summary.totalReturnedQuantity
	);

	setText(
		"totalSalesReturnAmount",
		formatCurrency(
			summary.totalReturnAmount
		)
	);

	setText(
		"totalSalesRefundedAmount",
		formatCurrency(
			summary.totalRefundedAmount
		)
	);

	setText(
		"totalSalesPendingRefundAmount",
		formatCurrency(
			summary.totalPendingRefundAmount
		)
	);
}


function resetSalesReturnSummary() {

	setText(
		"totalSalesReturns",
		"0"
	);

	setText(
		"totalSalesReturnQuantity",
		"0"
	);

	setText(
		"totalSalesReturnAmount",
		formatCurrency(0)
	);

	setText(
		"totalSalesRefundedAmount",
		formatCurrency(0)
	);

	setText(
		"totalSalesPendingRefundAmount",
		formatCurrency(0)
	);
}


async function loadSalesReturns() {

	if (isLoadingSalesReturns) {
		return;
	}

	isLoadingSalesReturns =
		true;

	showSalesReturnLoadingState();

	setButtonLoading(
		"refreshSalesReturnBtn",
		"Refreshing...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesReturnApiRequest(
			`${API_BASE}/saas/sales-returns` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	isLoadingSalesReturns =
		false;

	setButtonLoading(
		"refreshSalesReturnBtn",
		"Refresh",
		false
	);

	if (!result.ok) {

		salesReturnList = [];

		const message =
			getSalesReturnErrorMessage(
				result.data,
				"Unable to load sales returns."
			);

		showSalesReturnErrorState(
			message
		);

		showMsg(message);

		return;
	}

	salesReturnList =
		Array.isArray(result.data)
			? result.data
			: [];

	renderSalesReturns(
		salesReturnList
	);
}


async function searchSalesReturns() {

	const keyword =
		getValue(
			"salesReturnSearchKeyword"
		);

	if (!keyword) {

		await loadSalesReturns();

		return;
	}

	showSalesReturnLoadingState();

	setButtonLoading(
		"searchSalesReturnBtn",
		"Searching...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesReturnApiRequest(
			`${API_BASE}/saas/sales-returns/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`
		);

	setButtonLoading(
		"searchSalesReturnBtn",
		"Search",
		false
	);

	if (!result.ok) {

		showSalesReturnErrorState(
			getSalesReturnErrorMessage(
				result.data,
				"Unable to search sales returns."
			)
		);

		return;
	}

	salesReturnList =
		Array.isArray(result.data)
			? result.data
			: [];

	renderSalesReturns(
		salesReturnList
	);
}


function openSalesReturnForm() {

	if (!salesReturnPermissions.create) {

		showMsg(
			"You do not have permission to create sales returns."
		);

		return;
	}

	if (!salesReturnSales.length) {

		showMsg(
			"No original sale is available for return."
		);

		return;
	}

	const panel =
		document.getElementById(
			"salesReturnFormPanel"
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


function closeSalesReturnForm() {

	const panel =
		document.getElementById(
			"salesReturnFormPanel"
		);

	if (panel) {

		panel.style.display =
			"none";
	}
}


async function handleSalesReturnSaleChange() {

	const saleId =
		getNumberValue(
			"salesReturnSaleId"
		);

	salesReturnAvailability = [];

	if (!saleId) {

		hideSelectedSalesReturnSale();

		renderSalesReturnAvailability([]);

		calculateSalesReturnTotals();

		return;
	}

	const sale =
		findSalesReturnSale(
			saleId
		);

	showSelectedSalesReturnSale(
		sale
	);

	await loadSalesReturnAvailability(
		saleId
	);
}


function showSelectedSalesReturnSale(
	sale
) {

	const card =
		document.getElementById(
			"salesReturnSaleCard"
		);

	if (!card || !sale) {
		return;
	}

	card.classList.add(
		"active"
	);

	setText(
		"selectedSalesReturnSaleNumber",
		sale.saleNumber || "-"
	);

	setText(
		"selectedSalesReturnSaleDate",
		formatDate(
			sale.saleDate
		)
	);

	setText(
		"selectedSalesReturnCustomerName",
		sale.customerName || "-"
	);

	setText(
		"selectedSalesReturnCustomerCode",
		sale.customerCode || "-"
	);

	setText(
		"selectedSalesReturnSaleTotal",
		formatCurrency(
			sale.grandTotal
		)
	);
}


function hideSelectedSalesReturnSale() {

	const card =
		document.getElementById(
			"salesReturnSaleCard"
		);

	if (card) {

		card.classList.remove(
			"active"
		);
	}
}


async function loadSalesReturnAvailability(
	saleId
) {

	if (isLoadingSalesReturnAvailability) {
		return;
	}

	isLoadingSalesReturnAvailability =
		true;

	showSalesReturnAvailabilityLoading();

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesReturnApiRequest(
			`${API_BASE}/saas/sales-returns/sale/${encodeURIComponent(saleId)}/availability` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	isLoadingSalesReturnAvailability =
		false;

	if (!result.ok) {

		salesReturnAvailability = [];

		showSalesReturnAvailabilityError(
			getSalesReturnErrorMessage(
				result.data,
				"Unable to load returnable sale batches."
			)
		);

		return;
	}

	salesReturnAvailability =
		Array.isArray(result.data)
			? result.data
			: [];

	renderSalesReturnAvailability(
		salesReturnAvailability
	);
}


function renderSalesReturnAvailability(
	items
) {

	const tbody =
		document.getElementById(
			"salesReturnItemsBody"
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

				<td colspan="14">

					<div class="sales-return-state">

						<div class="sales-return-state-icon">

							<i class="bi bi-box-seam"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No returnable sale batches
						</h5>

						<p class="text-muted mb-0">

							All sold quantities may already have been returned.

						</p>

					</div>

				</td>

			</tr>
		`;

		calculateSalesReturnTotals();

		return;
	}

	tbody.innerHTML =
		list.map(
			function(item) {

				const remaining =
					Number(
						item.remainingReturnableQuantity || 0
					);

				const disabled =
					remaining <= 0;

				return `

					<tr data-allocation-id="${Number(item.saleStockAllocationId)}"
						data-sale-item-id="${Number(item.saleItemId)}"
						data-sale-rate="${Number(item.saleRate || 0)}"
						data-discount-percentage="${Number(item.discountPercentage || 0)}"
						data-gst-percentage="${Number(item.gstPercentage || 0)}"
						data-remaining-returnable="${remaining}">

						<td>

							<input type="checkbox"
								   class="form-check-input sales-return-select"
								   ${disabled ? "disabled" : ""}
								   onchange="handleSalesReturnRowSelection(this)">

						</td>

						<td>

							<strong class="text-primary">

								${escapeHtml(
					item.medicineName
				)}

							</strong>

							<div class="small text-muted">

								${escapeHtml(
					buildSalesReturnMedicineDetails(
						item
					)
				)}

							</div>

						</td>

						<td>

							<strong>

								${escapeHtml(
					item.batchNumber || "-"
				)}

							</strong>

						</td>

						<td>

							${formatDate(
					item.expiryDate
				)}

						</td>

						<td>

							<span class="sales-return-quantity-chip">

								${Number(
					item.soldQuantity || 0
				)}

							</span>

						</td>

						<td>

							<span class="sales-return-quantity-chip warning">

								${Number(
					item.previouslyReturnedQuantity || 0
				)}

							</span>

						</td>

						<td>

							<span class="sales-return-quantity-chip ${remaining > 0 ? "success" : "danger"}">

								${remaining}

							</span>

						</td>

						<td>

							<input type="number"
								   class="form-control sales-return-quantity"
								   min="1"
								   max="${remaining}"
								   value="${disabled ? 0 : 1}"
								   ${disabled ? "disabled" : ""}
								   oninput="calculateSalesReturnTotals()">

						</td>

						<td>

							<strong>

								${formatCurrency(
					item.saleRate
				)}

							</strong>

						</td>

						<td>

							${Number(
					item.discountPercentage || 0
				).toFixed(2)}%

						</td>

						<td>

							${Number(
					item.gstPercentage || 0
				).toFixed(2)}%

						</td>

						<td>

							<select class="form-select sales-return-reason"
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

								<option value="WRONG_MEDICINE">
									Wrong Medicine
								</option>

								<option value="EXCESS_QUANTITY">
									Excess Quantity
								</option>

								<option value="QUALITY_ISSUE">
									Quality Issue
								</option>

								<option value="CUSTOMER_REJECTED">
									Customer Rejected
								</option>

								<option value="BILLING_ERROR">
									Billing Error
								</option>

								<option value="OTHER">
									Other
								</option>

							</select>

						</td>

						<td>

							<input type="text"
								   class="form-control sales-return-reason-details"
								   maxlength="500"
								   placeholder="Optional details"
								   ${disabled ? "disabled" : ""}>

						</td>

						<td>

							<strong class="sales-return-line-total text-primary">
								₹0
							</strong>

						</td>

					</tr>
				`;
			}
		)
			.join("");

	calculateSalesReturnTotals();
}


function handleSalesReturnRowSelection(
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

	calculateSalesReturnTotals();
}


function handleSalesReturnAdjustmentChange() {

	const checkbox =
		document.getElementById(
			"salesReturnAdjustAccount"
		);

	const refundedAmount =
		document.getElementById(
			"salesReturnRefundedAmount"
		);

	const card =
		document.getElementById(
			"customerAccountAdjustmentCard"
		);

	const adjusted =
		Boolean(
			checkbox?.checked
		);

	if (refundedAmount) {

		refundedAmount.disabled =
			adjusted;

		if (adjusted) {

			refundedAmount.value =
				"0";
		}
	}

	if (card) {

		card.classList.toggle(
			"active",
			adjusted
		);
	}

	calculateSalesReturnTotals();
}


function calculateSalesReturnTotals() {

	let grossAmount = 0;
	let discountAmount = 0;
	let taxableAmount = 0;
	let gstAmount = 0;

	document
		.querySelectorAll(
			"#salesReturnItemsBody tr[data-allocation-id]"
		)
		.forEach(
			function(row) {

				const selected =
					Boolean(
						row.querySelector(
							".sales-return-select"
						)?.checked
					);

				const quantity =
					selected
						? numberFromRow(
							row,
							".sales-return-quantity"
						)
						: 0;

				const saleRate =
					Number(
						row.dataset.saleRate || 0
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
					quantity *
					saleRate;

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
						".sales-return-line-total"
					);

				if (lineElement) {

					lineElement.textContent =
						formatCurrency(
							rowTotal
						);
				}
			}
		);

	const otherAdjustment =
		getNumberValue(
			"salesReturnOtherAdjustment"
		);

	const roundOffAmount =
		getNumberValue(
			"salesReturnRoundOff"
		);

	const grandTotal =
		taxableAmount +
		gstAmount +
		otherAdjustment +
		roundOffAmount;

	const adjusted =
		Boolean(
			document.getElementById(
				"salesReturnAdjustAccount"
			)?.checked
		);

	const refundedAmount =
		adjusted
			? 0
			: getNumberValue(
				"salesReturnRefundedAmount"
			);

	const pendingRefund =
		adjusted
			? 0
			: Math.max(
				grandTotal -
				refundedAmount,
				0
			);

	setText(
		"salesReturnGrossAmount",
		formatCurrency(
			grossAmount
		)
	);

	setText(
		"salesReturnDiscountAmount",
		formatCurrency(
			discountAmount
		)
	);

	setText(
		"salesReturnTaxableAmount",
		formatCurrency(
			taxableAmount
		)
	);

	setText(
		"salesReturnGstAmount",
		formatCurrency(
			gstAmount
		)
	);

	setText(
		"salesReturnGrandTotal",
		formatCurrency(
			grandTotal
		)
	);

	setText(
		"salesReturnRefundedTotal",
		formatCurrency(
			refundedAmount
		)
	);

	setText(
		"salesReturnPendingRefund",
		formatCurrency(
			pendingRefund
		)
	);
}


async function saveSalesReturn() {

	if (isSavingSalesReturn) {
		return;
	}

	if (!salesReturnPermissions.create) {

		showMsg(
			"You do not have permission to create sales returns."
		);

		return;
	}

	const payload =
		buildSalesReturnPayload();

	const validationMessage =
		validateSalesReturnPayload(
			payload
		);

	if (validationMessage) {

		showMsg(
			validationMessage
		);

		return;
	}

	isSavingSalesReturn =
		true;

	setButtonLoading(
		"saveSalesReturnBtn",
		"Saving Return...",
		true
	);

	const result =
		await salesReturnApiRequest(
			`${API_BASE}/saas/sales-returns`,
			{
				method:
					"POST",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify(
						payload
					)
			}
		);

	isSavingSalesReturn =
		false;

	setButtonLoading(
		"saveSalesReturnBtn",
		"Save Sales Return",
		false
	);

	if (!result.ok) {

		showMsg(
			getSalesReturnErrorMessage(
				result.data,
				"Unable to save sales return."
			)
		);

		return;
	}

	showMsg(
		"Sales return saved and inventory restored successfully.",
		"success"
	);

	clearSalesReturnForm();

	closeSalesReturnForm();

	await Promise.all([
		loadSalesReturns(),
		loadSalesReturnSummary(),
		loadSalesReturnSales()
	]);
}


function buildSalesReturnPayload() {

	const items = [];

	document
		.querySelectorAll(
			"#salesReturnItemsBody tr[data-allocation-id]"
		)
		.forEach(
			function(row) {

				const selected =
					Boolean(
						row.querySelector(
							".sales-return-select"
						)?.checked
					);

				if (!selected) {
					return;
				}

				items.push({

					saleStockAllocationId:
						Number(
							row.dataset.allocationId
						),

					returnQuantity:
						numberFromRow(
							row,
							".sales-return-quantity"
						),

					returnReason:
						String(
							row.querySelector(
								".sales-return-reason"
							)?.value || ""
						).trim(),

					reasonDetails:
						String(
							row.querySelector(
								".sales-return-reason-details"
							)?.value || ""
						).trim(),

					remainingReturnableQuantity:
						Number(
							row.dataset.remainingReturnable || 0
						)
				});
			}
		);

	const adjustInCustomerAccount =
		Boolean(
			document.getElementById(
				"salesReturnAdjustAccount"
			)?.checked
		);

	return {

		tenantId:
			Number(
				localStorage.getItem(
					"tenantId"
				)
			),

		saleId:
			getNumberValue(
				"salesReturnSaleId"
			),

		returnDate:
			getValue(
				"salesReturnDate"
			) || null,

		creditNoteNumber:
			getValue(
				"salesReturnCreditNoteNumber"
			),

		otherAdjustment:
			getNumberValue(
				"salesReturnOtherAdjustment"
			),

		roundOffAmount:
			getNumberValue(
				"salesReturnRoundOff"
			),

		refundedAmount:
			adjustInCustomerAccount
				? 0
				: getNumberValue(
					"salesReturnRefundedAmount"
				),

		adjustInCustomerAccount:
			adjustInCustomerAccount,

		remarks:
			getValue(
				"salesReturnRemarks"
			),

		items:
			items
	};
}


function validateSalesReturnPayload(
	payload
) {

	if (!payload.saleId) {

		return "Please select original sale.";
	}

	if (!payload.returnDate) {

		return "Return date is required.";
	}

	const sale =
		findSalesReturnSale(
			payload.saleId
		);

	if (
		sale?.saleDate &&
		payload.returnDate <
		sale.saleDate
	) {

		return "Return date cannot be before original sale date.";
	}

	if (!payload.items.length) {

		return "Select at least one sale batch for return.";
	}

	const allocationIds =
		new Set();

	for (
		let index = 0;
		index < payload.items.length;
		index++
	) {

		const item =
			payload.items[index];

		const rowNumber =
			index + 1;

		if (!item.saleStockAllocationId) {

			return `Sale batch allocation is missing in selected row ${rowNumber}.`;
		}

		if (
			allocationIds.has(
				item.saleStockAllocationId
			)
		) {

			return `Duplicate batch allocation found in selected row ${rowNumber}.`;
		}

		allocationIds.add(
			item.saleStockAllocationId
		);

		if (
			!item.returnQuantity ||
			item.returnQuantity <= 0
		) {

			return `Return quantity must be greater than 0 in selected row ${rowNumber}.`;
		}

		if (
			item.returnQuantity >
			item.remainingReturnableQuantity
		) {

			return `Return quantity exceeds remaining quantity in selected row ${rowNumber}. Maximum: ${item.remainingReturnableQuantity}.`;
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

	const grandTotal =
		getCalculatedSalesReturnGrandTotal();

	if (grandTotal < 0) {

		return "Return grand total cannot be negative.";
	}

	if (
		payload.refundedAmount < 0
	) {

		return "Refunded amount cannot be negative.";
	}

	if (
		!payload.adjustInCustomerAccount &&
		payload.refundedAmount >
		grandTotal
	) {

		return "Refunded amount cannot exceed return grand total.";
	}

	return "";
}


function getCalculatedSalesReturnGrandTotal() {

	let taxableAmount = 0;
	let gstAmount = 0;

	document
		.querySelectorAll(
			"#salesReturnItemsBody tr[data-allocation-id]"
		)
		.forEach(
			function(row) {

				const selected =
					Boolean(
						row.querySelector(
							".sales-return-select"
						)?.checked
					);

				if (!selected) {
					return;
				}

				const quantity =
					numberFromRow(
						row,
						".sales-return-quantity"
					);

				const saleRate =
					Number(
						row.dataset.saleRate || 0
					);

				const discount =
					Number(
						row.dataset.discountPercentage || 0
					);

				const gst =
					Number(
						row.dataset.gstPercentage || 0
					);

				const gross =
					quantity *
					saleRate;

				const discountAmount =
					gross *
					discount /
					100;

				const taxable =
					gross -
					discountAmount;

				const tax =
					taxable *
					gst /
					100;

				taxableAmount +=
					taxable;

				gstAmount +=
					tax;
			}
		);

	return (
		taxableAmount +
		gstAmount +
		getNumberValue(
			"salesReturnOtherAdjustment"
		) +
		getNumberValue(
			"salesReturnRoundOff"
		)
	);
}


function clearSalesReturnForm() {

	setDefaultSalesReturnDate();

	setValue(
		"salesReturnSaleId",
		""
	);

	setValue(
		"salesReturnCreditNoteNumber",
		""
	);

	setValue(
		"salesReturnOtherAdjustment",
		"0"
	);

	setValue(
		"salesReturnRoundOff",
		"0"
	);

	setValue(
		"salesReturnRefundedAmount",
		"0"
	);

	setValue(
		"salesReturnRemarks",
		""
	);

	const adjustmentCheckbox =
		document.getElementById(
			"salesReturnAdjustAccount"
		);

	if (adjustmentCheckbox) {

		adjustmentCheckbox.checked =
			false;
	}

	const refundedAmount =
		document.getElementById(
			"salesReturnRefundedAmount"
		);

	if (refundedAmount) {

		refundedAmount.disabled =
			false;
	}

	const adjustmentCard =
		document.getElementById(
			"customerAccountAdjustmentCard"
		);

	if (adjustmentCard) {

		adjustmentCard.classList.remove(
			"active"
		);
	}

	salesReturnAvailability = [];

	hideSelectedSalesReturnSale();

	renderSalesReturnAvailability([]);

	calculateSalesReturnTotals();
}


async function refreshSalesReturns() {

	setValue(
		"salesReturnSearchKeyword",
		""
	);

	await Promise.all([
		loadSalesReturns(),
		loadSalesReturnSummary(),
		loadSalesReturnSales()
	]);
}


function renderSalesReturns(
	returns
) {

	const tbody =
		document.getElementById(
			"salesReturnTableBody"
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

				<td colspan="11">

					<div class="sales-return-state">

						<div class="sales-return-state-icon">

							<i class="bi bi-arrow-counterclockwise"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No sales returns found
						</h5>

						<p class="text-muted mb-0">

							Create your first customer sales return.

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
					item.saleNumber
				)}

							</strong>

							<div class="small text-muted">

								${formatDate(
					item.saleDate
				)}

							</div>

						</td>

						<td>

							<strong>

								${escapeHtml(
					item.customerName
				)}

							</strong>

							<div class="small text-muted">

								${escapeHtml(
					item.customerCode || "-"
				)}

							</div>

						</td>

						<td>

							${escapeHtml(
					item.creditNoteNumber || "-"
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

							${salesReturnRefundStatusBadge(
						item.refundStatus
					)}

						</td>

						<td>

							${salesReturnStatusBadge(
						item.returnStatus
					)}

						</td>

						<td>

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="showSalesReturnDetails(${Number(item.id)})">

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


function showSalesReturnDetails(
	returnId
) {

	const salesReturn =
		salesReturnList.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(returnId)
				);
			}
		);

	if (!salesReturn) {

		showMsg(
			"Sales return details not found."
		);

		return;
	}

	const items =
		Array.isArray(
			salesReturn.items
		)
			? salesReturn.items
			: [];

	const content =
		document.getElementById(
			"salesReturnDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="row g-3 mb-4">

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Return Number
					</span>

					<div class="sales-return-detail-value">

						${escapeHtml(
		salesReturn.returnNumber
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Return Date
					</span>

					<div class="sales-return-detail-value">

						${formatDate(
		salesReturn.returnDate
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Return Status
					</span>

					<div class="sales-return-detail-value">

						${salesReturnStatusBadge(
		salesReturn.returnStatus
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Original Sale
					</span>

					<div class="sales-return-detail-value">

						${escapeHtml(
		salesReturn.saleNumber
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Sale Date
					</span>

					<div class="sales-return-detail-value">

						${formatDate(
		salesReturn.saleDate
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Credit Note
					</span>

					<div class="sales-return-detail-value">

						${escapeHtml(
		salesReturn.creditNoteNumber || "-"
	)}

					</div>

				</div>

			</div>

			<div class="col-md-8">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Customer
					</span>

					<div class="sales-return-detail-value">

						${escapeHtml(
		salesReturn.customerName
	)}

						${salesReturn.customerCode
			? ` (${escapeHtml(salesReturn.customerCode)})`
			: ""
		}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Refund Status
					</span>

					<div class="sales-return-detail-value">

						${salesReturnRefundStatusBadge(
			salesReturn.refundStatus
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
						<th>Sale Rate</th>
						<th>Discount</th>
						<th>GST</th>
						<th>Reason</th>
						<th>Line Total</th>

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
					item.saleRate
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

											${formatSalesReturnReason(
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

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Gross Amount
					</span>

					<div class="sales-return-detail-value">

						${formatCurrency(
			salesReturn.grossAmount
		)}

					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Discount
					</span>

					<div class="sales-return-detail-value">

						${formatCurrency(
			salesReturn.discountAmount
		)}

					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						GST Amount
					</span>

					<div class="sales-return-detail-value">

						${formatCurrency(
			salesReturn.gstAmount
		)}

					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Grand Total
					</span>

					<div class="sales-return-detail-value">

						${formatCurrency(
			salesReturn.grandTotal
		)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Other Adjustment
					</span>

					<div class="sales-return-detail-value">

						${formatCurrency(
			salesReturn.otherAdjustment
		)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Refunded Amount
					</span>

					<div class="sales-return-detail-value text-success">

						${formatCurrency(
			salesReturn.refundedAmount
		)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sales-return-detail-card">

					<span class="sales-return-detail-label">
						Pending Refund
					</span>

					<div class="sales-return-detail-value text-danger">

						${formatCurrency(
			salesReturn.pendingRefundAmount
		)}

					</div>

				</div>

			</div>

		</div>

		${salesReturn.remarks
			? `
				<div class="sales-return-detail-card mt-3">

					<span class="sales-return-detail-label">
						Remarks
					</span>

					<div class="sales-return-detail-value">

						${escapeHtml(
				salesReturn.remarks
			)}

					</div>

				</div>
			`
			: ""
		}
	`;

	if (salesReturnDetailsModal) {

		salesReturnDetailsModal.show();
	}
}


function findSalesReturnSale(
	saleId
) {

	return salesReturnSales.find(
		function(sale) {

			return (
				Number(sale.id) ===
				Number(saleId)
			);
		}
	) || null;
}


function salesReturnStatusBadge(
	status
) {

	const normalized =
		String(status || "")
			.trim()
			.toUpperCase();

	if (normalized === "CANCELLED") {

		return `

			<span class="sales-return-status cancelled">

				<i class="bi bi-x-circle-fill"></i>
				Cancelled

			</span>
		`;
	}

	return `

		<span class="sales-return-status">

			<i class="bi bi-check-circle-fill"></i>
			Posted

		</span>
	`;
}


function salesReturnRefundStatusBadge(
	status
) {

	const normalized =
		String(status || "")
			.trim()
			.toUpperCase();

	switch (normalized) {

		case "REFUNDED":

			return `

				<span class="sales-return-refund-status refunded">

					<i class="bi bi-check-circle-fill"></i>
					Refunded

				</span>
			`;

		case "PARTIALLY_REFUNDED":

			return `

				<span class="sales-return-refund-status partial">

					<i class="bi bi-hourglass-split"></i>
					Partially Refunded

				</span>
			`;

		case "ADJUSTED":

			return `

				<span class="sales-return-refund-status adjusted">

					<i class="bi bi-journal-check"></i>
					Adjusted

				</span>
			`;

		default:

			return `

				<span class="sales-return-refund-status pending">

					<i class="bi bi-exclamation-circle-fill"></i>
					Not Refunded

				</span>
			`;
	}
}


function formatSalesReturnReason(
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


function buildSalesReturnMedicineDetails(
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


function showSalesReturnAvailabilityLoading() {

	const tbody =
		document.getElementById(
			"salesReturnItemsBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="14">

				<div class="sales-return-state">

					<div class="spinner-border text-primary"
						 role="status">
					</div>

					<p class="text-muted mt-3 mb-0">

						Loading returnable sale batches...

					</p>

				</div>

			</td>

		</tr>
	`;
}


function showSalesReturnAvailabilityError(
	message
) {

	const tbody =
		document.getElementById(
			"salesReturnItemsBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="14">

				<div class="sales-return-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<p class="text-muted mt-3 mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


function showSalesReturnLoadingState() {

	const tbody =
		document.getElementById(
			"salesReturnTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="11">

				<div class="sales-return-state">

					<div class="spinner-border text-primary"
						 role="status">
					</div>

					<p class="text-muted mt-3 mb-0">

						Loading sales returns...

					</p>

				</div>

			</td>

		</tr>
	`;
}


function showSalesReturnErrorState(
	message
) {

	const tbody =
		document.getElementById(
			"salesReturnTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="11">

				<div class="sales-return-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<h5 class="fw-bold mt-3">

						Unable to load sales returns

					</h5>

					<p class="text-muted mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


async function salesReturnApiRequest(
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
			await readSalesReturnResponse(
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
			"Sales return API error:",
			error
		);

		return {

			ok:
				false,

			status:
				0,

			data: {

				message:
					"Sales return service is not reachable."
			}
		};
	}
}


async function readSalesReturnResponse(
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


function getSalesReturnErrorMessage(
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