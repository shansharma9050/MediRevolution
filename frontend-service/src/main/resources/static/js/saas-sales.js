const API_BASE =
	"http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let saleList = [];
let saleCustomers = [];
let saleMedicines = [];
let saleStocks = [];

let saleItemSequence = 0;

let isLoadingSales = false;
let isSavingSale = false;

let saleDetailsModal = null;

let salePermissions = {
	create: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"SALES",
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

		initializeSalesPage();

		initializeSaleDetailsModal();

		await loadSalePermissions();

		setDefaultSaleDate();

		await Promise.all([
			loadSaleCustomers(),
			loadSaleMedicines(),
			loadSaleStocks(),
			loadSaleSummary(),
			loadSales()
		]);

		addSaleItemRow();

		const customerSelect =
			document.getElementById(
				"saleCustomerId"
			);

		if (customerSelect) {

			customerSelect.addEventListener(
				"change",
				updateSelectedCustomerCredit
			);
		}

		const searchInput =
			document.getElementById(
				"saleSearchKeyword"
			);

		if (searchInput) {

			searchInput.addEventListener(
				"keydown",
				function(event) {

					if (event.key === "Enter") {

						event.preventDefault();

						searchSales();
					}
				}
			);
		}
	}
);


function initializeSalesPage() {

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


function initializeSaleDetailsModal() {

	const modalElement =
		document.getElementById(
			"saleDetailsModal"
		);

	if (modalElement) {

		saleDetailsModal =
			new bootstrap.Modal(
				modalElement
			);
	}
}


async function loadSalePermissions() {

	const canCreate =
		await hasSaasPermission(
			"SALES",
			"CREATE"
		);

	salePermissions.create =
		Boolean(canCreate);

	showOrHideById(
		"addSaleBtn",
		salePermissions.create
	);
}


function setDefaultSaleDate() {

	const today =
		new Date()
			.toISOString()
			.substring(0, 10);

	setValue(
		"saleDate",
		today
	);
}


async function loadSaleCustomers() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await saleApiRequest(
			`${API_BASE}/saas/customers` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&activeOnly=true`
		);

	if (!result.ok) {

		saleCustomers = [];

		showMsg(
			getSaleErrorMessage(
				result.data,
				"Unable to load customers."
			)
		);

		populateSaleCustomerDropdown();

		return;
	}

	saleCustomers =
		Array.isArray(result.data)
			? result.data
			: [];

	populateSaleCustomerDropdown();
}


function populateSaleCustomerDropdown() {

	const select =
		document.getElementById(
			"saleCustomerId"
		);

	if (!select) {
		return;
	}

	select.innerHTML = `
		<option value="">
			Select Customer
		</option>
	`;

	saleCustomers.forEach(
		function(customer) {

			const option =
				document.createElement(
					"option"
				);

			option.value =
				customer.id;

			option.textContent =
				`${customer.customerName || "Customer"} (${customer.customerCode || "-"})`;

			select.appendChild(option);
		}
	);
}


function updateSelectedCustomerCredit() {

	const customerId =
		getNumberValue(
			"saleCustomerId"
		);

	const customer =
		saleCustomers.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(customerId)
				);
			}
		);

	const element =
		document.getElementById(
			"selectedCustomerCredit"
		);

	if (!element) {
		return;
	}

	if (!customer) {

		element.textContent =
			"Select customer to view credit details";

		return;
	}

	element.innerHTML = `
		<div>
			<strong class="text-primary">
				${formatCurrency(customer.creditLimit)}
			</strong>

			<span class="text-muted ms-2">
				Terms:
				${Number(customer.paymentTermsDays || 0)}
				days
			</span>

			<span class="text-muted ms-2">
				Default Discount:
				${Number(customer.discountPercentage || 0).toFixed(2)}%
			</span>
		</div>
	`;
}


async function loadSaleMedicines() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await saleApiRequest(
			`${API_BASE}/saas/inventory/medicines` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		saleMedicines = [];

		showMsg(
			getSaleErrorMessage(
				result.data,
				"Unable to load medicines."
			)
		);

		refreshSaleMedicineDropdowns();

		return;
	}

	saleMedicines =
		Array.isArray(result.data)
			? result.data
			: [];

	refreshSaleMedicineDropdowns();
}


async function loadSaleStocks() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await saleApiRequest(
			`${API_BASE}/saas/inventory/stocks` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		saleStocks = [];

		return;
	}

	saleStocks =
		Array.isArray(result.data)
			? result.data
			: [];
}


async function loadSaleSummary() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await saleApiRequest(
			`${API_BASE}/saas/sales/summary` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		resetSaleSummary();

		return;
	}

	const summary =
		result.data || {};

	setAnimatedNumber(
		"totalSales",
		summary.totalSales
	);

	setText(
		"totalSaleAmount",
		formatCurrency(
			summary.totalSaleAmount
		)
	);

	setText(
		"totalSalePaidAmount",
		formatCurrency(
			summary.totalPaidAmount
		)
	);

	setText(
		"totalSaleDueAmount",
		formatCurrency(
			summary.totalDueAmount
		)
	);

	setAnimatedNumber(
		"totalQuantitySold",
		summary.totalQuantitySold
	);
}


function resetSaleSummary() {

	setText(
		"totalSales",
		"0"
	);

	setText(
		"totalSaleAmount",
		formatCurrency(0)
	);

	setText(
		"totalSalePaidAmount",
		formatCurrency(0)
	);

	setText(
		"totalSaleDueAmount",
		formatCurrency(0)
	);

	setText(
		"totalQuantitySold",
		"0"
	);
}


async function loadSales() {

	if (isLoadingSales) {
		return;
	}

	isLoadingSales =
		true;

	showSaleLoadingState();

	setButtonLoading(
		"refreshSaleBtn",
		"Refreshing...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await saleApiRequest(
			`${API_BASE}/saas/sales` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	isLoadingSales =
		false;

	setButtonLoading(
		"refreshSaleBtn",
		"Refresh",
		false
	);

	if (!result.ok) {

		saleList = [];

		const message =
			getSaleErrorMessage(
				result.data,
				"Unable to load sales."
			);

		showSaleErrorState(
			message
		);

		showMsg(message);

		return;
	}

	saleList =
		Array.isArray(result.data)
			? result.data
			: [];

	renderSales(
		saleList
	);
}


async function searchSales() {

	const keyword =
		getValue(
			"saleSearchKeyword"
		);

	if (!keyword) {

		await loadSales();

		return;
	}

	showSaleLoadingState();

	setButtonLoading(
		"searchSaleBtn",
		"Searching...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await saleApiRequest(
			`${API_BASE}/saas/sales/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`
		);

	setButtonLoading(
		"searchSaleBtn",
		"Search",
		false
	);

	if (!result.ok) {

		showSaleErrorState(
			getSaleErrorMessage(
				result.data,
				"Unable to search sales."
			)
		);

		return;
	}

	renderSales(
		Array.isArray(result.data)
			? result.data
			: []
	);
}


function openSaleForm() {

	if (!salePermissions.create) {

		showMsg(
			"You do not have permission to create sales."
		);

		return;
	}

	if (!saleCustomers.length) {

		showMsg(
			"Create an active customer before creating a sale."
		);

		return;
	}

	if (!saleMedicines.length) {

		showMsg(
			"No tenant medicines are available."
		);

		return;
	}

	const panel =
		document.getElementById(
			"saleFormPanel"
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


function closeSaleForm() {

	const panel =
		document.getElementById(
			"saleFormPanel"
		);

	if (panel) {

		panel.style.display =
			"none";
	}
}


function addSaleItemRow() {

	saleItemSequence++;

	const rowId =
		saleItemSequence;

	const tbody =
		document.getElementById(
			"saleItemsBody"
		);

	if (!tbody) {
		return;
	}

	const row =
		document.createElement(
			"tr"
		);

	row.id =
		`saleItemRow_${rowId}`;

	row.innerHTML = `

		<td>

			<select class="form-select sale-medicine-select item-sale-medicine"
					onchange="handleSaleMedicineChange(this)">

				${buildSaleMedicineOptions()}

			</select>

		</td>

		<td>

			<span class="sale-stock-chip item-sale-available">

				<i class="bi bi-boxes"></i>
				0

			</span>

		</td>

		<td>

			<input type="number"
				   class="form-control item-sale-quantity"
				   value="1"
				   min="1"
				   oninput="calculateSaleTotals()">

		</td>

		<td>

			<input type="number"
				   class="form-control item-sale-rate"
				   value="0"
				   min="0"
				   step="0.01"
				   oninput="calculateSaleTotals()">

		</td>

		<td>

			<input type="number"
				   class="form-control item-sale-discount"
				   value="0"
				   min="0"
				   max="100"
				   step="0.01"
				   oninput="calculateSaleTotals()">

		</td>

		<td>

			<input type="number"
				   class="form-control item-sale-gst"
				   value="0"
				   min="0"
				   max="100"
				   step="0.01"
				   oninput="calculateSaleTotals()">

		</td>

		<td>

			<strong class="item-sale-line-total text-primary">
				₹0
			</strong>

		</td>

		<td>

			<button type="button"
					class="btn btn-sm btn-outline-danger"
					onclick="removeSaleItemRow(${rowId})">

				<i class="bi bi-trash"></i>

			</button>

		</td>
	`;

	tbody.appendChild(row);

	calculateSaleTotals();
}


function removeSaleItemRow(
	rowId
) {

	const rows =
		document.querySelectorAll(
			"#saleItemsBody tr"
		);

	if (rows.length <= 1) {

		showMsg(
			"At least one sale item is required."
		);

		return;
	}

	document.getElementById(
		`saleItemRow_${rowId}`
	)?.remove();

	calculateSaleTotals();
}


function buildSaleMedicineOptions() {

	let html = `
		<option value="">
			Select Medicine
		</option>
	`;

	saleMedicines.forEach(
		function(medicine) {

			const available =
				getAvailableQuantityForMedicine(
					medicine.id
				);

			const details = [
				medicine.strength,
				medicine.unit,
				medicine.manufacturer
			]
				.filter(Boolean)
				.join(" - ");

			html += `
				<option value="${Number(medicine.id)}">

					${escapeHtml(
				medicine.medicineName
			)}

					${details
					? `(${escapeHtml(details)})`
					: ""
				}

					— Stock ${available}

				</option>
			`;
		}
	);

	return html;
}


function refreshSaleMedicineDropdowns() {

	document
		.querySelectorAll(
			".item-sale-medicine"
		)
		.forEach(
			function(select) {

				const selectedValue =
					select.value;

				select.innerHTML =
					buildSaleMedicineOptions();

				select.value =
					selectedValue;
			}
		);
}


function handleSaleMedicineChange(
	select
) {

	const row =
		select.closest("tr");

	if (!row) {
		return;
	}

	const medicineId =
		Number(select.value || 0);

	const available =
		getAvailableQuantityForMedicine(
			medicineId
		);

	const stockElement =
		row.querySelector(
			".item-sale-available"
		);

	if (stockElement) {

		stockElement.innerHTML = `

			<i class="bi bi-boxes"></i>
			${available}
		`;

		stockElement.classList.toggle(
			"danger",
			available <= 0
		);
	}

	const suggestedStock =
		getSuggestedSaleStock(
			medicineId
		);

	if (suggestedStock) {

		const saleRateInput =
			row.querySelector(
				".item-sale-rate"
			);

		const gstInput =
			row.querySelector(
				".item-sale-gst"
			);

		if (
			saleRateInput &&
			Number(saleRateInput.value || 0) === 0
		) {

			saleRateInput.value =
				Number(
					suggestedStock.salePrice ||
					suggestedStock.mrp ||
					0
				);
		}

		if (
			gstInput &&
			Number(gstInput.value || 0) === 0
		) {

			gstInput.value =
				Number(
					suggestedStock.gstPercentage ||
					0
				);
		}
	}

	const selectedCustomer =
		getSelectedSaleCustomer();

	const discountInput =
		row.querySelector(
			".item-sale-discount"
		);

	if (
		selectedCustomer &&
		discountInput &&
		Number(discountInput.value || 0) === 0
	) {

		discountInput.value =
			Number(
				selectedCustomer.discountPercentage ||
				0
			);
	}

	calculateSaleTotals();
}


function getAvailableQuantityForMedicine(
	medicineId
) {

	const today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	return saleStocks
		.filter(
			function(stock) {

				if (
					Number(stock.medicineId) !==
					Number(medicineId)
				) {
					return false;
				}

				if (
					stock.active === false
				) {
					return false;
				}

				if (
					Number(stock.currentQuantity || 0) <= 0
				) {
					return false;
				}

				if (!stock.expiryDate) {
					return true;
				}

				const expiryDate =
					new Date(
						stock.expiryDate +
						"T00:00:00"
					);

				return expiryDate >= today;
			}
		)
		.reduce(
			function(total, stock) {

				return (
					total +
					Number(
						stock.currentQuantity || 0
					)
				);
			},
			0
		);
}


function getSuggestedSaleStock(
	medicineId
) {

	const today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	return saleStocks
		.filter(
			function(stock) {

				if (
					Number(stock.medicineId) !==
					Number(medicineId)
				) {
					return false;
				}

				if (
					Number(stock.currentQuantity || 0) <= 0
				) {
					return false;
				}

				if (!stock.expiryDate) {
					return true;
				}

				const expiry =
					new Date(
						stock.expiryDate +
						"T00:00:00"
					);

				return expiry >= today;
			}
		)
		.sort(
			function(first, second) {

				if (
					!first.expiryDate &&
					!second.expiryDate
				) {
					return 0;
				}

				if (!first.expiryDate) {
					return 1;
				}

				if (!second.expiryDate) {
					return -1;
				}

				return new Date(first.expiryDate) -
					new Date(second.expiryDate);
			}
		)[0] || null;
}


function calculateSaleTotals() {

	let grossAmount = 0;
	let discountAmount = 0;
	let taxableAmount = 0;
	let gstAmount = 0;

	document
		.querySelectorAll(
			"#saleItemsBody tr"
		)
		.forEach(
			function(row) {

				const quantity =
					numberFromRow(
						row,
						".item-sale-quantity"
					);

				const saleRate =
					numberFromRow(
						row,
						".item-sale-rate"
					);

				const discountPercentage =
					numberFromRow(
						row,
						".item-sale-discount"
					);

				const gstPercentage =
					numberFromRow(
						row,
						".item-sale-gst"
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

				const lineTotalElement =
					row.querySelector(
						".item-sale-line-total"
					);

				if (lineTotalElement) {

					lineTotalElement.textContent =
						formatCurrency(
							lineTotal
						);
				}
			}
		);

	const otherCharges =
		getNumberValue(
			"saleOtherCharges"
		);

	const roundOff =
		getNumberValue(
			"saleRoundOff"
		);

	const paidAmount =
		getNumberValue(
			"salePaidAmount"
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
		"saleGrossAmount",
		formatCurrency(grossAmount)
	);

	setText(
		"saleDiscountAmount",
		formatCurrency(discountAmount)
	);

	setText(
		"saleTaxableAmount",
		formatCurrency(taxableAmount)
	);

	setText(
		"saleGstAmount",
		formatCurrency(gstAmount)
	);

	setText(
		"saleGrandTotal",
		formatCurrency(grandTotal)
	);

	setText(
		"saleDueAmount",
		formatCurrency(dueAmount)
	);
}


async function saveSale() {

	if (isSavingSale) {
		return;
	}

	if (!salePermissions.create) {

		showMsg(
			"You do not have permission to create sales."
		);

		return;
	}

	const payload =
		buildSalePayload();

	const validationMessage =
		validateSalePayload(
			payload
		);

	if (validationMessage) {

		showMsg(validationMessage);

		return;
	}

	isSavingSale =
		true;

	setButtonLoading(
		"saveSaleBtn",
		"Saving Sale...",
		true
	);

	const result =
		await saleApiRequest(
			`${API_BASE}/saas/sales`,
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

	isSavingSale =
		false;

	setButtonLoading(
		"saveSaleBtn",
		"Save Sale",
		false
	);

	if (!result.ok) {

		showMsg(
			getSaleErrorMessage(
				result.data,
				"Unable to save sale."
			)
		);

		return;
	}

	showMsg(
		"Sale saved and inventory deducted successfully.",
		"success"
	);

	clearSaleForm();

	closeSaleForm();

	await Promise.all([
		loadSales(),
		loadSaleSummary(),
		loadSaleStocks()
	]);

	refreshSaleMedicineDropdowns();
}


function buildSalePayload() {

	const items = [];

	document
		.querySelectorAll(
			"#saleItemsBody tr"
		)
		.forEach(
			function(row) {

				items.push({

					medicineId:
						numberFromRow(
							row,
							".item-sale-medicine"
						),

					quantity:
						numberFromRow(
							row,
							".item-sale-quantity"
						),

					saleRate:
						numberFromRow(
							row,
							".item-sale-rate"
						),

					discountPercentage:
						numberFromRow(
							row,
							".item-sale-discount"
						),

					gstPercentage:
						numberFromRow(
							row,
							".item-sale-gst"
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

		saleDate:
			getValue(
				"saleDate"
			) || null,

		customerId:
			getNumberValue(
				"saleCustomerId"
			),

		otherCharges:
			getNumberValue(
				"saleOtherCharges"
			),

		roundOffAmount:
			getNumberValue(
				"saleRoundOff"
			),

		paidAmount:
			getNumberValue(
				"salePaidAmount"
			),

		remarks:
			getValue(
				"saleRemarks"
			),

		items:
			items
	};
}


function validateSalePayload(
	payload
) {

	if (!payload.customerId) {
		return "Please select customer.";
	}

	if (!payload.items.length) {
		return "At least one sale item is required.";
	}

	const medicineIds =
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

		if (!item.medicineId) {

			return `Please select medicine in row ${rowNumber}.`;
		}

		if (
			medicineIds.has(
				item.medicineId
			)
		) {

			return `Medicine is repeated in row ${rowNumber}. Please use one row per medicine.`;
		}

		medicineIds.add(
			item.medicineId
		);

		if (
			!item.quantity ||
			item.quantity <= 0
		) {

			return `Quantity must be greater than 0 in row ${rowNumber}.`;
		}

		const available =
			getAvailableQuantityForMedicine(
				item.medicineId
			);

		if (
			item.quantity >
			available
		) {

			return `Insufficient stock in row ${rowNumber}. Available quantity is ${available}.`;
		}

		if (item.saleRate < 0) {

			return `Sale rate cannot be negative in row ${rowNumber}.`;
		}

		if (
			item.discountPercentage < 0 ||
			item.discountPercentage > 100
		) {

			return `Discount must be between 0 and 100 in row ${rowNumber}.`;
		}

		if (
			item.gstPercentage < 0 ||
			item.gstPercentage > 100
		) {

			return `GST must be between 0 and 100 in row ${rowNumber}.`;
		}
	}

	const grandTotal =
		getSaleCalculatedGrandTotal();

	if (
		payload.paidAmount >
		grandTotal
	) {

		return "Paid amount cannot exceed grand total.";
	}

	return "";
}


function getSaleCalculatedGrandTotal() {

	let taxableAmount = 0;
	let gstAmount = 0;

	document
		.querySelectorAll(
			"#saleItemsBody tr"
		)
		.forEach(
			function(row) {

				const quantity =
					numberFromRow(
						row,
						".item-sale-quantity"
					);

				const rate =
					numberFromRow(
						row,
						".item-sale-rate"
					);

				const discount =
					numberFromRow(
						row,
						".item-sale-discount"
					);

				const gst =
					numberFromRow(
						row,
						".item-sale-gst"
					);

				const gross =
					quantity * rate;

				const discountAmount =
					gross * discount / 100;

				const taxable =
					gross - discountAmount;

				const tax =
					taxable * gst / 100;

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
			"saleOtherCharges"
		) +
		getNumberValue(
			"saleRoundOff"
		)
	);
}


function clearSaleForm() {

	setDefaultSaleDate();

	setValue(
		"saleCustomerId",
		""
	);

	setValue(
		"saleRemarks",
		""
	);

	setValue(
		"saleOtherCharges",
		"0"
	);

	setValue(
		"saleRoundOff",
		"0"
	);

	setValue(
		"salePaidAmount",
		"0"
	);

	const itemsBody =
		document.getElementById(
			"saleItemsBody"
		);

	if (itemsBody) {

		itemsBody.innerHTML =
			"";
	}

	addSaleItemRow();

	updateSelectedCustomerCredit();

	calculateSaleTotals();
}


async function refreshSales() {

	setValue(
		"saleSearchKeyword",
		""
	);

	await Promise.all([
		loadSales(),
		loadSaleSummary(),
		loadSaleStocks()
	]);

	refreshSaleMedicineDropdowns();
}


function renderSales(
	sales
) {

	const tbody =
		document.getElementById(
			"saleTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(sales)
			? sales
			: [];

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="10">

					<div class="sales-state">

						<div class="sales-state-icon">

							<i class="bi bi-cart-check-fill"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No sales found
						</h5>

						<p class="text-muted mb-0">
							Create your first customer sale invoice.
						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(sale, index) {

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
					sale.saleNumber
				)}

							</strong>

							<div class="small text-muted">

								${formatDate(
					sale.saleDate
				)}

							</div>

						</td>

						<td>

							<strong>

								${escapeHtml(
					sale.customerName
				)}

							</strong>

							<div class="small text-muted">

								${escapeHtml(
					sale.customerCode || "-"
				)}

							</div>

						</td>

						<td>

							${Array.isArray(sale.items)
						? sale.items.length
						: 0
					}

							items

						</td>

						<td>

							${Number(
						sale.totalQuantity || 0
					)}

						</td>

						<td>

							<strong>

								${formatCurrency(
						sale.grandTotal
					)}

							</strong>

						</td>

						<td>

							${formatCurrency(
						sale.paidAmount
					)}

						</td>

						<td>

							${formatCurrency(
						sale.dueAmount
					)}

						</td>

						<td>

							${salePaymentStatusBadge(
						sale.paymentStatus
					)}

						</td>

						<td>

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="showSaleDetails(${Number(sale.id)})">

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


function showSaleDetails(
	saleId
) {

	const sale =
		saleList.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(saleId)
				);
			}
		);

	if (!sale) {

		showMsg(
			"Sale details not found."
		);

		return;
	}

	const items =
		Array.isArray(sale.items)
			? sale.items
			: [];

	const content =
		document.getElementById(
			"saleDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="row g-3 mb-4">

			<div class="col-md-4">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Sale Number
					</span>

					<div class="sale-detail-value">

						${escapeHtml(
		sale.saleNumber
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Sale Date
					</span>

					<div class="sale-detail-value">

						${formatDate(
		sale.saleDate
	)}

					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Payment
					</span>

					<div class="sale-detail-value">

						${salePaymentStatusBadge(
		sale.paymentStatus
	)}

					</div>

				</div>

			</div>

			<div class="col-md-6">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Customer
					</span>

					<div class="sale-detail-value">

						${escapeHtml(
		sale.customerName
	)}

					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Customer Code
					</span>

					<div class="sale-detail-value">

						${escapeHtml(
		sale.customerCode || "-"
	)}

					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						GSTIN
					</span>

					<div class="sale-detail-value">

						${escapeHtml(
		sale.customerGstin || "-"
	)}

					</div>

				</div>

			</div>

		</div>

		<div class="table-responsive">

			<table class="table table-bordered align-middle">

				<thead>

					<tr>

						<th>Medicine</th>
						<th>Quantity</th>
						<th>Rate</th>
						<th>Discount</th>
						<th>GST</th>
						<th>Total</th>
						<th>Allocated Batches</th>

					</tr>

				</thead>

				<tbody>

					${items.map(
		function(item) {

			const allocations =
				Array.isArray(
					item.allocations
				)
					? item.allocations
					: [];

			return `

								<tr>

									<td>

										<strong>
											${escapeHtml(
				item.medicineName
			)}
										</strong>

										<div class="small text-muted">

											${escapeHtml(
				item.manufacturer || "-"
			)}

										</div>

									</td>

									<td>

										${Number(
				item.quantity || 0
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

									</td>

									<td>

										${Number(
				item.gstPercentage || 0
			).toFixed(2)}%

									</td>

									<td>

										<strong>

											${formatCurrency(
				item.lineTotal
			)}

										</strong>

									</td>

									<td>

										${allocations.length
					? allocations.map(
						function(allocation) {

							return `

														<span class="allocation-chip">

															<i class="bi bi-box-seam"></i>

															${escapeHtml(
								allocation.batchNumber
							)}

															×

															${Number(
								allocation.allocatedQuantity || 0
							)}

															${allocation.expiryDate
									? `(${formatDate(allocation.expiryDate)})`
									: ""
								}

														</span>
													`;
						}
					).join("")
					: "-"
				}

									</td>

								</tr>
							`;
		}
	).join("")}

				</tbody>

			</table>

		</div>

		<div class="row g-3 mt-3">

			<div class="col-md-3">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Gross Amount
					</span>

					<div class="sale-detail-value">
						${formatCurrency(sale.grossAmount)}
					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Discount
					</span>

					<div class="sale-detail-value">
						${formatCurrency(sale.discountAmount)}
					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						GST
					</span>

					<div class="sale-detail-value">
						${formatCurrency(sale.gstAmount)}
					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Grand Total
					</span>

					<div class="sale-detail-value">
						${formatCurrency(sale.grandTotal)}
					</div>

				</div>

			</div>

			<div class="col-md-6">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Paid Amount
					</span>

					<div class="sale-detail-value text-success">
						${formatCurrency(sale.paidAmount)}
					</div>

				</div>

			</div>

			<div class="col-md-6">

				<div class="sale-detail-card">

					<span class="sale-detail-label">
						Due Amount
					</span>

					<div class="sale-detail-value text-danger">
						${formatCurrency(sale.dueAmount)}
					</div>

				</div>

			</div>

		</div>

		${sale.remarks
			? `
				<div class="sale-detail-card mt-3">

					<span class="sale-detail-label">
						Remarks
					</span>

					<div class="sale-detail-value">

						${escapeHtml(
				sale.remarks
			)}

					</div>

				</div>
			`
			: ""
		}
	`;

	if (saleDetailsModal) {

		saleDetailsModal.show();
	}
}


function salePaymentStatusBadge(
	status
) {

	const normalized =
		String(status || "")
			.toUpperCase();

	if (normalized === "PAID") {

		return `

			<span class="sales-status paid">

				<i class="bi bi-check-circle-fill"></i>
				Paid

			</span>
		`;
	}

	if (
		normalized ===
		"PARTIALLY_PAID"
	) {

		return `

			<span class="sales-status partial">

				<i class="bi bi-hourglass-split"></i>
				Partially Paid

			</span>
		`;
	}

	return `

		<span class="sales-status unpaid">

			<i class="bi bi-exclamation-circle-fill"></i>
			Unpaid

		</span>
	`;
}


function getSelectedSaleCustomer() {

	const customerId =
		getNumberValue(
			"saleCustomerId"
		);

	return saleCustomers.find(
		function(customer) {

			return (
				Number(customer.id) ===
				Number(customerId)
			);
		}
	) || null;
}


function showSaleLoadingState() {

	const tbody =
		document.getElementById(
			"saleTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="10">

				<div class="sales-state">

					<div class="spinner-border text-primary"
						 role="status">
					</div>

					<p class="text-muted mt-3 mb-0">
						Loading sales...
					</p>

				</div>

			</td>

		</tr>
	`;
}


function showSaleErrorState(
	message
) {

	const tbody =
		document.getElementById(
			"saleTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="10">

				<div class="sales-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<h5 class="fw-bold mt-3">
						Unable to load sales
					</h5>

					<p class="text-muted mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


async function saleApiRequest(
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
			await readSaleResponse(
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
			"Sale API error:",
			error
		);

		return {

			ok:
				false,

			status:
				0,

			data: {

				message:
					"Sale service is not reachable."
			}
		};
	}
}


async function readSaleResponse(
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


function getSaleErrorMessage(
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