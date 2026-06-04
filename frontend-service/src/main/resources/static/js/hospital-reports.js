let hospitalReportRows = [];

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalReports();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadHospitalReports() {
	const token = localStorage.getItem("token");

	try {
		const [patientsRes, inventoryRes, billsRes] = await Promise.all([
			fetch(`${API_BASE}/hospital/patients`, { headers: { "Authorization": "Bearer " + token } }),
			fetch(`${API_BASE}/hospital/inventory`, { headers: { "Authorization": "Bearer " + token } }),
			fetch(`${API_BASE}/hospital/bills`, { headers: { "Authorization": "Bearer " + token } })
		]);

		const patients = patientsRes.ok ? await patientsRes.json() : [];
		const inventory = inventoryRes.ok ? await inventoryRes.json() : [];
		const bills = billsRes.ok ? await billsRes.json() : [];

		document.getElementById("opdCount").innerText =
			patients.filter(p => p.patientType === "OPD").length;

		document.getElementById("ipdCount").innerText =
			patients.filter(p => p.patientType === "IPD").length;

		const totalBilling = bills.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
		document.getElementById("billingValue").innerText = formatShortMoney(totalBilling);

		document.getElementById("lowStockCount").innerText =
			inventory.filter(i => Number(i.quantity || 0) <= Number(i.minimumQuantity || 0)).length;

		renderBillReport(bills);

	} catch (e) {
		document.getElementById("msg").innerHTML =
			`<div class="alert alert-danger">Hospital service not reachable.</div>`;
	}
}

function renderBillReport(bills) {
	const table = document.getElementById("hospitalReportTable");

	hospitalReportRows = bills.map(b => ({
		patient: b.patient ? b.patient.patientName : "",
		patientType: b.patient ? b.patient.patientType : "",
		totalAmount: b.totalAmount,
		status: b.status,
		date: b.createdAt
	}));

	if (!bills.length) {
		table.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No bill data found</td></tr>`;
		return;
	}

	let html = "";

	bills.forEach((b, index) => {
		const patient = b.patient || {};

		html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(patient.patientName)}</strong></td>
                <td>${safe(patient.patientType)}</td>
                <td>Rs. ${formatMoney(b.totalAmount)}</td>
                <td>${safe(b.status)}</td>
                <td>${formatDateTime(b.createdAt)}</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function exportHospitalReportCsv() {
	if (!hospitalReportRows.length) {
		alert("No data to export");
		return;
	}

	const headers = Object.keys(hospitalReportRows[0]);

	const csv = [
		headers.join(","),
		...hospitalReportRows.map(row => headers.map(h => `"${safe(row[h])}"`).join(","))
	].join("\n");

	const blob = new Blob([csv], { type: "text/csv" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = "hospital-report.csv";
	a.click();

	URL.revokeObjectURL(url);
}

function formatShortMoney(value) {
	value = Number(value || 0);

	if (value >= 100000) return "Rs. " + (value / 100000).toFixed(1) + "L";
	if (value >= 1000) return "Rs. " + (value / 1000).toFixed(1) + "K";

	return "Rs. " + value.toFixed(0);
}

function formatMoney(value) {
	return value === null || value === undefined ? "0.00" : Number(value).toFixed(2);
}

function formatDateTime(value) {
	return value ? new Date(value).toLocaleString() : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}