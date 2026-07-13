let reportOrders = [];
let reportStock = [];
let currentReportRows = [];
let isLoadingReports = false;

document.addEventListener("DOMContentLoaded", function() {
	validateReportRole();
	applyRoleBasedReportMenu();
	configureReportPageByRole();
	loadReports();
});

function validateReportRole() {
	const role =
		localStorage.getItem("role");

	if (
		![
			"SUPER_ADMIN",
			"WHOLESALER",
			"RETAILER"
		].includes(role)
	) {
		alert(
			"Reports are available for Admin, Wholesaler and Retailer only."
		);

		window.location.href =
			"/dashboard";
	}
}

function applyRoleBasedReportMenu() {
	const role =
		localStorage.getItem("role");

	document
		.querySelectorAll("[data-role]")
		.forEach(
			function(item) {

				const allowedRoles =
					item
						.getAttribute("data-role")
						.split(" ");

				if (!allowedRoles.includes(role)) {
					item.style.display = "none";
				}

			}
		);

	document
		.querySelectorAll(
			"#reportType option[data-role]"
		)
		.forEach(
			function(option) {

				const allowedRoles =
					option
						.getAttribute("data-role")
						.split(" ");

				if (!allowedRoles.includes(role)) {
					option.remove();
				}

			}
		);
}

function configureReportPageByRole() {
	const role =
		localStorage.getItem("role");

	const subtitle =
		document.getElementById(
			"reportSubtitle"
		);

	if (!subtitle) {
		return;
	}

	if (role === "WHOLESALER") {
		subtitle.innerText =
			"View sales, delivered orders, invoice and medicine stock analytics.";
	}

	if (role === "RETAILER") {
		subtitle.innerText =
			"View purchase history, delivered orders and invoice analytics.";
	}

	if (role === "SUPER_ADMIN") {
		subtitle.innerText =
			"Monitor platform orders, approvals and business performance.";
	}
}

async function loadReports() {
	if (isLoadingReports) {
		return;
	}

	isLoadingReports = true;

	showReportLoadingState();

	setButtonLoading(
		"refreshReportsBtn",
		"Refreshing...",
		true
	);

	try {
		await loadOrderReport();

		const role =
			localStorage.getItem("role");

		if (role === "WHOLESALER") {
			await loadStockReport();
		}

		renderCurrentReport();

	} finally {
		isLoadingReports = false;

		setButtonLoading(
			"refreshReportsBtn",
			"Refresh Reports",
			false
		);
	}
}

async function loadOrderReport() {
	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/orders/my`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showReportMessage(
				getErrorMessage(
					result,
					"Unable to load orders"
				)
			);

			reportOrders = [];
			return;
		}

		reportOrders =
			Array.isArray(result)
				? result
				: [];

	} catch (error) {
		console.error(
			"Load order report error:",
			error
		);

		showReportMessage(
			"Order service not reachable."
		);

		reportOrders = [];
	}
}

async function loadStockReport() {
	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/medicines/stock/my`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			reportStock = [];
			return;
		}

		reportStock =
			Array.isArray(result)
				? result
				: [];

	} catch (error) {
		console.error(
			"Load stock report error:",
			error
		);

		reportStock = [];
	}
}

function switchReportType() {
	const type =
		document.getElementById(
			"reportType"
		)?.value;

	const statusFilterWrap =
		document.getElementById(
			"statusFilterWrap"
		);

	if (statusFilterWrap) {
		statusFilterWrap.style.display =
			type === "STOCK" ||
				type === "INVOICE"
				? "none"
				: "block";
	}

	renderCurrentReport();
}

function renderCurrentReport() {
	const type =
		document.getElementById(
			"reportType"
		)?.value || "ORDER";

	if (type === "ORDER") {
		renderOrderReport();
		return;
	}

	if (type === "STOCK") {
		renderStockReport();
		return;
	}

	if (type === "INVOICE") {
		renderInvoiceReport();
		return;
	}

	if (type === "PLATFORM") {
		renderPlatformReport();
	}
}

function renderOrderReport() {
	const status =
		document.getElementById(
			"statusFilter"
		)?.value || "";

	let orders = [
		...reportOrders
	];

	if (status) {
		orders =
			orders.filter(
				order =>
					order.status === status
			);
	}

	const role =
		localStorage.getItem("role");

	const title =
		role === "WHOLESALER"
			? "Wholesaler Sales Report"
			: role === "RETAILER"
				? "Retailer Purchase Report"
				: "Admin Order Report";

	setText(
		"mainReportTitle",
		title
	);

	currentReportRows =
		orders.map(
			order => ({
				orderNumber:
					order.orderNumber,

				status:
					order.status,

				items:
					Array.isArray(order.items)
						? order.items.length
						: 0,

				amount:
					order.totalAmount,

				date:
					formatDateTime(
						order.orderDate
					)
			})
		);

	updateOrderCards(orders);

	let rows = "";

	if (!orders.length) {
		rows = emptyTableRow(
			6,
			"No orders found"
		);
	} else {
		orders.forEach(
			function(order, index) {

				rows += `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>${index + 1}</td>

						<td>
							<strong class="text-primary">
								${safe(order.orderNumber)}
							</strong>
						</td>

						<td>
							${orderStatusBadge(order.status)}
						</td>

						<td>
							${Array.isArray(order.items) ? order.items.length : 0}
						</td>

						<td>
							<strong>
								₹${formatMoney(order.totalAmount)}
							</strong>
						</td>

						<td>
							${formatDateTime(order.orderDate)}
						</td>

					</tr>
				`;

			}
		);
	}

	document.getElementById(
		"reportTableContainer"
	).innerHTML = `
		<div class="table-responsive report-table-wrap">

			<table class="table table-hover report-table">

				<thead>
					<tr>
						<th>#</th>
						<th>Order No</th>
						<th>Status</th>
						<th>Items</th>
						<th>Amount</th>
						<th>Date</th>
					</tr>
				</thead>

				<tbody>
					${rows}
				</tbody>

			</table>

		</div>
	`;

	renderOrderAnalytics(orders);
}

function renderStockReport() {
	setText(
		"mainReportTitle",
		"Medicine Stock Report"
	);

	currentReportRows =
		reportStock.map(
			stock => {

				const medicine =
					stock.medicine || {};

				return {
					medicine:
						medicine.medicineName || "",

					brand:
						medicine.brandName || "",

					batch:
						stock.batchNumber,

					quantity:
						stock.availableQuantity,

					minimumStock:
						stock.minimumStockLevel,

					wholesalePrice:
						stock.wholesalePrice,

					expiryDate:
						stock.expiryDate
				};

			}
		);

	const totalQty =
		reportStock.reduce(
			(sum, stock) =>
				sum +
				Number(
					stock.availableQuantity || 0
				),
			0
		);

	const lowStock =
		reportStock.filter(
			stock =>
				Number(
					stock.availableQuantity || 0
				) <=
				Number(
					stock.minimumStockLevel || 0
				)
		).length;

	const stockValue =
		reportStock.reduce(
			(sum, stock) =>
				sum +
				(
					Number(
						stock.availableQuantity || 0
					) *
					Number(
						stock.wholesalePrice || 0
					)
				),
			0
		);

	updateSummaryCard(
		1,
		"Stock Items",
		reportStock.length
	);

	updateSummaryCard(
		2,
		"Total Quantity",
		totalQty
	);

	updateSummaryCard(
		3,
		"Stock Value",
		formatShortMoney(stockValue)
	);

	updateSummaryCard(
		4,
		"Low Stock",
		lowStock
	);

	let rows = "";

	if (!reportStock.length) {
		rows = emptyTableRow(
			8,
			"No stock found"
		);
	} else {
		reportStock.forEach(
			function(stock, index) {

				const medicine =
					stock.medicine || {};

				const isLow =
					Number(
						stock.availableQuantity || 0
					) <=
					Number(
						stock.minimumStockLevel || 0
					);

				rows += `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>${index + 1}</td>

						<td>
							<strong class="text-primary">
								${safe(medicine.medicineName)}
							</strong>

							<br>

							<span class="text-muted small">
								${safe(medicine.brandName)}
							</span>
						</td>

						<td>${safe(stock.batchNumber)}</td>

						<td>${safe(stock.availableQuantity)}</td>

						<td>${safe(stock.minimumStockLevel)}</td>

						<td>₹${formatMoney(stock.wholesalePrice)}</td>

						<td>${formatDate(stock.expiryDate)}</td>

						<td>
							${stockStatusBadge(isLow)}
						</td>

					</tr>
				`;

			}
		);
	}

	document.getElementById(
		"reportTableContainer"
	).innerHTML = `
		<div class="table-responsive report-table-wrap">

			<table class="table table-hover report-table">

				<thead>
					<tr>
						<th>#</th>
						<th>Medicine</th>
						<th>Batch</th>
						<th>Qty</th>
						<th>Min</th>
						<th>Price</th>
						<th>Expiry</th>
						<th>Status</th>
					</tr>
				</thead>

				<tbody>
					${rows}
				</tbody>

			</table>

		</div>
	`;

	document.getElementById(
		"analyticsSummary"
	).innerHTML = `
		${summaryItem("Stock Items", reportStock.length)}
		${summaryItem("Total Quantity", totalQty)}
		${summaryItem("Low Stock Items", lowStock)}
		${summaryItem("Estimated Stock Value", "₹" + formatMoney(stockValue))}
	`;
}

function renderInvoiceReport() {
	const deliveredOrders =
		reportOrders.filter(
			order =>
				order.status === "DELIVERED"
		);

	setText(
		"mainReportTitle",
		"Invoice Report"
	);

	currentReportRows =
		deliveredOrders.map(
			order => ({
				orderId:
					order.id,

				orderNumber:
					order.orderNumber,

				amount:
					order.totalAmount,

				status:
					"Invoice Eligible",

				date:
					formatDateTime(
						order.orderDate
					)
			})
		);

	updateOrderCards(
		deliveredOrders
	);

	let rows = "";

	if (!deliveredOrders.length) {
		rows = emptyTableRow(
			6,
			"No delivered orders found"
		);
	} else {
		deliveredOrders.forEach(
			function(order, index) {

				rows += `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>${index + 1}</td>

						<td>${safe(order.id)}</td>

						<td>
							<strong class="text-primary">
								${safe(order.orderNumber)}
							</strong>
						</td>

						<td>
							₹${formatMoney(order.totalAmount)}
						</td>

						<td>
							<span class="report-status delivered">
								<i class="bi bi-check2-circle"></i>
								Eligible
							</span>
						</td>

						<td>
							<a href="/invoices"
							   class="btn btn-sm btn-medi"
							   style="width:auto;">

								<i class="bi bi-receipt-cutoff me-1"></i>
								Open Invoice
							</a>
						</td>

					</tr>
				`;

			}
		);
	}

	document.getElementById(
		"reportTableContainer"
	).innerHTML = `
		<div class="alert alert-info">

			<i class="bi bi-info-circle-fill me-1"></i>

			Invoice report shows delivered orders.
			Use the invoice page to generate or download PDF invoices.

		</div>

		<div class="table-responsive report-table-wrap">

			<table class="table table-hover report-table">

				<thead>
					<tr>
						<th>#</th>
						<th>Order ID</th>
						<th>Order No</th>
						<th>Amount</th>
						<th>Status</th>
						<th>Invoice</th>
					</tr>
				</thead>

				<tbody>
					${rows}
				</tbody>

			</table>

		</div>
	`;

	const totalInvoiceAmount =
		deliveredOrders.reduce(
			(sum, order) =>
				sum +
				Number(
					order.totalAmount || 0
				),
			0
		);

	document.getElementById(
		"analyticsSummary"
	).innerHTML = `
		${summaryItem("Invoice Eligible Orders", deliveredOrders.length)}
		${summaryItem("Total Invoice Value", "₹" + formatMoney(totalInvoiceAmount))}
		${summaryItem("Status", "Delivered Orders Only")}
	`;
}

function renderPlatformReport() {
	const status =
		document.getElementById(
			"statusFilter"
		)?.value || "";

	let orders = [
		...reportOrders
	];

	if (status) {
		orders =
			orders.filter(
				order =>
					order.status === status
			);
	}

	setText(
		"mainReportTitle",
		"Admin Platform Report"
	);

	currentReportRows =
		orders.map(
			order => ({
				orderNumber:
					order.orderNumber,

				status:
					order.status,

				items:
					Array.isArray(order.items)
						? order.items.length
						: 0,

				amount:
					order.totalAmount,

				date:
					formatDateTime(
						order.orderDate
					)
			})
		);

	updateOrderCards(orders);

	let rows = "";

	if (!orders.length) {
		rows = emptyTableRow(
			6,
			"No platform orders found"
		);
	} else {
		orders.forEach(
			function(order, index) {

				rows += `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>${index + 1}</td>

						<td>
							<strong class="text-primary">
								${safe(order.orderNumber)}
							</strong>
						</td>

						<td>${orderStatusBadge(order.status)}</td>

						<td>
							${Array.isArray(order.items) ? order.items.length : 0}
						</td>

						<td>
							₹${formatMoney(order.totalAmount)}
						</td>

						<td>
							${formatDateTime(order.orderDate)}
						</td>

					</tr>
				`;

			}
		);
	}

	document.getElementById(
		"reportTableContainer"
	).innerHTML = `
		<div class="table-responsive report-table-wrap">

			<table class="table table-hover report-table">

				<thead>
					<tr>
						<th>#</th>
						<th>Order No</th>
						<th>Status</th>
						<th>Items</th>
						<th>Amount</th>
						<th>Date</th>
					</tr>
				</thead>

				<tbody>
					${rows}
				</tbody>

			</table>

		</div>
	`;

	renderOrderAnalytics(orders);

	document.getElementById(
		"analyticsSummary"
	).innerHTML += `
		${summaryItem("Platform Scope", "All registered order data")}
		${summaryItem("Admin View", "System-wide monitoring")}
	`;
}

function updateOrderCards(orders) {
	const total =
		orders.length;

	const delivered =
		orders.filter(
			order =>
				order.status === "DELIVERED"
		).length;

	const pending =
		orders.filter(
			order =>
				order.status === "PENDING"
		).length;

	const amount =
		orders.reduce(
			(sum, order) =>
				sum +
				Number(
					order.totalAmount || 0
				),
			0
		);

	updateSummaryCard(
		1,
		"Total Orders",
		total
	);

	updateSummaryCard(
		2,
		"Delivered",
		delivered
	);

	updateSummaryCard(
		3,
		"Value",
		formatShortMoney(amount)
	);

	updateSummaryCard(
		4,
		"Pending",
		pending
	);
}

function updateSummaryCard(
	cardNumber,
	title,
	value
) {
	setText(
		`rCard${cardNumber}Title`,
		title
	);

	const valueElement =
		document.getElementById(
			`rCard${cardNumber}Value`
		);

	if (!valueElement) {
		return;
	}

	if (
		typeof value === "number" &&
		Number.isFinite(value)
	) {
		animateValue(
			valueElement,
			value
		);
	} else {
		valueElement.innerText =
			value ?? "0";
	}
}

function renderOrderAnalytics(orders) {
	const pending =
		orders.filter(
			order =>
				order.status === "PENDING"
		).length;

	const accepted =
		orders.filter(
			order =>
				order.status === "ACCEPTED"
		).length;

	const rejected =
		orders.filter(
			order =>
				order.status === "REJECTED"
		).length;

	const delivered =
		orders.filter(
			order =>
				order.status === "DELIVERED"
		).length;

	const amount =
		orders.reduce(
			(sum, order) =>
				sum +
				Number(
					order.totalAmount || 0
				),
			0
		);

	document.getElementById(
		"analyticsSummary"
	).innerHTML = `
		${summaryItem("Pending Orders", pending)}
		${summaryItem("Accepted Orders", accepted)}
		${summaryItem("Rejected Orders", rejected)}
		${summaryItem("Delivered Orders", delivered)}
		${summaryItem("Total Value", "₹" + formatMoney(amount))}
	`;
}

function exportReportCsv() {
	if (
		!Array.isArray(currentReportRows) ||
		!currentReportRows.length
	) {
		showReportMessage(
			"No data available to export"
		);

		return;
	}

	const headers =
		Object.keys(
			currentReportRows[0]
		);

	const csvRows = [
		headers
			.map(csvEscape)
			.join(",")
	];

	currentReportRows.forEach(
		function(row) {

			csvRows.push(
				headers
					.map(
						header =>
							csvEscape(
								row[header]
							)
					)
					.join(",")
			);

		}
	);

	const csv =
		"\uFEFF" +
		csvRows.join("\n");

	const blob =
		new Blob(
			[csv],
			{
				type:
					"text/csv;charset=utf-8;"
			}
		);

	const url =
		window.URL.createObjectURL(blob);

	const anchor =
		document.createElement("a");

	anchor.href = url;
	anchor.download =
		`medirevolution-report-${getTodayFileName()}.csv`;

	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();

	window.URL.revokeObjectURL(url);
}

function summaryItem(label, value) {
	return `
		<div class="report-summary-item">

			<div class="report-summary-label">
				${escapeHtml(label)}
			</div>

			<div class="report-summary-value">
				${escapeHtml(value)}
			</div>

		</div>
	`;
}

function orderStatusBadge(status) {
	if (status === "PENDING") {
		return `
			<span class="report-status pending">
				<i class="bi bi-hourglass-split"></i>
				PENDING
			</span>
		`;
	}

	if (status === "ACCEPTED") {
		return `
			<span class="report-status accepted">
				<i class="bi bi-check2-circle"></i>
				ACCEPTED
			</span>
		`;
	}

	if (status === "REJECTED") {
		return `
			<span class="report-status rejected">
				<i class="bi bi-x-circle"></i>
				REJECTED
			</span>
		`;
	}

	if (status === "DELIVERED") {
		return `
			<span class="report-status delivered">
				<i class="bi bi-truck"></i>
				DELIVERED
			</span>
		`;
	}

	return `
		<span class="report-status pending">
			${safe(status)}
		</span>
	`;
}

function stockStatusBadge(isLow) {
	if (isLow) {
		return `
			<span class="report-stock-status low">
				<i class="bi bi-exclamation-triangle-fill"></i>
				LOW STOCK
			</span>
		`;
	}

	return `
		<span class="report-stock-status normal">
			<i class="bi bi-check2-circle"></i>
			IN STOCK
		</span>
	`;
}

function showReportLoadingState() {
	const container =
		document.getElementById(
			"reportTableContainer"
		);

	const summary =
		document.getElementById(
			"analyticsSummary"
		);

	if (container) {
		container.innerHTML = `
			<div class="reports-state">

				<div class="reports-state-icon reports-loading-icon">
					<i class="bi bi-bar-chart-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					Loading reports
				</h5>

				<p class="text-muted mb-0">
					Please wait while we prepare analytics data.
				</p>

			</div>
		`;
	}

	if (summary) {
		summary.innerHTML = `
			<div class="reports-state">

				<div class="reports-state-icon reports-loading-icon">
					<i class="bi bi-graph-up"></i>
				</div>

				<p class="text-muted mb-0">
					Preparing analytics summary.
				</p>

			</div>
		`;
	}
}

function emptyTableRow(
	colspan,
	message
) {
	return `
		<tr>
			<td colspan="${colspan}">

				<div class="reports-state">

					<div class="reports-state-icon">
						<i class="bi bi-bar-chart-line"></i>
					</div>

					<h5 class="fw-bold text-primary">
						${escapeHtml(message)}
					</h5>

					<p class="text-muted mb-0">
						No matching report data is currently available.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showReportMessage(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type}">
			${escapeHtml(message)}
		</div>
	`;

	setTimeout(
		function() {
			if (msg) {
				msg.innerHTML = "";
			}
		},
		3500
	);
}

function formatShortMoney(value) {
	const numericValue =
		Number(value || 0);

	if (numericValue >= 100000) {
		return "₹" +
			(numericValue / 100000)
				.toFixed(1) +
			"L";
	}

	if (numericValue >= 1000) {
		return "₹" +
			(numericValue / 1000)
				.toFixed(1) +
			"K";
	}

	return "₹" +
		numericValue.toFixed(0);
}

function formatMoney(value) {
	const numericValue =
		Number(value);

	return Number.isFinite(numericValue)
		? numericValue.toFixed(2)
		: "0.00";
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleDateString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric"
		}
	);
}

function formatDateTime(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		}
	);
}

function animateValue(
	element,
	target
) {
	const start =
		Number(element.textContent) || 0;

	const difference =
		target - start;

	const duration = 500;
	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {
		element.textContent = target;
		return;
	}

	function update(currentTime) {
		const progress =
			Math.min(
				(currentTime - startTime) /
				duration,
				1
			);

		const eased =
			1 - Math.pow(1 - progress, 3);

		element.textContent =
			Math.round(
				start +
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {
	const button =
		document.getElementById(buttonId);

	if (!button) {
		return;
	}

	if (isLoading) {
		button.dataset.originalHtml =
			button.innerHTML;

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"
				  role="status"
				  aria-hidden="true"></span>
			${escapeHtml(loadingText)}
		`;

		button.disabled = true;

	} else {
		button.innerHTML =
			button.dataset.originalHtml ||
			button.innerHTML;

		button.disabled = false;
	}
}

function setText(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
}

async function readJsonSafely(response) {
	try {
		return await response.json();
	} catch (error) {
		return null;
	}
}

function getErrorMessage(
	data,
	fallback
) {
	if (!data) {
		return fallback;
	}

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	if (typeof data === "string") {
		return data;
	}

	return fallback;
}

function csvEscape(value) {
	const text =
		value === null ||
			value === undefined
			? ""
			: String(value);

	return `"${text.replace(/"/g, '""')}"`;
}

function getTodayFileName() {
	const today =
		new Date();

	return [
		today.getFullYear(),
		String(
			today.getMonth() + 1
		).padStart(2, "0"),
		String(
			today.getDate()
		).padStart(2, "0")
	].join("-");
}

function safe(value) {
	return (
		value === null ||
		value === undefined ||
		value === ""
	)
		? "-"
		: escapeHtml(value);
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}