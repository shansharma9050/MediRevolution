document.addEventListener("DOMContentLoaded", async function () {
    const allowed = await protectSaasPage("REPORTS", "VIEW");
    if (!allowed) return;
	const tenantId = localStorage.getItem("tenantId");
	const tenantName = localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	document.getElementById("tenantNameText").innerText = tenantName || "your workspace";

	setDefaultDates();
	loadDashboardReport();
	loadSelectedReport();
});

function setDefaultDates() {
	const today = new Date();
	const from = new Date();
	from.setMonth(from.getMonth() - 1);

	document.getElementById("toDate").value = today.toISOString().substring(0, 10);
	document.getElementById("fromDate").value = from.toISOString().substring(0, 10);
}

async function loadDashboardReport() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	try {
		const response = await fetch(`${API_BASE}/saas/reports/dashboard?tenantId=${tenantId}`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to load dashboard report.");
			return;
		}

		document.getElementById("totalPatients").innerText = safe(result.totalPatients);
		document.getElementById("totalAppointments").innerText = safe(result.totalAppointments);
		document.getElementById("totalBilling").innerText = "₹" + safe(result.totalBilling);
		document.getElementById("totalDue").innerText = "₹" + safe(result.totalDue);

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

async function loadSelectedReport() {
	const reportType = document.getElementById("reportType").value;
	const tenantId = localStorage.getItem("tenantId");
	const token = localStorage.getItem("token");
	const fromDate = document.getElementById("fromDate").value;
	const toDate = document.getElementById("toDate").value;

	let url = `${API_BASE}/saas/reports/${reportType}?tenantId=${tenantId}`;

	if (reportType === "low-stock") {
		url = `${API_BASE}/saas/reports/inventory/low-stock?tenantId=${tenantId}`;
	} else if (reportType === "lab") {
		url = `${API_BASE}/saas/reports/diagnostics?tenantId=${tenantId}&type=LAB&fromDate=${fromDate}&toDate=${toDate}`;
	} else if (reportType === "radiology") {
		url = `${API_BASE}/saas/reports/diagnostics?tenantId=${tenantId}&type=RADIOLOGY&fromDate=${fromDate}&toDate=${toDate}`;
	} else if (reportType !== "patients") {
		url += `&fromDate=${fromDate}&toDate=${toDate}`;
	}

	try {
		const response = await fetch(url, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to load report.");
			renderTable([], []);
			return;
		}

		renderReport(reportType, Array.isArray(result) ? result : []);
		
		await applyReportButtonPermissions();

	} catch (error) {
		console.error(error);
		showMsg("Unable to load report.");
	}
}

function renderReport(type, data) {
	document.getElementById("reportTitle").innerText = getReportTitle(type);

	if (type === "patients") {
		renderTable(
			["Code", "Name", "Mobile", "Gender", "Age", "City", "Created"],
			data.map(x => [
				x.patientCode,
				x.patientName,
				x.mobile,
				x.gender,
				x.age,
				x.city,
				formatDate(x.createdAt)
			])
		);
		return;
	}

	if (type === "appointments") {
		renderTable(
			["Date", "Time", "Patient", "Doctor", "Department", "Type", "Status"],
			data.map(x => [
				x.appointmentDate,
				x.appointmentTime,
				x.patientName,
				x.doctorName,
				x.department,
				x.appointmentType,
				x.status
			])
		);
		return;
	}

	if (type === "opd") {
		renderTable(
			["OPD No", "Date", "Patient", "Doctor", "Diagnosis", "Fee", "Status"],
			data.map(x => [
				x.opdNumber,
				formatDate(x.visitDateTime),
				x.patientName,
				x.doctorName,
				x.diagnosis,
				"₹" + safe(x.consultationFee),
				x.status
			])
		);
		return;
	}

	if (type === "ipd") {
		renderTable(
			["IPD No", "Patient", "Doctor", "Ward", "Bed", "Admission", "Discharge", "Total", "Status"],
			data.map(x => [
				x.ipdNumber,
				x.patientName,
				x.doctorName,
				x.wardName,
				x.bedNumber,
				formatDate(x.admissionDateTime),
				formatDate(x.dischargeDateTime),
				"₹" + safe(x.totalCharges),
				x.status
			])
		);
		return;
	}

	if (type === "billing") {
		renderTable(
			["Invoice", "Type", "Patient", "Total", "Paid", "Due", "Status", "Mode", "Date"],
			data.map(x => [
				x.invoiceNumber,
				x.invoiceType,
				x.patientName,
				"₹" + safe(x.totalAmount),
				"₹" + safe(x.paidAmount),
				"₹" + safe(x.dueAmount),
				x.paymentStatus,
				x.paymentMode,
				formatDate(x.invoiceDateTime)
			])
		);
		return;
	}

	if (type === "pharmacy") {
		renderTable(
			["Sale No", "Patient", "Total", "Paid", "Due", "Status", "Date"],
			data.map(x => [
				x.saleNumber,
				x.patientName,
				"₹" + safe(x.totalAmount),
				"₹" + safe(x.paidAmount),
				"₹" + safe(x.dueAmount),
				x.paymentStatus,
				formatDate(x.saleDateTime)
			])
		);
		return;
	}

	if (type === "low-stock") {
		renderTable(
			["Medicine", "Batch", "Expiry", "Qty", "Reorder Level", "Expired"],
			data.map(x => [
				x.medicineName,
				x.batchNumber,
				x.expiryDate,
				x.currentQuantity,
				x.reorderLevel,
				x.expired ? "YES" : "NO"
			])
		);
		return;
	}

	if (type === "lab" || type === "radiology") {
		renderTable(
			["Order", "Type", "Patient", "Doctor", "Total", "Status", "Invoice", "Date"],
			data.map(x => [
				x.orderNumber,
				x.diagnosticType,
				x.patientName,
				x.doctorName,
				"₹" + safe(x.totalAmount),
				x.status,
				x.invoiceId || "-",
				formatDate(x.orderDateTime)
			])
		);
	}
}

function renderTable(headers, rows) {
	const thead = document.getElementById("reportTableHead");
	const tbody = document.getElementById("reportTableBody");

	if (!headers || headers.length === 0) {
		thead.innerHTML = "";
		tbody.innerHTML = `
            <tr>
                <td class="text-center text-muted py-4">No report selected.</td>
            </tr>
        `;
		return;
	}

	thead.innerHTML = `
        <tr>
            ${headers.map(h => `<th>${safe(h)}</th>`).join("")}
        </tr>
    `;

	if (!rows || rows.length === 0) {
		tbody.innerHTML = `
            <tr>
                <td colspan="${headers.length}" class="text-center text-muted py-4">
                    No data found.
                </td>
            </tr>
        `;
		return;
	}

	tbody.innerHTML = rows.map(row => `
        <tr>
            ${row.map(cell => `<td>${safe(cell)}</td>`).join("")}
        </tr>
    `).join("");
}

function getReportTitle(type) {
	const titles = {
		patients: "Patient Report",
		appointments: "Appointment Report",
		opd: "OPD Report",
		ipd: "IPD Report",
		billing: "Billing Report",
		pharmacy: "Pharmacy Sales Report",
		"low-stock": "Low Stock Report",
		lab: "Lab Report",
		radiology: "Radiology Report"
	};

	return titles[type] || "Report";
}

function exportTableToCsv() {
	const table = document.getElementById("reportTable");
	const rows = table.querySelectorAll("tr");
	let csv = "";

	rows.forEach(row => {
		const cols = row.querySelectorAll("th, td");
		const values = [];

		cols.forEach(col => {
			values.push('"' + col.innerText.replace(/"/g, '""') + '"');
		});

		csv += values.join(",") + "\n";
	});

	const blob = new Blob([csv], { type: "text/csv" });
	const url = window.URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = "saas-report.csv";
	document.body.appendChild(a);
	a.click();

	a.remove();
	window.URL.revokeObjectURL(url);
}

async function applyReportButtonPermissions() {
    const canExport = await hasSaasPermission("REPORTS", "EXPORT");
    const canPrint = await hasSaasPermission("REPORTS", "PRINT");

    showOrHideByClass("export-report-btn", canExport);
    showOrHideByClass("print-report-btn", canPrint);
}

async function safeJson(response) {
	try {
		return await response.json();
	} catch (e) {
		return {};
	}
}

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	return String(value).replace("T", " ").substring(0, 16);
}