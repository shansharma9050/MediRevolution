let invoiceModal;
let paymentModal;
let invoiceViewModal;

let allInvoices = [];
let isLoadingInvoices = false;
let isSavingInvoice = false;
let isSavingPayment = false;
let isGeneratingIpdBill = false;

let billingPermissions = {
	create: false,
	update: false,
	delete: false,
	print: false
};

document.addEventListener("DOMContentLoaded", async function() {
	const allowed = await protectSaasPage("BILLING", "VIEW");
	if (!allowed) return;

	const tenantId = localStorage.getItem("tenantId");
	const tenantName = localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText("tenantNameText", tenantName || "your workspace");

	invoiceModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("invoiceModal"));
	paymentModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("paymentModal"));
	invoiceViewModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("invoiceViewModal"));

	await loadBillingPermissions();

	await Promise.all([
		loadPatientsDropdown(),
		loadDoctorsDropdown(),
		loadAdmissionsDropdown()
	]);

	await loadInvoices();
});

async function loadBillingPermissions() {
	const [canCreate, canUpdate, canDelete, canPrint] = await Promise.all([
		hasSaasPermission("BILLING", "CREATE"),
		hasSaasPermission("BILLING", "UPDATE"),
		hasSaasPermission("BILLING", "DELETE"),
		hasSaasPermission("BILLING", "PRINT")
	]);

	billingPermissions = {
		create: Boolean(canCreate),
		update: Boolean(canUpdate),
		delete: Boolean(canDelete),
		print: Boolean(canPrint)
	};

	applyBillingButtonPermissions();
}

function applyBillingButtonPermissions() {
	showOrHideById("createInvoiceBtn", billingPermissions.create);
	showOrHideById("createIpdBillBtn", billingPermissions.create);
	showOrHideByClass("update-invoice-btn", billingPermissions.update);
	showOrHideByClass("delete-invoice-btn", billingPermissions.delete);
	showOrHideByClass("print-invoice-btn", billingPermissions.print);
}

async function loadInvoices() {
	if (isLoadingInvoices) return;

	isLoadingInvoices = true;

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	showInvoicesLoadingState();
	setButtonLoading("refreshInvoicesBtn", "Refreshing...", true);

	try {
		const query = new URLSearchParams({ tenantId });

		const response = await fetch(
			`${API_BASE}/saas/billing/invoices?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			allInvoices = [];
			const message = getApiErrorMessage(result, "Unable to load invoices.");
			showMsg(message);
			showInvoicesErrorState(message);
			updateBillingSummary([]);
			return;
		}

		allInvoices = Array.isArray(result) ? result : [];
		allInvoices.sort((a, b) => safeDateTimestamp(b.invoiceDateTime) - safeDateTimestamp(a.invoiceDateTime));

		renderInvoices(allInvoices);
		updateBillingSummary(allInvoices);
		applyBillingButtonPermissions();

	} catch (error) {
		console.error("Load invoices error:", error);
		allInvoices = [];
		showMsg("SaaS service not reachable.");
		showInvoicesErrorState("SaaS billing service is currently unavailable.");
		updateBillingSummary([]);
	} finally {
		isLoadingInvoices = false;
		setButtonLoading("refreshInvoicesBtn", "Refresh", false);
	}
}

function renderInvoices(invoices) {
	const tbody = document.getElementById("invoiceTableBody");
	if (!tbody) return;

	const list = Array.isArray(invoices) ? invoices : [];

	if (!list.length) {
		tbody.innerHTML = `
			<tr><td colspan="8">
				<div class="billing-state">
					<div class="billing-state-icon"><i class="bi bi-receipt"></i></div>
					<h5 class="fw-bold text-primary">No invoices found</h5>
					<p class="text-muted mb-0">Create a patient invoice or change the selected filter.</p>
				</div>
			</td></tr>
		`;
		return;
	}

	tbody.innerHTML = list.map((invoice, index) => {
		const id = safeNumber(invoice.id);

		return `
			<tr style="--row-delay:${Math.min(index * 55, 330)}ms">
				<td>
					<strong class="text-primary">${safe(invoice.invoiceNumber)}</strong>
					<div class="text-muted small"><i class="bi bi-calendar3 me-1"></i>${formatDate(invoice.invoiceDateTime)}</div>
				</td>

				<td>
					<div class="billing-patient">
						<div class="billing-patient-icon"><i class="bi bi-person-fill"></i></div>
						<div>
							<strong class="text-primary">${safe(invoice.patientName)}</strong>
							<div class="text-muted small">${safe(invoice.patientMobile)}</div>
						</div>
					</div>
				</td>

				<td>${invoiceTypeBadge(invoice.invoiceType)}</td>
				<td><strong>₹${formatMoney(invoice.totalAmount)}</strong></td>
				<td><strong class="text-success">₹${formatMoney(invoice.paidAmount)}</strong></td>
				<td><strong class="text-danger">₹${formatMoney(invoice.dueAmount)}</strong></td>
				<td>${paymentStatusBadge(invoice.paymentStatus)}</td>

				<td>
					<div class="billing-actions">
						<button type="button"
								id="downloadInvoiceBtn_${id}"
								class="btn btn-sm btn-outline-secondary print-invoice-btn"
								onclick="downloadInvoicePdf(${id})"
								${id ? "" : "disabled"}>
							<i class="bi bi-file-earmark-pdf-fill me-1"></i>PDF
						</button>

						${invoice.paymentStatus !== "PAID" ? `
							<button type="button"
									class="btn btn-sm btn-outline-primary update-invoice-btn"
									onclick="openPaymentModal(${id}, ${toMoneyNumber(invoice.dueAmount) || toMoneyNumber(invoice.totalAmount)})">
								<i class="bi bi-credit-card-fill me-1"></i>Pay
							</button>
						` : ""}

						<button type="button"
								class="btn btn-sm btn-outline-info"
								onclick="viewInvoice(${id})"
								${id ? "" : "disabled"}>
							<i class="bi bi-eye-fill me-1"></i>View
						</button>
					</div>
				</td>
			</tr>
		`;
	}).join("");

	applyBillingButtonPermissions();
}

function invoiceTypeBadge(type) {
	const value = String(type || "GENERAL").toUpperCase();
	const icons = {
		OPD: "bi bi-hospital",
		IPD: "bi bi-building-fill-add",
		PHARMACY: "bi bi-capsule-pill",
		LAB: "bi bi-eyedropper",
		GENERAL: "bi bi-receipt"
	};

	return `<span class="billing-pill type"><i class="${icons[value] || icons.GENERAL}"></i>${escapeHtml(value)}</span>`;
}

function paymentStatusBadge(status) {
	const value = String(status || "PENDING").toUpperCase();
	const css = value.toLowerCase().replace(/_/g, "-");
	const icons = {
		PAID: "bi bi-check-circle-fill",
		PARTIAL: "bi bi-circle-half",
		CANCELLED: "bi bi-x-circle-fill",
		PENDING: "bi bi-hourglass-split",
		UNPAID: "bi bi-hourglass-split"
	};

	return `<span class="billing-pill ${escapeHtml(css)}"><i class="${icons[value] || icons.PENDING}"></i>${escapeHtml(value.replace(/_/g, " "))}</span>`;
}

function openInvoiceModal() {
	if (!billingPermissions.create) {
		showMsg("You do not have permission to create invoices.");
		return;
	}

	clearInvoiceForm();
	addInvoiceItemRow();
	updateInvoicePreview();
	invoiceModal.show();
}

async function saveInvoice() {
	if (isSavingInvoice) return;

	if (!billingPermissions.create) {
		showMsg("You do not have permission to create invoices.");
		return;
	}

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");
	const items = collectInvoiceItems();

	const payload = {
		tenantId: toPositiveNumberOrNull(tenantId),
		patientId: toPositiveNumberOrNull(getValue("patientId")),
		doctorProfileId: toPositiveNumberOrNull(getValue("doctorProfileId")),
		opdVisitId: toPositiveNumberOrNull(getValue("opdVisitId")),
		ipdAdmissionId: toPositiveNumberOrNull(getValue("ipdAdmissionId")),
		invoiceType: getValue("invoiceType"),
		discountAmount: toNonNegativeNumber(getValue("discountAmount")),
		taxAmount: toNonNegativeNumber(getValue("taxAmount")),
		paidAmount: toNonNegativeNumber(getValue("paidAmount")),
		paymentMode: getValue("paymentMode"),
		transactionId: getValue("transactionId"),
		notes: getValue("notes"),
		items
	};

	if (!payload.tenantId) return showMsg("Please select SaaS workspace first.");
	if (!payload.patientId) return showMsg("Please select patient.");
	if (!payload.invoiceType) return showMsg("Please select invoice type.");
	if (!payload.items.length) return showMsg("Please add at least one valid invoice item.");

	if (payload.items.some(item => item.quantity <= 0 || item.unitPrice < 0)) {
		return showMsg("Invoice item quantity and unit price must be valid.");
	}

	const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
	const finalTotal = Math.max(0, subtotal - payload.discountAmount + payload.taxAmount);

	if (payload.discountAmount > subtotal + payload.taxAmount) {
		return showMsg("Discount cannot exceed invoice amount.");
	}

	if (payload.paidAmount > finalTotal) {
		return showMsg("Paid amount cannot exceed final invoice total.");
	}

	if (payload.paidAmount > 0 && !payload.paymentMode) {
		return showMsg("Please select payment mode.");
	}

	isSavingInvoice = true;
	setButtonLoading("saveInvoiceBtn", "Saving...", true);

	try {
		const response = await fetch(`${API_BASE}/saas/billing/invoices`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to save invoice."));
			return;
		}

		invoiceModal.hide();
		showMsg("Invoice created successfully.", "success");
		await loadInvoices();

	} catch (error) {
		console.error("Save invoice error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingInvoice = false;
		setButtonLoading("saveInvoiceBtn", "Save Invoice", false);
	}
}

async function applyPatientFilter() {
	const patientId = getValue("filterPatientId");

	if (!patientId) {
		await loadInvoices();
		return;
	}

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	setButtonLoading("filterInvoicesBtn", "Filtering...", true);
	showInvoicesLoadingState();

	try {
		const query = new URLSearchParams({ tenantId, patientId });

		const response = await fetch(
			`${API_BASE}/saas/billing/invoices/patient?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			const message = getApiErrorMessage(result, "Unable to filter invoices.");
			showMsg(message);
			showInvoicesErrorState(message);
			return;
		}

		renderInvoices(Array.isArray(result) ? result : []);

	} catch (error) {
		console.error("Filter invoices error:", error);
		showMsg("SaaS service not reachable.");
		showInvoicesErrorState("Unable to filter invoices.");
	} finally {
		setButtonLoading("filterInvoicesBtn", "Filter", false);
	}
}

async function createIpdFinalBill() {
	if (isGeneratingIpdBill) return;

	if (!billingPermissions.create) {
		showMsg("You do not have permission to generate IPD bills.");
		return;
	}

	const admissionId = getValue("filterAdmissionId");

	if (!admissionId) return showMsg("Please select IPD admission.");
	if (!confirm("Generate final IPD bill for selected admission?")) return;

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	isGeneratingIpdBill = true;
	setButtonLoading("createIpdBillBtn", "Generating...", true);

	try {
		const query = new URLSearchParams({ tenantId, admissionId });

		const response = await fetch(
			`${API_BASE}/saas/billing/invoices/ipd-final?${query.toString()}`,
			{
				method: "POST",
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to generate IPD final bill."));
			return;
		}

		showMsg("IPD final bill generated successfully.", "success");
		await loadInvoices();

	} catch (error) {
		console.error("Generate IPD final bill error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isGeneratingIpdBill = false;
		setButtonLoading("createIpdBillBtn", "IPD Bill", false);
	}
}

function openPaymentModal(invoiceId, dueAmount) {
	if (!billingPermissions.update) {
		showMsg("You do not have permission to update invoice payments.");
		return;
	}

	setValue("paymentInvoiceId", invoiceId);
	setValue("paymentAmountInput", formatMoney(dueAmount));
	setValue("paymentModeInput", "CASH");
	setValue("paymentTransactionIdInput", "");
	paymentModal.show();
}

async function submitInvoicePayment() {
	if (isSavingPayment) return;

	if (!billingPermissions.update) {
		showMsg("You do not have permission to update invoice payments.");
		return;
	}

	const invoiceId = toPositiveNumberOrNull(getValue("paymentInvoiceId"));
	const paidAmount = toNonNegativeNumber(getValue("paymentAmountInput"));
	const paymentMode = getValue("paymentModeInput").toUpperCase();
	const transactionId = getValue("paymentTransactionIdInput");

	if (!invoiceId) return showMsg("Invalid invoice.");
	if (paidAmount <= 0) return showMsg("Please enter valid paid amount.");

	const allowedModes = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "ONLINE", "OTHER"];
	if (!allowedModes.includes(paymentMode)) return showMsg("Please select valid payment mode.");

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const query = new URLSearchParams({
		tenantId,
		paymentStatus: "PAID",
		paymentMode,
		paidAmount: String(paidAmount),
		transactionId
	});

	isSavingPayment = true;
	setButtonLoading("savePaymentBtn", "Updating...", true);

	try {
		const response = await fetch(
			`${API_BASE}/saas/billing/invoices/${encodeURIComponent(invoiceId)}/payment?${query.toString()}`,
			{
				method: "PUT",
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to update payment."));
			return;
		}

		paymentModal.hide();
		showMsg("Payment updated successfully.", "success");
		await loadInvoices();

	} catch (error) {
		console.error("Update payment error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingPayment = false;
		setButtonLoading("savePaymentBtn", "Update Payment", false);
	}
}

async function viewInvoice(invoiceId) {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");
	const content = document.getElementById("invoiceViewContent");

	if (!invoiceId || !content) return;

	content.innerHTML = loadingContent("Loading invoice details...");
	invoiceViewModal.show();

	try {
		const query = new URLSearchParams({ tenantId });

		const response = await fetch(
			`${API_BASE}/saas/billing/invoices/${encodeURIComponent(invoiceId)}?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const invoice = await safeJson(response);

		if (!response.ok) {
			content.innerHTML = `<div class="alert alert-danger">${escapeHtml(getApiErrorMessage(invoice, "Unable to load invoice."))}</div>`;
			return;
		}

		const items = Array.isArray(invoice.items) ? invoice.items : [];

		const rows = items.length
			? items.map((item, index) => `
				<tr>
					<td>${index + 1}</td><td>${safe(item.itemName)}</td><td>${safe(item.itemType)}</td>
					<td>${formatMoney(item.quantity)}</td><td>₹${formatMoney(item.unitPrice)}</td>
					<td>₹${formatMoney(item.totalPrice)}</td>
				</tr>
			`).join("")
			: `<tr><td colspan="6" class="text-center text-muted">No invoice items</td></tr>`;

		content.innerHTML = `
			<div class="invoice-detail-grid">
				<div class="invoice-detail"><small>Invoice Number</small><strong>${safe(invoice.invoiceNumber)}</strong></div>
				<div class="invoice-detail"><small>Invoice Date</small><strong>${formatDate(invoice.invoiceDateTime)}</strong></div>
				<div class="invoice-detail"><small>Patient</small><strong>${safe(invoice.patientName)}</strong></div>
				<div class="invoice-detail"><small>Invoice Type</small><strong>${safe(invoice.invoiceType)}</strong></div>
				<div class="invoice-detail"><small>Total Amount</small><strong>₹${formatMoney(invoice.totalAmount)}</strong></div>
				<div class="invoice-detail"><small>Paid Amount</small><strong>₹${formatMoney(invoice.paidAmount)}</strong></div>
				<div class="invoice-detail"><small>Due Amount</small><strong>₹${formatMoney(invoice.dueAmount)}</strong></div>
				<div class="invoice-detail"><small>Payment Status</small><strong>${safe(invoice.paymentStatus)}</strong></div>
				<div class="invoice-detail full"><small>Notes</small><strong>${safe(invoice.notes)}</strong></div>
			</div>

			<div class="table-responsive invoice-item-table mt-3">
				<table class="table table-bordered align-middle">
					<thead><tr><th>#</th><th>Item</th><th>Type</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
		`;

	} catch (error) {
		console.error("View invoice error:", error);
		content.innerHTML = `<div class="alert alert-danger">Unable to load invoice.</div>`;
	}
}

async function downloadInvoicePdf(invoiceId) {
	if (!billingPermissions.print) {
		showMsg("You do not have permission to print invoices.");
		return;
	}

	const tenantId = localStorage.getItem("tenantId");
	const token = localStorage.getItem("token");
	const buttonId = `downloadInvoiceBtn_${invoiceId}`;

	setButtonLoading(buttonId, "Downloading...", true);

	try {
		const query = new URLSearchParams({ tenantId });

		const response = await fetch(
			`${API_BASE}/saas/billing/invoices/${encodeURIComponent(invoiceId)}/pdf?${query.toString()}`,
			{
				headers: { "Authorization": "Bearer " + token }
			}
		);

		if (!response.ok) {
			const result = await safeJson(response);
			throw new Error(getApiErrorMessage(result, "Unable to download PDF"));
		}

		const blob = await response.blob();
		if (!blob.size) throw new Error("Invoice PDF is empty.");

		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");

		a.href = url;
		a.download = `saas-invoice-${invoiceId}.pdf`;
		document.body.appendChild(a);
		a.click();
		a.remove();

		setTimeout(() => window.URL.revokeObjectURL(url), 1000);
		showMsg("Invoice PDF downloaded successfully.", "success");

	} catch (error) {
		console.error("Download invoice PDF error:", error);
		showMsg(error.message || "Unable to download invoice PDF.");
	} finally {
		setButtonLoading(buttonId, "PDF", false);
	}
}

function addInvoiceItemRow() {
	const tbody = document.getElementById("invoiceItemRows");
	if (!tbody) return;

	const row = document.createElement("tr");

	row.innerHTML = `
		<td><input type="text" class="form-control item-name" placeholder="Consultation / Bed Charge" oninput="updateInvoicePreview()"></td>
		<td><input type="text" class="form-control item-type" placeholder="OPD / IPD / LAB"></td>
		<td><input type="number" min="1" step="1" class="form-control item-qty" value="1" oninput="updateInvoiceItemRow(this)"></td>
		<td><input type="number" min="0" step="0.01" class="form-control item-price" value="0" oninput="updateInvoiceItemRow(this)"></td>
		<td class="item-total fw-bold text-primary">₹0.00</td>
		<td><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeInvoiceItemRow(this)"><i class="bi bi-trash-fill"></i></button></td>
	`;

	tbody.appendChild(row);
	updateInvoicePreview();
}

function removeInvoiceItemRow(button) {
	const row = button.closest("tr");
	if (row) row.remove();

	if (!document.querySelector("#invoiceItemRows tr")) {
		addInvoiceItemRow();
	}

	updateInvoicePreview();
}

function updateInvoiceItemRow(input) {
	const row = input.closest("tr");
	if (!row) return;

	const qty = toNonNegativeNumber(row.querySelector(".item-qty")?.value);
	const price = toNonNegativeNumber(row.querySelector(".item-price")?.value);
	const total = row.querySelector(".item-total");

	if (total) total.innerText = `₹${formatMoney(qty * price)}`;
	updateInvoicePreview();
}

function collectInvoiceItems() {
	const items = [];

	document.querySelectorAll("#invoiceItemRows tr").forEach(row => {
		const itemName = row.querySelector(".item-name")?.value.trim() || "";
		if (!itemName) return;

		items.push({
			itemName,
			itemType: row.querySelector(".item-type")?.value.trim() || "",
			quantity: toNonNegativeNumber(row.querySelector(".item-qty")?.value) || 1,
			unitPrice: toNonNegativeNumber(row.querySelector(".item-price")?.value)
		});
	});

	return items;
}

function updateInvoicePreview() {
	const items = collectInvoiceItems();
	const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
	const discount = toNonNegativeNumber(getValue("discountAmount"));
	const tax = toNonNegativeNumber(getValue("taxAmount"));
	const paid = toNonNegativeNumber(getValue("paidAmount"));
	const total = Math.max(0, subtotal - discount + tax);
	const due = Math.max(0, total - paid);

	setText("previewSubtotal", formatMoney(subtotal));
	setText("previewTotal", formatMoney(total));
	setText("previewPaid", formatMoney(paid));
	setText("previewDue", formatMoney(due));
}

async function loadPatientsDropdown() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");
	const patientSelect = document.getElementById("patientId");
	const filterSelect = document.getElementById("filterPatientId");

	if (!patientSelect || !filterSelect) return;

	patientSelect.innerHTML = `<option value="">Loading patients...</option>`;
	filterSelect.innerHTML = `<option value="">Loading patients...</option>`;

	try {
		const query = new URLSearchParams({ tenantId });

		const response = await fetch(
			`${API_BASE}/saas/patients?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		patientSelect.innerHTML = `<option value="">Select Patient</option>`;
		filterSelect.innerHTML = `<option value="">All Patients</option>`;

		if (!response.ok || !Array.isArray(result)) return;

		result.forEach(patient => {
			if (!patient.id) return;

			const text = (patient.patientName || "Patient") + (patient.mobile ? ` (${patient.mobile})` : "");

			const option = document.createElement("option");
			option.value = String(patient.id);
			option.textContent = text;
			patientSelect.appendChild(option);

			filterSelect.appendChild(option.cloneNode(true));
		});

	} catch (error) {
		console.error("Load patients dropdown error:", error);
		patientSelect.innerHTML = `<option value="">Service unavailable</option>`;
		filterSelect.innerHTML = `<option value="">All Patients</option>`;
	}
}

async function loadDoctorsDropdown() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");
	const select = document.getElementById("doctorProfileId");

	if (!select) return;

	select.innerHTML = `<option value="">Loading doctors...</option>`;

	try {
		const query = new URLSearchParams({ tenantId });

		const response = await fetch(
			`${API_BASE}/saas/staff/doctors/for-clinical?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			select.innerHTML = `<option value="">Unable to load doctors</option>`;
			return;
		}

		select.innerHTML = `<option value="">Select Doctor</option>`;

		if (!Array.isArray(result) || !result.length) {
			select.innerHTML = `<option value="">No doctors found</option>`;
			return;
		}

		result.forEach(staff => {
			if (!staff.id || !staff.authUserId) return;

			const option = document.createElement("option");
			option.value = String(staff.id);
			option.dataset.authUserId = String(staff.authUserId);
			option.dataset.doctorName = staff.staffName || "";
			option.dataset.department = staff.department || "";
			option.dataset.specialization = staff.specialization || "";

			option.textContent =
				(staff.staffName || "Doctor") +
				(staff.department ? ` - ${staff.department}` : "") +
				(staff.specialization ? ` (${staff.specialization})` : "");

			select.appendChild(option);
		});

	} catch (error) {
		console.error("Doctor dropdown load error:", error);
		select.innerHTML = `<option value="">Service not reachable</option>`;
	}
}

async function loadAdmissionsDropdown() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");
	const select = document.getElementById("filterAdmissionId");

	if (!select) return;

	select.innerHTML = `<option value="">Loading admissions...</option>`;

	try {
		const query = new URLSearchParams({ tenantId });

		const response = await fetch(
			`${API_BASE}/saas/ipd/admissions?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + token,
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		select.innerHTML = `<option value="">Select IPD Admission</option>`;

		if (!response.ok || !Array.isArray(result)) return;

		result.forEach(admission => {
			if (!admission.id) return;

			const option = document.createElement("option");
			option.value = String(admission.id);
			option.textContent =
				`${admission.ipdNumber || "IPD"} - ` +
				`${admission.patientName || "Patient"} - ` +
				`${admission.status || ""}`;

			select.appendChild(option);
		});

	} catch (error) {
		console.error("Load admissions dropdown error:", error);
		select.innerHTML = `<option value="">Service unavailable</option>`;
	}
}

function clearInvoiceForm() {
	["patientId", "doctorProfileId", "opdVisitId", "ipdAdmissionId", "paymentMode", "transactionId", "notes"]
		.forEach(id => setValue(id, ""));

	setValue("invoiceType", "OPD");
	setValue("discountAmount", "0");
	setValue("taxAmount", "0");
	setValue("paidAmount", "0");

	const rows = document.getElementById("invoiceItemRows");
	if (rows) rows.innerHTML = "";
}

function updateBillingSummary(invoices) {
	const list = Array.isArray(invoices) ? invoices : [];
	const total = list.reduce((sum, i) => sum + toMoneyNumber(i.totalAmount), 0);
	const paid = list.reduce((sum, i) => sum + toMoneyNumber(i.paidAmount), 0);
	const due = list.reduce((sum, i) => sum + toMoneyNumber(i.dueAmount), 0);

	setAnimatedNumber("totalInvoices", list.length);
	setText("totalBillingAmount", formatShortMoney(total));
	setText("totalPaidAmount", formatShortMoney(paid));
	setText("totalDueAmount", formatShortMoney(due));
}

function showInvoicesLoadingState() {
	const tbody = document.getElementById("invoiceTableBody");
	if (!tbody) return;

	tbody.innerHTML = `
		<tr><td colspan="8"><div class="billing-state">
			<div class="billing-state-icon billing-loading"><i class="bi bi-receipt-cutoff"></i></div>
			<h5 class="fw-bold text-primary">Loading invoices</h5>
			<p class="text-muted mb-0">Please wait while we prepare billing records.</p>
		</div></td></tr>
	`;
}

function showInvoicesErrorState(message) {
	const tbody = document.getElementById("invoiceTableBody");
	if (!tbody) return;

	tbody.innerHTML = `
		<tr><td colspan="8"><div class="billing-state">
			<div class="billing-state-icon bg-danger"><i class="bi bi-exclamation-triangle-fill"></i></div>
			<h5 class="fw-bold text-danger">Unable to load invoices</h5>
			<p class="text-muted mb-0">${escapeHtml(message)}</p>
		</div></td></tr>
	`;
}

function loadingContent(message) {
	return `
		<div class="billing-state">
			<div class="billing-state-icon billing-loading"><i class="bi bi-receipt-cutoff"></i></div>
			<p class="text-muted mb-0">${escapeHtml(message)}</p>
		</div>
	`;
}

function getValue(id) {
	const element = document.getElementById(id);
	return element ? String(element.value || "").trim() : "";
}

function setValue(id, value) {
	const element = document.getElementById(id);
	if (element) element.value = value == null ? "" : String(value);
}

function setText(id, value) {
	const element = document.getElementById(id);
	if (element) element.innerText = value ?? "";
}

async function safeJson(response) {
	try {
		const text = await response.text();
		if (!text.trim()) return {};

		try {
			return JSON.parse(text);
		} catch {
			return { rawBody: text };
		}
	} catch {
		return {};
	}
}

function getApiErrorMessage(data, fallback) {
	if (!data) return fallback;
	if (data.message) return data.message;
	if (data.error) return data.error;
	if (data.rawBody) return data.rawBody;
	if (typeof data === "string") return data;
	return fallback;
}

function showMsg(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
	setTimeout(() => { if (msg) msg.innerHTML = ""; }, 5000);
}

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button = document.getElementById(buttonId);
	if (!button) return;

	if (isLoading) {
		button.dataset.originalHtml = button.innerHTML;
		button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${escapeHtml(loadingText)}`;
		button.disabled = true;
	} else {
		button.innerHTML = button.dataset.originalHtml || button.innerHTML;
		button.disabled = false;
	}
}

function setAnimatedNumber(id, targetValue) {
	const element = document.getElementById(id);
	if (!element) return;

	const target = Number(targetValue) || 0;
	const start = Number(element.textContent) || 0;
	const difference = target - start;
	const startTime = performance.now();
	const duration = 500;

	if (!difference || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		element.textContent = target;
		return;
	}

	function update(now) {
		const progress = Math.min((now - startTime) / duration, 1);
		const eased = 1 - Math.pow(1 - progress, 3);
		element.textContent = Math.round(start + difference * eased);
		if (progress < 1) requestAnimationFrame(update);
	}

	requestAnimationFrame(update);
}

function toPositiveNumberOrNull(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : null;
}

function toNonNegativeNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) && number >= 0 ? number : 0;
}

function toMoneyNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
	return toMoneyNumber(value).toFixed(2);
}

function formatShortMoney(value) {
	const amount = toMoneyNumber(value);

	if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
	if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
	if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
	return `₹${amount.toFixed(0)}`;
}

function formatDate(value) {
	if (!value) return "-";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return safe(value);

	return date.toLocaleString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}

function safeDateTimestamp(value) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function safeNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
}

function safe(value) {
	return value === null || value === undefined || value === ""
		? "-"
		: escapeHtml(value);
}

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}