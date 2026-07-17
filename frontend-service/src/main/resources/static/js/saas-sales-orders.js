const API_BASE =
	"http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let salesOrderList = [];
let salesOrderCustomers = [];
let salesOrderMedicines = [];
let salesOrderStocks = [];

let salesOrderItemSequence = 0;

let isLoadingSalesOrders = false;
let isSavingSalesOrder = false;
let isUpdatingSalesOrder = false;
let isConvertingSalesOrder = false;

let salesOrderDetailsModal = null;
let salesOrderStatusModal = null;
let convertSalesOrderModal = null;

let salesOrderPermissions = {
	create: false,
	update: false,
	delete: false,
	createSale: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

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

		if (tenantType !== "WHOLESALER") {

			alert(
				"Sales Orders module is available only for Wholesaler workspaces."
			);

			window.location.href =
				"/saas/dashboard";

			return;
		}

		const allowed =
			await protectSaasPage(
				"SALES_ORDERS",
				"VIEW"
			);

		if (!allowed) {
			return;
		}

		initializeSalesOrderPage();

		initializeSalesOrderModals();

		await loadSalesOrderPermissions();

		setDefaultSalesOrderDates();

		await Promise.all([
			loadSalesOrderCustomers(),
			loadSalesOrderMedicines(),
			loadSalesOrderStocks(),
			loadSalesOrderSummary(),
			loadSalesOrders()
		]);

		addSalesOrderItemRow();

		const customerSelect =
			document.getElementById(
				"salesOrderCustomerId"
			);

		if (customerSelect) {

			customerSelect.addEventListener(
				"change",
				updateSelectedOrderCustomer
			);
		}

		const searchInput =
			document.getElementById(
				"salesOrderSearchKeyword"
			);

		if (searchInput) {

			searchInput.addEventListener(
				"keydown",
				function(event) {

					if (event.key === "Enter") {

						event.preventDefault();

						searchSalesOrders();
					}
				}
			);
		}
	}
);


function initializeSalesOrderPage() {

	const tenantName =
		localStorage.getItem(
			"tenantName"
		) || "your workspace";

	setText(
		"tenantNameText",
		tenantName
	);

	setText(
		"tenantTypeText",
		"Wholesaler"
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


function initializeSalesOrderModals() {

	const detailsElement =
		document.getElementById(
			"salesOrderDetailsModal"
		);

	const statusElement =
		document.getElementById(
			"salesOrderStatusModal"
		);

	const convertElement =
		document.getElementById(
			"convertSalesOrderModal"
		);

	if (detailsElement) {

		salesOrderDetailsModal =
			new bootstrap.Modal(
				detailsElement
			);
	}

	if (statusElement) {

		salesOrderStatusModal =
			new bootstrap.Modal(
				statusElement
			);
	}

	if (convertElement) {

		convertSalesOrderModal =
			new bootstrap.Modal(
				convertElement
			);
	}
}


async function loadSalesOrderPermissions() {

	const [
		canCreate,
		canUpdate,
		canDelete,
		canCreateSale
	] = await Promise.all([

		hasSaasPermission(
			"SALES_ORDERS",
			"CREATE"
		),

		hasSaasPermission(
			"SALES_ORDERS",
			"UPDATE"
		),

		hasSaasPermission(
			"SALES_ORDERS",
			"DELETE"
		),

		hasSaasPermission(
			"SALES",
			"CREATE"
		)
	]);

	salesOrderPermissions = {

		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete),

		createSale:
			Boolean(canCreateSale)
	};

	showOrHideById(
		"addSalesOrderBtn",
		salesOrderPermissions.create
	);

	applySalesOrderActionVisibility();
}


function setDefaultSalesOrderDates() {

	const today =
		new Date()
			.toISOString()
			.substring(0, 10);

	setValue(
		"salesOrderDate",
		today
	);

	setValue(
		"convertSaleDate",
		today
	);
}


async function loadSalesOrderCustomers() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/customers` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&activeOnly=true`
		);

	if (!result.ok) {

		salesOrderCustomers = [];

		showMsg(
			getSalesOrderErrorMessage(
				result.data,
				"Unable to load customers."
			)
		);

		populateSalesOrderCustomerDropdown();

		return;
	}

	salesOrderCustomers =
		Array.isArray(result.data)
			? result.data
			: [];

	populateSalesOrderCustomerDropdown();
}


function populateSalesOrderCustomerDropdown() {

	const select =
		document.getElementById(
			"salesOrderCustomerId"
		);

	if (!select) {
		return;
	}

	select.innerHTML = `
		<option value="">
			Select Customer
		</option>
	`;

	salesOrderCustomers.forEach(
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


function updateSelectedOrderCustomer() {

	const customerId =
		getNumberValue(
			"salesOrderCustomerId"
		);

	const customer =
		salesOrderCustomers.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(customerId)
				);
			}
		);

	const detailsElement =
		document.getElementById(
			"selectedOrderCustomerDetails"
		);

	if (!detailsElement) {
		return;
	}

	if (!customer) {

		detailsElement.textContent =
			"Select customer";

		return;
	}

	detailsElement.innerHTML = `
		<div>
			<strong class="text-primary">
				${escapeHtml(customer.customerType || "Customer")}
			</strong>

			<span class="text-muted ms-2">
				Credit:
				${formatCurrency(customer.creditLimit)}
			</span>
		</div>
	`;

	const addressField =
		document.getElementById(
			"salesOrderShippingAddress"
		);

	if (
		addressField &&
		!String(addressField.value || "").trim()
	) {

		addressField.value =
			buildCustomerAddress(
				customer
			);
	}
}


function buildCustomerAddress(
	customer
) {

	return [
		customer.address,
		customer.city,
		customer.district,
		customer.state,
		customer.pincode
	]
		.filter(
			function(value) {

				return Boolean(
					String(
						value || ""
					).trim()
				);
			}
		)
		.join(", ");
}


async function loadSalesOrderMedicines() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/inventory/medicines` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		salesOrderMedicines = [];

		showMsg(
			getSalesOrderErrorMessage(
				result.data,
				"Unable to load medicines."
			)
		);

		refreshSalesOrderMedicineDropdowns();

		return;
	}

	salesOrderMedicines =
		Array.isArray(result.data)
			? result.data
			: [];

	refreshSalesOrderMedicineDropdowns();
}


async function loadSalesOrderStocks() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/inventory/stocks` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		salesOrderStocks = [];

		return;
	}

	salesOrderStocks =
		Array.isArray(result.data)
			? result.data
			: [];
}


async function loadSalesOrderSummary() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/sales-orders/summary` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		resetSalesOrderSummary();

		return;
	}

	const summary =
		result.data || {};

	setAnimatedNumber(
		"totalSalesOrders",
		summary.totalOrders
	);

	setAnimatedNumber(
		"pendingSalesOrders",
		summary.pendingOrders
	);

	setAnimatedNumber(
		"confirmedSalesOrders",
		summary.confirmedOrders
	);

	setAnimatedNumber(
		"dispatchedSalesOrders",
		summary.dispatchedOrders
	);

	setAnimatedNumber(
		"deliveredSalesOrders",
		summary.deliveredOrders
	);

	setText(
		"totalSalesOrderValue",
		formatCurrency(
			summary.totalOrderValue
		)
	);
}


function resetSalesOrderSummary() {

	[
		"totalSalesOrders",
		"pendingSalesOrders",
		"confirmedSalesOrders",
		"dispatchedSalesOrders",
		"deliveredSalesOrders"
	].forEach(
		function(id) {

			setText(
				id,
				"0"
			);
		}
	);

	setText(
		"totalSalesOrderValue",
		formatCurrency(0)
	);
}


async function loadSalesOrders() {

	if (isLoadingSalesOrders) {
		return;
	}

	isLoadingSalesOrders =
		true;

	showSalesOrderLoadingState();

	setButtonLoading(
		"refreshSalesOrderBtn",
		"Refreshing...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/sales-orders` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	isLoadingSalesOrders =
		false;

	setButtonLoading(
		"refreshSalesOrderBtn",
		"Refresh",
		false
	);

	if (!result.ok) {

		salesOrderList = [];

		const message =
			getSalesOrderErrorMessage(
				result.data,
				"Unable to load sales orders."
			);

		showSalesOrderErrorState(
			message
		);

		showMsg(message);

		return;
	}

	salesOrderList =
		Array.isArray(result.data)
			? result.data
			: [];

	renderSalesOrders(
		salesOrderList
	);
}


async function searchSalesOrders() {

	const keyword =
		getValue(
			"salesOrderSearchKeyword"
		);

	if (!keyword) {

		await loadSalesOrders();

		return;
	}

	showSalesOrderLoadingState();

	setButtonLoading(
		"searchSalesOrderBtn",
		"Searching...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/sales-orders/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`
		);

	setButtonLoading(
		"searchSalesOrderBtn",
		"Search",
		false
	);

	if (!result.ok) {

		showSalesOrderErrorState(
			getSalesOrderErrorMessage(
				result.data,
				"Unable to search sales orders."
			)
		);

		return;
	}

	renderSalesOrders(
		Array.isArray(result.data)
			? result.data
			: []
	);
}


function openSalesOrderForm() {

	if (!salesOrderPermissions.create) {

		showMsg(
			"You do not have permission to create sales orders."
		);

		return;
	}

	if (!salesOrderCustomers.length) {

		showMsg(
			"Create an active customer before creating an order."
		);

		return;
	}

	if (!salesOrderMedicines.length) {

		showMsg(
			"No tenant medicines are available."
		);

		return;
	}

	const panel =
		document.getElementById(
			"salesOrderFormPanel"
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


function closeSalesOrderForm() {

	const panel =
		document.getElementById(
			"salesOrderFormPanel"
		);

	if (panel) {

		panel.style.display =
			"none";
	}
}


function addSalesOrderItemRow() {

	salesOrderItemSequence++;

	const rowId =
		salesOrderItemSequence;

	const tbody =
		document.getElementById(
			"salesOrderItemsBody"
		);

	if (!tbody) {
		return;
	}

	const row =
		document.createElement(
			"tr"
		);

	row.id =
		`salesOrderItemRow_${rowId}`;

	row.innerHTML = `

		<td>

			<select class="form-select order-medicine-select item-order-medicine"
					onchange="handleSalesOrderMedicineChange(this)">

				${buildSalesOrderMedicineOptions()}

			</select>

		</td>

		<td>

			<span class="order-stock-chip item-order-available">

				<i class="bi bi-boxes"></i>
				0

			</span>

		</td>

		<td>

			<input type="number"
				   class="form-control item-order-quantity"
				   value="1"
				   min="1"
				   oninput="calculateSalesOrderTotals()">

		</td>

		<td>

			<input type="number"
				   class="form-control item-order-rate"
				   value="0"
				   min="0"
				   step="0.01"
				   oninput="calculateSalesOrderTotals()">

		</td>

		<td>

			<input type="number"
				   class="form-control item-order-discount"
				   value="0"
				   min="0"
				   max="100"
				   step="0.01"
				   oninput="calculateSalesOrderTotals()">

		</td>

		<td>

			<input type="number"
				   class="form-control item-order-gst"
				   value="0"
				   min="0"
				   max="100"
				   step="0.01"
				   oninput="calculateSalesOrderTotals()">

		</td>

		<td>

			<strong class="item-order-line-total text-primary">
				₹0
			</strong>

		</td>

		<td>

			<button type="button"
					class="btn btn-sm btn-outline-danger"
					onclick="removeSalesOrderItemRow(${rowId})">

				<i class="bi bi-trash"></i>

			</button>

		</td>
	`;

	tbody.appendChild(row);

	calculateSalesOrderTotals();
}


function removeSalesOrderItemRow(
	rowId
) {

	const rows =
		document.querySelectorAll(
			"#salesOrderItemsBody tr"
		);

	if (rows.length <= 1) {

		showMsg(
			"At least one order item is required."
		);

		return;
	}

	document.getElementById(
		`salesOrderItemRow_${rowId}`
	)?.remove();

	calculateSalesOrderTotals();
}


function buildSalesOrderMedicineOptions() {

	let html = `
		<option value="">
			Select Medicine
		</option>
	`;

	salesOrderMedicines.forEach(
		function(medicine) {

			const available =
				getAvailableOrderQuantity(
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


function refreshSalesOrderMedicineDropdowns() {

	document
		.querySelectorAll(
			".item-order-medicine"
		)
		.forEach(
			function(select) {

				const currentValue =
					select.value;

				select.innerHTML =
					buildSalesOrderMedicineOptions();

				select.value =
					currentValue;
			}
		);
}


function handleSalesOrderMedicineChange(
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
		getAvailableOrderQuantity(
			medicineId
		);

	const availableElement =
		row.querySelector(
			".item-order-available"
		);

	if (availableElement) {

		availableElement.innerHTML = `

			<i class="bi bi-boxes"></i>
			${available}
		`;

		availableElement.classList.toggle(
			"danger",
			available <= 0
		);
	}

	const suggestedStock =
		getSuggestedOrderStock(
			medicineId
		);

	if (suggestedStock) {

		const rateInput =
			row.querySelector(
				".item-order-rate"
			);

		const gstInput =
			row.querySelector(
				".item-order-gst"
			);

		if (
			rateInput &&
			Number(rateInput.value || 0) === 0
		) {

			rateInput.value =
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

	const customer =
		getSelectedOrderCustomer();

	const discountInput =
		row.querySelector(
			".item-order-discount"
		);

	if (
		customer &&
		discountInput &&
		Number(discountInput.value || 0) === 0
	) {

		discountInput.value =
			Number(
				customer.discountPercentage ||
				0
			);
	}

	calculateSalesOrderTotals();
}


function getAvailableOrderQuantity(
	medicineId
) {

	const orderDate =
		getValue(
			"salesOrderDate"
		);

	const requiredDate =
		orderDate
			? new Date(
				orderDate + "T00:00:00"
			)
			: new Date();

	requiredDate.setHours(
		0,
		0,
		0,
		0
	);

	return salesOrderStocks
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

				return expiryDate >= requiredDate;
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


function getSuggestedOrderStock(
	medicineId
) {

	const availableStocks =
		salesOrderStocks
			.filter(
				function(stock) {

					return (
						Number(stock.medicineId) ===
						Number(medicineId)
						&& Number(
							stock.currentQuantity || 0
						) > 0
						&& stock.active !== false
						&& !Boolean(stock.expired)
					);
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

					return (
						new Date(first.expiryDate) -
						new Date(second.expiryDate)
					);
				}
			);

	return availableStocks[0] || null;
}


function calculateSalesOrderTotals() {

	let grossAmount = 0;
	let discountAmount = 0;
	let taxableAmount = 0;
	let gstAmount = 0;

	document
		.querySelectorAll(
			"#salesOrderItemsBody tr"
		)
		.forEach(
			function(row) {

				const quantity =
					numberFromRow(
						row,
						".item-order-quantity"
					);

				const rate =
					numberFromRow(
						row,
						".item-order-rate"
					);

				const discount =
					numberFromRow(
						row,
						".item-order-discount"
					);

				const gst =
					numberFromRow(
						row,
						".item-order-gst"
					);

				const rowGross =
					quantity * rate;

				const rowDiscount =
					rowGross *
					discount /
					100;

				const rowTaxable =
					rowGross -
					rowDiscount;

				const rowGst =
					rowTaxable *
					gst /
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
						".item-order-line-total"
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
		getNumberValue(
			"salesOrderOtherCharges"
		);

	const roundOff =
		getNumberValue(
			"salesOrderRoundOff"
		);

	const grandTotal =
		taxableAmount +
		gstAmount +
		otherCharges +
		roundOff;

	setText(
		"salesOrderGrossAmount",
		formatCurrency(grossAmount)
	);

	setText(
		"salesOrderDiscountAmount",
		formatCurrency(discountAmount)
	);

	setText(
		"salesOrderTaxableAmount",
		formatCurrency(taxableAmount)
	);

	setText(
		"salesOrderGstAmount",
		formatCurrency(gstAmount)
	);

	setText(
		"salesOrderGrandTotal",
		formatCurrency(grandTotal)
	);
}


async function saveSalesOrder() {

	if (isSavingSalesOrder) {
		return;
	}

	if (!salesOrderPermissions.create) {

		showMsg(
			"You do not have permission to create sales orders."
		);

		return;
	}

	const payload =
		buildSalesOrderPayload();

	const validationMessage =
		validateSalesOrderPayload(
			payload
		);

	if (validationMessage) {

		showMsg(validationMessage);

		return;
	}

	isSavingSalesOrder =
		true;

	setButtonLoading(
		"saveSalesOrderBtn",
		"Saving Order...",
		true
	);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/sales-orders`,
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

	isSavingSalesOrder =
		false;

	setButtonLoading(
		"saveSalesOrderBtn",
		"Save Order",
		false
	);

	if (!result.ok) {

		showMsg(
			getSalesOrderErrorMessage(
				result.data,
				"Unable to save sales order."
			)
		);

		return;
	}

	showMsg(
		"Sales order created successfully.",
		"success"
	);

	clearSalesOrderForm();

	closeSalesOrderForm();

	await Promise.all([
		loadSalesOrders(),
		loadSalesOrderSummary()
	]);
}


function buildSalesOrderPayload() {

	const items = [];

	document
		.querySelectorAll(
			"#salesOrderItemsBody tr"
		)
		.forEach(
			function(row) {

				items.push({

					medicineId:
						numberFromRow(
							row,
							".item-order-medicine"
						),

					quantity:
						numberFromRow(
							row,
							".item-order-quantity"
						),

					saleRate:
						numberFromRow(
							row,
							".item-order-rate"
						),

					discountPercentage:
						numberFromRow(
							row,
							".item-order-discount"
						),

					gstPercentage:
						numberFromRow(
							row,
							".item-order-gst"
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

		orderDate:
			getValue(
				"salesOrderDate"
			) || null,

		expectedDeliveryDate:
			getValue(
				"salesOrderExpectedDate"
			) || null,

		customerId:
			getNumberValue(
				"salesOrderCustomerId"
			),

		shippingAddress:
			getValue(
				"salesOrderShippingAddress"
			),

		otherCharges:
			getNumberValue(
				"salesOrderOtherCharges"
			),

		roundOffAmount:
			getNumberValue(
				"salesOrderRoundOff"
			),

		remarks:
			getValue(
				"salesOrderRemarks"
			),

		items:
			items
	};
}


function validateSalesOrderPayload(
	payload
) {

	if (!payload.customerId) {
		return "Please select customer.";
	}

	if (
		payload.expectedDeliveryDate &&
		payload.orderDate &&
		payload.expectedDeliveryDate <
		payload.orderDate
	) {

		return "Expected delivery date cannot be before order date.";
	}

	if (!payload.items.length) {
		return "At least one order item is required.";
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

			return `Medicine is repeated in row ${rowNumber}.`;
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
			getAvailableOrderQuantity(
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

	if (payload.otherCharges < 0) {
		return "Other charges cannot be negative.";
	}

	return "";
}


function clearSalesOrderForm() {

	setDefaultSalesOrderDates();

	setValue(
		"salesOrderExpectedDate",
		""
	);

	setValue(
		"salesOrderCustomerId",
		""
	);

	setValue(
		"salesOrderShippingAddress",
		""
	);

	setValue(
		"salesOrderOtherCharges",
		"0"
	);

	setValue(
		"salesOrderRoundOff",
		"0"
	);

	setValue(
		"salesOrderRemarks",
		""
	);

	const itemsBody =
		document.getElementById(
			"salesOrderItemsBody"
		);

	if (itemsBody) {

		itemsBody.innerHTML =
			"";
	}

	addSalesOrderItemRow();

	updateSelectedOrderCustomer();

	calculateSalesOrderTotals();
}


async function refreshSalesOrders() {

	setValue(
		"salesOrderSearchKeyword",
		""
	);

	await Promise.all([
		loadSalesOrders(),
		loadSalesOrderSummary(),
		loadSalesOrderStocks()
	]);

	refreshSalesOrderMedicineDropdowns();
}


function renderSalesOrders(
	orders
) {

	const tbody =
		document.getElementById(
			"salesOrderTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(orders)
			? orders
			: [];

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="10">

					<div class="sales-order-state">

						<div class="sales-order-state-icon">
							<i class="bi bi-clipboard2-check-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No sales orders found
						</h5>

						<p class="text-muted mb-0">
							Create your first wholesaler sales order.
						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(order, index) {

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
					order.orderNumber
				)}

							</strong>

							<div class="small text-muted">

								${formatDate(
					order.orderDate
				)}

							</div>

						</td>

						<td>

							<strong>

								${escapeHtml(
					order.customerName
				)}

							</strong>

							<div class="small text-muted">

								${escapeHtml(
					order.customerCode || "-"
				)}

							</div>

						</td>

						<td>

							${formatDate(
					order.expectedDeliveryDate
				)}

						</td>

						<td>

							${Array.isArray(order.items)
						? order.items.length
						: 0
					}

							items

						</td>

						<td>

							${Number(
						order.totalQuantity || 0
					)}

						</td>

						<td>

							<strong>

								${formatCurrency(
						order.grandTotal
					)}

							</strong>

						</td>

						<td>

							${salesOrderStatusBadge(
						order.orderStatus
					)}

						</td>

						<td>

							${order.convertedSaleNumber
						? `
									<span class="order-status converted">

										<i class="bi bi-receipt-cutoff"></i>

										${escapeHtml(
							order.convertedSaleNumber
						)}

									</span>
								`
						: "-"
					}

						</td>

						<td>

							${buildSalesOrderActionButtons(
						order
					)}

						</td>

					</tr>
				`;
			}
		)
			.join("");

	applySalesOrderActionVisibility();
}


function buildSalesOrderActionButtons(
	order
) {

	const orderId =
		Number(order.id);

	const status =
		String(
			order.orderStatus || ""
		).toUpperCase();

	let buttons = `

		<button type="button"
				class="btn btn-sm btn-outline-primary"
				onclick="showSalesOrderDetails(${orderId})">

			<i class="bi bi-eye"></i>
			View

		</button>
	`;

	if (status === "PENDING") {

		buttons += `

			<button type="button"
					class="btn btn-sm btn-outline-success update-order-action"
					onclick="openSalesOrderStatusAction(${orderId}, 'CONFIRM')">

				<i class="bi bi-check-circle"></i>
				Confirm

			</button>

			<button type="button"
					class="btn btn-sm btn-outline-danger update-order-action"
					onclick="openSalesOrderStatusAction(${orderId}, 'REJECT')">

				<i class="bi bi-x-circle"></i>
				Reject

			</button>
		`;
	}

	if (status === "CONFIRMED") {

		buttons += `

			<button type="button"
					class="btn btn-sm btn-outline-primary update-order-action"
					onclick="openSalesOrderStatusAction(${orderId}, 'DISPATCH')">

				<i class="bi bi-truck"></i>
				Dispatch

			</button>

			<button type="button"
					class="btn btn-sm btn-outline-success convert-order-action"
					onclick="openConvertSalesOrder(${orderId})">

				<i class="bi bi-arrow-repeat"></i>
				Convert

			</button>
		`;
	}

	if (status === "DISPATCHED") {

		buttons += `

			<button type="button"
					class="btn btn-sm btn-outline-success update-order-action"
					onclick="openSalesOrderStatusAction(${orderId}, 'DELIVER')">

				<i class="bi bi-box2-heart"></i>
				Deliver

			</button>

			<button type="button"
					class="btn btn-sm btn-outline-success convert-order-action"
					onclick="openConvertSalesOrder(${orderId})">

				<i class="bi bi-arrow-repeat"></i>
				Convert

			</button>
		`;
	}

	if (status === "DELIVERED") {

		buttons += `

			<button type="button"
					class="btn btn-sm btn-outline-success convert-order-action"
					onclick="openConvertSalesOrder(${orderId})">

				<i class="bi bi-arrow-repeat"></i>
				Convert

			</button>
		`;
	}

	if (
		status === "PENDING" ||
		status === "CONFIRMED" ||
		status === "DISPATCHED"
	) {

		buttons += `

			<button type="button"
					class="btn btn-sm btn-outline-danger delete-order-action"
					onclick="openSalesOrderStatusAction(${orderId}, 'CANCEL')">

				<i class="bi bi-slash-circle"></i>
				Cancel

			</button>
		`;
	}

	return `

		<div class="order-actions">
			${buttons}
		</div>
	`;
}


function applySalesOrderActionVisibility() {

	document
		.querySelectorAll(
			".update-order-action"
		)
		.forEach(
			function(button) {

				button.style.display =
					salesOrderPermissions.update
						? ""
						: "none";
			}
		);

	document
		.querySelectorAll(
			".delete-order-action"
		)
		.forEach(
			function(button) {

				button.style.display =
					salesOrderPermissions.delete
						? ""
						: "none";
			}
		);

	document
		.querySelectorAll(
			".convert-order-action"
		)
		.forEach(
			function(button) {

				button.style.display =
					salesOrderPermissions.update &&
						salesOrderPermissions.createSale
						? ""
						: "none";
			}
		);
}


function showSalesOrderDetails(
	orderId
) {

	const order =
		findSalesOrder(
			orderId
		);

	if (!order) {

		showMsg(
			"Sales order details not found."
		);

		return;
	}

	const items =
		Array.isArray(order.items)
			? order.items
			: [];

	const timeline =
		Array.isArray(order.timeline)
			? order.timeline
			: [];

	const content =
		document.getElementById(
			"salesOrderDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="row g-3 mb-4">

			<div class="col-md-4">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Order Number
					</span>

					<div class="order-detail-value">
						${escapeHtml(order.orderNumber)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Order Date
					</span>

					<div class="order-detail-value">
						${formatDate(order.orderDate)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Status
					</span>

					<div class="order-detail-value">
						${salesOrderStatusBadge(order.orderStatus)}
					</div>

				</div>

			</div>

			<div class="col-md-6">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Customer
					</span>

					<div class="order-detail-value">
						${escapeHtml(order.customerName)}
					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Customer Code
					</span>

					<div class="order-detail-value">
						${escapeHtml(order.customerCode || "-")}
					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Expected Delivery
					</span>

					<div class="order-detail-value">
						${formatDate(order.expectedDeliveryDate)}
					</div>

				</div>

			</div>

			<div class="col-12">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Shipping Address
					</span>

					<div class="order-detail-value">
						${escapeHtml(order.shippingAddress || "-")}
					</div>

				</div>

			</div>

		</div>

		<div class="table-responsive mb-4">

			<table class="table table-bordered align-middle">

				<thead>

					<tr>

						<th>Medicine</th>
						<th>Available at Order</th>
						<th>Quantity</th>
						<th>Rate</th>
						<th>Discount</th>
						<th>GST</th>
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
											${escapeHtml(item.medicineName)}
										</strong>

										<div class="small text-muted">
											${escapeHtml(item.manufacturer || "-")}
										</div>

									</td>

									<td>
										${Number(item.availableQuantityAtOrder || 0)}
									</td>

									<td>
										${Number(item.quantity || 0)}
									</td>

									<td>
										${formatCurrency(item.saleRate)}
									</td>

									<td>
										${Number(item.discountPercentage || 0).toFixed(2)}%
									</td>

									<td>
										${Number(item.gstPercentage || 0).toFixed(2)}%
									</td>

									<td>

										<strong>
											${formatCurrency(item.lineTotal)}
										</strong>

									</td>

								</tr>
							`;
		}
	).join("")}

				</tbody>

			</table>

		</div>

		<div class="row g-3 mb-4">

			<div class="col-md-3">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Gross Amount
					</span>

					<div class="order-detail-value">
						${formatCurrency(order.grossAmount)}
					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Discount
					</span>

					<div class="order-detail-value">
						${formatCurrency(order.discountAmount)}
					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="order-detail-card">

					<span class="order-detail-label">
						GST
					</span>

					<div class="order-detail-value">
						${formatCurrency(order.gstAmount)}
					</div>

				</div>

			</div>

			<div class="col-md-3">

				<div class="order-detail-card">

					<span class="order-detail-label">
						Grand Total
					</span>

					<div class="order-detail-value">
						${formatCurrency(order.grandTotal)}
					</div>

				</div>

			</div>

		</div>

		${order.convertedSaleNumber
			? `
				<div class="alert alert-success">

					<i class="bi bi-check-circle-fill me-1"></i>

					Order converted to sale:

					<strong>
						${escapeHtml(order.convertedSaleNumber)}
					</strong>

				</div>
			`
			: ""
		}

		${order.rejectionReason
			? `
				<div class="alert alert-danger">

					<strong>Rejection Reason:</strong>

					${escapeHtml(order.rejectionReason)}

				</div>
			`
			: ""
		}

		${order.cancellationReason
			? `
				<div class="alert alert-danger">

					<strong>Cancellation Reason:</strong>

					${escapeHtml(order.cancellationReason)}

				</div>
			`
			: ""
		}

		<div class="mt-4">

			<h6 class="fw-bold text-primary mb-3">
				Order Timeline
			</h6>

			<div class="order-timeline">

				${timeline.length
			? timeline.map(
				function(entry) {

					return `

								<div class="order-timeline-item">

									<div class="d-flex justify-content-between gap-3">

										<strong>
											${escapeHtml(entry.statusLabel)}
										</strong>

										<small>
											${formatDateTime(entry.createdAt)}
										</small>

									</div>

									${entry.remarks
							? `
											<small>
												${escapeHtml(entry.remarks)}
											</small>
										`
							: ""
						}

									${entry.referenceId
							? `
											<small>
												Reference: #${escapeHtml(entry.referenceId)}
											</small>
										`
							: ""
						}

								</div>
							`;
				}
			).join("")
			: `
						<p class="text-muted">
							No timeline records found.
						</p>
					`
		}

			</div>

		</div>
	`;

	if (salesOrderDetailsModal) {

		salesOrderDetailsModal.show();
	}
}


function openSalesOrderStatusAction(
	orderId,
	actionType
) {

	const order =
		findSalesOrder(
			orderId
		);

	if (!order) {

		showMsg(
			"Sales order not found."
		);

		return;
	}

	const configuration = {

		CONFIRM: {
			eyebrow:
				"Stock Verification",

			title:
				"Confirm Sales Order",

			label:
				"Remarks",

			placeholder:
				"Confirmation remarks",

			required:
				false
		},

		REJECT: {
			eyebrow:
				"Order Rejection",

			title:
				"Reject Sales Order",

			label:
				"Rejection Reason *",

			placeholder:
				"Enter rejection reason",

			required:
				true
		},

		DISPATCH: {
			eyebrow:
				"Order Dispatch",

			title:
				"Dispatch Sales Order",

			label:
				"Dispatch Remarks",

			placeholder:
				"Courier, vehicle or dispatch details",

			required:
				false
		},

		DELIVER: {
			eyebrow:
				"Order Delivery",

			title:
				"Mark Order Delivered",

			label:
				"Delivery Remarks",

			placeholder:
				"Delivery acknowledgement",

			required:
				false
		},

		CANCEL: {
			eyebrow:
				"Order Cancellation",

			title:
				"Cancel Sales Order",

			label:
				"Cancellation Reason *",

			placeholder:
				"Enter cancellation reason",

			required:
				true
		}
	};

	const config =
		configuration[actionType];

	if (!config) {
		return;
	}

	setValue(
		"statusActionOrderId",
		order.id
	);

	setValue(
		"statusActionType",
		actionType
	);

	setValue(
		"statusActionRemarks",
		""
	);

	setText(
		"statusActionEyebrow",
		config.eyebrow
	);

	setText(
		"statusActionTitle",
		config.title
	);

	setText(
		"statusActionRemarksLabel",
		config.label
	);

	setText(
		"statusActionOrderLabel",
		`${order.orderNumber} — ${order.customerName}`
	);

	const remarks =
		document.getElementById(
			"statusActionRemarks"
		);

	if (remarks) {

		remarks.placeholder =
			config.placeholder;

		remarks.dataset.required =
			config.required
				? "true"
				: "false";
	}

	if (salesOrderStatusModal) {

		salesOrderStatusModal.show();
	}
}


async function submitSalesOrderStatusAction() {

	if (isUpdatingSalesOrder) {
		return;
	}

	const orderId =
		getNumberValue(
			"statusActionOrderId"
		);

	const actionType =
		getValue(
			"statusActionType"
		);

	const remarks =
		getValue(
			"statusActionRemarks"
		);

	const remarksElement =
		document.getElementById(
			"statusActionRemarks"
		);

	if (
		remarksElement?.dataset.required === "true" &&
		!remarks
	) {

		showMsg(
			"Reason is required for this action."
		);

		return;
	}

	const endpointMap = {

		CONFIRM:
			"confirm",

		REJECT:
			"reject",

		DISPATCH:
			"dispatch",

		DELIVER:
			"deliver",

		CANCEL:
			"cancel"
	};

	const endpoint =
		endpointMap[actionType];

	if (!endpoint) {
		return;
	}

	isUpdatingSalesOrder =
		true;

	setButtonLoading(
		"submitStatusActionBtn",
		"Updating...",
		true
	);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/sales-orders/${orderId}/${endpoint}`,
			{
				method:
					"PUT",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify({

						tenantId:
							Number(
								localStorage.getItem(
									"tenantId"
								)
							),

						remarks:
							remarks
					})
			}
		);

	isUpdatingSalesOrder =
		false;

	setButtonLoading(
		"submitStatusActionBtn",
		"Continue",
		false
	);

	if (!result.ok) {

		showMsg(
			getSalesOrderErrorMessage(
				result.data,
				"Unable to update sales order."
			)
		);

		return;
	}

	if (salesOrderStatusModal) {

		salesOrderStatusModal.hide();
	}

	showMsg(
		"Sales order updated successfully.",
		"success"
	);

	await Promise.all([
		loadSalesOrders(),
		loadSalesOrderSummary()
	]);
}


function openConvertSalesOrder(
	orderId
) {

	if (
		!salesOrderPermissions.update ||
		!salesOrderPermissions.createSale
	) {

		showMsg(
			"You do not have permission to convert this order to sale."
		);

		return;
	}

	const order =
		findSalesOrder(
			orderId
		);

	if (!order) {

		showMsg(
			"Sales order not found."
		);

		return;
	}

	setValue(
		"convertOrderId",
		order.id
	);

	setText(
		"convertOrderLabel",
		`${order.orderNumber} — ${order.customerName} — ${formatCurrency(order.grandTotal)}`
	);

	const today =
		new Date()
			.toISOString()
			.substring(0, 10);

	setValue(
		"convertSaleDate",
		today
	);

	setValue(
		"convertPaidAmount",
		"0"
	);

	setValue(
		"convertSaleRemarks",
		`Converted from sales order ${order.orderNumber}`
	);

	if (convertSalesOrderModal) {

		convertSalesOrderModal.show();
	}
}


async function convertSalesOrderToSale() {

	if (isConvertingSalesOrder) {
		return;
	}

	const orderId =
		getNumberValue(
			"convertOrderId"
		);

	const order =
		findSalesOrder(
			orderId
		);

	if (!order) {

		showMsg(
			"Sales order not found."
		);

		return;
	}

	const paidAmount =
		getNumberValue(
			"convertPaidAmount"
		);

	if (paidAmount < 0) {

		showMsg(
			"Paid amount cannot be negative."
		);

		return;
	}

	if (
		paidAmount >
		Number(order.grandTotal || 0)
	) {

		showMsg(
			"Paid amount cannot exceed order grand total."
		);

		return;
	}

	isConvertingSalesOrder =
		true;

	setButtonLoading(
		"convertToSaleBtn",
		"Converting...",
		true
	);

	const result =
		await salesOrderApiRequest(
			`${API_BASE}/saas/sales-orders/${orderId}/convert-to-sale`,
			{
				method:
					"POST",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify({

						tenantId:
							Number(
								localStorage.getItem(
									"tenantId"
								)
							),

						saleDate:
							getValue(
								"convertSaleDate"
							) || null,

						paidAmount:
							paidAmount,

						remarks:
							getValue(
								"convertSaleRemarks"
							)
					})
			}
		);

	isConvertingSalesOrder =
		false;

	setButtonLoading(
		"convertToSaleBtn",
		"Convert to Sale",
		false
	);

	if (!result.ok) {

		showMsg(
			getSalesOrderErrorMessage(
				result.data,
				"Unable to convert order to sale."
			)
		);

		return;
	}

	if (convertSalesOrderModal) {

		convertSalesOrderModal.hide();
	}

	showMsg(
		"Sales order converted to sale and inventory deducted successfully.",
		"success"
	);

	await Promise.all([
		loadSalesOrders(),
		loadSalesOrderSummary(),
		loadSalesOrderStocks()
	]);

	refreshSalesOrderMedicineDropdowns();
}


function findSalesOrder(
	orderId
) {

	return salesOrderList.find(
		function(order) {

			return (
				Number(order.id) ===
				Number(orderId)
			);
		}
	) || null;
}


function getSelectedOrderCustomer() {

	const customerId =
		getNumberValue(
			"salesOrderCustomerId"
		);

	return salesOrderCustomers.find(
		function(customer) {

			return (
				Number(customer.id) ===
				Number(customerId)
			);
		}
	) || null;
}


function salesOrderStatusBadge(
	status
) {

	const normalized =
		String(status || "")
			.toUpperCase();

	switch (normalized) {

		case "PENDING":

			return `
				<span class="order-status pending">

					<i class="bi bi-hourglass-split"></i>
					Pending

				</span>
			`;

		case "CONFIRMED":

			return `
				<span class="order-status confirmed">

					<i class="bi bi-check-circle-fill"></i>
					Confirmed

				</span>
			`;

		case "DISPATCHED":

			return `
				<span class="order-status dispatched">

					<i class="bi bi-truck"></i>
					Dispatched

				</span>
			`;

		case "DELIVERED":

			return `
				<span class="order-status delivered">

					<i class="bi bi-box2-heart-fill"></i>
					Delivered

				</span>
			`;

		case "REJECTED":

			return `
				<span class="order-status rejected">

					<i class="bi bi-x-circle-fill"></i>
					Rejected

				</span>
			`;

		case "CANCELLED":

			return `
				<span class="order-status cancelled">

					<i class="bi bi-slash-circle-fill"></i>
					Cancelled

				</span>
			`;

		case "CONVERTED_TO_SALE":

			return `
				<span class="order-status converted">

					<i class="bi bi-arrow-repeat"></i>
					Converted to Sale

				</span>
			`;

		default:

			return `
				<span class="order-status pending">
					${escapeHtml(normalized || "Unknown")}
				</span>
			`;
	}
}


function showSalesOrderLoadingState() {

	const tbody =
		document.getElementById(
			"salesOrderTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="10">

				<div class="sales-order-state">

					<div class="spinner-border text-primary"
						 role="status">
					</div>

					<p class="text-muted mt-3 mb-0">
						Loading sales orders...
					</p>

				</div>

			</td>

		</tr>
	`;
}


function showSalesOrderErrorState(
	message
) {

	const tbody =
		document.getElementById(
			"salesOrderTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="10">

				<div class="sales-order-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<h5 class="fw-bold mt-3">
						Unable to load sales orders
					</h5>

					<p class="text-muted mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


async function salesOrderApiRequest(
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
			await readSalesOrderResponse(
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
			"Sales order API error:",
			error
		);

		return {

			ok:
				false,

			status:
				0,

			data: {

				message:
					"Sales order service is not reachable."
			}
		};
	}
}


async function readSalesOrderResponse(
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


function getSalesOrderErrorMessage(
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


function formatDateTime(
	value
) {

	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (
		Number.isNaN(
			date.getTime()
		)
	) {
		return "-";
	}

	return date.toLocaleString(
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