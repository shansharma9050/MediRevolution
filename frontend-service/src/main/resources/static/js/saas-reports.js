let currentReportHeaders = [];
let currentReportRows = [];
let currentReportType = "patients";

let isLoadingDashboardReport = false;
let isLoadingSelectedReport = false;

let reportPagePermissions = {
	export: false,
	print: false
};

document.addEventListener("DOMContentLoaded", async function() {

	const allowed =
		await protectSaasPage(
			"REPORTS",
			"VIEW"
		);

	if (!allowed) {
		return;
	}

	const tenantId =
		localStorage.getItem("tenantId");

	const tenantName =
		localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText(
		"tenantNameText",
		tenantName || "your workspace"
	);

	setDefaultDates();
	handleReportTypeChange();

	await applyReportPagePermissions();

	await Promise.all([
		loadDashboardReport(),
		loadSelectedReport()
	]);
});


function setDefaultDates() {

	const today =
		new Date();

	const fromDate =
		new Date();

	fromDate.setMonth(
		fromDate.getMonth() - 1
	);

	setValue(
		"toDate",
		formatDateForInput(today)
	);

	setValue(
		"fromDate",
		formatDateForInput(fromDate)
	);
}


function formatDateForInput(date) {

	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0")
	].join("-");
}


function handleReportTypeChange() {

	const reportType =
		getValue("reportType");

	const fromDateInput =
		document.getElementById("fromDate");

	const toDateInput =
		document.getElementById("toDate");

	const dateRequired =
		reportType !== "patients" &&
		reportType !== "low-stock";

	if (fromDateInput) {
		fromDateInput.disabled =
			!dateRequired;
	}

	if (toDateInput) {
		toDateInput.disabled =
			!dateRequired;
	}

	setText(
		"reportTitle",
		getReportTitle(reportType)
	);
}


async function loadDashboardReport() {

	if (isLoadingDashboardReport) {
		return;
	}

	isLoadingDashboardReport = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	setButtonLoading(
		"refreshDashboardBtn",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/reports/dashboard?tenantId=${encodeURIComponent(tenantId)}`,
			{
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

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load dashboard report."
				)
			);

			return;
		}

		setAnimatedNumber(
			"totalPatients",
			result.totalPatients
		);

		setAnimatedNumber(
			"totalAppointments",
			result.totalAppointments
		);

		setText(
			"totalBilling",
			"₹" + safeText(result.totalBilling)
		);

		setText(
			"totalDue",
			"₹" + safeText(result.totalDue)
		);

	} catch (error) {

		console.error(
			"Unable to load dashboard report:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {

		isLoadingDashboardReport = false;

		setButtonLoading(
			"refreshDashboardBtn",
			"Refresh Summary",
			false
		);
	}
}


async function loadSelectedReport() {

	if (isLoadingSelectedReport) {
		return;
	}

	const reportType =
		getValue("reportType");

	const tenantId =
		localStorage.getItem("tenantId");

	const token =
		localStorage.getItem("token");

	const fromDate =
		getValue("fromDate");

	const toDate =
		getValue("toDate");

	if (
		reportType !== "patients" &&
		reportType !== "low-stock"
	) {

		if (!fromDate || !toDate) {

			showMsg(
				"Please select both from date and to date."
			);

			return;
		}

		if (fromDate > toDate) {

			showMsg(
				"From date cannot be after to date."
			);

			return;
		}
	}

	isLoadingSelectedReport = true;
	currentReportType = reportType;

	setButtonLoading(
		"loadReportBtn",
		"Loading...",
		true
	);

	showReportLoadingState();

	const url =
		buildReportUrl(
			reportType,
			tenantId,
			fromDate,
			toDate
		);

	try {

		const response = await fetch(
			url,
			{
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

			currentReportHeaders = [];
			currentReportRows = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load report."
				);

			showMsg(message);
			showReportErrorState(message);

			return;
		}

		const reportData =
			Array.isArray(result)
				? result
				: [];

		renderReport(
			reportType,
			reportData
		);

		updateReportMeta(
			reportData.length,
			reportType,
			fromDate,
			toDate
		);

		applyReportPagePermissions();

	} catch (error) {

		console.error(
			"Unable to load report:",
			error
		);

		currentReportHeaders = [];
		currentReportRows = [];

		showMsg(
			"Unable to load report."
		);

		showReportErrorState(
			"Unable to load report."
		);

	} finally {

		isLoadingSelectedReport = false;

		setButtonLoading(
			"loadReportBtn",
			"Load Report",
			false
		);
	}
}


function buildReportUrl(
	reportType,
	tenantId,
	fromDate,
	toDate
) {

	let url =
		`${API_BASE}/saas/reports/${reportType}` +
		`?tenantId=${encodeURIComponent(tenantId)}`;

	if (reportType === "low-stock") {

		url =
			`${API_BASE}/saas/reports/inventory/low-stock` +
			`?tenantId=${encodeURIComponent(tenantId)}`;

	} else if (reportType === "lab") {

		url =
			`${API_BASE}/saas/reports/diagnostics` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&type=LAB` +
			`&fromDate=${encodeURIComponent(fromDate)}` +
			`&toDate=${encodeURIComponent(toDate)}`;

	} else if (reportType === "radiology") {

		url =
			`${API_BASE}/saas/reports/diagnostics` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&type=RADIOLOGY` +
			`&fromDate=${encodeURIComponent(fromDate)}` +
			`&toDate=${encodeURIComponent(toDate)}`;

	} else if (reportType !== "patients") {

		url +=
			`&fromDate=${encodeURIComponent(fromDate)}` +
			`&toDate=${encodeURIComponent(toDate)}`;
	}

	return url;
}


function renderReport(type, data) {

	setText(
		"reportTitle",
		getReportTitle(type)
	);

	let headers = [];
	let rows = [];

	if (type === "patients") {

		headers = [
			"Code",
			"Name",
			"Mobile",
			"Gender",
			"Age",
			"City",
			"Created"
		];

		rows =
			data.map(
				function(item) {
					return [
						item.patientCode,
						item.patientName,
						item.mobile,
						item.gender,
						item.age,
						item.city,
						formatDate(item.createdAt)
					];
				}
			);

	} else if (type === "appointments") {

		headers = [
			"Date",
			"Time",
			"Patient",
			"Doctor",
			"Department",
			"Type",
			"Status"
		];

		rows =
			data.map(
				function(item) {
					return [
						item.appointmentDate,
						item.appointmentTime,
						item.patientName,
						item.doctorName,
						item.department,
						item.appointmentType,
						item.status
					];
				}
			);

	} else if (type === "opd") {

		headers = [
			"OPD No",
			"Date",
			"Patient",
			"Doctor",
			"Diagnosis",
			"Fee",
			"Status"
		];

		rows =
			data.map(
				function(item) {
					return [
						item.opdNumber,
						formatDate(item.visitDateTime),
						item.patientName,
						item.doctorName,
						item.diagnosis,
						"₹" + safeText(item.consultationFee),
						item.status
					];
				}
			);

	} else if (type === "ipd") {

		headers = [
			"IPD No",
			"Patient",
			"Doctor",
			"Ward",
			"Bed",
			"Admission",
			"Discharge",
			"Total",
			"Status"
		];

		rows =
			data.map(
				function(item) {
					return [
						item.ipdNumber,
						item.patientName,
						item.doctorName,
						item.wardName,
						item.bedNumber,
						formatDate(item.admissionDateTime),
						formatDate(item.dischargeDateTime),
						"₹" + safeText(item.totalCharges),
						item.status
					];
				}
			);

	} else if (type === "billing") {

		headers = [
			"Invoice",
			"Type",
			"Patient",
			"Total",
			"Paid",
			"Due",
			"Status",
			"Mode",
			"Date"
		];

		rows =
			data.map(
				function(item) {
					return [
						item.invoiceNumber,
						item.invoiceType,
						item.patientName,
						"₹" + safeText(item.totalAmount),
						"₹" + safeText(item.paidAmount),
						"₹" + safeText(item.dueAmount),
						item.paymentStatus,
						item.paymentMode,
						formatDate(item.invoiceDateTime)
					];
				}
			);

	} else if (type === "pharmacy") {

		headers = [
			"Sale No",
			"Patient",
			"Total",
			"Paid",
			"Due",
			"Status",
			"Date"
		];

		rows =
			data.map(
				function(item) {
					return [
						item.saleNumber,
						item.patientName,
						"₹" + safeText(item.totalAmount),
						"₹" + safeText(item.paidAmount),
						"₹" + safeText(item.dueAmount),
						item.paymentStatus,
						formatDate(item.saleDateTime)
					];
				}
			);

	} else if (type === "low-stock") {

		headers = [
			"Medicine",
			"Batch",
			"Expiry",
			"Qty",
			"Reorder Level",
			"Expired"
		];

		rows =
			data.map(
				function(item) {
					return [
						item.medicineName,
						item.batchNumber,
						item.expiryDate,
						item.currentQuantity,
						item.reorderLevel,
						item.expired
							? "YES"
							: "NO"
					];
				}
			);

	} else if (
		type === "lab" ||
		type === "radiology"
	) {

		headers = [
			"Order",
			"Type",
			"Patient",
			"Doctor",
			"Total",
			"Status",
			"Invoice",
			"Date"
		];

		rows =
			data.map(
				function(item) {
					return [
						item.orderNumber,
						item.diagnosticType,
						item.patientName,
						item.doctorName,
						"₹" + safeText(item.totalAmount),
						item.status,
						item.invoiceId || "-",
						formatDate(item.orderDateTime)
					];
				}
			);
	}

	currentReportHeaders = headers;
	currentReportRows = rows;

	renderTable(
		headers,
		rows
	);
}


function renderTable(headers, rows) {

	const tableHead =
		document.getElementById(
			"reportTableHead"
		);

	const tableBody =
		document.getElementById(
			"reportTableBody"
		);

	if (!tableHead || !tableBody) {
		return;
	}

	if (
		!Array.isArray(headers) ||
		headers.length === 0
	) {

		tableHead.innerHTML = "";

		tableBody.innerHTML = `
			<tr>
				<td>

					<div class="saas-reports-state">

						<div class="saas-reports-state-icon">
							<i class="bi bi-bar-chart-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No report selected
						</h5>

						<p class="text-muted mb-0">
							Select a report and click Load Report.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableHead.innerHTML = `
		<tr>
			${headers
			.map(
				function(header) {
					return (
						`<th>${escapeHtml(header)}</th>`
					);
				}
			)
			.join("")}
		</tr>
	`;

	if (
		!Array.isArray(rows) ||
		rows.length === 0
	) {

		tableBody.innerHTML = `
			<tr>
				<td colspan="${headers.length}">

					<div class="saas-reports-state">

						<div class="saas-reports-state-icon">
							<i class="bi bi-inbox-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No data found
						</h5>

						<p class="text-muted mb-0">
							No records are available for the selected report criteria.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableBody.innerHTML =
		rows.map(
			function(row, index) {

				return `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						${row
						.map(
							function(cell) {
								return (
									`<td>${safe(cell)}</td>`
								);
							}
						)
						.join("")}

					</tr>
				`;
			}
		).join("");
}


function getReportTitle(type) {

	const titles = {
		patients:
			"Patient Report",

		appointments:
			"Appointment Report",

		opd:
			"OPD Report",

		ipd:
			"IPD Report",

		billing:
			"Billing Report",

		pharmacy:
			"Pharmacy Sales Report",

		"low-stock":
			"Low Stock Report",

		lab:
			"Lab Report",

		radiology:
			"Radiology Report"
	};

	return titles[type] || "Report";
}


function updateReportMeta(
	recordCount,
	reportType,
	fromDate,
	toDate
) {

	let text =
		`${recordCount} record${recordCount === 1 ? "" : "s"}`;

	if (
		reportType !== "patients" &&
		reportType !== "low-stock"
	) {

		text +=
			` | ${fromDate} to ${toDate}`;
	}

	setText(
		"reportMetaText",
		text
	);
}


function exportTableToCsv() {

	if (!reportPagePermissions.export) {

		showMsg(
			"You do not have permission to export reports."
		);

		return;
	}

	if (
		currentReportHeaders.length === 0 ||
		currentReportRows.length === 0
	) {

		showMsg(
			"There is no report data to export."
		);

		return;
	}

	const csvRows = [
		currentReportHeaders,
		...currentReportRows
	];

	let csv = "\uFEFF";

	csvRows.forEach(
		function(row) {

			const values =
				row.map(
					function(cell) {

						const value =
							cell === null ||
								cell === undefined
								? ""
								: String(cell);

						return (
							'"' +
							value.replace(/"/g, '""') +
							'"'
						);
					}
				);

			csv +=
				values.join(",") +
				"\r\n";
		}
	);

	const blob =
		new Blob(
			[csv],
			{
				type:
					"text/csv;charset=utf-8"
			}
		);

	const url =
		window.URL.createObjectURL(blob);

	const anchor =
		document.createElement("a");

	anchor.href = url;

	anchor.download =
		`saas-${currentReportType}-report.csv`;

	document.body.appendChild(anchor);

	anchor.click();
	anchor.remove();

	window.URL.revokeObjectURL(url);

	showMsg(
		"Report exported successfully.",
		"success"
	);
}


async function applyReportPagePermissions() {

	const [
		canExport,
		canPrint
	] =
		await Promise.all([
			hasSaasPermission(
				"REPORTS",
				"EXPORT"
			),
			hasSaasPermission(
				"REPORTS",
				"PRINT"
			)
		]);

	reportPagePermissions = {
		export:
			Boolean(canExport),

		print:
			Boolean(canPrint)
	};

	showOrHideByClass(
		"export-report-btn",
		reportPagePermissions.export
	);

	showOrHideByClass(
		"print-report-btn",
		reportPagePermissions.print
	);
}


function showReportLoadingState() {

	const tableHead =
		document.getElementById(
			"reportTableHead"
		);

	const tableBody =
		document.getElementById(
			"reportTableBody"
		);

	if (tableHead) {
		tableHead.innerHTML = "";
	}

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td>

				<div class="saas-reports-state">

					<div class="saas-reports-state-icon saas-reports-loading">
						<i class="bi bi-bar-chart-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading report
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare the report data.
					</p>

				</div>

			</td>
		</tr>
	`;
}


function showReportErrorState(message) {

	const tableHead =
		document.getElementById(
			"reportTableHead"
		);

	const tableBody =
		document.getElementById(
			"reportTableBody"
		);

	if (tableHead) {
		tableHead.innerHTML = "";
	}

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td>

				<div class="saas-reports-state">

					<div class="saas-reports-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load report
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}


async function safeJson(response) {

	try {

		const text =
			await response.text();

		if (!text.trim()) {
			return {};
		}

		try {
			return JSON.parse(text);
		} catch (error) {
			return {};
		}

	} catch (error) {
		return {};
	}
}


function getApiErrorMessage(data, fallback) {

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


function showMsg(
	message,
	type = "danger"
) {

	const msg =
		document.getElementById("msg");

	if (!msg) {
		alert(message);
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
		5000
	);
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

		if (!button.dataset.originalHtml) {
			button.dataset.originalHtml =
				button.innerHTML;
		}

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


function setAnimatedNumber(id, value) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const target =
		Number(value) || 0;

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


function getValue(id) {

	const element =
		document.getElementById(id);

	return element
		? String(element.value || "").trim()
		: "";
}


function setValue(id, value) {

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


function setText(id, value) {

	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
}


function safeText(value) {

	return value === null ||
		value === undefined ||
		value === ""
		? "-"
		: String(value);
}


function safe(value) {

	return value === null ||
		value === undefined ||
		value === ""
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


function formatDate(value) {

	if (!value) {
		return "-";
	}

	return escapeHtml(
		String(value)
			.replace("T", " ")
			.substring(0, 16)
	);
}