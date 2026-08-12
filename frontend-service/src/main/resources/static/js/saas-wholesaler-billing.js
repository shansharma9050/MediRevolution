'use strict';

/* ===========================================================
   SAAS WHOLESALER BILLING
   MediRevolution
=========================================================== */

/* ===========================================================
   GLOBAL VARIABLES
=========================================================== */

let saleFormPanel;
let previewModal;

let tenantId = null;
let editingSaleId = null;

let customers = [];
let medicines = [];
let medicineRows = [];
let sales = [];

let medicineOptionsHtml = "";

let searchTimer = null;

/* ===========================================================
   REQUEST FLAGS
=========================================================== */

let isLoadingSales = false;
let isSavingSale = false;
let isDeletingSale = false;
let isPrintingSale = false;

/* ===========================================================
   PERMISSIONS
=========================================================== */

let salesPermissions = {

	create: false,
	update: false,
	delete: false,
	print: false

};

/* ===========================================================
   FORMATTER
=========================================================== */

const currencyFormatter = new Intl.NumberFormat("en-IN", {

	minimumFractionDigits: 2,
	maximumFractionDigits: 2

});

/* ===========================================================
   INITIALIZE
=========================================================== */

document.addEventListener("DOMContentLoaded", async function() {

	const allowed = await protectSaasPage("SALES", "VIEW");

	if (!allowed) {
		return;
	}

	tenantId = Number(localStorage.getItem("tenantId"));

	if (!tenantId) {

		showError("Please select SaaS workspace first.");

		return;

	}


	const tenantInput = document.getElementById("tenantId");

	if (tenantInput) {

		tenantInput.value = tenantId;

	}


	saleFormPanel = document.getElementById("saleFormPanel");


	const previewElement =
		document.getElementById("salePreviewModal");


	if (previewElement) {

		previewModal =
			bootstrap.Modal.getOrCreateInstance(previewElement);

	}


	bindEvents();


	await loadSalesPermissions();


	await Promise.all([

		loadSummary(),
		loadCustomers(),
		loadMedicines()

	]);


	bindCustomerSelection();


	await loadSales();


});


function openSaleForm() {

	if (!saleFormPanel) {
		return;
	}

	saleFormPanel.style.display = "block";

	saleFormPanel.scrollIntoView({
		behavior: "smooth",
		block: "start"
	});

}

function closeSaleForm() {

	if (!saleFormPanel) {
		return;
	}

	saleFormPanel.style.display = "none";

	resetSaleForm();

}
/* ===========================================================
   LOAD PERMISSIONS
=========================================================== */

async function loadSalesPermissions() {

	const [

		canCreate,
		canUpdate,
		canDelete,
		canPrint

	] = await Promise.all([

		hasSaasPermission("SALES", "CREATE"),
		hasSaasPermission("SALES", "UPDATE"),
		hasSaasPermission("SALES", "DELETE"),
		hasSaasPermission("SALES", "PRINT")

	]);

	salesPermissions = {

		create: Boolean(canCreate),
		update: Boolean(canUpdate),
		delete: Boolean(canDelete),
		print: Boolean(canPrint)

	};

	applySalesPermissions();

}

/* ===========================================================
   APPLY PERMISSIONS
=========================================================== */

function applySalesPermissions() {

	showOrHideById(
		"btnCreateSale",
		salesPermissions.create
	);

	showOrHideById(
		"heroCreateSaleBtn",
		salesPermissions.create
	);

	showOrHideByClass(
		"update-sale-btn",
		salesPermissions.update
	);

	showOrHideByClass(
		"delete-sale-btn",
		salesPermissions.delete
	);

	showOrHideByClass(
		"print-sale-btn",
		salesPermissions.print
	);

}

/* ===========================================================
   EVENT BINDINGS
=========================================================== */

function bindEvents() {

	bindClick("btnCreateSale", openCreateModal);

	bindClick("heroCreateSaleBtn", openCreateModal);

	bindClick("btnSaveSale", saveSale);

	bindClick("btnRefresh", refreshBillingPage);

	bindClick("btnSearch", searchSales);

	bindClick("btnAddMedicine", addMedicineRow);

	bindInput("otherCharges", calculateTotals);

	bindInput("roundOffAmount", calculateTotals);

	bindInput("paidAmount", calculateTotals);

	bindClick("btnPreviewPrint", printCurrentSale);

	bindInput("searchKeyword", debounceSearch);

}

/* ===========================================================
   SMALL EVENT HELPERS
=========================================================== */

function bindClick(id, callback) {

	const element = document.getElementById(id);

	if (!element) return;

	element.addEventListener("click", callback);

}

function bindInput(id, callback) {

	const element = document.getElementById(id);

	if (!element) return;

	element.addEventListener("input", callback);

}

function debounceSearch() {

	clearTimeout(searchTimer);

	searchTimer = setTimeout(function() {

		filterSales();

	}, 300);

}

async function printCurrentSale() {

	if (!editingSaleId) {

		showError("No invoice selected.");

		return;

	}

	await printInvoice(editingSaleId);

}

/* ===========================================================
   LOAD SUMMARY
=========================================================== */

async function loadSummary() {

	try {

		const response = await fetch(
			`${API_BASE}/saas/sales/summary?tenantId=${tenantId}`,
			{
				headers: authHeaders()
			}
		);

		if (handleUnauthorized(response)) {

			clearSelect("customerId");

			appendOption(
				document.getElementById("customerId"),
				"",
				"Unable to load"
			);

			return;

		}

		const result = await safeJson(response);

		if (!response.ok) {

			console.error(result);

			return;

		}

		setText(
			"summaryTotalSales",
			result.totalSales ?? 0
		);

		setText(
			"summaryTotalAmount",
			"₹" + formatMoney(result.totalAmount)
		);

		setText(
			"summaryPaidAmount",
			"₹" + formatMoney(result.paidAmount)
		);

		setText(
			"summaryDueAmount",
			"₹" + formatMoney(result.dueAmount)
		);

	}
	catch (error) {

		console.error(
			"Load summary error:",
			error
		);

	}

}

/* ===========================================================
   LOAD SALES
=========================================================== */

async function loadSales() {

	if (isLoadingSales) {
		return;
	}

	isLoadingSales = true;

	showSalesLoadingState();

	setButtonLoading(
		"btnRefresh",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/wholesaler/billing/sales?tenantId=${tenantId}`,
			{
				headers: authHeaders()
			}
		);

		if (handleUnauthorized(response)) {

			clearSelect("customerId");

			appendOption(
				document.getElementById("customerId"),
				"",
				"Unable to load"
			);

			return;

		}

		const result = await safeJson(response);

		if (!response.ok) {

			sales = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load sales."
				);

			showError(message);

			showSalesErrorState(message);

			return;

		}

		sales = Array.isArray(result)
			? result
			: [];

		sales.sort((a, b) => {

			const dateA =
				new Date(
					a.saleDate ||
					a.createdAt ||
					0
				).getTime();

			const dateB =
				new Date(
					b.saleDate ||
					b.createdAt ||
					0
				).getTime();

			return dateB - dateA;

		});

		if (!sales.length) {

			renderEmptyState();

		} else {

			renderSalesTable(sales);

		}

		applySalesPermissions();

		updateSalesSummary(sales);

	}
	catch (error) {

		console.error(error);

		sales = [];

		showSalesErrorState(
			"SaaS service is currently unavailable."
		);

	}
	finally {

		isLoadingSales = false;

		setButtonLoading(
			"btnRefresh",
			"Refresh",
			false
		);

	}

}

/* ===========================================================
   RENDER SALES TABLE
=========================================================== */

function renderSalesTable(list) {

	const tbody =
		document.getElementById(
			"salesTableBody"
		);

	if (!tbody) {
		return;
	}

	if (!Array.isArray(list) || !list.length) {

		renderEmptyState();

		return;

	}

	tbody.innerHTML = list.map((sale) => {

		const dueAmount =
			toMoneyNumber(
				sale.grandTotal
			) -
			toMoneyNumber(
				sale.paidAmount
			);

		return `

<tr>

    <td>

        <strong class="text-primary">

            ${safe(sale.saleNumber)}

        </strong>

        <div class="small text-muted">

            ${formatDate(sale.saleDate)}

        </div>

    </td>

    <td>

        ${safe(sale.customerName)}

    </td>

    <td>

        ₹${formatMoney(
			sale.grandTotal
		)}

    </td>

    <td class="text-success fw-semibold">

        ₹${formatMoney(
			sale.paidAmount
		)}

    </td>

    <td class="text-danger fw-semibold">

        ₹${formatMoney(
			dueAmount
		)}

    </td>

    <td>

        ${paymentStatusBadge(
			sale.paymentStatus
		)}

    </td>

    <td>

        <div class="d-flex gap-2">

            <button
                type="button"
                class="btn btn-sm btn-outline-info"
                onclick="viewSale(${sale.id})">

                <i class="bi bi-eye"></i>

            </button>

            <button
                type="button"
                class="btn btn-sm btn-outline-success update-sale-btn"
                onclick="openEditModal(${sale.id})">

                <i class="bi bi-pencil"></i>

            </button>

            <button
                type="button"
                class="btn btn-sm btn-outline-danger delete-sale-btn"
                onclick="deleteSale(${sale.id})">

                <i class="bi bi-trash"></i>

            </button>

            <button
                type="button"
                class="btn btn-sm btn-outline-secondary print-sale-btn"
                onclick="printInvoice(${sale.id})">

                <i class="bi bi-printer"></i>

            </button>

        </div>

    </td>

</tr>

`;

	}).join("");

	applySalesPermissions();

}

/* ===========================================================
   SEARCH SALES (API SEARCH)
=========================================================== */

async function searchSales() {

	const keyword =
		getValue("searchKeyword");

	if (!keyword) {

		await loadSales();

		return;

	}

	if (isLoadingSales) {
		return;
	}

	isLoadingSales = true;

	showSalesLoadingState();

	setButtonLoading(
		"btnSearch",
		"Searching...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/wholesaler/billing/sales/search?tenantId=${tenantId}&keyword=${encodeURIComponent(keyword)}`,
			{
				headers: authHeaders()
			}
		);

		if (handleUnauthorized(response)) {

			clearSelect("customerId");

			appendOption(
				document.getElementById("customerId"),
				"",
				"Unable to load"
			);

			return;

		}

		const result =
			await safeJson(response);

		if (!response.ok) {

			showSalesErrorState(
				getApiErrorMessage(
					result,
					"Search failed."
				)
			);

			return;

		}

		sales = Array.isArray(result)
			? result
			: [];

		if (!sales.length) {

			renderEmptyState();

			return;

		}

		renderSalesTable(sales);

		updateSalesSummary(sales);

	}
	catch (error) {

		console.error(error);

		showSalesErrorState(
			"Search service unavailable."
		);

	}
	finally {

		isLoadingSales = false;

		setButtonLoading(
			"btnSearch",
			"Search",
			false
		);

	}

}

/* ===========================================================
   LOCAL FILTER
=========================================================== */

function filterSales() {

	const keyword =
		getValue("searchKeyword")
			.toLowerCase();

	if (!keyword) {

		renderSalesTable(sales);

		return;

	}

	const filteredSales =
		sales.filter(sale =>

			(sale.saleNumber || "")
				.toLowerCase()
				.includes(keyword)

			||

			(sale.customerName || "")
				.toLowerCase()
				.includes(keyword)

			||

			(sale.paymentStatus || "")
				.toLowerCase()
				.includes(keyword)

		);

	renderSalesTable(filteredSales);

	updateSalesSummary(filteredSales);

}

/* ===========================================================
   REFRESH PAGE
=========================================================== */

async function refreshBillingPage() {

	await Promise.all([

		loadSummary(),
		loadSales()

	]);

}

/* ===========================================================
   REFRESH SUMMARY ONLY
=========================================================== */

async function refreshSummary() {

	await loadSummary();

}

/* ===========================================================
   MEDICINE ROW MANAGEMENT
=========================================================== */

function addMedicineRow(data = {}) {

	medicineRows.push({

		medicineId: data.medicineId || "",

		medicineName: data.medicineName || "",

		quantity: Number(data.quantity || 1),

		saleRate: Number(data.saleRate || 0),

		discountPercentage: Number(data.discountPercentage || 0),

		gstPercentage: Number(data.gstPercentage || 0),

		availableStock: Number(data.availableStock || 0),

		lineTotal: Number(data.lineTotal || 0)

	});

	renderMedicineRows();

	calculateTotals();

}

function removeMedicineRow(index) {

	if (index < 0 || index >= medicineRows.length) {
		return;
	}

	medicineRows.splice(index, 1);

	renderMedicineRows();

	calculateTotals();

}

function renderMedicineRows() {

	const tbody = document.getElementById("medicineTableBody");

	if (!tbody) {
		return;
	}

	if (medicineRows.length === 0) {

		tbody.innerHTML = `
			<tr>
				<td colspan="8" class="text-center text-muted py-4">
					No medicines added.
				</td>
			</tr>
		`;

		return;
	}

	tbody.innerHTML = medicineRows.map((row, index) => {

		return `
			<tr>

				<td>
					<select
						class="form-select medicine-select"
						data-index="${index}">

						<option value="">Select Medicine</option>

						${medicineOptions(row.medicineId)}

					</select>
				</td>

				<td>
					<input
						type="number"
						class="form-control quantity-input"
						data-index="${index}"
						min="1"
						value="${row.quantity}">
				</td>

				<td>
					<input
						type="number"
						step="0.01"
						class="form-control rate-input"
						data-index="${index}"
						value="${row.saleRate}">
				</td>

				<td>
					<input
						type="number"
						step="0.01"
						class="form-control discount-input"
						data-index="${index}"
						value="${row.discountPercentage}">
				</td>

				<td>
					<input
						type="number"
						step="0.01"
						class="form-control gst-input"
						data-index="${index}"
						value="${row.gstPercentage}">
				</td>

				<td>
					<span class="badge bg-info stock-badge-${index}">
						Stock : ${row.availableStock}
					</span>
				</td>

				<td class="fw-bold text-end line-total">
					₹${formatMoney(row.lineTotal)}
				</td>

				<td>
					<button
						type="button"
						class="btn btn-sm btn-outline-danger"
						onclick="removeMedicineRow(${index})">
						<i class="bi bi-trash"></i>
					</button>
				</td>

			</tr>
		`;

	}).join("");

	// Ensure correct selected medicine is shown
	document.querySelectorAll(".medicine-select").forEach(select => {

		const index = Number(select.dataset.index);
		const row = medicineRows[index];

		if (row && row.medicineId != null) {
			select.value = String(row.medicineId);
		}

	});

	bindMedicineEvents();

	calculateTotals();
}

/* ===========================================================
   MEDICINE OPTIONS
=========================================================== */

function medicineOptions(selectedId = "") {

	if (!selectedId) {

		return medicineOptionsHtml;

	}

	return medicineOptionsHtml.replace(

		`value="${selectedId}"`,

		`value="${selectedId}" selected`

	);

}
/* ===========================================================
   BIND ROW EVENTS
=========================================================== */

function bindMedicineEvents() {

	document.querySelectorAll(".medicine-select")
		.forEach(select => {

			select.onchange = async function() {

				const index = Number(this.dataset.index);

				/* ==========================================
				   DUPLICATE MEDICINE CHECK
				========================================== */

				const selectedMedicineId = String(this.value);

				if (
					selectedMedicineId &&
					medicineRows.some((row, i) =>
						i !== index &&
						String(row.medicineId || "") === selectedMedicineId
					)
				) {

					showError("Medicine already added.");

					this.value = "";

					medicineRows[index].medicineId = "";
					medicineRows[index].medicineName = "";
					medicineRows[index].saleRate = 0;
					medicineRows[index].availableStock = 0;

					calculateTotals();

					return;
				}

				/* ==========================================
				   LOAD MEDICINE DETAILS
				========================================== */

				const stock = medicines.find(s =>
					String(s.medicineId) === String(this.value)
				);

				if (stock) {

					medicineRows[index].medicineId = stock.medicineId;

					medicineRows[index].stockId = stock.id;

					medicineRows[index].medicineName =
						stock.medicineName;

					medicineRows[index].saleRate =
						Number(stock.salePrice || 0);

					medicineRows[index].gstPercentage =
						Number(stock.gstPercentage || 0);

					medicineRows[index].availableStock =
						Number(stock.currentQuantity || 0);

				}

				await loadMedicineStock(index);

				renderMedicineRows();

				calculateTotals();

			};

		});

	document.querySelectorAll(".quantity-input")
		.forEach(input => {

			input.oninput = function() {

				const index = Number(this.dataset.index);

				medicineRows[index].quantity =
					Number(this.value || 0);

				calculateTotals();

				validateMedicineStock(index);

			};

		});

	document.querySelectorAll(".rate-input")
		.forEach(input => {

			input.oninput = function() {

				const index = Number(this.dataset.index);

				medicineRows[index].saleRate =
					Number(this.value || 0);

				calculateTotals();

			};

		});

	document.querySelectorAll(".discount-input")
		.forEach(input => {

			input.oninput = function() {

				const index = Number(this.dataset.index);

				medicineRows[index].discountPercentage =
					Number(this.value || 0);

				calculateTotals();

			};

		});

	document.querySelectorAll(".gst-input")
		.forEach(input => {

			input.oninput = function() {

				const index = Number(this.dataset.index);

				medicineRows[index].gstPercentage =
					Number(this.value || 0);

				calculateTotals();

			};

		});

}

/* ===========================================================
   TOTAL CALCULATION
=========================================================== */

function calculateTotals() {

	let gross = 0;
	let discount = 0;
	let taxable = 0;
	let gst = 0;

	medicineRows.forEach(row => {

		const qty = toMoneyNumber(row.quantity);

		const rate = toMoneyNumber(row.saleRate);

		const grossLine = qty * rate;

		const discountLine =
			grossLine *
			toMoneyNumber(row.discountPercentage) / 100;

		const taxableLine =
			grossLine -
			discountLine;

		const gstLine =
			taxableLine *
			toMoneyNumber(row.gstPercentage) / 100;

		row.lineTotal = Number(

			(taxableLine + gstLine)

				.toFixed(2)

		);

		gross += grossLine;

		discount += discountLine;

		taxable += taxableLine;

		gst += gstLine;

	});

	const other =
		toMoneyNumber(getValue("otherCharges"));

	const round =
		toMoneyNumber(getValue("roundOffAmount"));

	const grand =
		taxable +
		gst +
		other +
		round;

	const paid =
		toMoneyNumber(getValue("paidAmount"));

	const due =
		Math.max(0, grand - paid);

	const grossElement = document.getElementById("grossAmount");
	if (grossElement) {
		grossElement.textContent = "₹" + formatMoney(gross);
		grossElement.dataset.value = gross;
	}

	const discountElement = document.getElementById("discountAmount");
	if (discountElement) {
		discountElement.textContent = "₹" + formatMoney(discount);
		discountElement.dataset.value = discount;
	}

	const taxableElement = document.getElementById("taxableAmount");
	if (taxableElement) {
		taxableElement.textContent = "₹" + formatMoney(taxable);
		taxableElement.dataset.value = taxable;
	}

	const gstElement = document.getElementById("gstAmount");
	if (gstElement) {
		gstElement.textContent = "₹" + formatMoney(gst);
		gstElement.dataset.value = gst;
	}

	const grandElement = document.getElementById("grandTotal");
	if (grandElement) {
		grandElement.textContent = "₹" + formatMoney(grand);
		grandElement.dataset.value = grand;
	}

	const dueElement = document.getElementById("dueAmount");
	if (dueElement) {
		dueElement.textContent = "₹" + formatMoney(due);
		dueElement.dataset.value = due;
	}

	updatePaymentStatus();

	document.querySelectorAll(".line-total")
		.forEach((cell, index) => {

			if (medicineRows[index]) {

				cell.innerHTML =
					"₹" +
					formatMoney(
						medicineRows[index].lineTotal
					);

			}

		});

}

/* ===========================================================
   VALIDATION
=========================================================== */

function validateSaleForm() {

	const grand = Number(
		document.getElementById("grandTotal").dataset.value || 0
	);

	const paid = toMoneyNumber(getValue("paidAmount"));

	if (paid > grand) {

		showError("Paid amount cannot exceed Grand Total.");

		return false;

	}

	if (
		paid > 0 &&
		!getValue("paymentMode").trim()
	) {

		showError("Please select payment mode.");

		return false;

	}

	if (!getValue("customerId")) {

		showError("Please select customer.");

		return false;

	}

	if (!medicineRows.length) {

		showError("Please add at least one medicine.");

		return false;

	}

	if (toMoneyNumber(getValue("paidAmount")) < 0) {

		showError("Paid amount cannot be negative.");

		return false;

	}

	if (toMoneyNumber(getValue("otherCharges")) < 0) {

		showError("Other charges cannot be negative.");

		return false;

	}

	if (toMoneyNumber(getValue("roundOffAmount")) < 0) {

		showError("Round off cannot be negative.");

		return false;

	}

	for (const row of medicineRows) {

		if (!row.medicineId) {

			showError("Please select medicine.");

			return false;

		}

		if (Number(row.quantity) <= 0) {

			showError("Quantity must be greater than zero.");

			return false;

		}

		if (Number(row.saleRate) <= 0) {

			showError("Sale rate must be greater than zero.");

			return false;

		}

		if (Number(row.discountPercentage) < 0) {

			showError("Discount cannot be negative.");

			return false;

		}

		if (Number(row.gstPercentage) < 0) {

			showError("GST cannot be negative.");

			return false;

		}

		if (
			row.availableStock >= 0 &&
			Number(row.quantity) > Number(row.availableStock)
		) {

			showError(
				`${row.medicineName || "Selected medicine"} stock is only ${row.availableStock}.`
			);

			return false;

		}

	}

	return true;

}

/* ===========================================================
   REQUEST BODY
=========================================================== */

function collectSaleRequest() {

	return {

		tenantId,

		customerId: Number(getValue("customerId")),

		saleDate: getValue("saleDate"),

		paymentMode: getValue("paymentMode"),

		remarks: getValue("remarks"),

		paidAmount:
			toMoneyNumber(getValue("paidAmount")),

		otherCharges:
			toMoneyNumber(getValue("otherCharges")),

		roundOffAmount:
			toMoneyNumber(getValue("roundOffAmount")),

		items: medicineRows.map(row => ({

			medicineId: Number(row.medicineId),

			quantity: Number(row.quantity),

			saleRate: Number(row.saleRate),

			discountPercentage:
				Number(row.discountPercentage),

			gstPercentage:
				Number(row.gstPercentage)

		}))

	};

}

/* ===========================================================
   SALES CRUD
=========================================================== */

/* ===========================================================
   OPEN CREATE SALE
=========================================================== */

function openCreateModal() {

	if (!salesPermissions.create) {

		showError("You do not have permission to create sales.");

		return;

	}

	editingSaleId = null;

	resetSaleForm();

	addMedicineRow();

	document.getElementById("saleModalTitle").textContent =
		"Create Sale";

	openSaleForm();

}
/* ===========================================================
   OPEN EDIT SALE
=========================================================== */

async function openEditModal(id) {

	if (!salesPermissions.update) {

		showError("You do not have permission.");
		return;

	}

	resetSaleForm();

	editingSaleId = id;

	document.getElementById("saleModalTitle").textContent =
		"Update Sales Invoice";

	await loadSale(id);

	openSaleForm();

}

/* ===========================================================
   RESET SALE FORM
=========================================================== */

function resetSaleForm() {

	editingSaleId = null;

	setValue("saleId", "");
	setValue("customerId", "");
	setValue("customerCode", "");
	setValue("customerType", "");
	setValue("customerGstin", "");

	setValue(
		"saleDate",
		new Date().toISOString().split("T")[0]
	);

	setValue("paymentMode", "CASH");

	setValue("remarks", "");

	setValue("paidAmount", 0);

	setValue("otherCharges", 0);

	setValue("roundOffAmount", 0);

	medicineRows = [];

	document.getElementById("medicineTableBody").innerHTML = "";

	setText("grossAmount", "₹0.00");
	setText("discountAmount", "₹0.00");
	setText("taxableAmount", "₹0.00");
	setText("gstAmount", "₹0.00");
	setText("grandTotal", "₹0.00");
	setText("dueAmount", "₹0.00");

	document.getElementById("grandTotal")?.setAttribute("data-value", "0");
	document.getElementById("dueAmount")?.setAttribute("data-value", "0");

	updatePaymentStatus();
	renderMedicineRows();
}
/* ===========================================================
   SAVE SALE
=========================================================== */

async function saveSale() {

	if (isSavingSale) return;

	if (!validateSaleForm()) return;

	isSavingSale = true;

	setButtonLoading(
		"btnSaveSale",
		editingSaleId ? "Updating..." : "Saving...",
		true
	);

	try {

		const payload = collectSaleRequest();

		let url =
			`${API_BASE}/saas/sales?tenantId=${tenantId}`;

		let method = "POST";

		if (editingSaleId) {

			url =
				`${API_BASE}/saas/sales/${editingSaleId}?tenantId=${tenantId}`

			method = "PUT";
		}


		const response = await fetch(

			url,

			{
				method,
				headers: authHeaders(),
				body: JSON.stringify(payload)
			}

		);

		if (handleUnauthorized(response)) {

			clearSelect("customerId");

			appendOption(
				document.getElementById("customerId"),
				"",
				"Unable to load"
			);

			return;

		}

		const result = await safeJson(response);

		if (!response.ok) {

			showError(

				getApiErrorMessage(

					result,

					editingSaleId
						? "Unable to update sale."
						: "Unable to save sale."

				)

			);

			return;
		}

		closeSaleForm();

		showSuccess(

			editingSaleId
				? "Sale updated successfully."
				: "Sale created successfully."

		);

		await loadSales();

		await loadSummary();

		await loadMedicines();
	}
	catch (error) {

		console.error(error);

		showError("Unable to save sale.");

	}
	finally {

		isSavingSale = false;

		setButtonLoading(
			"btnSaveSale",
			"Save Sale",
			false
		);

	}
}
// =======================================================
// Cancel Sale
// =======================================================

async function deleteSale(saleId) {

	if (!salesPermissions.delete) {

		showMsg(
			"You do not have permission to cancel sales."
		);

		return;
	}

	if (!saleId) {

		showMsg(
			"Invalid sale selected."
		);

		return;
	}

	if (!confirm(
		"Cancel this sale?\n\nThe sale will be cancelled and stock will be restored."
	)) {

		return;
	}

	try {

		const token =
			localStorage.getItem("token");

		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/wholesaler/billing/sales/${saleId}?${query.toString()}`,
				{
					method: "DELETE",

					headers: {
						"Authorization":
							"Bearer " + token,

						"Accept":
							"application/json"
					}
				}
			);

		const result =
			await safeJson(response);

		if (!response.ok) {

			console.error(
				"Cancel sale failed:",
				result
			);

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to cancel sale."
				)
			);

			return;
		}

		showMsg(
			"Sale cancelled successfully.",
			"success"
		);

		// Reload list from server
		await loadSales();

	}
	catch (error) {

		console.error(
			"Cancel sale error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);
	}
}

/* ===========================================================
   LOAD SINGLE SALE
=========================================================== */

async function loadSale(id) {

	showLoader();

	try {

		const response = await fetch(

			`${API_BASE}/saas/sales/${id}?tenantId=${tenantId}`,

			{
				headers: authHeaders()
			}

		);

		if (handleUnauthorized(response)) {

			clearSelect("customerId");

			appendOption(
				document.getElementById("customerId"),
				"",
				"Unable to load"
			);

			return;

		}
		const sale = await safeJson(response);

		if (!response.ok) {

			showError(
				getApiErrorMessage(
					sale,
					"Unable to load sale."
				)
			);

			return;
		}

		setValue("saleId", sale.id);

		setValue("customerId", sale.customerId);

		setValue(
			"saleDate",
			(sale.saleDate || "").substring(0, 10)
		);

		setValue("remarks", sale.remarks);

		setValue(
			"paymentMode",
			sale.paymentMode || "CASH"
		);

		setValue(
			"paidAmount",
			sale.paidAmount || 0
		);

		setValue(
			"otherCharges",
			sale.otherCharges || 0
		);

		setValue(
			"roundOffAmount",
			sale.roundOffAmount || 0
		);

		medicineRows = [];

		if (Array.isArray(sale.items)) {

			sale.items.forEach(item => {

				const stock = medicines.find(
					s => Number(s.medicineId) === Number(item.medicineId)
				);

				medicineRows.push({

					medicineId: item.medicineId,

					stockId: stock ? stock.id : "",

					medicineName: item.medicineName,

					quantity: item.quantity,

					saleRate: item.saleRate,

					discountPercentage: item.discountPercentage,

					gstPercentage: item.gstPercentage,

					lineTotal: item.lineTotal,

					availableStock: stock ? Number(stock.currentQuantity || 0) : 0

				});

			});
		}
		for (let i = 0; i < medicineRows.length; i++) {

			await loadMedicineStock(i);

		}
		renderMedicineRows();

		calculateTotals();

		updatePaymentStatus();

		document.getElementById("customerId")
			?.dispatchEvent(new Event("change"));

	}
	catch (error) {

		console.error(error);

		showError("Unable to load sale.");

	}
	finally {

		hideLoader();

	}
}
// =======================================================
// PRINT INVOICE
// =======================================================

async function printInvoice(saleId) {

    if (!saleId) {
        return;
    }

    if (!salesPermissions.print) {

        showMsg(
            "You do not have permission to print sales."
        );

        return;
    }

    try {

        showMsg(
            "Preparing invoice PDF...",
            "info"
        );

        const response = await fetch(
            `${API_BASE}/saas/wholesaler/billing/invoice/${saleId}/pdf?tenantId=${tenantId}`,
            {
                method: "GET",
                headers: {
                    ...authHeaders(),
                    "Accept": "application/pdf"
                }
            }
        );

        if (handleUnauthorized(response)) {
            return;
        }

        if (!response.ok) {

            let message =
                `Unable to generate invoice PDF. (${response.status})`;

            try {

                const contentType =
                    response.headers.get("content-type") || "";

                if (contentType.includes("application/json")) {

                    const errorData =
                        await response.json();

                    message =
                        errorData.message ||
                        errorData.error ||
                        message;
                }

            } catch (e) {
                console.warn(
                    "Unable to parse PDF error response.",
                    e
                );
            }

            throw new Error(message);
        }

        const blob =
            await response.blob();

        if (!blob || blob.size === 0) {

            throw new Error(
                "Invoice PDF is empty."
            );
        }

        const pdfUrl =
            URL.createObjectURL(blob);

        const newWindow =
            window.open(
                pdfUrl,
                "_blank"
            );

        if (!newWindow) {

            URL.revokeObjectURL(pdfUrl);

            throw new Error(
                "Please allow pop-ups for this site to open the invoice."
            );
        }

        /*
         * Keep the object URL alive long enough
         * for the browser PDF viewer to load it.
         */
        setTimeout(() => {

            URL.revokeObjectURL(pdfUrl);

        }, 60000);

    }
    catch (error) {

        console.error(
            "Print invoice error:",
            error
        );

        showMsg(
            error.message ||
            "Unable to open invoice PDF."
        );
    }
}

/* ===========================================================
   CUSTOMER & MEDICINE LOADING
=========================================================== */

async function loadCustomers() {

	const select = document.getElementById("customerId");

	if (!select) return;

	clearSelect("customerId");

	appendOption(select, "", "Loading Customers...");

	try {

		const response = await fetch(
			`${API_BASE}/saas/customers?tenantId=${tenantId}&activeOnly=true`,
			{
				headers: authHeaders()
			}
		);

		if (handleUnauthorized(response)) {

			clearSelect("customerId");

			appendOption(
				document.getElementById("customerId"),
				"",
				"Unable to load"
			);

			return;

		}

		const result = await safeJson(response);

		clearSelect("customerId");

		appendOption(select, "", "Select Customer");

		if (!response.ok) {

			customers = [];

			showError(
				getApiErrorMessage(
					result,
					"Unable to load customers."
				)
			);

			return;
		}

		customers = Array.isArray(result)
			? result
			: [];

		if (!customers.length) {

			clearSelect("customerId");

			appendOption(
				select,
				"",
				"No Customers Available"
			);

			return;
		}

		customers.forEach(customer => {

			appendOption(

				select,

				customer.id,

				customer.customerName || "Customer"

			);

		});

	}
	catch (e) {

		console.error(e);

		customers = [];

		clearSelect("customerId");

		appendOption(
			select,
			"",
			"Service Unavailable"
		);

		showError(
			"Unable to load customers."
		);

	}

}

async function loadMedicines() {

	try {

		const response = await fetch(

			`${API_BASE}/saas/inventory/stocks?tenantId=${tenantId}`,

			{
				headers: authHeaders()
			}

		);

		if (handleUnauthorized(response)) {

			clearSelect("customerId");

			appendOption(
				document.getElementById("customerId"),
				"",
				"Unable to load"
			);

			return;

		}

		const result = await safeJson(response);

		if (!response.ok) {

			medicines = [];

			showError(
				getApiErrorMessage(
					result,
					"Unable to load inventory medicines."
				)
			);

			return;
		}

		/* Only active medicines having stock */

		medicines = Array.isArray(result)
			? result.filter(stock =>
				stock.active === true &&
				(stock.currentQuantity ?? 0) > 0
			)
			: [];

		console.log("Inventory Medicines :", medicines);

		medicineOptionsHtml = medicines.map(stock => `

    <option value="${stock.medicineId}">
        ${escapeHtml(stock.medicineName)}
        (Batch : ${escapeHtml(stock.batchNumber || "-")})
        - Stock : ${stock.currentQuantity}
    </option>

`).join("");

	}
	catch (e) {

		console.error(e);

		medicines = [];

		showError("Unable to load inventory medicines.");

	}

}

function bindCustomerSelection() {

	const customer = document.getElementById("customerId");

	if (!customer) return;

	customer.addEventListener("change", function() {

		const selected = customers.find(

			c => Number(c.id) === Number(this.value)

		);

		if (!selected) {

			setValue("customerCode", "");
			setValue("customerType", "");
			setValue("customerGstin", "");

			return;
		}

		setValue(
			"customerCode",
			selected.customerCode || ""
		);

		setValue(
			"customerType",
			selected.customerType || ""
		);

		setValue(
			"customerGstin",
			selected.gstin || ""
		);

	});

}


/* ===========================================================
   PART 8
   MISSING HELPERS
=========================================================== */

function loadingContent(title, message) {

	return `
        <div class="hospital-billing-state">

            <div class="hospital-billing-state-icon hospital-billing-loading-icon">
                <i class="bi bi-arrow-repeat"></i>
            </div>

            <h5 class="fw-bold text-primary">
                ${title}
            </h5>

            <p class="text-muted mb-0">
                ${message}
            </p>

        </div>
    `;

}

function showOrHideById(id, show) {

	const element = document.getElementById(id);

	if (!element) {
		return;
	}

	element.style.display = show ? "" : "none";

}

function showOrHideByClass(className, show) {

	document.querySelectorAll("." + className).forEach(element => {

		element.style.display = show ? "" : "none";

	});

}

function formatShortMoney(value) {

	value = Number(value || 0);

	if (value >= 10000000) {
		return "₹" + (value / 10000000).toFixed(2) + " Cr";
	}

	if (value >= 100000) {
		return "₹" + (value / 100000).toFixed(2) + " L";
	}

	if (value >= 1000) {
		return "₹" + (value / 1000).toFixed(1) + " K";
	}

	return "₹" + currencyFormatter.format(value);

}

function setAnimatedNumber(id, value, prefix = "") {

	const element = document.getElementById(id);

	if (!element) {
		return;
	}

	const target = Number(value || 0);

	const start = Number(element.dataset.value || 0);

	const duration = 500;

	const startTime = performance.now();

	function animate(time) {

		const progress = Math.min((time - startTime) / duration, 1);

		const current = start + ((target - start) * progress);

		element.dataset.value = target;

		if (prefix === "₹") {
			element.textContent = prefix + currencyFormatter.format(current);
		} else {
			element.textContent = Math.round(current);
		}

		if (progress < 1) {
			requestAnimationFrame(animate);
		}

	}

	requestAnimationFrame(animate);

}

/* ===========================================================
   PART 9
   SALE PREVIEW / VIEW / PRINT
=========================================================== */

async function viewSale(saleId) {

	if (!saleId) {
		return;
	}

	editingSaleId = saleId;

	const previewBody = document.getElementById("salePreviewBody");

	if (previewBody) {

		previewBody.innerHTML = loadingContent(
			"Loading Invoice",
			"Please wait while invoice details are loading..."
		);

	}

	previewModal?.show();

	try {

		const response = await fetch(
			`${API_BASE}/saas/sales/${saleId}?tenantId=${tenantId}`,
			{
				headers: authHeaders()
			}
		);

		if (handleUnauthorized(response)) {

			clearSelect("customerId");

			appendOption(
				document.getElementById("customerId"),
				"",
				"Unable to load"
			);

			return;

		}

		if (!response.ok) {
			throw new Error("Unable to load invoice.");
		}

		const sale = await response.json();

		renderSalePreview(sale);

	} catch (error) {

		if (previewBody) {

			previewBody.innerHTML = `
                <div class="hospital-billing-state">

                    <div class="hospital-billing-state-icon bg-danger text-white">

                        <i class="bi bi-exclamation-circle"></i>

                    </div>

                    <h5 class="text-danger fw-bold">

                        Failed to Load Invoice

                    </h5>

                    <p class="text-muted mb-0">

                        ${error.message}

                    </p>

                </div>
            `;

		}

	}

}

/* ===========================================================
   PREVIEW HTML
=========================================================== */

function renderSalePreview(sale) {

	const previewBody = document.getElementById("salePreviewBody");

	if (!previewBody) {
		return;
	}

	const items = sale.items || [];

	previewBody.innerHTML = `

        <div class="row mb-4">

            <div class="col-md-6">

                <h5 class="fw-bold text-primary">
                    ${sale.saleNumber || "-"}
                </h5>

                <div>Customer :
                    <strong>${sale.customerName || "-"}</strong>
                </div>

                <div>Date :
                    ${formatDateTime(sale.saleDate)}
                </div>

            </div>

            <div class="col-md-6 text-md-end">

                <div>
                    Payment :
                    <strong>${sale.paymentStatus || "-"}</strong>
                </div>

                <div>
                    Mode :
                    <strong>${sale.paymentMode || "-"}</strong>
                </div>

            </div>

        </div>

        <div class="table-responsive">

            <table class="table table-bordered">

                <thead>

                    <tr>

                        <th>Medicine</th>

                        <th>Qty</th>

                        <th>Rate</th>

                        <th>Discount</th>

                        <th>GST</th>

                        <th>Total</th>

                    </tr>

                </thead>

                <tbody>

                    ${items.map(item => `

                        <tr>

                            <td>${item.medicineName || "-"}</td>

                            <td>${item.quantity}</td>

                            <td>${formatMoney(item.saleRate || item.rate)}</td>

                            <td>${item.discountPercentage || 0}%</td>

                            <td>${item.gstPercentage || 0}%</td>

                            <td>${formatMoney(item.lineTotal)}</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

        <hr>

        <div class="row">

            <div class="col-md-4">

                <strong>Gross :</strong>
                ${formatMoney(sale.grossAmount || 0)}

            </div>

            <div class="col-md-4">

                <strong>Discount :</strong>
                ${formatMoney(sale.discountAmount || 0)}

            </div>

            <div class="col-md-4">

                <strong>GST :</strong>
                ${formatMoney(sale.gstAmount || 0)}

            </div>

            <div class="col-md-4 mt-3">

                <strong>Grand Total :</strong>
                ${formatMoney(sale.grandTotal || 0)}

            </div>

            <div class="col-md-4 mt-3">

                <strong>Paid :</strong>
                ${formatMoney(sale.paidAmount || 0)}

            </div>

            <div class="col-md-4 mt-3">

                <strong>Due :</strong>
                ${formatMoney(sale.dueAmount || 0)}

            </div>

        </div>

    `;

}

/* ===========================================================
   CLOSE PREVIEW
=========================================================== */

function closeSalePreview() {

	editingSaleId = null;

	previewModal?.hide();

}

/* ===========================================================
   UPDATE SALES SUMMARY
=========================================================== */

function updateSalesSummary(list) {

	list = Array.isArray(list) ? list : [];

	let totalSales = list.length;

	let totalAmount = 0;

	let totalPaid = 0;

	let totalDue = 0;

	list.forEach(sale => {

		totalAmount += Number(sale.grandTotal || 0);

		totalPaid += Number(sale.paidAmount || 0);

		totalDue += Number(sale.dueAmount || 0);

	});

	setAnimatedNumber(
		"summaryTotalSales",
		totalSales
	);

	setAnimatedNumber(
		"summaryTotalAmount",
		totalAmount,
		"₹"
	);

	setAnimatedNumber(
		"summaryPaidAmount",
		totalPaid,
		"₹"
	);

	setAnimatedNumber(
		"summaryDueAmount",
		totalDue,
		"₹"
	);

}

/* ===========================================================
   CLEAR SEARCH
=========================================================== */

function clearSearch() {

	const input = document.getElementById("searchKeyword");

	if (!input) {
		return;
	}

	input.value = "";

	filterSales();

}

function authHeaders() {

	const token = localStorage.getItem("token");

	return {

		"Authorization": "Bearer " + token,
		"Content-Type": "application/json",
		"Accept": "application/json"

	};

}

function showLoader() {

	const loader = document.getElementById("pageLoader");

	if (loader) {

		loader.classList.remove("d-none");

	}

}

function hideLoader() {

	const loader = document.getElementById("pageLoader");

	if (loader) {

		loader.classList.add("d-none");

	}

}

/* ===========================================================
   HANDLE UNAUTHORIZED
=========================================================== */

function handleUnauthorized(response) {

	if (response.status === 401) {

		localStorage.clear();

		showError("Your session has expired. Please login again.");

		setTimeout(() => {

			window.location.href = "/login";

		}, 1000);

		return true;

	}

	if (response.status === 403) {

		showError("You do not have permission to perform this action.");

		return true;

	}

	return false;

}

async function safeJson(response) {

	const type =
		response.headers.get("content-type");

	if (
		!type ||
		!type.includes("application/json")
	) {

		return {};

	}

	try {

		return await response.json();

	}

	catch {

		return {};

	}

}

function safe(value) {

	return value == null ? "" : escapeHtml(String(value));

}

function escapeHtml(text) {

	return String(text || "")

		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

}

function setButtonLoading(id, text, loading) {

	const button = document.getElementById(id);

	if (!button) {
		return;
	}

	if (!button.dataset.originalText) {

		button.dataset.originalText = button.innerHTML;

	}

	if (loading) {

		button.disabled = true;

		button.innerHTML =
			`<span class="spinner-border spinner-border-sm me-2"></span>${text}`;

	} else {

		button.disabled = false;

		button.innerHTML = button.dataset.originalText;

	}

}

function setText(id, value) {

	const element = document.getElementById(id);

	if (element) {

		element.textContent = value;

	}

}

function setValue(id, value) {

	const element = document.getElementById(id);

	if (element) {

		element.value = value;

	}

}

function getValue(id) {

	const element = document.getElementById(id);

	return element ? element.value : "";

}

function appendOption(select, value, text) {

	const option = document.createElement("option");

	option.value = value;

	option.textContent = text;

	select.appendChild(option);

}

function clearSelect(id) {

	const select = document.getElementById(id);

	if (select) {

		select.innerHTML = "";

	}

}

function toMoneyNumber(value) {

	const number = Number(value);

	return isNaN(number) ? 0 : number;

}

function formatMoney(value) {

	return currencyFormatter.format(Number(value || 0));

}

function formatDate(value) {

	if (!value) {
		return "-";
	}

	const datePart = String(value).split("T")[0];

	const parts = datePart.split("-");

	if (parts.length !== 3) {
		return value;
	}

	return `${parts[2]}/${parts[1]}/${parts[0]}`;

}

function formatDateTime(value) {

	if (!value) {
		return "-";
	}

	const date = new Date(value);

	if (isNaN(date.getTime())) {
		return "-";
	}

	const formatter = new Intl.DateTimeFormat("en-IN", {

		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true

	});

	return formatter.format(date);

}

function paymentStatusBadge(status) {

	status = (status || "UNPAID").toUpperCase();

	let cls = "bg-danger";

	if (status === "PAID") {

		cls = "bg-success";

	} else if (status === "PARTIAL") {

		cls = "bg-warning text-dark";

	}

	return `<span class="badge ${cls}">${status}</span>`;

}

function showSalesLoadingState() {

	const tbody = document.getElementById("salesTableBody");

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

<tr>

<td colspan="7" class="text-center py-5">

<div class="spinner-border text-primary"></div>

<div class="mt-2">

Loading sales...

</div>

</td>

</tr>

`;

}

function showSalesErrorState(message) {

	const tbody = document.getElementById("salesTableBody");

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

<tr>

<td colspan="7" class="text-center text-danger py-5">

${message}

</td>

</tr>

`;

}

function renderEmptyState() {

	const tbody = document.getElementById("salesTableBody");

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

<tr>

<td colspan="7" class="text-center text-muted py-5">

No sales found.

</td>

</tr>

`;

}

function showMsg(message, type = "danger") {

	const msg = document.getElementById("msg");

	if (!msg) {

		alert(message);
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show"
			 role="alert">

			${escapeHtml(message)}

			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert">
			</button>

		</div>
	`;

	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}

function showSuccess(message) {
	showMsg(message, "success");
}

function showError(message) {
	showMsg(message, "danger");
}

function getApiErrorMessage(result, defaultMessage) {

	if (!result) {

		return defaultMessage;

	}

	return (

		result.message ||

		result.error ||

		result.details ||

		defaultMessage

	);

}

async function loadMedicineStock(index) {

	const row = medicineRows[index];

	if (!row) return;

	const stock = medicines.find(s =>
		Number(s.id) === Number(row.stockId)
	);

	if (!stock) return;

	row.availableStock = Number(stock.currentQuantity || 0);

}
function validateMedicineStock(index) {

	const row = medicineRows[index];

	if (!row) {

		return;

	}

	if (

		row.availableStock > 0 &&

		row.quantity > row.availableStock

	) {

		showError(
			`${row.medicineName || "Selected medicine"} stock is only ${row.availableStock}.`
		);

	}

}

function updatePaymentStatus() {

	const grandElement = document.getElementById("grandTotal");

	const grand = grandElement
		? Number(grandElement.dataset.value || 0)
		: 0;

	const paid = toMoneyNumber(getValue("paidAmount"));

	const badge = document.getElementById("paymentStatus");

	if (!badge) {

		return;

	}

	badge.className = "badge";

	if (paid <= 0) {

		badge.classList.add("bg-danger");

		badge.textContent = "UNPAID";

	} else if (paid < grand) {

		badge.classList.add("bg-warning");

		badge.textContent = "PARTIAL";

	} else if (paid === grand) {

		badge.classList.add("bg-success");

		badge.textContent = "PAID";

	}
	else {

		badge.classList.add("bg-danger");

		badge.textContent = "INVALID";

	}

}