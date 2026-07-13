let diagnosticType = "LAB";
let diagnosticModule = "LAB";

let testOptions = [];
let allOrders = [];

let testModal;
let orderModal;
let resultModal;

let diagnosticPermissions = {
	create: false,
	update: false,
	delete: false,
	print: false
};

let isLoadingTests = false;
let isLoadingOrders = false;
let isSavingTest = false;
let isSavingOrder = false;
let isUpdatingStatus = false;
let isSavingResult = false;
let isCreatingInvoice = false;
let isDownloadingPdf = false;

document.addEventListener("DOMContentLoaded", async function() {
	diagnosticType = String(window.DIAGNOSTIC_TYPE || "LAB").toUpperCase();
	diagnosticModule = diagnosticType === "RADIOLOGY" ? "RADIOLOGY" : "LAB";

	const allowed = await protectSaasPage(diagnosticModule, "VIEW");
	if (!allowed) return;

	const tenantId = localStorage.getItem("tenantId");
	const tenantName = localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText("tenantNameText", tenantName || "your workspace");

	testModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("testModal"));
	orderModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("orderModal"));
	resultModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("resultModal"));

	await applyDiagnosticButtonPermissions();

	await Promise.all([
		loadPatientsDropdown(),
		loadDoctorsDropdown(),
		loadTests()
	]);

	await loadOrders();
});

async function applyDiagnosticButtonPermissions() {
	const [canCreate, canUpdate, canDelete, canPrint] = await Promise.all([
		hasSaasPermission(diagnosticModule, "CREATE"),
		hasSaasPermission(diagnosticModule, "UPDATE"),
		hasSaasPermission(diagnosticModule, "DELETE"),
		hasSaasPermission(diagnosticModule, "PRINT")
	]);

	diagnosticPermissions = {
		create: Boolean(canCreate),
		update: Boolean(canUpdate),
		delete: Boolean(canDelete),
		print: Boolean(canPrint)
	};

	showOrHideById("addTestBtn", diagnosticPermissions.create);
	showOrHideById("createOrderBtn", diagnosticPermissions.create);

	showOrHideByClass("edit-test-btn", diagnosticPermissions.update);
	showOrHideByClass("delete-test-btn", diagnosticPermissions.delete);
	showOrHideByClass("update-order-btn", diagnosticPermissions.update);
	showOrHideByClass("result-order-btn", diagnosticPermissions.update);
	showOrHideByClass("print-report-btn", diagnosticPermissions.print);
}

function openTestModal() {
	if (!diagnosticPermissions.create) {
		showMsg(`You do not have permission to create ${diagnosticType.toLowerCase()} tests.`);
		return;
	}

	clearTestForm();
	testModal.show();
}

function openOrderModal() {
	if (!diagnosticPermissions.create) {
		showMsg(`You do not have permission to create ${diagnosticType.toLowerCase()} orders.`);
		return;
	}

	if (!testOptions.length) {
		showMsg(`Please create at least one ${diagnosticType.toLowerCase()} test first.`);
		return;
	}

	clearOrderForm();
	addTestRow();
	updateOrderPreview();
	orderModal.show();
}

async function saveTest() {
	if (isSavingTest) return;

	if (!diagnosticPermissions.create) {
		showMsg("You do not have permission to create tests.");
		return;
	}

	const payload = {
		tenantId: toPositiveNumberOrNull(localStorage.getItem("tenantId")),
		diagnosticType,
		testName: getValue("testName"),
		testCode: getValue("testCode"),
		category: getValue("category"),
		description: getValue("description"),
		price: toNonNegativeNumber(getValue("price"))
	};

	if (!payload.tenantId) return showMsg("Please select SaaS workspace first.");
	if (!payload.testName) return showMsg("Test name is required.");

	isSavingTest = true;
	setButtonLoading("saveTestBtn", "Saving...", true);

	try {
		const response = await fetch(`${API_BASE}/saas/diagnostics/tests`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("token"),
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to save test."));
			return;
		}

		testModal.hide();
		clearTestForm();
		showMsg("Test saved successfully.", "success");
		await loadTests();

	} catch (error) {
		console.error("Save diagnostic test error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingTest = false;
		setButtonLoading("saveTestBtn", "Save Test", false);
	}
}

async function loadTests() {
	if (isLoadingTests) return;

	isLoadingTests = true;

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId"),
			type: diagnosticType
		});

		const response = await fetch(
			`${API_BASE}/saas/diagnostics/tests?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			testOptions = [];
			showMsg(getApiErrorMessage(result, "Unable to load tests."));
			return;
		}

		testOptions = Array.isArray(result) ? result : [];
		testOptions.sort((a, b) =>
			String(a.testName || "").localeCompare(String(b.testName || ""), "en", { sensitivity: "base" })
		);

	} catch (error) {
		console.error("Load tests error:", error);
		testOptions = [];
		showMsg("SaaS service not reachable while loading tests.");
	} finally {
		isLoadingTests = false;
	}
}

async function loadOrders() {
	if (isLoadingOrders) return;

	isLoadingOrders = true;
	showOrdersLoadingState();
	setButtonLoading("refreshOrdersBtn", "Refreshing...", true);

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId"),
			type: diagnosticType
		});

		const response = await fetch(
			`${API_BASE}/saas/diagnostics/orders?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			allOrders = [];
			const message = getApiErrorMessage(result, "Unable to load orders.");
			showMsg(message);
			showOrdersErrorState(message);
			updateDiagnosticsSummary();
			return;
		}

		allOrders = Array.isArray(result) ? result : [];
		allOrders.sort((a, b) => safeDateTimestamp(b.orderDateTime) - safeDateTimestamp(a.orderDateTime));

		renderOrders(allOrders);
		updateDiagnosticsSummary();
		applyDiagnosticButtonPermissions();

	} catch (error) {
		console.error("Load orders error:", error);
		allOrders = [];
		showMsg("SaaS service not reachable.");
		showOrdersErrorState("Diagnostic service is currently unavailable.");
		updateDiagnosticsSummary();
	} finally {
		isLoadingOrders = false;
		setButtonLoading("refreshOrdersBtn", "Refresh", false);
	}
}

function filterOrders() {
	const keyword = getValue("orderSearchBox").toLowerCase();
	const status = getValue("orderStatusFilter").toUpperCase();

	const filtered = allOrders.filter(order => {
		const searchable = [
			order.orderNumber,
			order.patientName,
			order.patientMobile,
			order.doctorName,
			order.department
		].filter(Boolean).join(" ").toLowerCase();

		const keywordMatches = !keyword || searchable.includes(keyword);
		const statusMatches = !status || String(order.status || "").toUpperCase() === status;

		return keywordMatches && statusMatches;
	});

	renderOrders(filtered);
}

function renderOrders(orders) {
	const tbody = document.getElementById("ordersTableBody");
	if (!tbody) return;

	const list = Array.isArray(orders) ? orders : [];

	if (!list.length) {
		tbody.innerHTML = `
			<tr><td colspan="6">
				<div class="diagnostics-state">
					<div class="diagnostics-state-icon"><i class="bi bi-clipboard2-x-fill"></i></div>
					<h5 class="fw-bold text-primary">No ${escapeHtml(diagnosticType.toLowerCase())} orders found</h5>
					<p class="text-muted mb-0">Create a new diagnostic order or change the selected filters.</p>
				</div>
			</td></tr>
		`;
		return;
	}

	tbody.innerHTML = list.map((order, index) => {
		const orderId = safeNumber(order.id);

		return `
			<tr style="--row-delay:${Math.min(index * 55, 330)}ms">
				<td>
					<strong class="text-primary">${safe(order.orderNumber)}</strong>
					<div class="text-muted small">${formatDate(order.orderDateTime)}</div>
				</td>

				<td>
					<div class="diagnostics-person">
						<div class="diagnostics-person-icon"><i class="bi bi-person-fill"></i></div>
						<div>
							<strong class="text-primary">${safe(order.patientName)}</strong>
							<div class="text-muted small">${safe(order.patientMobile)}</div>
						</div>
					</div>
				</td>

				<td>
					<div class="diagnostics-person">
						<div class="diagnostics-person-icon"><i class="bi bi-person-badge-fill"></i></div>
						<div>
							<strong class="text-primary">${safe(order.doctorName)}</strong>
							<div class="text-muted small">${safe(order.department)}</div>
						</div>
					</div>
				</td>

				<td><strong>₹${formatAmount(order.totalAmount)}</strong></td>
				<td>${statusBadge(order.status)}</td>
				<td><div class="diagnostics-actions">${getActionButtons(orderId, order)}</div></td>
			</tr>
		`;
	}).join("");

	applyDiagnosticButtonPermissions();
}

function getActionButtons(orderId, order) {
	const status = String(order.status || "").toUpperCase();
	let html = "";

	if (status === "ORDERED") {
		html += `
			<button type="button" class="btn btn-sm btn-outline-warning update-order-btn"
					onclick="updateStatus(${orderId}, 'SAMPLE_COLLECTED')">
				<i class="bi bi-droplet-fill me-1"></i>Sample
			</button>
		`;
	}

	if (status === "SAMPLE_COLLECTED") {
		html += `
			<button type="button" class="btn btn-sm btn-outline-primary update-order-btn"
					onclick="updateStatus(${orderId}, 'IN_PROCESS')">
				<i class="bi bi-activity me-1"></i>Process
			</button>
		`;
	}

	if (["IN_PROCESS", "SAMPLE_COLLECTED", "ORDERED"].includes(status)) {
		html += `
			<button type="button" class="btn btn-sm btn-outline-success result-order-btn"
					onclick="openResultModal(${orderId})">
				<i class="bi bi-clipboard2-check-fill me-1"></i>Result
			</button>
		`;
	}

	if (status === "REPORT_READY") {
		html += `
			<button type="button" id="downloadReportBtn_${orderId}"
					class="btn btn-sm btn-outline-secondary print-report-btn"
					onclick="downloadPdf(${orderId})">
				<i class="bi bi-file-earmark-pdf-fill me-1"></i>PDF
			</button>
		`;
	}

	if (!order.invoiceId) {
		html += `
			<button type="button" class="btn btn-sm btn-outline-secondary"
					onclick="createInvoice(${orderId})">
				<i class="bi bi-receipt me-1"></i>Invoice
			</button>
		`;
	}

	return html || "-";
}

function statusBadge(status) {
	const value = String(status || "ORDERED").toUpperCase();

	if (value === "REPORT_READY" || value === "DELIVERED") {
		return `<span class="diagnostics-pill success"><i class="bi bi-check-circle-fill"></i>${escapeHtml(value.replace(/_/g, " "))}</span>`;
	}

	if (value === "CANCELLED") {
		return `<span class="diagnostics-pill danger"><i class="bi bi-x-circle-fill"></i>Cancelled</span>`;
	}

	if (value === "IN_PROCESS") {
		return `<span class="diagnostics-pill primary"><i class="bi bi-activity"></i>In Process</span>`;
	}

	return `<span class="diagnostics-pill warning"><i class="bi bi-hourglass-split"></i>${escapeHtml(value.replace(/_/g, " "))}</span>`;
}

function addTestRow() {
	const tbody = document.getElementById("testRows");
	if (!tbody) return;

	const row = document.createElement("tr");

	const selectCell = document.createElement("td");
	const priceCell = document.createElement("td");
	const actionCell = document.createElement("td");

	const select = document.createElement("select");
	select.className = "form-select diagnostic-test";
	select.addEventListener("change", function() {
		updateTestRowPrice(this);
	});

	const placeholder = document.createElement("option");
	placeholder.value = "";
	placeholder.textContent = "Select Test";
	select.appendChild(placeholder);

	testOptions.forEach(test => {
		if (!test.id) return;

		const option = document.createElement("option");
		option.value = String(test.id);
		option.dataset.price = String(toNonNegativeNumber(test.price));
		option.textContent = `${test.testName || "Test"} - ₹${formatAmount(test.price)}`;
		select.appendChild(option);
	});

	priceCell.className = "diagnostic-test-price fw-bold text-primary";
	priceCell.textContent = "₹0.00";

	const removeButton = document.createElement("button");
	removeButton.type = "button";
	removeButton.className = "btn btn-sm btn-outline-danger";
	removeButton.innerHTML = '<i class="bi bi-trash-fill"></i>';
	removeButton.addEventListener("click", function() {
		removeTestRow(this);
	});

	selectCell.appendChild(select);
	actionCell.appendChild(removeButton);

	row.appendChild(selectCell);
	row.appendChild(priceCell);
	row.appendChild(actionCell);
	tbody.appendChild(row);

	updateOrderPreview();
}

function removeTestRow(button) {
	const row = button.closest("tr");
	if (row) row.remove();

	if (!document.querySelector("#testRows tr")) {
		addTestRow();
	}

	updateOrderPreview();
}

function updateTestRowPrice(select) {
	const row = select.closest("tr");
	const selected = select.options[select.selectedIndex];
	const price = toNonNegativeNumber(selected?.dataset.price);
	const priceCell = row?.querySelector(".diagnostic-test-price");

	if (priceCell) priceCell.textContent = `₹${formatAmount(price)}`;
	updateOrderPreview();
}

function collectTests() {
	const items = [];
	const used = new Set();

	document.querySelectorAll("#testRows .diagnostic-test").forEach(select => {
		const testId = toPositiveNumberOrNull(select.value);
		if (!testId || used.has(testId)) return;

		used.add(testId);
		items.push({ testId });
	});

	return items;
}

function updateOrderPreview() {
	const selectedTests = collectTests();

	const subtotal = selectedTests.reduce((sum, item) => {
		const test = testOptions.find(option => Number(option.id) === item.testId);
		return sum + toNonNegativeNumber(test?.price);
	}, 0);

	const discount = toNonNegativeNumber(getValue("discountAmount"));
	const tax = toNonNegativeNumber(getValue("taxAmount"));
	const total = Math.max(0, subtotal - discount + tax);

	setText("previewSubtotal", formatAmount(subtotal));
	setText("previewDiscount", formatAmount(discount));
	setText("previewTax", formatAmount(tax));
	setText("previewTotal", formatAmount(total));
}

async function saveOrder() {
	if (isSavingOrder) return;

	if (!diagnosticPermissions.create) {
		showMsg("You do not have permission to create diagnostic orders.");
		return;
	}

	const payload = {
		tenantId: toPositiveNumberOrNull(localStorage.getItem("tenantId")),
		patientId: toPositiveNumberOrNull(getValue("patientId")),
		doctorProfileId: toPositiveNumberOrNull(getValue("doctorProfileId")),
		prescriptionId: toPositiveNumberOrNull(getValue("prescriptionId")),
		diagnosticType,
		discountAmount: toNonNegativeNumber(getValue("discountAmount")),
		taxAmount: toNonNegativeNumber(getValue("taxAmount")),
		clinicalNotes: getValue("clinicalNotes"),
		items: collectTests()
	};

	if (!payload.patientId) return showMsg("Please select patient.");
	if (!payload.items.length) return showMsg("Please select at least one test.");

	const subtotal = payload.items.reduce((sum, item) => {
		const test = testOptions.find(option => Number(option.id) === item.testId);
		return sum + toNonNegativeNumber(test?.price);
	}, 0);

	if (payload.discountAmount > subtotal + payload.taxAmount) {
		return showMsg("Discount cannot exceed order amount.");
	}

	isSavingOrder = true;
	setButtonLoading("saveOrderBtn", "Saving...", true);

	try {
		const response = await fetch(`${API_BASE}/saas/diagnostics/orders`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("token"),
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to create order."));
			return;
		}

		orderModal.hide();
		clearOrderForm();
		showMsg(`${diagnosticType} order created successfully.`, "success");
		await loadOrders();

	} catch (error) {
		console.error("Save order error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingOrder = false;
		setButtonLoading("saveOrderBtn", "Save Order", false);
	}
}

async function updateStatus(orderId, status) {
	if (isUpdatingStatus) return;

	if (!diagnosticPermissions.update) {
		showMsg("You do not have permission to update diagnostic orders.");
		return;
	}

	if (!isValidId(orderId)) return showMsg("Invalid order selected.");

	const allowedStatuses = ["SAMPLE_COLLECTED", "IN_PROCESS"];
	if (!allowedStatuses.includes(status)) return showMsg("Invalid diagnostic status.");

	isUpdatingStatus = true;

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId"),
			status
		});

		const response = await fetch(
			`${API_BASE}/saas/diagnostics/orders/${encodeURIComponent(orderId)}/status?${query.toString()}`,
			{
				method: "PUT",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to update status."));
			return;
		}

		showMsg("Status updated successfully.", "success");
		await loadOrders();

	} catch (error) {
		console.error("Update status error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isUpdatingStatus = false;
	}
}

function openResultModal(orderId) {
	if (!diagnosticPermissions.update) {
		showMsg("You do not have permission to update results.");
		return;
	}

	if (!isValidId(orderId)) return showMsg("Invalid order selected.");

	setValue("resultOrderId", orderId);
	setValue("resultSummary", "");
	setValue("resultDetails", "");
	setValue("reportFileUrl", "");
	resultModal.show();
}

async function submitResult() {
	if (isSavingResult) return;

	const orderId = toPositiveNumberOrNull(getValue("resultOrderId"));

	const payload = {
		tenantId: toPositiveNumberOrNull(localStorage.getItem("tenantId")),
		resultSummary: getValue("resultSummary"),
		resultDetails: getValue("resultDetails"),
		reportFileUrl: getValue("reportFileUrl")
	};

	if (!orderId) return showMsg("Invalid order selected.");
	if (!payload.resultSummary) return showMsg("Result summary is required.");

	isSavingResult = true;
	setButtonLoading("saveResultBtn", "Saving...", true);

	try {
		const response = await fetch(
			`${API_BASE}/saas/diagnostics/orders/${encodeURIComponent(orderId)}/result`,
			{
				method: "PUT",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Content-Type": "application/json",
					"Accept": "application/json"
				},
				body: JSON.stringify(payload)
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to update result."));
			return;
		}

		resultModal.hide();
		showMsg("Result saved successfully.", "success");
		await loadOrders();

	} catch (error) {
		console.error("Save result error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isSavingResult = false;
		setButtonLoading("saveResultBtn", "Save Result", false);
	}
}

async function createInvoice(orderId) {
	if (isCreatingInvoice) return;
	if (!isValidId(orderId)) return showMsg("Invalid order selected.");
	if (!confirm("Create invoice for this order?")) return;

	isCreatingInvoice = true;

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/diagnostics/orders/${encodeURIComponent(orderId)}/invoice?${query.toString()}`,
			{
				method: "POST",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(getApiErrorMessage(result, "Unable to create invoice."));
			return;
		}

		showMsg("Invoice created successfully.", "success");
		await loadOrders();

	} catch (error) {
		console.error("Create invoice error:", error);
		showMsg("SaaS service not reachable.");
	} finally {
		isCreatingInvoice = false;
	}
}

async function downloadPdf(orderId) {
	if (isDownloadingPdf) return;

	if (!diagnosticPermissions.print) {
		showMsg("You do not have permission to print reports.");
		return;
	}

	if (!isValidId(orderId)) return showMsg("Invalid order selected.");

	isDownloadingPdf = true;
	const buttonId = `downloadReportBtn_${orderId}`;
	setButtonLoading(buttonId, "Downloading...", true);

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/diagnostics/orders/${encodeURIComponent(orderId)}/pdf?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token")
				}
			}
		);

		if (!response.ok) {
			const result = await safeJson(response);
			throw new Error(getApiErrorMessage(result, "Unable to download report PDF."));
		}

		const blob = await response.blob();
		if (!blob.size) throw new Error("Diagnostic report PDF is empty.");

		const url = window.URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `diagnostic-report-${orderId}.pdf`;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();

		setTimeout(() => window.URL.revokeObjectURL(url), 1000);
		showMsg("Report PDF downloaded successfully.", "success");

	} catch (error) {
		console.error("Download PDF error:", error);
		showMsg(error.message || "Unable to download report PDF.");
	} finally {
		isDownloadingPdf = false;
		setButtonLoading(buttonId, "PDF", false);
	}
}

async function loadPatientsDropdown() {
	const select = document.getElementById("patientId");
	if (!select) return;

	select.innerHTML = `<option value="">Loading patients...</option>`;

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/patients?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
					"Accept": "application/json"
				}
			}
		);

		const result = await safeJson(response);
		select.innerHTML = `<option value="">Select Patient</option>`;

		if (!response.ok || !Array.isArray(result)) return;

		result.forEach(patient => {
			if (!patient.id) return;

			const option = document.createElement("option");
			option.value = String(patient.id);
			option.textContent = `${patient.patientName || "Patient"}${patient.mobile ? ` (${patient.mobile})` : ""}`;
			select.appendChild(option);
		});

	} catch (error) {
		console.error("Load patients error:", error);
		select.innerHTML = `<option value="">Service unavailable</option>`;
	}
}

async function loadDoctorsDropdown() {
	const select = document.getElementById("doctorProfileId");
	if (!select) return;

	select.innerHTML = `<option value="">Loading doctors...</option>`;

	try {
		const query = new URLSearchParams({
			tenantId: localStorage.getItem("tenantId")
		});

		const response = await fetch(
			`${API_BASE}/saas/staff/doctors/for-clinical?${query.toString()}`,
			{
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("token"),
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
			if (!staff.id) return;

			const option = document.createElement("option");
			option.value = String(staff.id);
			option.dataset.authUserId = staff.authUserId ? String(staff.authUserId) : "";
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

function clearTestForm() {
	["testName", "testCode", "category", "description"].forEach(id => setValue(id, ""));
	setValue("price", "0");
}

function clearOrderForm() {
	[
		"patientId",
		"doctorProfileId",
		"prescriptionId",
		"clinicalNotes"
	].forEach(id => setValue(id, ""));

	setValue("discountAmount", "0");
	setValue("taxAmount", "0");

	const rows = document.getElementById("testRows");
	if (rows) rows.innerHTML = "";
}

function updateDiagnosticsSummary() {
	setAnimatedNumber("totalOrderCount", allOrders.length);

	setAnimatedNumber(
		"inProcessCount",
		allOrders.filter(order =>
			["SAMPLE_COLLECTED", "IN_PROCESS"].includes(String(order.status || "").toUpperCase())
		).length
	);

	setAnimatedNumber(
		"reportReadyCount",
		allOrders.filter(order =>
			["REPORT_READY", "DELIVERED"].includes(String(order.status || "").toUpperCase())
		).length
	);

	const total = allOrders.reduce(
		(sum, order) => sum + toNonNegativeNumber(order.totalAmount),
		0
	);

	setText("totalOrderAmount", formatShortMoney(total));
}

function showOrdersLoadingState() {
	const tbody = document.getElementById("ordersTableBody");
	if (!tbody) return;

	tbody.innerHTML = `
		<tr><td colspan="6"><div class="diagnostics-state">
			<div class="diagnostics-state-icon diagnostics-loading"><i class="bi bi-activity"></i></div>
			<h5 class="fw-bold text-primary">Loading diagnostic orders</h5>
			<p class="text-muted mb-0">Please wait while diagnostic records are prepared.</p>
		</div></td></tr>
	`;
}

function showOrdersErrorState(message) {
	const tbody = document.getElementById("ordersTableBody");
	if (!tbody) return;

	tbody.innerHTML = `
		<tr><td colspan="6"><div class="diagnostics-state">
			<div class="diagnostics-state-icon bg-danger"><i class="bi bi-exclamation-triangle-fill"></i></div>
			<h5 class="fw-bold text-danger">Unable to load orders</h5>
			<p class="text-muted mb-0">${escapeHtml(message)}</p>
		</div></td></tr>
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

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show" role="alert">
			${escapeHtml(message)}
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
		</div>
	`;

	setTimeout(() => {
		if (msg) msg.innerHTML = "";
	}, 5000);
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

function setAnimatedNumber(id, value) {
	const element = document.getElementById(id);
	if (!element) return;

	const target = Number(value) || 0;
	const start = Number(element.textContent) || 0;
	const difference = target - start;
	const duration = 500;
	const startTime = performance.now();

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

function isValidId(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0;
}

function safeDateTimestamp(value) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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

function formatAmount(value) {
	const number = Number(value);

	if (!Number.isFinite(number)) return "0.00";

	return number.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

function formatShortMoney(value) {
	const amount = toNonNegativeNumber(value);

	if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
	if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
	if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;

	return `₹${amount.toFixed(0)}`;
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