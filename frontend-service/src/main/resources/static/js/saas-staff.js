let staffModal;
let allStaff = [];
let selectedTenantType = "";

let isLoadingStaff = false;
let isSearchingStaff = false;
let isSavingStaff = false;
let isLoadingStaffDetails = false;
let isResolvingTenantType = false;

let staffPagePermissions = {
	create: false,
	update: false,
	delete: false
};

const deletingStaffIds = new Set();


document.addEventListener("DOMContentLoaded", async function() {

	const allowed = await protectSaasPage(
		"STAFF",
		"VIEW"
	);

	if (!allowed) {
		return;
	}

	const tenantId = localStorage.getItem("tenantId");
	const tenantName = localStorage.getItem("tenantName");

	if (!tenantId) {

		alert("Please select SaaS workspace first.");

		window.location.href = "/saas/workspaces";

		return;
	}

	setText(
		"tenantNameText",
		tenantName || "your workspace"
	);

	const modalElement =
		document.getElementById("staffModal");

	if (modalElement) {

		staffModal =
			bootstrap.Modal.getOrCreateInstance(
				modalElement
			);
	}

	const searchInput =
		document.getElementById("searchKeyword");

	if (searchInput) {

		searchInput.addEventListener(
			"keyup",
			function(event) {

				if (event.key === "Enter") {
					searchStaff();
				}
			}
		);
	}

	const staffRoleElement =
		document.getElementById("staffRole");

	if (staffRoleElement) {

		staffRoleElement.addEventListener(
			"change",
			function() {

				handleStaffRoleChange(true);
			}
		);
	}

	selectedTenantType =
		await resolveSelectedTenantType();

	renderStaffRoleOptions(
		selectedTenantType
	);

	updateTenantTypeDisplay(
		selectedTenantType
	);

	await applyStaffPagePermissions();

	await loadStaff();

	handleStaffRoleChange();
});


async function resolveSelectedTenantType() {

	const storedTenantType =
		normalizeTenantType(
			localStorage.getItem("tenantType")
		);

	if (storedTenantType) {
		return storedTenantType;
	}

	if (isResolvingTenantType) {
		return "";
	}

	isResolvingTenantType = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	try {

		const response = await fetch(
			`${API_BASE}/saas/tenants/${encodeURIComponent(tenantId)}`,
			{
				method: "GET",

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

			console.error(
				"Unable to resolve workspace type:",
				result
			);

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to determine workspace type."
				)
			);

			return "";
		}

		const tenantType =
			normalizeTenantType(
				result.tenantType
			);

		if (tenantType) {

			localStorage.setItem(
				"tenantType",
				tenantType
			);
		}

		return tenantType;

	} catch (error) {

		console.error(
			"Unable to resolve workspace type:",
			error
		);

		showMsg(
			"SaaS service not reachable while loading workspace type."
		);

		return "";

	} finally {

		isResolvingTenantType = false;
	}
}


function normalizeTenantType(tenantType) {

	return String(
		tenantType || ""
	)
		.trim()
		.toUpperCase();
}


function updateTenantTypeDisplay(tenantType) {

	setText(
		"tenantTypeText",
		formatTenantType(tenantType)
	);
}


function formatTenantType(tenantType) {

	switch (
	normalizeTenantType(tenantType)
	) {

		case "DOCTOR_CLINIC":
			return "Doctor Clinic";

		case "HOSPITAL":
			return "Hospital";

		case "WHOLESALER":
			return "Wholesaler";

		case "RETAILER":
			return "Retailer";

		default:
			return "Workspace";
	}
}


function renderStaffRoleOptions(
	tenantType,
	selectedRole = ""
) {

	const roleSelect =
		document.getElementById("staffRole");

	if (!roleSelect) {
		return;
	}

	const normalizedTenantType =
		normalizeTenantType(
			tenantType
		);

	const roles =
		getStaffRolesByTenantType(
			normalizedTenantType
		);

	const normalizedSelectedRole =
		String(
			selectedRole || ""
		)
			.trim()
			.toUpperCase();

	roleSelect.innerHTML = `
        <option value="">
            Select Role
        </option>

        ${roles.map(
		function(role) {

			const selected =
				role.value === normalizedSelectedRole
					? "selected"
					: "";

			return `
                <option value="${escapeHtml(role.value)}"
                        ${selected}>
                    ${escapeHtml(role.label)}
                </option>
            `;
		}
	).join("")}
    `;

	updateStaffRoleHelpText(
		normalizedTenantType
	);
}


function getStaffRolesByTenantType(
	tenantType
) {

	switch (tenantType) {

		case "DOCTOR_CLINIC":

			return [
				{
					value: "ADMIN",
					label: "Admin"
				},
				{
					value: "DOCTOR",
					label: "Doctor"
				},
				{
					value: "RECEPTIONIST",
					label: "Receptionist"
				},
				{
					value: "PHARMACIST",
					label: "Pharmacist"
				},
				{
					value: "ACCOUNTANT",
					label: "Accountant"
				},
				{
					value: "MANAGER",
					label: "Manager"
				},
				{
					value: "OTHER",
					label: "Other"
				}
			];

		case "HOSPITAL":

			return [
				{
					value: "ADMIN",
					label: "Admin"
				},
				{
					value: "DOCTOR",
					label: "Doctor"
				},
				{
					value: "NURSE",
					label: "Nurse"
				},
				{
					value: "RECEPTIONIST",
					label: "Receptionist"
				},
				{
					value: "PHARMACIST",
					label: "Pharmacist"
				},
				{
					value: "LAB_TECHNICIAN",
					label: "Lab Technician"
				},
				{
					value: "RADIOLOGY_TECHNICIAN",
					label: "Radiology Technician"
				},
				{
					value: "ACCOUNTANT",
					label: "Accountant"
				},
				{
					value: "BILLING_STAFF",
					label: "Billing Staff"
				},
				{
					value: "WARD_BOY",
					label: "Ward Boy"
				},
				{
					value: "MANAGER",
					label: "Manager"
				},
				{
					value: "CLEANING_STAFF",
					label: "Cleaning Staff"
				},
				{
					value: "SECURITY",
					label: "Security"
				},
				{
					value: "OTHER",
					label: "Other"
				}
			];

		case "WHOLESALER":

			return [
				{
					value: "ADMIN",
					label: "Admin"
				},
				{
					value: "MANAGER",
					label: "Manager"
				},
				{
					value: "SALES_MANAGER",
					label: "Sales Manager"
				},
				{
					value: "PURCHASE_MANAGER",
					label: "Purchase Manager"
				},
				{
					value: "WAREHOUSE_MANAGER",
					label: "Warehouse Manager"
				},
				{
					value: "ACCOUNTANT",
					label: "Accountant"
				},
				{
					value: "SALESPERSON",
					label: "Salesperson"
				},
				{
					value: "OTHER",
					label: "Other"
				}
			];

		case "RETAILER":

			return [
				{
					value: "ADMIN",
					label: "Admin"
				},
				{
					value: "MANAGER",
					label: "Manager"
				},
				{
					value: "PHARMACIST",
					label: "Pharmacist"
				},
				{
					value: "CASHIER",
					label: "Cashier"
				},
				{
					value: "ACCOUNTANT",
					label: "Accountant"
				},
				{
					value: "PURCHASE_MANAGER",
					label: "Purchase Manager"
				},
				{
					value: "SALESPERSON",
					label: "Salesperson"
				},
				{
					value: "OTHER",
					label: "Other"
				}
			];

		default:

			return [
				{
					value: "ADMIN",
					label: "Admin"
				},
				{
					value: "MANAGER",
					label: "Manager"
				},
				{
					value: "OTHER",
					label: "Other"
				}
			];
	}
}


function updateStaffRoleHelpText(
	tenantType
) {

	let message =
		"Select a role for this workspace member.";

	switch (tenantType) {

		case "DOCTOR_CLINIC":

			message =
				"Clinic roles include doctors, reception, pharmacy, accounts and management.";

			break;

		case "HOSPITAL":

			message =
				"Hospital roles include clinical, pharmacy, laboratory, billing and support staff.";

			break;

		case "WHOLESALER":

			message =
				"Wholesaler roles include sales, purchases, warehouse, accounts and management.";

			break;

		case "RETAILER":

			message =
				"Retailer roles include pharmacy, cashier, purchases, accounts and store management.";

			break;
	}

	setText(
		"staffRoleHelpText",
		message
	);
}


function handleStaffRoleChange(
	forceSuggestion = true
) {

	toggleDoctorFields();

	applyRoleBasedDepartmentSuggestion(
		forceSuggestion
	);
}


function applyRoleBasedDepartmentSuggestion(
	forceSuggestion = true
) {

	const role =
		getValue("staffRole")
			.trim()
			.toUpperCase();

	const departmentElement =
		document.getElementById(
			"department"
		);

	const designationElement =
		document.getElementById(
			"designation"
		);

	if (!departmentElement) {
		return;
	}

	const departmentSuggestions = {

		ADMIN: "Administration",
		DOCTOR: "Clinical",
		NURSE: "Nursing",
		RECEPTIONIST: "Reception",
		PHARMACIST: "Pharmacy",
		LAB_TECHNICIAN: "Laboratory",
		RADIOLOGY_TECHNICIAN: "Radiology",
		ACCOUNTANT: "Accounts",
		BILLING_STAFF: "Billing",
		WARD_BOY: "Ward",
		MANAGER: "Management",
		CLEANING_STAFF: "Housekeeping",
		SECURITY: "Security",
		SALES_MANAGER: "Sales",
		PURCHASE_MANAGER: "Purchase",
		WAREHOUSE_MANAGER: "Warehouse",
		CASHIER: "Billing",
		SALESPERSON: "Sales",
		OTHER: "General"
	};

	const designationSuggestions = {

		ADMIN: "Administrator",
		DOCTOR: "Doctor",
		NURSE: "Nurse",
		RECEPTIONIST: "Receptionist",
		PHARMACIST: "Pharmacist",
		LAB_TECHNICIAN: "Lab Technician",
		RADIOLOGY_TECHNICIAN:
			"Radiology Technician",
		ACCOUNTANT: "Accountant",
		BILLING_STAFF: "Billing Executive",
		WARD_BOY: "Ward Assistant",
		MANAGER: "Manager",
		CLEANING_STAFF:
			"Housekeeping Staff",
		SECURITY: "Security Staff",
		SALES_MANAGER: "Sales Manager",
		PURCHASE_MANAGER:
			"Purchase Manager",
		WAREHOUSE_MANAGER:
			"Warehouse Manager",
		CASHIER: "Cashier",
		SALESPERSON: "Salesperson",
		OTHER: "Staff"
	};

	const suggestedDepartment =
		departmentSuggestions[role] || "";

	const suggestedDesignation =
		designationSuggestions[role] || "";

	if (
		forceSuggestion ||
		!departmentElement.value.trim()
	) {

		departmentElement.value =
			suggestedDepartment;
	}

	if (
		designationElement &&
		(
			forceSuggestion ||
			!designationElement.value.trim()
		)
	) {

		designationElement.value =
			suggestedDesignation;
	}
}

async function loadStaff() {

	if (isLoadingStaff) {
		return;
	}

	isLoadingStaff = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showStaffLoadingState();

	setButtonLoading(
		"refreshStaffBtn",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/staff?tenantId=${encodeURIComponent(tenantId)}`,
			{
				method: "GET",

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

			allStaff = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load staff."
				);

			showMsg(message);

			showStaffErrorState(message);

			updateStaffSummary();

			return;
		}

		allStaff =
			Array.isArray(result)
				? result
				: [];

		renderStaff(allStaff);

		updateStaffSummary();

		await applyStaffPagePermissions();

	} catch (error) {

		console.error(
			"Unable to load staff:",
			error
		);

		allStaff = [];

		showMsg(
			"SaaS service not reachable."
		);

		showStaffErrorState(
			"SaaS staff service is currently unavailable."
		);

		updateStaffSummary();

	} finally {

		isLoadingStaff = false;

		setButtonLoading(
			"refreshStaffBtn",
			"Refresh",
			false
		);
	}
}


function filterStaffClientSide() {

	const keyword =
		getValue(
			"searchKeyword"
		).toLowerCase();

	const filtered =
		allStaff.filter(
			function(staff) {

				const searchableText = [
					staff.staffCode,
					staff.staffName,
					staff.email,
					staff.mobile,
					staff.staffRole,
					staff.department,
					staff.designation,
					staff.city,
					staff.state,
					staff.specialization
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return (
					!keyword ||
					searchableText.includes(keyword)
				);
			}
		);

	renderStaff(filtered);
}


async function searchStaff() {

	if (isSearchingStaff) {
		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const keyword =
		getValue("searchKeyword");

	if (!keyword) {

		await loadStaff();

		return;
	}

	isSearchingStaff = true;

	setButtonLoading(
		"searchStaffBtn",
		"Searching...",
		true
	);

	showStaffLoadingState();

	try {

		const response = await fetch(
			`${API_BASE}/saas/staff/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`,
			{
				method: "GET",

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

			const message =
				getApiErrorMessage(
					result,
					"Unable to search staff."
				);

			showMsg(message);

			showStaffErrorState(message);

			return;
		}

		renderStaff(
			Array.isArray(result)
				? result
				: []
		);

		await applyStaffPagePermissions();

	} catch (error) {

		console.error(
			"Unable to search staff:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

		showStaffErrorState(
			"Unable to search staff."
		);

	} finally {

		isSearchingStaff = false;

		setButtonLoading(
			"searchStaffBtn",
			"Search Staff",
			false
		);
	}
}

function renderStaff(staffList) {

	const tableBody =
		document.getElementById(
			"staffTableBody"
		);

	if (!tableBody) {
		return;
	}

	const list =
		Array.isArray(staffList)
			? staffList
			: [];

	if (!list.length) {

		tableBody.innerHTML = `
            <tr>
                <td colspan="8">

                    <div class="saas-staff-state">

                        <div class="saas-staff-state-icon">
                            <i class="bi bi-person-x-fill"></i>
                        </div>

                        <h5 class="fw-bold text-primary">
                            No staff found
                        </h5>

                        <p class="text-muted mb-0">
                            Add a staff member or change the search keyword.
                        </p>

                    </div>

                </td>
            </tr>
        `;

		return;
	}

	tableBody.innerHTML =
		list.map(
			function(staff, index) {

				const staffId =
					safeNumber(
						staff.id
					);

				return `
                    <tr style="--row-delay:${Math.min(index * 55, 330)}ms">

                        <td>
                            <strong class="text-primary">
                                ${safe(staff.staffCode)}
                            </strong>
                        </td>

                        <td>

                            <div class="saas-staff-profile">

                                <div class="saas-staff-avatar">
                                    <i class="bi bi-person-fill"></i>
                                </div>

                                <div>

                                    <strong class="text-primary">
                                        ${safe(staff.staffName)}
                                    </strong>

                                    <div class="text-muted small">
                                        ${safe(staff.email)}
                                    </div>

                                    ${staff.staffRole === "DOCTOR"
						? `
                                            <div class="text-muted small">
                                                Auth ID:
                                                ${safe(staff.authUserId)}
                                            </div>
                                        `
						: ""
					}

                                </div>

                            </div>

                        </td>

                        <td>
                            ${roleBadge(staff.staffRole)}
                        </td>

                        <td>

                            ${safe(staff.department)}

                            ${staff.staffRole === "DOCTOR" &&
						staff.specialization
						? `
                                    <div class="text-muted small">
                                        ${safe(staff.specialization)}
                                    </div>
                                `
						: ""
					}

                        </td>

                        <td>
                            ${safe(staff.mobile)}
                        </td>

                        <td>
                            ${safe(staff.city)}
                        </td>

                        <td>
                            ${statusBadge(staff.status)}
                        </td>

                        <td>

                            <div class="saas-staff-actions">

                                <button type="button"
                                        id="editStaffBtn_${staffId}"
                                        class="btn btn-sm btn-outline-primary edit-staff-btn"
                                        onclick="editStaff(${staffId})"
                                        ${staffId ? "" : "disabled"}>

                                    <i class="bi bi-pencil-square me-1"></i>
                                    Edit
                                </button>

                                <button type="button"
                                        id="deleteStaffBtn_${staffId}"
                                        class="btn btn-sm btn-outline-danger delete-staff-btn"
                                        onclick="deleteStaff(${staffId})"
                                        ${staffId ? "" : "disabled"}>

                                    <i class="bi bi-trash-fill me-1"></i>
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
			}
		).join("");

	applyStaffPagePermissions();
}


async function applyStaffPagePermissions() {

	const [
		canCreate,
		canUpdate,
		canDelete
	] =
		await Promise.all([
			hasSaasPermission(
				"STAFF",
				"CREATE"
			),
			hasSaasPermission(
				"STAFF",
				"UPDATE"
			),
			hasSaasPermission(
				"STAFF",
				"DELETE"
			)
		]);

	staffPagePermissions = {

		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete)
	};

	showOrHideById(
		"addStaffBtn",
		staffPagePermissions.create
	);

	showOrHideByClass(
		"edit-staff-btn",
		staffPagePermissions.update
	);

	showOrHideByClass(
		"delete-staff-btn",
		staffPagePermissions.delete
	);
}


function openCreateStaffModal() {

	if (!staffPagePermissions.create) {

		showMsg(
			"You do not have permission to create staff."
		);

		return;
	}

	clearStaffForm();

	hideStaffFormAlert();

	renderStaffRoleOptions(
		selectedTenantType
	);

	setText(
		"staffModalTitle",
		"Add Staff"
	);

	updatePasswordFieldForMode(
		false
	);

	if (staffModal) {
		staffModal.show();
	}
}


async function editStaff(staffId) {

	if (!staffPagePermissions.update) {

		showMsg(
			"You do not have permission to update staff."
		);

		return;
	}

	if (isLoadingStaffDetails) {
		return;
	}

	const numericStaffId =
		safeNumber(staffId);

	if (!numericStaffId) {

		showMsg(
			"Invalid staff selected."
		);

		return;
	}

	isLoadingStaffDetails = true;

	setButtonLoading(
		`editStaffBtn_${numericStaffId}`,
		"Loading...",
		true
	);

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	try {

		const response = await fetch(
			`${API_BASE}/saas/staff/${numericStaffId}` +
			`?tenantId=${encodeURIComponent(tenantId)}`,
			{
				method: "GET",

				headers: {
					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
				}
			}
		);

		const staff =
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					staff,
					"Unable to load staff."
				)
			);

			return;
		}

		hideStaffFormAlert();

		fillStaffForm(staff);

		setText(
			"staffModalTitle",
			"Edit Staff"
		);

		updatePasswordFieldForMode(
			true
		);

		if (staffModal) {
			staffModal.show();
		}

	} catch (error) {

		console.error(
			"Unable to load staff details:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {

		isLoadingStaffDetails = false;

		setButtonLoading(
			`editStaffBtn_${numericStaffId}`,
			"Edit",
			false
		);
	}
}


function updatePasswordFieldForMode(
	isUpdate
) {

	const requiredMark =
		document.getElementById(
			"passwordRequiredMark"
		);

	const helpText =
		document.getElementById(
			"passwordHelpText"
		);

	if (requiredMark) {

		requiredMark.style.display =
			isUpdate
				? "none"
				: "";
	}

	if (helpText) {

		helpText.innerText =
			isUpdate
				? "Leave password blank to keep the existing staff login password."
				: "Password is required when creating new staff.";
	}
}


async function saveStaff() {

	if (isSavingStaff) {
		return;
	}

	hideStaffFormAlert();

	const staffId =
		getValue("staffId");

	const isUpdate =
		staffId !== "";

	if (
		isUpdate &&
		!staffPagePermissions.update
	) {

		showStaffFormAlert(
			"You do not have permission to update staff.",
			"danger"
		);

		return;
	}

	if (
		!isUpdate &&
		!staffPagePermissions.create
	) {

		showStaffFormAlert(
			"You do not have permission to create staff.",
			"danger"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const payload = {

		tenantId:
			Number(tenantId),

		staffName:
			getValue("staffName"),

		email:
			getValue("email"),

		mobile:
			getValue("mobile"),

		password:
			getValue("password"),

		staffRole:
			getValue("staffRole"),

		department:
			getValue("department"),

		designation:
			getValue("designation"),

		gender:
			getValue("gender"),

		joiningDate:
			getValue("joiningDate") || null,

		address:
			getValue("address"),

		city:
			getValue("city"),

		state:
			getValue("state"),

		pincode:
			getValue("pincode"),

		salary:
			getValue("salary")
				? Number(
					getValue("salary")
				)
				: null,

		emergencyContactName:
			getValue(
				"emergencyContactName"
			),

		emergencyContactMobile:
			getValue(
				"emergencyContactMobile"
			),

		qualification:
			getValue("qualification"),

		specialization:
			getValue("specialization"),

		registrationNumber:
			getValue(
				"registrationNumber"
			),

		experienceYears:
			getValue("experienceYears")
				? Number(
					getValue("experienceYears")
				)
				: null,

		consultationFee:
			getValue("consultationFee")
				? Number(
					getValue("consultationFee")
				)
				: null,

		onlineConsultationFee:
			getValue(
				"onlineConsultationFee"
			)
				? Number(
					getValue(
						"onlineConsultationFee"
					)
				)
				: null,

		onlineConsultationEnabled:
			getValue(
				"onlineConsultationEnabled"
			) === "true"
	};

	if (!payload.staffName) {

		showStaffFormAlert(
			"Staff name is required.",
			"danger"
		);

		focusStaffField("staffName");

		return;
	}

	if (!payload.staffRole) {

		showStaffFormAlert(
			"Staff role is required.",
			"danger"
		);

		focusStaffField("staffRole");

		return;
	}

	if (
		!isRoleAllowedForTenantType(
			payload.staffRole,
			selectedTenantType
		)
	) {

		showStaffFormAlert(
			"Selected staff role is not allowed for this workspace type.",
			"danger"
		);

		focusStaffField("staffRole");

		return;
	}

	if (!payload.email) {

		showStaffFormAlert(
			"Email is required.",
			"danger"
		);

		focusStaffField("email");

		return;
	}

	if (!isValidEmail(payload.email)) {

		showStaffFormAlert(
			"Please enter a valid email address.",
			"danger"
		);

		focusStaffField("email");

		return;
	}

	if (!payload.mobile) {

		showStaffFormAlert(
			"Mobile is required.",
			"danger"
		);

		focusStaffField("mobile");

		return;
	}

	if (!isValidMobile(payload.mobile)) {

		showStaffFormAlert(
			"Please enter a valid 10-digit mobile number.",
			"danger"
		);

		focusStaffField("mobile");

		return;
	}

	if (
		!isUpdate &&
		!payload.password
	) {

		showStaffFormAlert(
			"Password is required for new staff login.",
			"danger"
		);

		focusStaffField("password");

		return;
	}

	if (
		payload.password &&
		payload.password.length < 6
	) {

		showStaffFormAlert(
			"Staff login password must be at least 6 characters.",
			"danger"
		);

		focusStaffField("password");

		return;
	}

	if (
		payload.pincode &&
		!isValidPincode(payload.pincode)
	) {

		showStaffFormAlert(
			"Please enter a valid 6-digit pincode.",
			"danger"
		);

		focusStaffField("pincode");

		return;
	}

	if (
		payload.emergencyContactMobile &&
		!isValidMobile(
			payload.emergencyContactMobile
		)
	) {

		showStaffFormAlert(
			"Please enter a valid emergency contact mobile number.",
			"danger"
		);

		focusStaffField(
			"emergencyContactMobile"
		);

		return;
	}

	if (
		payload.staffRole === "DOCTOR"
	) {

		if (!payload.department) {

			showStaffFormAlert(
				"Department is required for doctor.",
				"danger"
			);

			focusStaffField("department");

			return;
		}

		if (!payload.specialization) {

			showStaffFormAlert(
				"Specialization is required for doctor.",
				"danger"
			);

			focusStaffField(
				"specialization"
			);

			return;
		}

		if (!payload.qualification) {

			showStaffFormAlert(
				"Qualification is required for doctor.",
				"danger"
			);

			focusStaffField(
				"qualification"
			);

			return;
		}

		if (
			payload.consultationFee === null
		) {

			showStaffFormAlert(
				"Consultation fee is required for doctor.",
				"danger"
			);

			focusStaffField(
				"consultationFee"
			);

			return;
		}
	}

	const url =
		isUpdate
			? `${API_BASE}/saas/staff/${encodeURIComponent(staffId)}` +
			`?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/staff`;

	const method =
		isUpdate
			? "PUT"
			: "POST";

	isSavingStaff = true;

	setButtonLoading(
		"saveStaffBtn",
		"Saving...",
		true
	);

	try {

		const response = await fetch(
			url,
			{
				method: method,

				headers: {
					"Authorization":
						"Bearer " + token,

					"Content-Type":
						"application/json",

					"Accept":
						"application/json"
				},

				body:
					JSON.stringify(payload)
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			const errorMessage =
				getStaffSaveErrorMessage(
					result,
					response.status
				);

			showStaffFormAlert(
				errorMessage,
				"danger"
			);

			return;
		}

		hideStaffFormAlert();

		if (staffModal) {
			staffModal.hide();
		}

		showMsg(
			isUpdate
				? "Staff updated successfully."
				: "Staff added successfully.",
			"success"
		);

		await loadStaff();

	} catch (error) {

		console.error(
			"Unable to save staff:",
			error
		);

		showStaffFormAlert(
			"SaaS service is not reachable. Please try again.",
			"danger"
		);

	} finally {

		isSavingStaff = false;

		setButtonLoading(
			"saveStaffBtn",
			"Save Staff",
			false
		);
	}
}


function getStaffSaveErrorMessage(
	result,
	status
) {

	const apiMessage =
		getApiErrorMessage(
			result,
			""
		);

	const normalizedMessage =
		String(apiMessage || "")
			.trim();

	if (normalizedMessage) {

		const lowerMessage =
			normalizedMessage.toLowerCase();

		if (
			lowerMessage.includes(
				"mobile already registered"
			)
		) {

			return "This mobile number is already registered.";
		}

		if (
			lowerMessage.includes(
				"email already registered"
			)
		) {

			return "This email address is already registered.";
		}

		return normalizedMessage;
	}

	switch (Number(status)) {

		case 400:
			return "Invalid staff information. Please check the entered details.";

		case 401:
			return "Your login session has expired. Please login again.";

		case 403:
			return "You do not have permission to save staff.";

		case 404:
			return "The requested staff service was not found.";

		case 409:
			return "Staff email or mobile number is already registered.";

		default:

			if (Number(status) >= 500) {

				return "Server error occurred while saving staff.";
			}

			return "Unable to save staff.";
	}
}


function focusStaffField(id) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	setTimeout(
		function() {

			element.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});

			element.focus({
				preventScroll: true
			});

		},
		120
	);
}


function isRoleAllowedForTenantType(
	staffRole,
	tenantType
) {

	const allowedRoles =
		getStaffRolesByTenantType(
			normalizeTenantType(
				tenantType
			)
		)
			.map(
				function(role) {

					return role.value;
				}
			);

	return allowedRoles.includes(
		String(
			staffRole || ""
		)
			.trim()
			.toUpperCase()
	);
}


async function deleteStaff(staffId) {

	if (!staffPagePermissions.delete) {

		showMsg(
			"You do not have permission to delete staff."
		);

		return;
	}

	const numericStaffId =
		safeNumber(staffId);

	if (!numericStaffId) {

		showMsg(
			"Invalid staff selected."
		);

		return;
	}

	if (
		deletingStaffIds.has(
			numericStaffId
		)
	) {
		return;
	}

	if (
		!confirm(
			"Delete this staff?"
		)
	) {
		return;
	}

	deletingStaffIds.add(
		numericStaffId
	);

	setButtonLoading(
		`deleteStaffBtn_${numericStaffId}`,
		"Deleting...",
		true
	);

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	try {

		const response = await fetch(
			`${API_BASE}/saas/staff/${numericStaffId}` +
			`?tenantId=${encodeURIComponent(tenantId)}`,
			{
				method: "DELETE",

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
					"Unable to delete staff."
				)
			);

			return;
		}

		showMsg(
			getApiErrorMessage(
				result,
				"Staff deleted successfully."
			),
			"success"
		);

		await loadStaff();

	} catch (error) {

		console.error(
			"Unable to delete staff:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {

		deletingStaffIds.delete(
			numericStaffId
		);

		setButtonLoading(
			`deleteStaffBtn_${numericStaffId}`,
			"Delete",
			false
		);
	}
}

function fillStaffForm(staff) {

	const staffRole =
		String(
			staff.staffRole || ""
		)
			.trim()
			.toUpperCase();

	renderStaffRoleOptions(
		selectedTenantType,
		staffRole
	);

	setValue(
		"staffId",
		staff.id
	);

	setValue(
		"staffName",
		staff.staffName
	);

	setValue(
		"email",
		staff.email
	);

	setValue(
		"mobile",
		staff.mobile
	);

	setValue(
		"password",
		""
	);

	setValue(
		"staffRole",
		staffRole
	);

	setValue(
		"department",
		staff.department
	);

	setValue(
		"designation",
		staff.designation
	);

	setValue(
		"gender",
		staff.gender
	);

	setValue(
		"joiningDate",
		staff.joiningDate
	);

	setValue(
		"address",
		staff.address
	);

	setValue(
		"city",
		staff.city
	);

	setValue(
		"state",
		staff.state
	);

	setValue(
		"pincode",
		staff.pincode
	);

	setValue(
		"salary",
		staff.salary
	);

	setValue(
		"emergencyContactName",
		staff.emergencyContactName
	);

	setValue(
		"emergencyContactMobile",
		staff.emergencyContactMobile
	);

	setValue(
		"qualification",
		staff.qualification
	);

	setValue(
		"specialization",
		staff.specialization
	);

	setValue(
		"registrationNumber",
		staff.registrationNumber
	);

	setValue(
		"experienceYears",
		staff.experienceYears
	);

	setValue(
		"consultationFee",
		staff.consultationFee
	);

	setValue(
		"onlineConsultationFee",
		staff.onlineConsultationFee
	);

	setValue(
		"onlineConsultationEnabled",
		String(
			staff.onlineConsultationEnabled === true
		)
	);

	handleStaffRoleChange(false);
}


function toggleDoctorFields() {

	const role =
		getValue("staffRole");

	const doctorFields =
		document.getElementById(
			"doctorExtraFields"
		);

	if (!doctorFields) {
		return;
	}

	if (role === "DOCTOR") {

		doctorFields.style.display =
			"";

		return;
	}

	doctorFields.style.display =
		"none";

	clearDoctorExtraFields();
}


function clearDoctorExtraFields() {

	setValue(
		"qualification",
		""
	);

	setValue(
		"specialization",
		""
	);

	setValue(
		"registrationNumber",
		""
	);

	setValue(
		"experienceYears",
		""
	);

	setValue(
		"consultationFee",
		""
	);

	setValue(
		"onlineConsultationFee",
		""
	);

	setValue(
		"onlineConsultationEnabled",
		"false"
	);
}


function clearStaffForm() {

	hideStaffFormAlert();

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
	].forEach(
		function(id) {

			setValue(id, "");
		}
	);

	renderStaffRoleOptions(
		selectedTenantType
	);

	clearDoctorExtraFields();

	handleStaffRoleChange();

	updatePasswordFieldForMode(
		false
	);
}


async function refreshStaff() {

	setValue(
		"searchKeyword",
		""
	);

	await loadStaff();
}


function updateStaffSummary() {

	setAnimatedNumber(
		"totalStaffCount",
		allStaff.length
	);

	setAnimatedNumber(
		"doctorStaffCount",
		allStaff.filter(
			function(staff) {

				return (
					staff.staffRole ===
					"DOCTOR"
				);
			}
		).length
	);

	setAnimatedNumber(
		"activeStaffCount",
		allStaff.filter(
			function(staff) {

				return (
					staff.status ===
					"ACTIVE"
				);
			}
		).length
	);

	const departments =
		new Set(
			allStaff
				.map(
					function(staff) {

						return String(
							staff.department || ""
						)
							.trim()
							.toLowerCase();
					}
				)
				.filter(Boolean)
		);

	setAnimatedNumber(
		"staffDepartmentCount",
		departments.size
	);
}


function showStaffLoadingState() {

	const tableBody =
		document.getElementById(
			"staffTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
        <tr>
            <td colspan="8">

                <div class="saas-staff-state">

                    <div class="saas-staff-state-icon saas-staff-loading">
                        <i class="bi bi-people-fill"></i>
                    </div>

                    <h5 class="fw-bold text-primary">
                        Loading staff
                    </h5>

                    <p class="text-muted mb-0">
                        Please wait while we prepare the staff directory.
                    </p>

                </div>

            </td>
        </tr>
    `;
}


function showStaffErrorState(message) {

	const tableBody =
		document.getElementById(
			"staffTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
        <tr>
            <td colspan="8">

                <div class="saas-staff-state">

                    <div class="saas-staff-state-icon bg-danger">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>

                    <h5 class="fw-bold text-danger">
                        Unable to load staff
                    </h5>

                    <p class="text-muted mb-0">
                        ${escapeHtml(message)}
                    </p>

                </div>

            </td>
        </tr>
    `;
}


function roleBadge(role) {

	const normalizedRole =
		String(
			role || ""
		)
			.trim()
			.toUpperCase();

	const label =
		formatStaffRole(
			normalizedRole
		);

	if (
		normalizedRole === "DOCTOR"
	) {

		return `
            <span class="saas-staff-pill primary">
                <i class="bi bi-person-badge-fill"></i>
                ${escapeHtml(label)}
            </span>
        `;
	}

	if (
		normalizedRole === "ADMIN" ||
		normalizedRole === "MANAGER" ||
		normalizedRole === "SALES_MANAGER" ||
		normalizedRole === "PURCHASE_MANAGER" ||
		normalizedRole === "WAREHOUSE_MANAGER"
	) {

		return `
            <span class="saas-staff-pill dark">
                ${escapeHtml(label)}
            </span>
        `;
	}

	return `
        <span class="saas-staff-pill secondary">
            ${escapeHtml(label)}
        </span>
    `;
}


function formatStaffRole(role) {

	return String(
		role || ""
	)
		.trim()
		.toLowerCase()
		.split("_")
		.filter(Boolean)
		.map(
			function(part) {

				return (
					part.charAt(0).toUpperCase() +
					part.slice(1)
				);
			}
		)
		.join(" ") || "-";
}


function statusBadge(status) {

	if (status === "ACTIVE") {

		return `
            <span class="saas-staff-pill active">
                <i class="bi bi-check-circle-fill"></i>
                ACTIVE
            </span>
        `;
	}

	if (status === "LEFT") {

		return `
            <span class="saas-staff-pill left">
                <i class="bi bi-x-circle-fill"></i>
                LEFT
            </span>
        `;
	}

	return `
        <span class="saas-staff-pill secondary">
            ${safe(status)}
        </span>
    `;
}


function showOrHideById(
	id,
	visible
) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	element.style.display =
		visible
			? ""
			: "none";
}


function showOrHideByClass(
	className,
	visible
) {

	document
		.querySelectorAll(
			`.${className}`
		)
		.forEach(
			function(element) {

				element.style.display =
					visible
						? ""
						: "none";
			}
		);
}


function isValidEmail(email) {

	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
		String(
			email || ""
		).trim()
	);
}


function isValidMobile(mobile) {

	return /^[6-9][0-9]{9}$/.test(
		String(
			mobile || ""
		).trim()
	);
}


function isValidPincode(pincode) {

	return /^[1-9][0-9]{5}$/.test(
		String(
			pincode || ""
		).trim()
	);
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

			return {
				message: text
			};
		}

	} catch (error) {

		return {};
	}
}


function getApiErrorMessage(
	data,
	fallback
) {

	if (!data) {
		return fallback;
	}

	if (typeof data === "string") {
		return data;
	}

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	return fallback;
}


function showMsg(
	message,
	type = "danger"
) {

	const msg =
		document.getElementById(
			"msg"
		);

	if (!msg) {

		alert(message);

		return;
	}

	msg.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show"
             role="alert">

            ${escapeHtml(message)}

            <button type="button"
                    class="btn-close"
                    data-bs-dismiss="alert"
                    aria-label="Close">
            </button>

        </div>
    `;

	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}


function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {

	const button =
		document.getElementById(
			buttonId
		);

	if (!button) {
		return;
	}

	if (isLoading) {

		if (
			!button.dataset.originalHtml
		) {

			button.dataset.originalHtml =
				button.innerHTML;
		}

		button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true">
            </span>

            ${escapeHtml(loadingText)}
        `;

		button.disabled = true;

		return;
	}

	button.innerHTML =
		button.dataset.originalHtml ||
		button.innerHTML;

	button.disabled = false;
}


function setAnimatedNumber(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const target =
		Number(value) || 0;

	const start =
		Number(
			element.textContent
		) || 0;

	const difference =
		target - start;

	const duration =
		500;

	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {

		element.textContent =
			target;

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
			1 - Math.pow(
				1 - progress,
				3
			);

		element.textContent =
			Math.round(
				start +
				difference * eased
			);

		if (progress < 1) {

			requestAnimationFrame(
				update
			);
		}
	}

	requestAnimationFrame(
		update
	);
}


function showStaffFormAlert(
	message,
	type = "danger"
) {

	const alertBox =
		document.getElementById(
			"staffFormAlert"
		);

	const alertMessage =
		document.getElementById(
			"staffFormAlertMessage"
		);

	if (!alertBox || !alertMessage) {

		console.error(message);

		return;
	}

	alertBox.classList.remove(
		"d-none",
		"alert-danger",
		"alert-success",
		"alert-warning",
		"alert-info"
	);

	alertBox.classList.add(
		`alert-${type}`
	);

	alertMessage.textContent =
		message ||
		"Unable to save staff. Please try again.";

	alertBox.scrollIntoView({
		behavior: "smooth",
		block: "center"
	});
}


function hideStaffFormAlert() {

	const alertBox =
		document.getElementById(
			"staffFormAlert"
		);

	if (!alertBox) {
		return;
	}

	alertBox.classList.add(
		"d-none"
	);
}


function getValue(id) {

	const element =
		document.getElementById(id);

	return element
		? String(
			element.value || ""
		).trim()
		: "";
}


function setValue(
	id,
	value
) {

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


function setText(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.innerText =
			value ?? "";
	}
}


function safeNumber(value) {

	const number =
		Number(value);

	return Number.isFinite(number)
		? number
		: 0;
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

	return String(
		value ?? ""
	)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}