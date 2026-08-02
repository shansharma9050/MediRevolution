'use strict';

/* ===========================================================
   GLOBAL VARIABLES
=========================================================== */

let saleModal;

let tenantId = null;

let editingSaleId = null;

let customers = [];

let medicineRows = [];

let medicines = [];

let sales = [];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

/* ===========================================================
   DOM READY
=========================================================== */

document.addEventListener("DOMContentLoaded", async function() {

	const allowed = await protectSaasPage("SALES", "VIEW");

	if (!allowed) {
		return;
	}

	tenantId = Number(localStorage.getItem("tenantId"));

	if (!tenantId) {

		showErrorMessage("Tenant not found.");

		return;
	}

	document.getElementById("tenantId").value = tenantId;

	saleModal = new bootstrap.Modal(
		document.getElementById("saleModal")
	);

	bindEvents();

	await loadSummary();

	await loadCustomers();
	
	
	bindCustomerSelection();

	await loadMedicines();

	await loadSales();
	
});

/* ===========================================================
   EVENT BINDINGS
=========================================================== */

function bindEvents() {

	document
		.getElementById("btnCreateSale")
		.addEventListener("click", openCreateModal);

	document
		.getElementById("btnSaveSale")
		.addEventListener("click", saveSale);

	document
		.getElementById("btnRefresh")
		.addEventListener("click", loadSales);

	document
		.getElementById("btnSearch")
		.addEventListener("click", searchSales);

	document
		.getElementById("btnAddMedicine")
		.addEventListener("click", addMedicineRow);

	document
		.getElementById("otherCharges")
		.addEventListener("input", calculateTotals);

	document
		.getElementById("roundOffAmount")
		.addEventListener("input", calculateTotals);

	document
		.getElementById("paidAmount")
		.addEventListener("input", calculateTotals);

}

/* ===========================================================
   LOAD SUMMARY
=========================================================== */

async function loadSummary() {

    try {

        const response = await fetch(
            `${API_BASE}/summary?tenantId=${tenantId}`,
            {
                headers: authHeaders()
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load summary");
        }

        const data = await response.json();

        document.getElementById("summaryTotalSales").textContent =
            data.totalSales ?? 0;

        document.getElementById("summaryTotalAmount").textContent =
            formatMoney(data.totalAmount);

        document.getElementById("summaryPaidAmount").textContent =
            formatMoney(data.paidAmount);

        document.getElementById("summaryDueAmount").textContent =
            formatMoney(data.dueAmount);

    }
    catch (e) {
        console.error(e);
    }

}

function renderSalesTable(salesList) {

	const tbody = document.getElementById("salesTableBody");

	tbody.innerHTML = "";

	if (!salesList || salesList.length === 0) {

		tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-5">
                No Sales Found
            </td>
        </tr>`;
		return;
	}

	salesList.forEach(sale => {

		const due =
			(sale.grandTotal || 0) -
			(sale.paidAmount || 0);

		tbody.innerHTML += `

<tr>

<td>${sale.saleNumber ?? "-"}</td>

<td>${formatDate(sale.saleDate)}</td>

<td>${sale.customerName ?? "-"}</td>

<td>₹ ${Number(sale.grandTotal || 0).toFixed(2)}</td>

<td>₹ ${Number(sale.paidAmount || 0).toFixed(2)}</td>

<td>₹ ${Number(due).toFixed(2)}</td>

<td>

<span class="badge bg-${paymentStatusColor(sale.paymentStatus)}">

${sale.paymentStatus ?? "-"}

</span>

</td>

<td>

<button class="btn btn-sm btn-outline-primary"
onclick="viewSale(${sale.id})">

<i class="bi bi-eye"></i>

</button>

<button class="btn btn-sm btn-outline-success"
onclick="openEditModal(${sale.id})">

<i class="bi bi-pencil"></i>

</button>

<button class="btn btn-sm btn-outline-danger"
onclick="deleteSale(${sale.id})">

<i class="bi bi-trash"></i>

</button>

<button class="btn btn-sm btn-outline-dark"
onclick="printInvoice(${sale.id})">

<i class="bi bi-printer"></i>

</button>

</td>

</tr>

`;

	});

}

// =======================================================
// Create Sale
// =======================================================

function openCreateModal() {

	editingSaleId = null;

	resetSaleForm();

	document.getElementById("saleModalTitle").innerText =
		"Create Sale";

	saleModal.show();

}


function resetSaleForm() {

    editingSaleId = null;

    document.getElementById("saleId").value = "";

    document.getElementById("customerId").value = "";

    document.getElementById("saleDate").value = "";

    document.getElementById("paymentMode").value = "CASH";

    document.getElementById("remarks").value = "";

    document.getElementById("paidAmount").value = 0;

    document.getElementById("otherCharges").value = 0;

    document.getElementById("roundOffAmount").value = 0;

    medicineRows = [];

    document.getElementById("medicineTableBody").innerHTML = "";

    calculateTotals();

}

// =======================================================
// Edit Sale
// =======================================================

async function openEditModal(saleId) {

	editingSaleId = saleId;

	resetSaleForm();

	document.getElementById("saleModalTitle").innerText =
		"Update Sale";

	await loadSale(saleId);

	saleModal.show();

}




// =======================================================
// Delete Sale
// =======================================================

async function deleteSale(saleId) {

	if (!confirm("Cancel this sale?")) {
		return;
	}

	try {

		showLoader();

		const response = await fetch(

			`${API_BASE}/${saleId}?tenantId=${tenantId}`,

			{
				method: "DELETE",
				headers: authHeaders()
			}

		);

		if (!response.ok) {

			throw new Error("Unable to cancel sale.");

		}

		showSuccess("Sale cancelled successfully.");

		await loadSummary();

		await loadSales();

	}

	catch (e) {

		console.error(e);

		showError(e.message);

	}

	finally {

		hideLoader();

	}

}


// =======================================================
// Print Invoice
// =======================================================

function printInvoice(saleId) {

	window.open(

		`${API_BASE}/saas/wholesaler/invoice/${saleId}/pdf?tenantId=${tenantId}`,

		"_blank"

	);

}


// =======================================================
// View Sale
// =======================================================

async function viewSale(saleId) {

	try {

		showLoader();

		const response = await fetch(

			`${API_BASE}/${saleId}?tenantId=${tenantId}`,

			{
				headers: authHeaders()
			}

		);

		if (!response.ok) {

			throw new Error("Unable to load sale.");

		}

		const sale = await response.json();

		let html = "";

		html += `
            <b>Invoice No :</b> ${sale.saleNumber}<br>
            <b>Date :</b> ${formatDate(sale.saleDate)}<br>
            <b>Customer :</b> ${sale.customerName}<br>
            <b>Payment :</b> ${sale.paymentStatus}<br>
            <hr/>
        `;

		if (sale.items) {

			sale.items.forEach(item => {

				html += `
                    <div class="mb-2">

                        <b>${item.medicineName}</b>

                        (${item.quantity})

                        ×

                        ${formatMoney(item.saleRate)}

                        =

                        ${formatMoney(item.lineTotal)}

                    </div>
                `;

			});

		}

		html += `
            <hr/>

            <h5 class="text-end">

                Grand Total :
                ${formatMoney(sale.grandTotal)}

            </h5>
        `;

		document.getElementById("salePreviewBody").innerHTML =
			html;

	}

	catch (e) {

		console.error(e);

		showError(e.message);

	}

	finally {

		hideLoader();

	}

}

// =======================================================
// Save Sale
// =======================================================

async function saveSale() {

	try {

		const request = collectSaleRequest();

		showLoader();

		let response;

		if (editingSaleId == null) {

			response = await fetch(
				API_BASE,
				{
					method: "POST",
					headers: authHeaders(),
					body: JSON.stringify(request)
				}
			);

		} else {

			response = await fetch(
				`${API_BASE}/${editingSaleId}`,
				{
					method: "PUT",
					headers: authHeaders(),
					body: JSON.stringify(request)
				}
			);

		}

		if (!response.ok) {

			const message = await response.text();

			throw new Error(message || "Unable to save sale.");

		}

		saleModal.hide();

		showSuccess(
			editingSaleId == null
				? "Sale created successfully."
				: "Sale updated successfully."
		);

		await loadSummary();

		await loadSales();

	}
	catch (e) {

		console.error(e);

		showError(e.message);

	}
	finally {

		hideLoader();

	}

}



// =======================================================
// Collect Request
// =======================================================

function collectSaleRequest() {

	if (medicineRows.length === 0) {

		throw new Error("Add at least one medicine.");

	}

	return {

		tenantId: tenantId,

		customerId: Number(
			document.getElementById("customerId").value
		),

		saleDate:
			document.getElementById("saleDate").value,

		remarks:
			document.getElementById("remarks").value,

		paidAmount: Number(
			document.getElementById("paidAmount").value || 0
		),

		otherCharges: Number(
			document.getElementById("otherCharges").value || 0
		),

		roundOffAmount: Number(
			document.getElementById("roundOffAmount").value || 0
		),

		paymentMode:
			document.getElementById("paymentMode").value,

		items: medicineRows.map(r => ({

			medicineId: Number(r.medicineId),

			quantity: Number(r.quantity),

			saleRate: Number(r.saleRate),

			discountPercentage:
				Number(r.discountPercentage),

			gstPercentage:
				Number(r.gstPercentage)

		}))

	};

}



// =======================================================
// Add Medicine Row
// =======================================================

function addMedicineRow(data = null) {

	medicineRows.push({

		medicineId:
			data?.medicineId || "",

		quantity:
			data?.quantity || 1,

		saleRate:
			data?.saleRate || 0,

		discountPercentage:
			data?.discountPercentage || 0,

		gstPercentage:
			data?.gstPercentage || 0,

		lineTotal:
			data?.lineTotal || 0

	});

	renderMedicineRows();

}



// =======================================================
// Remove Medicine
// =======================================================

function removeMedicineRow(index) {

	medicineRows.splice(index, 1);

	renderMedicineRows();

	calculateTotals();

}



// =======================================================
// Render Medicine Rows
// =======================================================

function renderMedicineRows() {

	const tbody =
		document.getElementById("medicineTableBody");

	tbody.innerHTML = "";

	medicineRows.forEach((row, index) => {

		tbody.innerHTML += `

<tr>

<td>

<select
class="form-select medicine-select"
data-index="${index}">

<option value="">Select</option>

${medicineOptions()}

</select>

</td>

<td>

<input
type="number"
class="form-control quantity-input"
data-index="${index}"
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

<td class="line-total">

${formatMoney(row.lineTotal)}

</td>

<td>

<button
class="btn btn-danger btn-sm"
onclick="removeMedicineRow(${index})">

<i class="bi bi-trash"></i>

</button>

</td>

</tr>

`;

	});

	bindMedicineEvents();

}



// =======================================================
// Medicine Row Events
// =======================================================

function bindMedicineEvents() {

	document
		.querySelectorAll(".medicine-select")
		.forEach(el => {

			el.addEventListener("change", function() {

				const i = Number(this.dataset.index);

				medicineRows[i].medicineId = this.value;

				validateMedicineStock(i);

			});

		});

	document
		.querySelectorAll(".quantity-input")
		.forEach(el => {

			el.addEventListener("input", function() {

				const i = Number(this.dataset.index);

				medicineRows[i].quantity =
					Number(this.value);

				calculateTotals();

				validateMedicineStock(i);

			});

		});

	document
		.querySelectorAll(".rate-input")
		.forEach(el => {

			el.addEventListener("input", function() {

				medicineRows[
					Number(this.dataset.index)
				].saleRate = Number(this.value);

				calculateTotals();

			});

		});

	document
		.querySelectorAll(".discount-input")
		.forEach(el => {

			el.addEventListener("input", function() {

				medicineRows[
					Number(this.dataset.index)
				].discountPercentage =
					Number(this.value);

				calculateTotals();

			});

		});

	document
		.querySelectorAll(".gst-input")
		.forEach(el => {

			el.addEventListener("input", function() {

				medicineRows[
					Number(this.dataset.index)
				].gstPercentage =
					Number(this.value);

				calculateTotals();

			});

		});

}



function calculateTotals() {

    let gross = 0;
    let discount = 0;
    let taxable = 0;
    let gst = 0;

    medicineRows.forEach(row => {

        const lineGross =
            row.quantity * row.saleRate;

        const lineDiscount =
            lineGross * row.discountPercentage / 100;

        const lineTaxable =
            lineGross - lineDiscount;

        const lineGST =
            lineTaxable * row.gstPercentage / 100;

        row.lineTotal =
            lineTaxable + lineGST;

        gross += lineGross;
        discount += lineDiscount;
        taxable += lineTaxable;
        gst += lineGST;

    });

    renderMedicineRows();

    const other =
        Number(document.getElementById("otherCharges").value || 0);

    const round =
        Number(document.getElementById("roundOffAmount").value || 0);

    const grand =
        taxable + gst + other + round;

    document.getElementById("grossAmount").value =
        gross.toFixed(2);

    document.getElementById("discountAmount").value =
        discount.toFixed(2);

    document.getElementById("taxableAmount").value =
        taxable.toFixed(2);

    document.getElementById("gstAmount").value =
        gst.toFixed(2);

    document.getElementById("grandTotal").value =
        grand.toFixed(2);

    const paid =
        Number(document.getElementById("paidAmount").value || 0);

    document.getElementById("dueAmount").value =
        (grand - paid).toFixed(2);

}
// =======================================================
// Load Customers
// =======================================================

async function loadCustomers() {

    const tenantId = localStorage.getItem("tenantId");

    const response = await fetch(
        API_BASE + "/saas/customers?tenantId=" + tenantId,
        {
            headers: getAuthHeaders()
        }
    );

    if (!response.ok) {
        throw new Error("Unable to load customers");
    }

    const customers = await response.json();

    const select = document.getElementById("customer");

    select.innerHTML = '<option value="">Select Customer</option>';

    customers.forEach(customer => {

        select.innerHTML += `
            <option value="${customer.id}">
                ${customer.customerName}
            </option>
        `;

    });

}


// =======================================================
// Load Medicines
// =======================================================

async function loadMedicines() {

	try {

		const response = await fetch(
			`${API_BASE}/saas/medicine-master` +
			`?tenantId=${encodeURIComponent(tenantId)}`,
			{
				headers: authHeaders()
			}
		);

		if (!response.ok) {
			throw new Error("Unable to load medicines.");
		}

		medicines = await response.json();

	}
	catch (e) {

		console.error(e);

		showError(e.message);

	}

}



// =======================================================
// Medicine Options
// =======================================================

function medicineOptions() {

	let html = "";

	medicines.forEach(medicine => {

		html += `

<option
value="${medicine.id}">

${medicine.medicineName}

</option>

`;

	});

	return html;

}



// =======================================================
// Search Sales
// =======================================================

async function searchSales() {

	const keyword =
		document
			.getElementById("searchKeyword")
			.value
			.trim();

	if (keyword === "") {

		loadSales();

		return;

	}

	try {

		showLoader();

		const response = await fetch(

			`${API_BASE}/search?tenantId=${tenantId}&keyword=${encodeURIComponent(keyword)}`,

			{
				headers: authHeaders()
			}

		);

		if (!response.ok) {
			throw new Error("Search failed.");
		}

		sales = await response.json();

		renderSalesTable(sales);

	}
	catch (e) {

		console.error(e);

		showError(e.message);

	}
	finally {

		hideLoader();

	}

}



// =======================================================
// Filter Sales
// =======================================================

function filterSales() {

	const keyword =
		document
			.getElementById("searchKeyword")
			.value
			.toLowerCase();

	const filtered = sales.filter(sale =>

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

	renderSalesTable(filtered);

}



// =======================================================
// Refresh Summary
// =======================================================

async function refreshSummary() {

	await loadSummary();

}



// =======================================================
// Format Money
// =======================================================

function formatMoney(value) {

	const amount = Number(value || 0);

	return "₹ " + amount.toFixed(2);

}



// =======================================================
// Format Date
// =======================================================

function formatDate(value) {

	if (!value) {

		return "-";

	}

	return new Date(value)
		.toLocaleDateString("en-IN");

}



// =======================================================
// Authorization Headers
// =======================================================

function authHeaders() {

	return {

		"Content-Type": "application/json",

		"Authorization":
			"Bearer " + localStorage.getItem("token")

	};

}



// =======================================================
// Loader
// =======================================================

function showLoader() {

	const loader =
		document.getElementById("pageLoader");

	if (loader) {

		loader.classList.remove("d-none");

	}

}



function hideLoader() {

	const loader =
		document.getElementById("pageLoader");

	if (loader) {

		loader.classList.add("d-none");

	}

}



// =======================================================
// Success
// =======================================================

function showSuccess(message) {

	if (window.Toastify) {

		Toastify({

			text: message,

			duration: 3000,

			gravity: "top",

			position: "right",

			className: "bg-success"

		}).showToast();

	} else {

		alert(message);

	}

}



// =======================================================
// Error
// =======================================================

function showError(message) {

	if (window.Toastify) {

		Toastify({

			text: message,

			duration: 4000,

			gravity: "top",

			position: "right",

			className: "bg-danger"

		}).showToast();

	} else {

		alert(message);

	}

}

// =======================================================
// Load Sale
// =======================================================

async function loadSale(id) {

	showLoader();

	try {

		const response = await fetch(

			`${API_BASE}/${id}?tenantId=${tenantId}`,

			{
				headers: authHeaders()
			}

		);

		if (!response.ok) {

			throw new Error("Unable to load sale.");

		}

		const sale = await response.json();

		document.getElementById("customerId").value =
			sale.customerId;

		document.getElementById("saleDate").value =
			sale.saleDate;

		document.getElementById("remarks").value =
			sale.remarks || "";

		document.getElementById("paidAmount").value =
			sale.paidAmount || 0;

		document.getElementById("otherCharges").value =
			sale.otherCharges || 0;

		document.getElementById("roundOffAmount").value =
			sale.roundOffAmount || 0;

		medicineRows = [];

		if (sale.items) {

			sale.items.forEach(item => {

				medicineRows.push({

					medicineId:
						item.medicineId,

					quantity:
						item.quantity,

					saleRate:
						item.saleRate,

					discountPercentage:
						item.discountPercentage,

					gstPercentage:
						item.gstPercentage,

					lineTotal:
						item.lineTotal,

					availableStock: 0

				});

			});

		}

		renderMedicineRows();

		calculateTotals();

		updatePaymentStatus();

	}
	finally {

		hideLoader();

	}

}



// =======================================================
// Customer Auto Fill
// =======================================================

function bindCustomerSelection() {

	document
		.getElementById("customerId")
		.addEventListener("change", function() {

			const customer =
				customers.find(c =>
					c.id == this.value
				);

			if (!customer) {

				return;

			}

			document.getElementById("customerCode").value =
				customer.customerCode || "";

			document.getElementById("customerType").value =
				customer.customerType || "";

			document.getElementById("customerGstin").value =
				customer.gstin || "";

		});

}



// =======================================================
// Medicine Stock Display
// =======================================================

async function loadMedicineStock(index) {

	const row = medicineRows[index];

	if (!row.medicineId) {

		return;

	}

	try {

		const response = await fetch(

			`${API_BASE}/stock?tenantId=${tenantId}&medicineId=${row.medicineId}`,

			{
				headers: authHeaders()
			}

		);

		if (!response.ok) {

			return;

		}

		const stock = await response.json();

		row.availableStock = stock;

		const badge =
			document.querySelector(
				`.stock-badge-${index}`
			);

		if (badge) {

			badge.innerHTML =
				"Stock : " + stock;

		}

	}
	catch (e) {

		console.error(e);

	}

}



// =======================================================
// Live Stock Validation
// =======================================================

async function validateMedicineStock(index) {

	const row = medicineRows[index];

	if (!row.medicineId) {

		return;

	}

	await loadMedicineStock(index);

	if (
		row.availableStock <
		row.quantity
	) {

		showError(

			"Only " +
			row.availableStock +
			" stock available."

		);

	}

}



function updatePaymentStatus() {

    const grand =
        Number(document.getElementById("grandTotal").value || 0);

    const paid =
        Number(document.getElementById("paidAmount").value || 0);

    let status = "UNPAID";

    if (paid >= grand && grand > 0) {

        status = "PAID";

    }
    else if (paid > 0) {

        status = "PARTIALLY_PAID";

    }

    const badge =
        document.getElementById("paymentStatus");

    if (!badge) return;

    badge.innerText = status;

    badge.className =
        "badge " +
        (
            status === "PAID"
                ? "bg-success"
                : status === "PARTIALLY_PAID"
                    ? "bg-warning text-dark"
                    : "bg-danger"
        );

}

// =======================================================
// Empty State
// =======================================================

function renderEmptyState() {

	document.getElementById(
		"salesTableBody"
	).innerHTML = `

<tr>

<td colspan="9" class="text-center py-5">

<i class="bi bi-receipt-cutoff fs-1 text-muted"></i>

<div class="mt-3 fw-bold">

No Sales Found

</div>

</td>

</tr>

`;

}

function paymentStatusColor(status) {

    switch (status) {

        case "PAID":
            return "success";

        case "PARTIALLY_PAID":
            return "warning text-dark";

        case "UNPAID":
            return "danger";

        default:
            return "secondary";
    }

}

function saleStatusColor(status) {

    switch (status) {

        case "COMPLETED":
            return "success";

        case "PENDING":
            return "warning text-dark";

        case "CANCELLED":
            return "danger";

        default:
            return "secondary";
    }

}

function showLoading(show) {

    const loading =
        document.getElementById("loadingArea");

    if (!loading) return;

    loading.style.display =
        show ? "block" : "none";

}

// =======================================================
// Validation
// =======================================================

function validateSaleForm() {

	if (!document.getElementById("customerId").value) {

		showError("Select customer.");

		return false;

	}

	if (medicineRows.length === 0) {

		showError("Add at least one medicine.");

		return false;

	}

	return true;

}



// =======================================================
// Professional Refresh
// =======================================================

async function refreshBillingPage() {

	await loadSummary();

	await loadSales();

}