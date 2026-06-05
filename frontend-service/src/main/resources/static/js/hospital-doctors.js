let hospitalDoctors = [];
let editingDoctorId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalDoctors();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleDoctorForm() {
	const panel = document.getElementById("doctorFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function loadHospitalDoctors() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/doctors/my`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to load doctors");
			return;
		}

		hospitalDoctors = result;
		renderDoctors(hospitalDoctors);

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

async function saveHospitalDoctor() {
	const payload = {
		doctorName: getVal("doctorName"),
		specialization: getVal("specialization"),
		department: getVal("department"),
		qualification: getVal("qualification"),
		experienceYears: toInt(getVal("experienceYears")),
		consultationFee: toDecimal(getVal("consultationFee")),
		mobile: getVal("mobile"),
		email: getVal("email")
	};

	if (!payload.doctorName || !payload.department) {
		showMsg("Doctor name and department are required");
		return;
	}

	const token = localStorage.getItem("token");

	const url = editingDoctorId
		? `${API_BASE}/hospital/doctors/${editingDoctorId}`
		: `${API_BASE}/hospital/doctors`;

	const method = editingDoctorId ? "PUT" : "POST";

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
			showMsg(result.message || "Unable to save doctor");
			return;
		}

		showMsg(editingDoctorId ? "Doctor updated successfully" : "Doctor added successfully", "success");

		clearDoctorForm();
		document.getElementById("doctorFormPanel").style.display = "none";
		loadHospitalDoctors();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function renderDoctors(list) {
	const table = document.getElementById("doctorTable");

	if (!list || list.length === 0) {
		table.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hospital doctors found</td></tr>`;
		return;
	}

	let html = "";

	list.forEach((d, index) => {
		html += `
            <tr>
                <td>${index + 1}</td>

                <td>
                    <strong>${safe(d.doctorName)}</strong><br>
                    <span class="text-muted small">${safe(d.qualification)}</span>
                </td>

                <td>${safe(d.specialization)}</td>
                <td>${safe(d.department)}</td>
                <td>${safe(d.experienceYears)} years</td>
                <td>Rs. ${formatMoney(d.consultationFee)}</td>

                <td>
                    ${safe(d.mobile)}<br>
                    <span class="text-muted small">${safe(d.email)}</span>
                </td>

                <td>
                    <button class="btn btn-sm btn-outline-primary me-1"
                            onclick="editDoctor(${d.id})">
                        Edit
                    </button>

                    <button class="btn btn-sm btn-outline-danger"
                            onclick="deleteDoctor(${d.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function editDoctor(id) {
	const d = hospitalDoctors.find(item => item.id === id);

	if (!d) {
		showMsg("Doctor not found");
		return;
	}

	editingDoctorId = id;

	document.getElementById("doctorName").value = d.doctorName || "";
	document.getElementById("specialization").value = d.specialization || "";
	document.getElementById("department").value = d.department || "";
	document.getElementById("qualification").value = d.qualification || "";
	document.getElementById("experienceYears").value = d.experienceYears || "";
	document.getElementById("consultationFee").value = d.consultationFee || "";
	document.getElementById("mobile").value = d.mobile || "";
	document.getElementById("email").value = d.email || "";

	document.getElementById("doctorFormPanel").style.display = "block";
}

async function deleteDoctor(id) {
	if (!confirm("Delete this hospital doctor?")) {
		return;
	}

	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/doctors/${id}`, {
			method: "DELETE",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const text = await response.text();

		if (!response.ok) {
			showMsg(text || "Unable to delete doctor");
			return;
		}

		showMsg("Doctor deleted successfully", "success");
		loadHospitalDoctors();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function filterDoctors() {
	const keyword = document.getElementById("searchBox").value.toLowerCase();

	const filtered = hospitalDoctors.filter(d =>
		JSON.stringify(d).toLowerCase().includes(keyword)
	);

	renderDoctors(filtered);
}

function clearDoctorForm() {
	editingDoctorId = null;

	[
		"doctorName",
		"specialization",
		"department",
		"qualification",
		"experienceYears",
		"consultationFee",
		"mobile",
		"email"
	].forEach(id => document.getElementById(id).value = "");
}

function getVal(id) {
	return document.getElementById(id).value.trim();
}

function toInt(value) {
	return value ? parseInt(value) : null;
}

function toDecimal(value) {
	return value ? parseFloat(value) : null;
}

function formatMoney(value) {
	return value === null || value === undefined ? "0.00" : Number(value).toFixed(2);
}

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}