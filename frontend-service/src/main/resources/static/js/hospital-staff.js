let hospitalStaff = [];
let editingStaffId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadStaff();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleStaffForm() {
	const panel = document.getElementById("staffFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function loadStaff() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/staff`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to load staff");
			return;
		}

		hospitalStaff = result;
		renderStaff(hospitalStaff);

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

async function createStaff() {
	const payload = {
		staffName: getVal("staffName"),
		designation: getVal("designation"),
		department: getVal("department"),
		mobile: getVal("mobile"),
		email: getVal("email"),
		salary: toDecimal(getVal("salary"))
	};

	if (!payload.staffName || !payload.designation || !payload.department) {
		showMsg("Staff name, designation and department are required");
		return;
	}

	const token = localStorage.getItem("token");

	const url = editingStaffId
		? `${API_BASE}/hospital/staff/${editingStaffId}`
		: `${API_BASE}/hospital/staff`;

	const method = editingStaffId ? "PUT" : "POST";

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
			showMsg(result.message || "Unable to save staff");
			return;
		}

		showMsg(editingStaffId ? "Staff updated successfully" : "Staff saved successfully", "success");

		editingStaffId = null;
		clearForm();
		document.getElementById("staffFormPanel").style.display = "none";
		loadStaff();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

function filterStaff() {
	const keyword = document.getElementById("searchBox").value.toLowerCase();
	renderStaff(hospitalStaff.filter(s => JSON.stringify(s).toLowerCase().includes(keyword)));
}

function renderStaff(staff) {
	const table = document.getElementById("staffTable");

	if (!staff.length) {
		table.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No staff found</td></tr>`;
		return;
	}

	let html = "";

	staff.forEach((s, index) => {
		html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(s.staffName)}</strong></td>
                <td>${safe(s.designation)}</td>
                <td>${safe(s.department)}</td>
                <td>${safe(s.mobile)}</td>
                <td>${safe(s.email)}</td>
                <td>Rs. ${formatMoney(s.salary)}</td>
                <td>
    <button class="btn btn-sm btn-outline-primary me-1"
            onclick="editStaff(${s.id})">
        Edit
    </button>

    <button class="btn btn-sm btn-outline-danger"
            onclick="deleteStaff(${s.id})">
        Delete
    </button>
</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function editStaff(id) {
    const s = hospitalStaff.find(item => item.id === id);

    if (!s) {
        showMsg("Staff not found");
        return;
    }

    editingStaffId = id;

    document.getElementById("staffName").value = s.staffName || "";
    document.getElementById("designation").value = s.designation || "";
    document.getElementById("department").value = s.department || "";
    document.getElementById("mobile").value = s.mobile || "";
    document.getElementById("email").value = s.email || "";
    document.getElementById("salary").value = s.salary || "";

    document.getElementById("staffFormPanel").style.display = "block";
}

async function deleteStaff(id) {
    if (!confirm("Are you sure you want to delete this staff record?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/hospital/staff/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultText = await response.text();

        if (!response.ok) {
            showMsg(resultText || "Unable to delete staff");
            return;
        }

        showMsg("Staff deleted successfully", "success");
        loadStaff();

    } catch (e) {
        showMsg("Hospital service not reachable.");
    }
}
function clearForm() {
    editingStaffId = null;

    ["staffName", "designation", "department", "mobile", "email", "salary"]
        .forEach(id => document.getElementById(id).value = "");
}

function getVal(id) { return document.getElementById(id).value.trim(); }
function toDecimal(v) { return v ? parseFloat(v) : null; }

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatMoney(value) {
	return value === null || value === undefined ? "0.00" : Number(value).toFixed(2);
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}