let hospitalPatients = [];
let editingPatientId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalPatients();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function togglePatientForm() {
	const panel = document.getElementById("patientFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function loadHospitalPatients() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/patients`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to load patients");
			return;
		}

		hospitalPatients = result;
		renderPatients(hospitalPatients);

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

async function createHospitalPatient() {
	const payload = {
		patientName: getVal("patientName"),
		mobile: getVal("mobile"),
		gender: getVal("gender"),
		age: toInt(getVal("age")),
		patientType: getVal("patientType"),
		department: getVal("department"),
		doctorName: getVal("doctorName"),
		admissionDate: getVal("admissionDate"),
		dischargeDate: getVal("dischargeDate") || null,
		diagnosis: getVal("diagnosis")
	};

	if (!payload.patientName || !payload.mobile || !payload.patientType) {
		showMsg("Patient name, mobile and patient type are required");
		return;
	}

	const token = localStorage.getItem("token");

	const url = editingPatientId
		? `${API_BASE}/hospital/patients/${editingPatientId}`
		: `${API_BASE}/hospital/patients`;

	const method = editingPatientId ? "PUT" : "POST";

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
			showMsg(result.message || "Unable to save patient");
			return;
		}

		showMsg(editingPatientId ? "Patient updated successfully" : "Patient saved successfully", "success");

		editingPatientId = null;
		clearForm();
		document.getElementById("patientFormPanel").style.display = "none";
		loadHospitalPatients();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function filterPatients() {
	const type = document.getElementById("typeFilter").value;
	const keyword = document.getElementById("searchBox").value.toLowerCase();

	const filtered = hospitalPatients.filter(p => {
		const typeMatch = !type || p.patientType === type;
		const textMatch = !keyword || JSON.stringify(p).toLowerCase().includes(keyword);
		return typeMatch && textMatch;
	});

	renderPatients(filtered);
}

function renderPatients(patients) {
	const table = document.getElementById("patientTable");

	if (!patients.length) {
		table.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No patients found</td></tr>`;
		return;
	}

	let html = "";

	patients.forEach((p, index) => {
		html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${safe(p.patientName)}</strong><br>
                    <span class="text-muted small">${safe(p.mobile)} | ${safe(p.gender)} | Age: ${safe(p.age)}</span>
                </td>
                <td>${patientTypeBadge(p.patientType)}</td>
                <td>${safe(p.department)}</td>
                <td>${safe(p.doctorName)}</td>
                <td>${formatDate(p.admissionDate)}</td>
                <td>${formatDate(p.dischargeDate)}</td>
                <td>${safe(p.diagnosis)}</td>
                <td>
    <button class="btn btn-sm btn-outline-primary me-1"
            onclick="editPatient(${p.id})">
        Edit
    </button>

    <button class="btn btn-sm btn-outline-danger"
            onclick="deletePatient(${p.id})">
        Delete
    </button>
</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}


function editPatient(id) {
    const p = hospitalPatients.find(item => item.id === id);

    if (!p) {
        showMsg("Patient not found");
        return;
    }

    editingPatientId = id;

    document.getElementById("patientName").value = p.patientName || "";
    document.getElementById("mobile").value = p.mobile || "";
    document.getElementById("gender").value = p.gender || "";
    document.getElementById("age").value = p.age || "";
    document.getElementById("patientType").value = p.patientType || "";
    document.getElementById("department").value = p.department || "";
    document.getElementById("doctorName").value = p.doctorName || "";
    document.getElementById("admissionDate").value = p.admissionDate || "";
    document.getElementById("dischargeDate").value = p.dischargeDate || "";
    document.getElementById("diagnosis").value = p.diagnosis || "";

    document.getElementById("patientFormPanel").style.display = "block";
}

async function deletePatient(id) {
    if (!confirm("Are you sure you want to delete this patient?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/hospital/patients/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultText = await response.text();

        if (!response.ok) {
            showMsg(resultText || "Unable to delete patient");
            return;
        }

        showMsg("Patient deleted successfully", "success");
        loadHospitalPatients();

    } catch (e) {
        showMsg("Hospital service not reachable.");
    }
}
function patientTypeBadge(type) {
	if (type === "OPD") return `<span class="badge bg-info text-dark">OPD</span>`;
	if (type === "IPD") return `<span class="badge bg-primary">IPD</span>`;
	return `<span class="badge bg-secondary">${safe(type)}</span>`;
}

function clearForm() {
    editingPatientId = null;

    [
        "patientName", "mobile", "gender", "age", "patientType", "department",
        "doctorName", "admissionDate", "dischargeDate", "diagnosis"
    ].forEach(id => document.getElementById(id).value = "");
}

function getVal(id) {
	return document.getElementById(id).value.trim();
}

function toInt(value) {
	return value ? parseInt(value) : null;
}

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDate(value) {
	return value ? new Date(value).toLocaleDateString() : "-";
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}