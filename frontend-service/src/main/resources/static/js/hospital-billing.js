let billingPatients = [];
let hospitalBills = [];

let editingBillId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadPatientsForBilling();
	loadBills();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleBillForm() {
	const panel = document.getElementById("billFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function loadPatientsForBilling() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/patients`, {
			headers: { "Authorization": "Bearer " + token }
		});

		billingPatients = response.ok ? await response.json() : [];
		renderPatientDropdown();

	} catch (e) {
		showMsg("Unable to load patients");
	}
}

function renderPatientDropdown() {
	const dropdown = document.getElementById("patientId");

	if (!billingPatients.length) {
		dropdown.innerHTML = `<option value="">No patients found</option>`;
		return;
	}

	let html = `<option value="">Select Patient</option>`;

	billingPatients.forEach(p => {
		html += `<option value="${p.id}">${p.patientName} - ${p.patientType} - ${p.mobile}</option>`;
	});

	dropdown.innerHTML = html;
}

async function loadBills() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/bills`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to load bills");
			return;
		}

		hospitalBills = result;
		renderBills();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

async function createBill() {
	const patientId = document.getElementById("patientId").value;

	if (!patientId && !editingBillId) {
		showMsg("Please select patient");
		return;
	}

	const payload = {
		consultationFee: toDecimal(getVal("consultationFee")),
		medicineCharge: toDecimal(getVal("medicineCharge")),
		roomCharge: toDecimal(getVal("roomCharge")),
		otherCharge: toDecimal(getVal("otherCharge")),
		status: getVal("billStatus") || "PENDING"
	};

	const token = localStorage.getItem("token");

	const url = editingBillId
		? `${API_BASE}/hospital/bills/${editingBillId}`
		: `${API_BASE}/hospital/patients/${patientId}/bill`;

	const method = editingBillId ? "PUT" : "POST";

	try {
		const response = await fetch(url, {
			method: method,
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to save bill");
			return;
		}

		showMsg(editingBillId ? "Bill updated successfully" : "Bill created successfully", "success");

		editingBillId = null;
		clearForm();
		document.getElementById("billFormPanel").style.display = "none";
		loadBills();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function renderBills() {
	const table = document.getElementById("billTable");

	if (!hospitalBills.length) {
		table.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No bills found</td></tr>`;
		return;
	}

	let html = "";

	hospitalBills.forEach((b, index) => {
		const patient = b.patient || {};

		html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(patient.patientName)}</strong><br><span class="text-muted small">${safe(patient.patientType)}</span></td>
                <td>Rs. ${formatMoney(b.consultationFee)}</td>
                <td>Rs. ${formatMoney(b.medicineCharge)}</td>
                <td>Rs. ${formatMoney(b.roomCharge)}</td>
                <td>Rs. ${formatMoney(b.otherCharge)}</td>
                <td><strong>Rs. ${formatMoney(b.totalAmount)}</strong></td>
                <td>${billStatusBadge(b.status)}</td>
                <td>
    <button class="btn btn-sm btn-outline-primary me-1"
            onclick="editBill(${b.id})">
        Edit
    </button>

    ${b.status !== "PAID"
				? `<button class="btn btn-sm btn-success me-1" onclick="markBillPaid(${b.id})">Paid</button>`
				: ''
			}

    <button class="btn btn-sm btn-outline-danger"
            onclick="deleteBill(${b.id})">
        Delete
    </button>
</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function editBill(id) {
    const b = hospitalBills.find(item => item.id === id);

    if (!b) {
        showMsg("Bill not found");
        return;
    }

    editingBillId = id;

    document.getElementById("patientId").value = b.patient ? b.patient.id : "";
    document.getElementById("patientId").disabled = true;

    document.getElementById("consultationFee").value = b.consultationFee || "";
    document.getElementById("medicineCharge").value = b.medicineCharge || "";
    document.getElementById("roomCharge").value = b.roomCharge || "";
    document.getElementById("otherCharge").value = b.otherCharge || "";
    document.getElementById("billStatus").value = b.status || "PENDING";

    document.getElementById("billFormPanel").style.display = "block";
}

async function deleteBill(id) {
    if (!confirm("Are you sure you want to delete this bill?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/hospital/bills/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultText = await response.text();

        if (!response.ok) {
            showMsg(resultText || "Unable to delete bill");
            return;
        }

        showMsg("Bill deleted successfully", "success");
        loadBills();

    } catch (e) {
        showMsg("Hospital service not reachable.");
    }
}


async function markBillPaid(billId) {
	if (!confirm("Mark this bill as paid?")) {
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/bills/${billId}/paid`, {
			method: "PUT",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to update bill status");
			return;
		}

		showMsg("Bill marked as paid", "success");
		loadBills();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}
function billStatusBadge(status) {
	if (status === "PAID") return `<span class="badge bg-success">PAID</span>`;
	return `<span class="badge bg-warning text-dark">PENDING</span>`;
}

function clearForm() {
    editingBillId = null;

    document.getElementById("patientId").disabled = false;

    ["patientId", "consultationFee", "medicineCharge", "roomCharge", "otherCharge"]
        .forEach(id => document.getElementById(id).value = "");

    document.getElementById("billStatus").value = "PENDING";
}

function getVal(id) { return document.getElementById(id).value.trim(); }
function toDecimal(v) { return v ? parseFloat(v) : 0; }

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatMoney(value) {
	return value === null || value === undefined ? "0.00" : Number(value).toFixed(2);
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}