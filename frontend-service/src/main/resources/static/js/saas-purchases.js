let purchaseList = [];
let supplierList = [];
let medicineList = [];
let purchaseItemSequence = 0;
let isSavingPurchase = false;

let purchasePermissions = {
	create: false
};

document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"PURCHASES",
				"VIEW"
			);

		if (!allowed) {
			return;
		}

		const tenantId =
			localStorage.getItem("tenantId");

		if (!tenantId) {

			alert(
				"Please select SaaS workspace first."
			);

			window.location.href =
				"/saas/workspaces";

			return;
		}

		setText(
			"tenantNameText",
			localStorage.getItem("tenantName") ||
			"your workspace"
		);

		purchasePermissions.create =
			await hasSaasPermission(
				"PURCHASES",
				"CREATE"
			);

		showOrHide(
			"addPurchaseBtn",
			purchasePermissions.create
		);

		setDefaultDates();

		await Promise.all([
			loadSuppliers(),
			loadMedicines(),
			loadPurchaseSummary(),
			loadPurchases()
		]);

		addPurchaseItemRow();

		const searchInput =
			document.getElementById(
				"purchaseSearchKeyword"
			);

		if (searchInput) {

			searchInput.addEventListener(
				"keydown",
				function(event) {

					if (event.key === "Enter") {
						searchPurchases();
					}
				}
			);
		}
	}
);

function setDefaultDates() {

	const today =
		new Date()
			.toISOString()
			.substring(0, 10);

	setValue(
		"purchaseDate",
		today
	);

	setValue(
		"supplierInvoiceDate",
		today
	);
}

async function loadSuppliers() {

	const tenantId =
		localStorage.getItem("tenantId");

	const response =
		await apiRequest(
			`${API_BASE}/saas/suppliers` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&activeOnly=true`
		);

	if (!response.ok) {
		return;
	}

	supplierList =
		Array.isArray(response.data)
			? response.data
			: [];

	const select =
		document.getElementById("supplierId");

	if (!select) {
		return;
	}

	select.innerHTML = `
		<option value="">
			Select Supplier
		</option>
	`;

	supplierList.forEach(
		function(supplier) {

			select.innerHTML += `
				<option value="${supplier.id}">
					${escapeHtml(supplier.supplierName)}
					(${escapeHtml(supplier.supplierCode)})
				</option>
			`;
		}
	);
}

async function loadMedicines() {

	const tenantId =
		localStorage.getItem("tenantId");

	if (!tenantId) {

		medicineList = [];

		refreshMedicineSelectOptions();

		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	const response =
		await apiRequest(
			`${API_BASE}/saas/inventory/medicines` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!response.ok) {

		medicineList = [];

		refreshMedicineSelectOptions();

		console.error(
			"Unable to load medicines:",
			{
				status: response.status,
				response: response.data
			}
		);

		showMsg(
			getErrorMessage(
				response.data,
				"Unable to load medicines."
			)
		);

		return;
	}

	const result =
		response.data;

	if (Array.isArray(result)) {

		medicineList =
			result;

	} else if (
		result &&
		Array.isArray(result.medicines)
	) {

		medicineList =
			result.medicines;

	} else if (
		result &&
		Array.isArray(result.content)
	) {

		medicineList =
			result.content;

	} else if (
		result &&
		Array.isArray(result.data)
	) {

		medicineList =
			result.data;

	} else if (
		result &&
		Array.isArray(result.items)
	) {

		medicineList =
			result.items;

	} else {

		medicineList = [];
	}

	console.log(
		"Loaded purchase medicines:",
		medicineList
	);

	refreshMedicineSelectOptions();

	if (!medicineList.length) {

		showMsg(
			"No medicines found. Please add medicines in Medicine Master first."
		);
	}
}

async function loadPurchaseSummary() {

	const tenantId =
		localStorage.getItem("tenantId");

	if (!tenantId) {

		setText(
			"totalPurchases",
			"0"
		);

		setText(
			"totalPurchaseAmount",
			formatCurrency(0)
		);

		setText(
			"totalPaidAmount",
			formatCurrency(0)
		);

		setText(
			"totalDueAmount",
			formatCurrency(0)
		);

		return;
	}

	const response =
		await apiRequest(
			`${API_BASE}/saas/purchases/summary` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!response.ok) {

		console.error(
			"Unable to load purchase summary:",
			{
				status: response.status,
				response: response.data
			}
		);

		setText(
			"totalPurchases",
			"0"
		);

		setText(
			"totalPurchaseAmount",
			formatCurrency(0)
		);

		setText(
			"totalPaidAmount",
			formatCurrency(0)
		);

		setText(
			"totalDueAmount",
			formatCurrency(0)
		);

		return;
	}

	const summary =
		response.data || {};

	setText(
		"totalPurchases",
		summary.totalPurchases || 0
	);

	setText(
		"totalPurchaseAmount",
		formatCurrency(
			summary.totalPurchaseAmount || 0
		)
	);

	setText(
		"totalPaidAmount",
		formatCurrency(
			summary.totalPaidAmount || 0
		)
	);

	setText(
		"totalDueAmount",
		formatCurrency(
			summary.totalDueAmount || 0
		)
	);
}
async function loadPurchases() {

	showPurchaseLoading();

	const tenantId =
		localStorage.getItem("tenantId");

	const response =
		await apiRequest(
			`${API_BASE}/saas/purchases` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!response.ok) {

		showPurchaseError(
			getErrorMessage(
				response.data,
				"Unable to load purchases."
			)
		);

		return;
	}

	purchaseList =
		Array.isArray(response.data)
			? response.data
			: [];

	renderPurchases(
		purchaseList
	);
}

async function searchPurchases() {

	const keyword =
		getValue(
			"purchaseSearchKeyword"
		);

	if (!keyword) {

		await loadPurchases();

		return;
	}

	const tenantId =
		localStorage.getItem("tenantId");

	const response =
		await apiRequest(
			`${API_BASE}/saas/purchases/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`
		);

	if (!response.ok) {

		showMsg(
			getErrorMessage(
				response.data,
				"Unable to search purchases."
			)
		);

		return;
	}

	renderPurchases(
		Array.isArray(response.data)
			? response.data
			: []
	);
}

function openPurchaseForm() {

	if (!purchasePermissions.create) {

		showMsg(
			"You do not have permission to create purchases."
		);

		return;
	}

	document.getElementById(
		"purchaseFormPanel"
	).style.display = "block";

	document.getElementById(
		"purchaseFormPanel"
	).scrollIntoView({
		behavior: "smooth",
		block: "start"
	});
}

function closePurchaseForm() {

	document.getElementById(
		"purchaseFormPanel"
	).style.display = "none";
}

function addPurchaseItemRow() {

	purchaseItemSequence++;

	const rowId =
		purchaseItemSequence;

	const tbody =
		document.getElementById(
			"purchaseItemsBody"
		);

	const row =
		document.createElement("tr");

	row.id =
		`purchaseItemRow_${rowId}`;

	row.innerHTML = `
		<td>
			<select class="form-select medicine-select item-medicine"
					onchange="calculatePurchaseTotals()">
				${buildMedicineOptions()}
			</select>
		</td>

		<td>
			<input type="text"
				   class="form-control item-batch"
				   placeholder="Batch">
		</td>

		<td>
			<input type="date"
				   class="form-control item-manufacturing-date">
		</td>

		<td>
			<input type="date"
				   class="form-control item-expiry-date">
		</td>

		<td>
			<input type="number"
				   class="form-control item-quantity"
				   value="1"
				   min="1"
				   oninput="calculatePurchaseTotals()">
		</td>

		<td>
			<input type="number"
				   class="form-control item-free-quantity"
				   value="0"
				   min="0"
				   oninput="calculatePurchaseTotals()">
		</td>

		<td>
			<input type="number"
				   class="form-control item-purchase-rate"
				   value="0"
				   min="0"
				   step="0.01"
				   oninput="calculatePurchaseTotals()">
		</td>

		<td>
			<input type="number"
				   class="form-control item-sale-rate"
				   value="0"
				   min="0"
				   step="0.01">
		</td>

		<td>
			<input type="number"
				   class="form-control item-mrp"
				   value="0"
				   min="0"
				   step="0.01">
		</td>

		<td>
			<input type="number"
				   class="form-control item-discount"
				   value="0"
				   min="0"
				   max="100"
				   step="0.01"
				   oninput="calculatePurchaseTotals()">
		</td>

		<td>
			<input type="number"
				   class="form-control item-gst"
				   value="0"
				   min="0"
				   max="100"
				   step="0.01"
				   oninput="calculatePurchaseTotals()">
		</td>

		<td>
			<strong class="item-line-total">
				₹0
			</strong>
		</td>

		<td>
			<button type="button"
					class="btn btn-sm btn-outline-danger"
					onclick="removePurchaseItemRow(${rowId})">
				<i class="bi bi-trash"></i>
			</button>
		</td>
	`;

	tbody.appendChild(row);

	calculatePurchaseTotals();
}

function removePurchaseItemRow(
	rowId
) {

	const rows =
		document.querySelectorAll(
			"#purchaseItemsBody tr"
		);

	if (rows.length <= 1) {

		showMsg(
			"At least one purchase item is required."
		);

		return;
	}

	document.getElementById(
		`purchaseItemRow_${rowId}`
	)?.remove();

	calculatePurchaseTotals();
}

function buildMedicineOptions() {

	let html = `
		<option value="">
			Select Medicine
		</option>
	`;

	medicineList.forEach(
		function(medicine) {

			const medicineId =
				medicine.id ||
				medicine.medicineId ||
				medicine.masterMedicineId ||
				"";

			const medicineName =
				medicine.medicineName ||
				medicine.name ||
				medicine.brandName ||
				medicine.productName ||
				"Unnamed Medicine";

			const strength =
				medicine.strength ||
				"";

			const unit =
				medicine.unit ||
				medicine.packUnit ||
				medicine.packaging ||
				"";

			const manufacturer =
				medicine.manufacturer ||
				medicine.manufacturerName ||
				medicine.companyName ||
				"";

			const detail = [
				strength,
				unit,
				manufacturer
			]
				.filter(Boolean)
				.join(" - ");

			if (!medicineId) {

				console.warn(
					"Medicine ID missing:",
					medicine
				);

				return;
			}

			html += `
				<option value="${escapeHtml(medicineId)}">
					${escapeHtml(medicineName)}
					${detail
						? `(${escapeHtml(detail)})`
						: ""
					}
				</option>
			`;
		}
	);

	return html;
}

function refreshMedicineSelectOptions() {

	const medicineSelects =
		document.querySelectorAll(
			".item-medicine"
		);

	medicineSelects.forEach(
		function(select) {

			const selectedValue =
				select.value;

			select.innerHTML =
				buildMedicineOptions();

			if (
				selectedValue &&
				Array.from(select.options)
					.some(
						function(option) {
							return (
								String(option.value) ===
								String(selectedValue)
							);
						}
					)
			) {
				select.value =
					selectedValue;
			}
		}
	);
}
function calculatePurchaseTotals() {

	let grossAmount = 0;
	let discountAmount = 0;
	let taxableAmount = 0;
	let gstAmount = 0;

	document
		.querySelectorAll(
			"#purchaseItemsBody tr"
		)
		.forEach(
			function(row) {

				const quantity =
					numberFromRow(
						row,
						".item-quantity"
					);

				const purchaseRate =
					numberFromRow(
						row,
						".item-purchase-rate"
					);

				const discountPercentage =
					numberFromRow(
						row,
						".item-discount"
					);

				const gstPercentage =
					numberFromRow(
						row,
						".item-gst"
					);

				const rowGross =
					quantity *
					purchaseRate;

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

				const lineTotal =
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
						".item-line-total"
					);

				if (lineElement) {

					lineElement.textContent =
						formatCurrency(
							lineTotal
						);
				}
			}
		);

	const otherCharges =
		numberValue(
			"otherCharges"
		);

	const roundOff =
		numberValue(
			"roundOffAmount"
		);

	const paidAmount =
		numberValue(
			"paidAmount"
		);

	const grandTotal =
		taxableAmount +
		gstAmount +
		otherCharges +
		roundOff;

	const dueAmount =
		Math.max(
			grandTotal -
			paidAmount,
			0
		);

	setText(
		"purchaseGrossAmount",
		formatCurrency(grossAmount)
	);

	setText(
		"purchaseDiscountAmount",
		formatCurrency(discountAmount)
	);

	setText(
		"purchaseTaxableAmount",
		formatCurrency(taxableAmount)
	);

	setText(
		"purchaseGstAmount",
		formatCurrency(gstAmount)
	);

	setText(
		"purchaseGrandTotal",
		formatCurrency(grandTotal)
	);

	setText(
		"purchaseDueAmount",
		formatCurrency(dueAmount)
	);
}

async function savePurchase() {

	if (isSavingPurchase) {
		return;
	}

	const payload =
		buildPurchasePayload();

	const validationMessage =
		validatePurchasePayload(
			payload
		);

	if (validationMessage) {

		showMsg(validationMessage);

		return;
	}

	isSavingPurchase = true;

	setButtonLoading(
		"savePurchaseBtn",
		"Saving Purchase...",
		true
	);

	const response =
		await apiRequest(
			`${API_BASE}/saas/purchases`,
			{
				method: "POST",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify(payload)
			}
		);

	isSavingPurchase = false;

	setButtonLoading(
		"savePurchaseBtn",
		"Save Purchase",
		false
	);

	if (!response.ok) {

		showMsg(
			getErrorMessage(
				response.data,
				"Unable to save purchase."
			)
		);

		return;
	}

	showMsg(
		"Purchase saved and inventory updated successfully.",
		"success"
	);

	clearPurchaseForm();
	closePurchaseForm();

	await Promise.all([
		loadPurchases(),
		loadPurchaseSummary()
	]);
}

function buildPurchasePayload() {

	const items = [];

	document
		.querySelectorAll(
			"#purchaseItemsBody tr"
		)
		.forEach(
			function(row) {

				items.push({
					medicineId:
						numberFromRow(
							row,
							".item-medicine"
						),

					batchNumber:
						valueFromRow(
							row,
							".item-batch"
						),

					manufacturingDate:
						valueFromRow(
							row,
							".item-manufacturing-date"
						) || null,

					expiryDate:
						valueFromRow(
							row,
							".item-expiry-date"
						) || null,

					quantity:
						numberFromRow(
							row,
							".item-quantity"
						),

					freeQuantity:
						numberFromRow(
							row,
							".item-free-quantity"
						),

					purchaseRate:
						numberFromRow(
							row,
							".item-purchase-rate"
						),

					saleRate:
						numberFromRow(
							row,
							".item-sale-rate"
						),

					mrp:
						numberFromRow(
							row,
							".item-mrp"
						),

					discountPercentage:
						numberFromRow(
							row,
							".item-discount"
						),

					gstPercentage:
						numberFromRow(
							row,
							".item-gst"
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

		purchaseDate:
			getValue(
				"purchaseDate"
			) || null,

		supplierId:
			numberValue(
				"supplierId"
			),

		supplierInvoiceNumber:
			getValue(
				"supplierInvoiceNumber"
			),

		supplierInvoiceDate:
			getValue(
				"supplierInvoiceDate"
			) || null,

		otherCharges:
			numberValue(
				"otherCharges"
			),

		roundOffAmount:
			numberValue(
				"roundOffAmount"
			),

		paidAmount:
			numberValue(
				"paidAmount"
			),

		remarks:
			getValue(
				"purchaseRemarks"
			),

		items: items
	};
}

function validatePurchasePayload(
	payload
) {

	if (!payload.supplierId) {
		return "Please select supplier.";
	}

	if (!payload.supplierInvoiceNumber) {
		return "Supplier invoice number is required.";
	}

	if (!payload.items.length) {
		return "At least one purchase item is required.";
	}

	for (let index = 0;
		index < payload.items.length;
		index++) {

		const item =
			payload.items[index];

		const rowNumber =
			index + 1;

		if (!item.medicineId) {
			return `Please select medicine in row ${rowNumber}.`;
		}

		if (!item.batchNumber) {
			return `Batch number is required in row ${rowNumber}.`;
		}

		if (!item.expiryDate) {
			return `Expiry date is required in row ${rowNumber}.`;
		}

		if (item.quantity <= 0) {
			return `Quantity must be greater than 0 in row ${rowNumber}.`;
		}

		if (item.purchaseRate < 0
			|| item.saleRate < 0
			|| item.mrp < 0) {

			return `Prices cannot be negative in row ${rowNumber}.`;
		}

		if (item.discountPercentage < 0
			|| item.discountPercentage > 100) {

			return `Invalid discount in row ${rowNumber}.`;
		}

		if (item.gstPercentage < 0
			|| item.gstPercentage > 100) {

			return `Invalid GST in row ${rowNumber}.`;
		}
	}

	return "";
}

function renderPurchases(
	purchases
) {

	const tbody =
		document.getElementById(
			"purchaseTableBody"
		);

	if (!purchases.length) {

		tbody.innerHTML = `
			<tr>
				<td colspan="10">
					<div class="purchase-state">
						<h5 class="fw-bold text-primary">
							No purchases found
						</h5>
						<p class="text-muted mb-0">
							Create your first supplier purchase invoice.
						</p>
					</div>
				</td>
			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		purchases.map(
			function(purchase, index) {

				return `
					<tr>

						<td>${index + 1}</td>

						<td>
							<strong class="text-primary">
								${escapeHtml(purchase.purchaseNumber)}
							</strong>
							<div class="small text-muted">
								${formatDate(purchase.purchaseDate)}
							</div>
						</td>

						<td>
							<strong>
								${escapeHtml(purchase.supplierName)}
							</strong>
							<div class="small text-muted">
								${escapeHtml(purchase.supplierCode || "")}
							</div>
						</td>

						<td>
							${escapeHtml(purchase.supplierInvoiceNumber)}
						</td>

						<td>
							${purchase.items?.length || 0}
							items
						</td>

						<td>
							<strong>
								${formatCurrency(purchase.grandTotal)}
							</strong>
						</td>

						<td>
							${formatCurrency(purchase.paidAmount)}
						</td>

						<td>
							${formatCurrency(purchase.dueAmount)}
						</td>

						<td>
							${paymentStatusBadge(
					purchase.paymentStatus
				)}
						</td>

						<td>
							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="showPurchaseDetails(${purchase.id})">
								View
							</button>
						</td>

					</tr>
				`;
			}
		)
			.join("");
}

function showPurchaseDetails(
	purchaseId
) {

	const purchase =
		purchaseList.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(purchaseId)
				);
			}
		);

	if (!purchase) {
		return;
	}

	const items =
		purchase.items || [];

	document.getElementById(
		"purchaseDetailsContent"
	).innerHTML = `

		<div class="row g-3 mb-4">

			<div class="col-md-4">
				<strong>Purchase Number</strong>
				<div>${escapeHtml(purchase.purchaseNumber)}</div>
			</div>

			<div class="col-md-4">
				<strong>Supplier</strong>
				<div>${escapeHtml(purchase.supplierName)}</div>
			</div>

			<div class="col-md-4">
				<strong>Invoice</strong>
				<div>${escapeHtml(purchase.supplierInvoiceNumber)}</div>
			</div>

		</div>

		<div class="table-responsive">

			<table class="table table-bordered align-middle">

				<thead>
					<tr>
						<th>Medicine</th>
						<th>Batch</th>
						<th>Expiry</th>
						<th>Qty</th>
						<th>Free</th>
						<th>Rate</th>
						<th>GST</th>
						<th>Total</th>
					</tr>
				</thead>

				<tbody>

					${items.map(
		function(item) {

			return `
								<tr>
									<td>${escapeHtml(item.medicineName)}</td>
									<td>${escapeHtml(item.batchNumber)}</td>
									<td>${formatDate(item.expiryDate)}</td>
									<td>${item.quantity}</td>
									<td>${item.freeQuantity}</td>
									<td>${formatCurrency(item.purchaseRate)}</td>
									<td>${Number(item.gstPercentage || 0)}%</td>
									<td>${formatCurrency(item.lineTotal)}</td>
								</tr>
							`;
		}
	).join("")}

				</tbody>

			</table>

		</div>

		<div class="text-end mt-3">
			<h5 class="fw-bold text-primary">
				Grand Total:
				${formatCurrency(purchase.grandTotal)}
			</h5>
		</div>
	`;

	new bootstrap.Modal(
		document.getElementById(
			"purchaseDetailsModal"
		)
	).show();
}

function clearPurchaseForm() {

	setDefaultDates();

	[
		"supplierId",
		"supplierInvoiceNumber",
		"purchaseRemarks"
	].forEach(
		function(id) {

			setValue(id, "");
		}
	);

	setValue(
		"otherCharges",
		"0"
	);

	setValue(
		"roundOffAmount",
		"0"
	);

	setValue(
		"paidAmount",
		"0"
	);

	document.getElementById(
		"purchaseItemsBody"
	).innerHTML = "";

	addPurchaseItemRow();

	calculatePurchaseTotals();
}

async function refreshPurchases() {

	setValue(
		"purchaseSearchKeyword",
		""
	);

	await Promise.all([
		loadPurchases(),
		loadPurchaseSummary()
	]);
}

function paymentStatusBadge(
	status
) {

	const normalized =
		String(status || "")
			.toUpperCase();

	if (normalized === "PAID") {
		return `
			<span class="purchase-status paid">
				Paid
			</span>
		`;
	}

	if (normalized === "PARTIALLY_PAID") {
		return `
			<span class="purchase-status partial">
				Partially Paid
			</span>
		`;
	}

	return `
		<span class="purchase-status unpaid">
			Unpaid
		</span>
	`;
}

async function apiRequest(
	url,
	options = {}
) {

	const token =
		localStorage.getItem("token");

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
					headers: headers
				}
			);

		const data =
			await readResponse(response);

		return {
			ok: response.ok,
			status: response.status,
			data: data
		};

	} catch (error) {

		console.error(
			"API request error:",
			error
		);

		return {
			ok: false,
			status: 0,
			data: {
				message:
					"Server is not reachable."
			}
		};
	}
}

async function readResponse(
	response
) {

	const text =
		await response.text();

	if (!text.trim()) {
		return {};
	}

	try {
		return JSON.parse(text);
	} catch (error) {
		return {
			message: text
		};
	}
}

function showPurchaseLoading() {

	document.getElementById(
		"purchaseTableBody"
	).innerHTML = `
		<tr>
			<td colspan="10">
				<div class="purchase-state">
					<div class="spinner-border text-primary"></div>
					<p class="text-muted mt-3 mb-0">
						Loading purchases...
					</p>
				</div>
			</td>
		</tr>
	`;
}

function showPurchaseError(
	message
) {

	document.getElementById(
		"purchaseTableBody"
	).innerHTML = `
		<tr>
			<td colspan="10">
				<div class="purchase-state text-danger">
					<i class="bi bi-exclamation-triangle-fill fs-1"></i>
					<p class="mt-3 mb-0">
						${escapeHtml(message)}
					</p>
				</div>
			</td>
		</tr>
	`;
}

function numberFromRow(
	row,
	selector
) {

	const value =
		Number(
			row.querySelector(selector)
				?.value || 0
		);

	return Number.isFinite(value)
		? value
		: 0;
}

function valueFromRow(
	row,
	selector
) {

	return String(
		row.querySelector(selector)
			?.value || ""
	).trim();
}

function numberValue(
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

	return String(
		document.getElementById(id)
			?.value || ""
	).trim();
}

function setValue(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {
		element.value =
			value ?? "";
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
			value ?? "";
	}
}

function showOrHide(
	id,
	visible
) {

	const element =
		document.getElementById(id);

	if (element) {
		element.style.display =
			visible ? "" : "none";
	}
}

function setButtonLoading(
	id,
	text,
	loading
) {

	const button =
		document.getElementById(id);

	if (!button) {
		return;
	}

	if (loading) {

		button.dataset.originalHtml =
			button.innerHTML;

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"></span>
			${escapeHtml(text)}
		`;

		button.disabled = true;

	} else {

		button.innerHTML =
			button.dataset.originalHtml ||
			text;

		button.disabled = false;
	}
}

function showMsg(
	message,
	type = "danger"
) {

	const element =
		document.getElementById("msg");

	element.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show">
			${escapeHtml(message)}
			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert"></button>
		</div>
	`;

	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}

function getErrorMessage(
	data,
	fallback
) {

	if (!data) {
		return fallback;
	}

	return data.message ||
		data.error ||
		fallback;
}

function formatCurrency(
	value
) {

	return new Intl.NumberFormat(
		"en-IN",
		{
			style: "currency",
			currency: "INR",
			maximumFractionDigits: 2
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

	return new Date(
		value + "T00:00:00"
	).toLocaleDateString(
		"en-IN"
	);
}

function escapeHtml(
	value
) {

	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}