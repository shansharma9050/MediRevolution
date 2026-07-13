let staffModal;

document.addEventListener("DOMContentLoaded", async function() {
	const allowed = await protectSaasPage("STAFF", "VIEW");
	if (!allowed) return;

	const tenantName = localStorage.getItem("tenantName");

	const tenantNameText = document.getElementById("tenantNameText");
	if (tenantNameText) {
		tenantNameText.innerText = tenantName || "your workspace";
	}

	const modalElement = document.getElementById("staffModal");
	if (modalElement) {
		staffModal = new bootstrap.Modal(modalElement);
	}

	await loadStaff();

	const searchInput = document.getElementById("searchKeyword");
	if (searchInput) {
		searchInput.addEventListener("keyup", function(event) {
			if (event.key === "Enter") {
				searchStaff();
			}
		});
	}

	const staffRoleSelect = document.getElementById("staffRole");
	if (staffRoleSelect) {
		staffRoleSelect.addEventListener("change", toggleDoctorFields);
	}

	toggleDoctorFields();
});

async function loadStaff() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const tableBody = document.getElementById("staffTableBody");

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-muted py-4">Loading staff...</td>
        </tr>
    `;

	try {
		const response = await fetch(`${API_BASE}/saas/staff?tenantId=${tenantId}`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to load staff.");
			renderStaff([]);
			return;
		}

		renderStaff(Array.isArray(result) ? result : []);
		await applyStaffButtonPermissions();

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
		renderStaff([]);
	}
}

async function searchStaff() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");
	const keyword = getValue("searchKeyword");

	try {
		const response = await fetch(
			`${API_BASE}/saas/staff/search?tenantId=${tenantId}&keyword=${encodeURIComponent(keyword)}`,
			{
				method: "GET",
				headers: {
					"Authorization": "Bearer " + token
				}
			}
		);

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to search staff.");
			return;
		}

		renderStaff(Array.isArray(result) ? result : []);
		await applyStaffButtonPermissions();

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

function renderStaff(staffList) {
	const tableBody = document.getElementById("staffTableBody");

	if (!tableBody) {
		return;
	}

	if (!staffList || staffList.length === 0) {
		tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">No staff found.</td>
            </tr>
        `;
		return;
	}

	let html = "";

	staffList.forEach(staff => {
		html += `
            <tr>
                <td>${safe(staff.staffCode)}</td>

                <td>
                    <strong>${safe(staff.staffName)}</strong>
                    <div class="text-muted small">${safe(staff.email)}</div>
                    ${staff.staffRole === "DOCTOR"
				? `<div class="text-muted small">Auth ID: ${safe(staff.authUserId)}</div>`
				: ""
			}
                </td>

                <td>${roleBadge(staff.staffRole)}</td>

                <td>
                    ${safe(staff.department)}
                    ${staff.staffRole === "DOCTOR" && staff.specialization
				? `<div class="text-muted small">${safe(staff.specialization)}</div>`
				: ""
			}
                </td>

                <td>${safe(staff.mobile)}</td>

                <td>${safe(staff.city)}</td>

                <td>${statusBadge(staff.status)}</td>

                <td>
                    <button class="btn btn-sm btn-outline-primary edit-staff-btn"
                            onclick="editStaff(${staff.id})">
                        Edit
                    </button>

                    <button class="btn btn-sm btn-outline-danger delete-staff-btn"
                            onclick="deleteStaff(${staff.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
	});

	tableBody.innerHTML = html;
}

async function applyStaffButtonPermissions() {
	const canCreate = await hasSaasPermission("STAFF", "CREATE");
	const canUpdate = await hasSaasPermission("STAFF", "UPDATE");
	const canDelete = await hasSaasPermission("STAFF", "DELETE");

	showOrHideById("addStaffBtn", canCreate);
	showOrHideByClass("edit-staff-btn", canUpdate);
	showOrHideByClass("delete-staff-btn", canDelete);
}

function openCreateStaffModal() {
	clearStaffForm();

	const title = document.getElementById("staffModalTitle");
	if (title) {
		title.innerText = "Add Staff";
	}

	if (staffModal) {
		staffModal.show();
	}
}

async function editStaff(staffId) {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	try {
		const response = await fetch(`${API_BASE}/saas/staff/${staffId}?tenantId=${tenantId}`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const staff = await safeJson(response);

		if (!response.ok) {
			showMsg(staff.message || "Unable to load staff.");
			return;
		}

		fillStaffForm(staff);

		const title = document.getElementById("staffModalTitle");
		if (title) {
			title.innerText = "Edit Staff";
		}

		if (staffModal) {
			staffModal.show();
		}

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

async function saveStaff() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");
	const staffId = getValue("staffId");
	const isUpdate = staffId !== "";

	const payload = {
		tenantId: Number(tenantId),
		staffName: getValue("staffName"),
		email: getValue("email"),
		mobile: getValue("mobile"),
		password: getValue("password"),
		staffRole: getValue("staffRole"),

		department: getValue("department"),
		designation: getValue("designation"),
		gender: getValue("gender"),
		joiningDate: getValue("joiningDate") || null,
		address: getValue("address"),
		city: getValue("city"),
		state: getValue("state"),
		pincode: getValue("pincode"),
		salary: getValue("salary") ? Number(getValue("salary")) : null,
		emergencyContactName: getValue("emergencyContactName"),
		emergencyContactMobile: getValue("emergencyContactMobile"),

		qualification: getValue("qualification"),
		specialization: getValue("specialization"),
		registrationNumber: getValue("registrationNumber"),
		experienceYears: getValue("experienceYears") ? Number(getValue("experienceYears")) : null,
		consultationFee: getValue("consultationFee") ? Number(getValue("consultationFee")) : null,
		onlineConsultationFee: getValue("onlineConsultationFee") ? Number(getValue("onlineConsultationFee")) : null,
		onlineConsultationEnabled: getValue("onlineConsultationEnabled") === "true"
	};

	if (!payload.staffName) {
		showMsg("Staff name is required.");
		return;
	}

	if (!payload.staffRole) {
		showMsg("Staff role is required.");
		return;
	}

	if (!payload.email) {
		showMsg("Email is required.");
		return;
	}

	if (!payload.mobile) {
		showMsg("Mobile is required.");
		return;
	}

	if (!isUpdate && !payload.password) {
		showMsg("Password is required for new staff login.");
		return;
	}

	if (payload.staffRole === "DOCTOR") {
		if (!payload.department) {
			showMsg("Department is required for doctor.");
			return;
		}

		if (!payload.specialization) {
			showMsg("Specialization is required for doctor.");
			return;
		}

		if (!payload.qualification) {
			showMsg("Qualification is required for doctor.");
			return;
		}

		if (payload.consultationFee === null) {
			showMsg("Consultation fee is required for doctor.");
			return;
		}
	}

	const url = isUpdate
		? `${API_BASE}/saas/staff/${staffId}?tenantId=${tenantId}`
		: `${API_BASE}/saas/staff`;

	const method = isUpdate ? "PUT" : "POST";

	try {
		setButtonLoading("saveStaffBtn", "Saving...", true);

		const response = await fetch(url, {
			method: method,
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to save staff.");
			return;
		}

		if (staffModal) {
			staffModal.hide();
		}

		showMsg(isUpdate ? "Staff updated successfully." : "Staff added successfully.", "success");

		await loadStaff();

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	} finally {
		setButtonLoading("saveStaffBtn", "Save Staff", false);
	}
}

async function deleteStaff(staffId) {
	if (!confirm("Delete this staff?")) {
		return;
	}

	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	try {
		const response = await fetch(`${API_BASE}/saas/staff/${staffId}?tenantId=${tenantId}`, {
			method: "DELETE",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to delete staff.");
			return;
		}

		showMsg(result.message || "Staff deleted successfully.", "success");

		await loadStaff();

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

function fillStaffForm(staff) {
	setValue("staffId", staff.id);
	setValue("staffName", staff.staffName);
	setValue("email", staff.email);
	setValue("mobile", staff.mobile);

	/*
	 * Password is not returned from backend and should not be shown on edit.
	 */
	setValue("password", "");

	setValue("staffRole", staff.staffRole);
	setValue("department", staff.department);
	setValue("designation", staff.designation);
	setValue("gender", staff.gender);
	setValue("joiningDate", staff.joiningDate);
	setValue("address", staff.address);
	setValue("city", staff.city);
	setValue("state", staff.state);
	setValue("pincode", staff.pincode);
	setValue("salary", staff.salary);
	setValue("emergencyContactName", staff.emergencyContactName);
	setValue("emergencyContactMobile", staff.emergencyContactMobile);

	setValue("qualification", staff.qualification);
	setValue("specialization", staff.specialization);
	setValue("registrationNumber", staff.registrationNumber);
	setValue("experienceYears", staff.experienceYears);
	setValue("consultationFee", staff.consultationFee);
	setValue("onlineConsultationFee", staff.onlineConsultationFee);
	setValue("onlineConsultationEnabled", String(staff.onlineConsultationEnabled === true));

	toggleDoctorFields();
}

function toggleDoctorFields() {
	const role = getValue("staffRole");
	const doctorFields = document.getElementById("doctorExtraFields");

	if (!doctorFields) {
		return;
	}

	if (role === "DOCTOR") {
		doctorFields.style.display = "";
	} else {
		doctorFields.style.display = "none";
		clearDoctorExtraFields();
	}
}

function clearDoctorExtraFields() {
	setValue("qualification", "");
	setValue("specialization", "");
	setValue("registrationNumber", "");
	setValue("experienceYears", "");
	setValue("consultationFee", "");
	setValue("onlineConsultationFee", "");
	setValue("onlineConsultationEnabled", "false");
}

function clearStaffForm() {
	[
		"staffId",
		"staffName",
		"email",
		"mobile",
		"password",
		"staffRole",
		"department",
		"designation",
		"gender",
		"joiningDate",
		"address",
		"city",
		"state",
		"pincode",
		"salary",
		"emergencyContactName",
		"emergencyContactMobile"
	].forEach(id => setValue(id, ""));

	clearDoctorExtraFields();
	toggleDoctorFields();
}

function roleBadge(role) {
	if (role === "DOCTOR") {
		return `<span class="badge bg-primary">DOCTOR</span>`;
	}

	if (role === "ADMIN" || role === "MANAGER") {
		return `<span class="badge bg-dark">${safe(role)}</span>`;
	}

	return `<span class="badge bg-secondary">${safe(role)}</span>`;
}

function statusBadge(status) {
	if (status === "ACTIVE") {
		return `<span class="badge bg-success">ACTIVE</span>`;
	}

	if (status === "LEFT") {
		return `<span class="badge bg-danger">LEFT</span>`;
	}

	return `<span class="badge bg-secondary">${safe(status)}</span>`;
}

function getValue(id) {
	const element = document.getElementById(id);
	return element ? element.value.trim() : "";
}

function setValue(id, value) {
	const element = document.getElementById(id);

	if (element) {
		element.value = value === null || value === undefined ? "" : value;
	}
}

async function safeJson(response) {
	try {
		const text = await response.text();

		if (!text || text.trim() === "") {
			return {};
		}

		try {
			return JSON.parse(text);
		} catch (error) {
			return {
				rawBody: text
			};
		}

	} catch (error) {
		return {};
	}
}

function showMsg(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `<div class="alert alert-${type}">${message}</div>`;

	setTimeout(() => {
		msg.innerHTML = "";
	}, 5000);
}

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button = document.getElementById(buttonId);

	if (!button) {
		return;
	}

	if (isLoading) {
		button.dataset.originalText = button.innerHTML;
		button.innerHTML = loadingText;
		button.disabled = true;
	} else {
		button.innerHTML = button.dataset.originalText || button.innerHTML;
		button.disabled = false;
	}
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}