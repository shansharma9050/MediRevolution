var saasWorkspaceUsers = [];

var filteredSaasWorkspaceUsers = [];

var saasWorkspaces = [];

var filteredSaasWorkspaces = [];


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function() {

	/*
	 * This page is for Platform Admin only.
	 */

	requireRole("SUPER_ADMIN");

	loadSaasWorkspaceUsers();

	loadSaasWorkspaces();

});


/* =========================================================
   REFRESH
   ========================================================= */

function refreshSaasWorkspaceManagement() {

	loadSaasWorkspaceUsers();

	loadSaasWorkspaces();

}


/* =========================================================
   LOAD ELIGIBLE SAAS USERS
   ========================================================= */

async function loadSaasWorkspaceUsers() {

	var token = localStorage.getItem("token");

	if (!token) {

		showWorkspaceUsersError(
			"Authentication token not found. Please login again."
		);

		return;
	}

	var tableBody =
		document.getElementById("saasWorkspaceUsersTable");

	if (tableBody) {

		var loadingHtml = [];

		loadingHtml.push("<tr>");

		loadingHtml.push(
			"<td colspan=\"6\" class=\"text-center py-5\">"
		);

		loadingHtml.push(
			"<div class=\"spinner-border\" role=\"status\">"
		);

		loadingHtml.push(
			"<span class=\"visually-hidden\">Loading...</span>"
		);

		loadingHtml.push("</div>");

		loadingHtml.push(
			"<div class=\"text-muted mt-2\">"
		);

		loadingHtml.push(
			"Loading eligible users..."
		);

		loadingHtml.push("</div>");

		loadingHtml.push("</td>");

		loadingHtml.push("</tr>");

		tableBody.innerHTML =
			loadingHtml.join("");
	}

	try {

		var response = await fetch(
			API_BASE + "/saas/tenants/admin/workspace-users",
			{
				method: "GET",
				headers: {
					"Authorization": "Bearer " + token
				}
			}
		);

		if (!response.ok) {

			var message =
				"Unable to load SaaS workspace users.";

			try {

				var errorData =
					await response.json();

				if (errorData && errorData.message) {

					message = errorData.message;

				} else if (errorData && errorData.error) {

					message = errorData.error;
				}

			} catch (error) {

				/*
				 * Ignore JSON parsing error.
				 */
			}

			throw new Error(message);
		}

		saasWorkspaceUsers =
			await response.json();

		if (!Array.isArray(saasWorkspaceUsers)) {

			saasWorkspaceUsers = [];
		}

		filteredSaasWorkspaceUsers =
			saasWorkspaceUsers.slice();

		updateWorkspaceSummary();

		renderSaasWorkspaceUsers();

	} catch (error) {

		console.error(
			"SaaS workspace users load error:",
			error
		);

		saasWorkspaceUsers = [];

		filteredSaasWorkspaceUsers = [];

		updateWorkspaceSummary();

		showWorkspaceUsersError(
			error.message ||
			"Server not reachable. Please check api-gateway and saas-service."
		);
	}

}


/* =========================================================
   LOAD ALL SAAS WORKSPACES
   ========================================================= */

async function loadSaasWorkspaces() {

	var token = localStorage.getItem("token");

	if (!token) {

		showWorkspaceListError(
			"Authentication token not found. Please login again."
		);

		return;
	}

	var tableBody =
		document.getElementById("saasWorkspacesTable");

	if (tableBody) {

		var loadingHtml = [];

		loadingHtml.push("<tr>");

		loadingHtml.push(
			"<td colspan=\"8\" class=\"text-center py-5\">"
		);

		loadingHtml.push(
			"<div class=\"spinner-border\" role=\"status\">"
		);

		loadingHtml.push(
			"<span class=\"visually-hidden\">Loading...</span>"
		);

		loadingHtml.push("</div>");

		loadingHtml.push(
			"<div class=\"text-muted mt-2\">"
		);

		loadingHtml.push(
			"Loading workspaces..."
		);

		loadingHtml.push("</div>");

		loadingHtml.push("</td>");

		loadingHtml.push("</tr>");

		tableBody.innerHTML =
			loadingHtml.join("");
	}

	try {

		var response = await fetch(
			API_BASE + "/saas/tenants/admin/workspaces",
			{
				method: "GET",
				headers: {
					"Authorization": "Bearer " + token
				}
			}
		);

		if (!response.ok) {

			var message =
				"Unable to load SaaS workspaces.";

			try {

				var errorData =
					await response.json();

				if (errorData && errorData.message) {

					message = errorData.message;

				} else if (errorData && errorData.error) {

					message = errorData.error;
				}

			} catch (error) {

				/*
				 * Ignore JSON parsing error.
				 */
			}

			throw new Error(message);
		}

		saasWorkspaces =
			await response.json();

		if (!Array.isArray(saasWorkspaces)) {

			saasWorkspaces = [];
		}

		filteredSaasWorkspaces =
			saasWorkspaces.slice();

		updateWorkspaceSummary();

		updateWorkspaceManagementSummary();

		renderSaasWorkspaces();

	} catch (error) {

		console.error(
			"SaaS workspace list load error:",
			error
		);

		saasWorkspaces = [];

		filteredSaasWorkspaces = [];

		updateWorkspaceSummary();

		updateWorkspaceManagementSummary();

		showWorkspaceListError(
			error.message ||
			"Unable to load SaaS workspaces."
		);
	}

}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateWorkspaceSummary() {

	var eligibleCount =
		document.getElementById("eligibleUsersCount");

	var ownersCount =
		document.getElementById("workspaceOwnersCount");

	if (eligibleCount) {

		eligibleCount.textContent =
			saasWorkspaceUsers.length;
	}

	/*
	 * Count unique workspace owners.
	 */

	var ownerIds = {};

	saasWorkspaces.forEach(function(workspace) {

		var ownerId =
			Number(workspace.ownerAuthUserId);

		if (ownerId > 0) {

			ownerIds[ownerId] = true;
		}

	});

	if (ownersCount) {

		ownersCount.textContent =
			Object.keys(ownerIds).length;
	}

}


/* =========================================================
   WORKSPACE MANAGEMENT SUMMARY
   ========================================================= */

function updateWorkspaceManagementSummary() {

	var total =
		document.getElementById("totalWorkspacesCount");

	var active =
		document.getElementById("activeWorkspacesCount");

	var suspended =
		document.getElementById("suspendedWorkspacesCount");

	var expired =
		document.getElementById("expiredWorkspacesCount");

	if (total) {

		total.textContent =
			saasWorkspaces.length;
	}

	var activeCount = 0;

	var suspendedCount = 0;

	var expiredCount = 0;

	saasWorkspaces.forEach(function(workspace) {

		var status =
			getWorkspaceDisplayStatus(workspace);

		if (status === "EXPIRED") {

			expiredCount++;

		} else if (status === "SUSPENDED") {

			suspendedCount++;

		} else if (status === "ACTIVE") {

			activeCount++;
		}

	});

	if (active) {

		active.textContent =
			activeCount;
	}

	if (suspended) {

		suspended.textContent =
			suspendedCount;
	}

	if (expired) {

		expired.textContent =
			expiredCount;
	}

}


/* =========================================================
   RENDER USERS
   ========================================================= */

function renderSaasWorkspaceUsers() {

	var tableBody =
		document.getElementById(
			"saasWorkspaceUsersTable"
		);

	if (!tableBody) {

		return;
	}

	if (!filteredSaasWorkspaceUsers.length) {

		var emptyHtml = [];

		emptyHtml.push("<tr>");

		emptyHtml.push(
			"<td colspan=\"6\" class=\"text-center text-muted py-5\">"
		);

		emptyHtml.push(
			"<i class=\"bi bi-people fs-2 d-block mb-2\"></i>"
		);

		emptyHtml.push(
			"No eligible SaaS users found."
		);

		emptyHtml.push("</td>");

		emptyHtml.push("</tr>");

		tableBody.innerHTML =
			emptyHtml.join("");

		return;
	}

	tableBody.innerHTML =
		filteredSaasWorkspaceUsers
			.map(function(user) {

				return createWorkspaceUserRow(user);

			})
			.join("");

}


/* =========================================================
   CREATE USER TABLE ROW
   ========================================================= */

function createWorkspaceUserRow(user) {

	var fullName =
		escapeHtml(user.fullName || "-");

	var email =
		escapeHtml(user.email || "-");

	var mobile =
		escapeHtml(user.mobile || "-");

	var role =
		normalizeRole(user.role);

	var roleLabel =
		formatRole(role);

	var userId =
		Number(user.id);

	var html = [];

	html.push("<tr>");

	html.push(
		"<td class=\"px-4\">"
	);

	html.push(
		"<div class=\"fw-semibold\">"
	);

	html.push(fullName);

	html.push("</div>");

	html.push(
		"<div class=\"small text-muted\">"
	);

	html.push("User ID: ");

	html.push(userId);

	html.push("</div>");

	html.push("</td>");

	html.push("<td>");

	html.push(email);

	html.push("</td>");

	html.push("<td>");

	html.push(mobile);

	html.push("</td>");

	html.push("<td>");

	html.push(
		"<span class=\"badge text-bg-light border\">"
	);

	html.push(
		escapeHtml(roleLabel)
	);

	html.push("</span>");

	html.push("</td>");

	html.push("<td>");

	html.push(
		"<span class=\"badge text-bg-success\">"
	);

	html.push(
		"<i class=\"bi bi-check-circle me-1\"></i>"
	);

	html.push("Active");

	html.push("</span>");

	html.push(
		"<span class=\"badge text-bg-success ms-1\">"
	);

	html.push("Approved");

	html.push("</span>");

	html.push("</td>");

	html.push(
		"<td class=\"text-end px-4\">"
	);

	html.push(
		"<button type=\"button\" " +
		"class=\"btn btn-primary btn-sm\" " +
		"onclick=\"openCreateWorkspaceModal(" +
		userId +
		")\">"
	);

	html.push(
		"<i class=\"bi bi-building-add me-1\"></i>"
	);

	html.push("Create Workspace");

	html.push("</button>");

	html.push("</td>");

	html.push("</tr>");

	return html.join("");

}


/* =========================================================
   SEARCH USERS
   ========================================================= */

function filterSaasWorkspaceUsers() {

	var searchInput =
		document.getElementById(
			"workspaceUserSearch"
		);

	var roleFilter =
		document.getElementById(
			"workspaceRoleFilter"
		);

	var searchText = "";

	if (searchInput) {

		searchText =
			String(searchInput.value || "")
				.trim()
				.toLowerCase();
	}

	var selectedRole = "";

	if (roleFilter) {

		selectedRole =
			normalizeRole(
				roleFilter.value || ""
			);
	}

	filteredSaasWorkspaceUsers =
		saasWorkspaceUsers.filter(function(user) {

			var name =
				String(user.fullName || "")
					.toLowerCase();

			var email =
				String(user.email || "")
					.toLowerCase();

			var mobile =
				String(user.mobile || "")
					.toLowerCase();

			var role =
				normalizeRole(user.role);

			var matchesSearch =
				!searchText ||
				name.includes(searchText) ||
				email.includes(searchText) ||
				mobile.includes(searchText) ||
				role.toLowerCase().includes(searchText);

			var matchesRole =
				!selectedRole ||
				role === selectedRole;

			return (
				matchesSearch &&
				matchesRole
			);

		});

	renderSaasWorkspaceUsers();

}


/* =========================================================
   SEARCH WORKSPACES
   ========================================================= */

function filterSaasWorkspaces() {

	var searchInput =
		document.getElementById(
			"workspaceManagementSearch"
		);

	var statusFilter =
		document.getElementById(
			"workspaceStatusFilter"
		);

	var searchText = "";

	if (searchInput) {

		searchText =
			String(searchInput.value || "")
				.trim()
				.toLowerCase();
	}

	var selectedStatus = "";

	if (statusFilter) {

		selectedStatus =
			normalizeWorkspaceStatus(
				statusFilter.value || ""
			);
	}

	filteredSaasWorkspaces =
		saasWorkspaces.filter(function(workspace) {

			var workspaceName =
				String(workspace.tenantName || "")
					.toLowerCase();

			var tenantCode =
				String(workspace.tenantCode || "")
					.toLowerCase();

			var ownerId =
				String(
					workspace.ownerAuthUserId || ""
				).toLowerCase();

			var owner =
				findWorkspaceOwner(workspace);

			var ownerName =
				String(owner.fullName || "")
					.toLowerCase();

			var ownerEmail =
				String(owner.email || "")
					.toLowerCase();

			var tenantType =
				normalizeTenantType(
					workspace.tenantType
				).toLowerCase();

			var actualStatus =
				getWorkspaceDisplayStatus(workspace);

			var matchesSearch =
				!searchText ||
				workspaceName.includes(searchText) ||
				tenantCode.includes(searchText) ||
				ownerId.includes(searchText) ||
				ownerName.includes(searchText) ||
				ownerEmail.includes(searchText) ||
				tenantType.includes(searchText);

			var matchesStatus =
				!selectedStatus ||
				actualStatus === selectedStatus;

			return (
				matchesSearch &&
				matchesStatus
			);

		});

	renderSaasWorkspaces();

}


/* =========================================================
   RENDER WORKSPACES
   ========================================================= */

function renderSaasWorkspaces() {

	var tableBody =
		document.getElementById(
			"saasWorkspacesTable"
		);

	if (!tableBody) {

		return;
	}

	if (!filteredSaasWorkspaces.length) {

		var emptyHtml = [];

		emptyHtml.push("<tr>");

		emptyHtml.push(
			"<td colspan=\"8\" class=\"text-center text-muted py-5\">"
		);

		emptyHtml.push(
			"<i class=\"bi bi-buildings fs-2 d-block mb-2\"></i>"
		);

		emptyHtml.push(
			"No SaaS workspaces found."
		);

		emptyHtml.push("</td>");

		emptyHtml.push("</tr>");

		tableBody.innerHTML =
			emptyHtml.join("");

		return;
	}

	tableBody.innerHTML =
		filteredSaasWorkspaces
			.map(function(workspace) {

				return createWorkspaceManagementRow(
					workspace
				);

			})
			.join("");

}


/* =========================================================
   FIND WORKSPACE OWNER
   ========================================================= */

function findWorkspaceOwner(workspace) {

	var ownerId =
		Number(workspace.ownerAuthUserId);

	if (!ownerId) {

		return {
			id: null,
			fullName: "",
			email: "",
			mobile: "",
			role: ""
		};
	}

	var user =
		saasWorkspaceUsers.find(
			function(item) {

				return Number(item.id) === ownerId;

			}
		);

	if (!user) {

		return {
			id: ownerId,
			fullName: "",
			email: "",
			mobile: "",
			role: ""
		};
	}

	return user;

}


/* =========================================================
   CREATE WORKSPACE MANAGEMENT ROW
   ========================================================= */

function createWorkspaceManagementRow(workspace) {

	/*
	 * AdminWorkspaceResponse fields:
	 *
	 * tenantId
	 * tenantName
	 * tenantCode
	 * tenantType
	 * status
	 * ownerAuthUserId
	 * validFrom
	 * validUntil
	 */

	var tenantId =
		Number(workspace.tenantId);

	var tenantName =
		escapeHtml(
			workspace.tenantName || "-"
		);

	var tenantCode =
		escapeHtml(
			workspace.tenantCode || "-"
		);

	var tenantType =
		normalizeTenantType(
			workspace.tenantType
		);

	var ownerId =
		Number(workspace.ownerAuthUserId);

	var owner =
		findWorkspaceOwner(workspace);

	var displayOwner = "";

	if (owner.fullName) {

		var ownerHtml = [];

		ownerHtml.push(
			"<div class=\"fw-semibold\">"
		);

		ownerHtml.push(
			escapeHtml(owner.fullName)
		);

		ownerHtml.push("</div>");

		if (owner.email) {

			ownerHtml.push(
				"<div class=\"small text-muted\">"
			);

			ownerHtml.push(
				escapeHtml(owner.email)
			);

			ownerHtml.push("</div>");
		}

		ownerHtml.push(
			"<div class=\"small text-muted\">"
		);

		ownerHtml.push("User ID: ");

		ownerHtml.push(ownerId);

		ownerHtml.push("</div>");

		displayOwner =
			ownerHtml.join("");

	} else if (ownerId) {

		displayOwner =
			"<div class=\"fw-semibold\">" +
			"User ID: " +
			ownerId +
			"</div>";

	} else {

		displayOwner =
			"<span class=\"text-muted\">" +
			"Owner not available" +
			"</span>";
	}

	var validFrom =
		formatDateOnly(
			workspace.validFrom
		);

	var validUntil =
		formatDateOnly(
			workspace.validUntil
		);

	var displayStatus =
		getWorkspaceDisplayStatus(
			workspace
		);

	var statusBadge =
		getWorkspaceStatusBadge(
			displayStatus
		);

	var daysRemaining =
		calculateDaysRemaining(
			workspace.validUntil
		);

	var validityText =
		getValidityText(
			workspace.validUntil
		);

	var actionButtons = [];

	/*
	 * EXPIRED
	 *
	 * Backend does not allow direct reactivation
	 * after validity has expired.
	 */

	if (displayStatus === "EXPIRED") {

		actionButtons.push(
			"<button " +
			"type=\"button\" " +
			"class=\"btn btn-outline-primary\" " +
			"title=\"Set validity\" " +
			"onclick=\"openSetValidityModal(" +
			tenantId +
			")\">" +
			"<i class=\"bi bi-calendar-check\"></i>" +
			"</button>"
		);

		actionButtons.push(
			"<button " +
			"type=\"button\" " +
			"class=\"btn btn-outline-success\" " +
			"title=\"Extend validity\" " +
			"onclick=\"openExtendValidityModal(" +
			tenantId +
			")\">" +
			"<i class=\"bi bi-calendar-plus\"></i>" +
			"</button>"
		);

	}

	/*
	 * SUSPENDED
	 */

	else if (displayStatus === "SUSPENDED") {

		actionButtons.push(
			"<button " +
			"type=\"button\" " +
			"class=\"btn btn-outline-primary\" " +
			"title=\"Set validity\" " +
			"onclick=\"openSetValidityModal(" +
			tenantId +
			")\">" +
			"<i class=\"bi bi-calendar-check\"></i>" +
			"</button>"
		);

		actionButtons.push(
			"<button " +
			"type=\"button\" " +
			"class=\"btn btn-outline-success\" " +
			"title=\"Extend validity\" " +
			"onclick=\"openExtendValidityModal(" +
			tenantId +
			")\">" +
			"<i class=\"bi bi-calendar-plus\"></i>" +
			"</button>"
		);

		actionButtons.push(
			"<button " +
			"type=\"button\" " +
			"class=\"btn btn-outline-success\" " +
			"title=\"Reactivate workspace\" " +
			"onclick=\"reactivateWorkspace(" +
			tenantId +
			")\">" +
			"<i class=\"bi bi-play-circle\"></i>" +
			"</button>"
		);

	}

	/*
	 * ACTIVE
	 */

	else {

		actionButtons.push(
			"<button " +
			"type=\"button\" " +
			"class=\"btn btn-outline-primary\" " +
			"title=\"Set validity\" " +
			"onclick=\"openSetValidityModal(" +
			tenantId +
			")\">" +
			"<i class=\"bi bi-calendar-check\"></i>" +
			"</button>"
		);

		actionButtons.push(
			"<button " +
			"type=\"button\" " +
			"class=\"btn btn-outline-success\" " +
			"title=\"Extend validity\" " +
			"onclick=\"openExtendValidityModal(" +
			tenantId +
			")\">" +
			"<i class=\"bi bi-calendar-plus\"></i>" +
			"</button>"
		);

		actionButtons.push(
			"<button " +
			"type=\"button\" " +
			"class=\"btn btn-outline-danger\" " +
			"title=\"Suspend workspace\" " +
			"onclick=\"suspendWorkspace(" +
			tenantId +
			")\">" +
			"<i class=\"bi bi-pause-circle\"></i>" +
			"</button>"
		);

	}

	var html = [];

	html.push("<tr>");

	html.push(
		"<td class=\"px-4\">"
	);

	html.push(
		"<div class=\"fw-semibold\">"
	);

	html.push(tenantName);

	html.push("</div>");

	html.push(
		"<div class=\"small text-muted\">"
	);

	html.push("ID: ");

	html.push(tenantId);

	html.push("</div>");

	html.push(
		"<div class=\"small text-muted\">"
	);

	html.push("Code: ");

	html.push(tenantCode);

	html.push("</div>");

	html.push("</td>");

	html.push("<td>");

	html.push(displayOwner);

	html.push("</td>");

	html.push("<td>");

	html.push(
		"<span class=\"badge text-bg-light border\">"
	);

	html.push(
		escapeHtml(tenantType)
	);

	html.push("</span>");

	html.push("</td>");

	html.push("<td>");

	html.push(statusBadge);

	html.push("</td>");

	html.push("<td>");

	html.push(validFrom);

	html.push("</td>");

	html.push("<td>");

	html.push(
		"<div class=\"fw-semibold\">"
	);

	html.push(validUntil);

	html.push("</div>");

	html.push(
		"<div class=\"small text-muted\">"
	);

	html.push(validityText);

	html.push("</div>");

	html.push("</td>");

	html.push("<td>");

	html.push(daysRemaining);

	html.push("</td>");

	html.push(
		"<td class=\"text-end px-4\">"
	);

	html.push(
		"<div class=\"btn-group btn-group-sm\">"
	);

	html.push(
		actionButtons.join("")
	);

	html.push("</div>");

	html.push("</td>");

	html.push("</tr>");

	return html.join("");

}


/* =========================================================
   CREATE WORKSPACE MODAL
   ========================================================= */

function openCreateWorkspaceModal(userId) {

	var user =
		saasWorkspaceUsers.find(
			function(item) {

				return Number(item.id) ===
					Number(userId);

			}
		);

	if (!user) {

		alert(
			"Selected user could not be found."
		);

		return;
	}

	var userIdInput =
		document.getElementById(
			"selectedWorkspaceUserId"
		);

	var details =
		document.getElementById(
			"selectedWorkspaceUserDetails"
		);

	var workspaceName =
		document.getElementById(
			"workspaceName"
		);

	var email =
		document.getElementById(
			"workspaceContactEmail"
		);

	var mobile =
		document.getElementById(
			"workspaceContactMobile"
		);

	if (userIdInput) {

		userIdInput.value =
			user.id;
	}

	if (details) {

		var detailsHtml = [];

		detailsHtml.push(
			"<strong>"
		);

		detailsHtml.push(
			escapeHtml(user.fullName || "-")
		);

		detailsHtml.push("</strong>");

		detailsHtml.push("<br>");

		detailsHtml.push(
			escapeHtml(user.email || "-")
		);

		detailsHtml.push("<br>");

		detailsHtml.push(
			"<span class=\"small\">"
		);

		detailsHtml.push(
			escapeHtml(
				formatRole(user.role)
			)
		);

		detailsHtml.push("</span>");

		details.innerHTML =
			detailsHtml.join("");
	}

	if (email) {

		email.value =
			user.email || "";
	}

	if (mobile) {

		mobile.value =
			user.mobile || "";
	}

	if (workspaceName) {

		if (user.fullName) {

			workspaceName.value =
				user.fullName +
				" Workspace";

		} else {

			workspaceName.value =
				"";
		}

		workspaceName.focus();
	}

	clearCreateWorkspaceMessage();

	var modalElement =
		document.getElementById(
			"createSaasWorkspaceModal"
		);

	if (!modalElement) {

		return;
	}

	var modal =
		bootstrap.Modal.getOrCreateInstance(
			modalElement
		);

	modal.show();

}


/* =========================================================
   CREATE ADMIN SAAS WORKSPACE
   ========================================================= */

async function createAdminSaasWorkspace() {

	var userIdElement =
		document.getElementById(
			"selectedWorkspaceUserId"
		);

	var workspaceNameElement =
		document.getElementById(
			"workspaceName"
		);

	var emailElement =
		document.getElementById(
			"workspaceContactEmail"
		);

	var mobileElement =
		document.getElementById(
			"workspaceContactMobile"
		);

	var addressElement =
		document.getElementById(
			"workspaceAddress"
		);

	var cityElement =
		document.getElementById(
			"workspaceCity"
		);

	var stateElement =
		document.getElementById(
			"workspaceState"
		);

	var pincodeElement =
		document.getElementById(
			"workspacePincode"
		);

	var messageElement =
		document.getElementById(
			"createWorkspaceMessage"
		);

	var createButton =
		document.getElementById(
			"createWorkspaceButton"
		);

	if (!userIdElement ||
		!workspaceNameElement) {

		showCreateWorkspaceMessage(
			"Workspace form is not available.",
			"danger"
		);

		return;
	}

	var userId =
		Number(userIdElement.value);

	var tenantName =
		workspaceNameElement.value.trim();

	var contactEmail =
		emailElement
			? emailElement.value.trim()
			: "";

	var contactMobile =
		mobileElement
			? mobileElement.value.trim()
			: "";

	var address =
		addressElement
			? addressElement.value.trim()
			: "";

	var city =
		cityElement
			? cityElement.value.trim()
			: "";

	var state =
		stateElement
			? stateElement.value.trim()
			: "";

	var pincode =
		pincodeElement
			? pincodeElement.value.trim()
			: "";

	if (!userId || userId <= 0) {

		showCreateWorkspaceMessage(
			"Please select a valid user.",
			"warning"
		);

		return;
	}

	if (!tenantName) {

		showCreateWorkspaceMessage(
			"Workspace name is required.",
			"warning"
		);

		return;
	}

	var token =
		localStorage.getItem("token");

	if (!token) {

		showCreateWorkspaceMessage(
			"Authentication token not found. Please login again.",
			"danger"
		);

		return;
	}

	var selectedUser =
		saasWorkspaceUsers.find(
			function(user) {

				return Number(user.id) ===
					userId;

			}
		);

	if (!selectedUser) {

		showCreateWorkspaceMessage(
			"Selected user could not be found.",
			"danger"
		);

		return;
	}

	var normalizedRole =
		normalizeRole(
			selectedUser.role
		);

	var tenantType = "";

	switch (normalizedRole) {

		case "DOCTOR":

			tenantType =
				"DOCTOR_CLINIC";

			break;

		case "HOSPITAL":

			tenantType =
				"HOSPITAL";

			break;

		case "WHOLESALER":

			tenantType =
				"WHOLESALER";

			break;

		case "RETAILER":

			tenantType =
				"RETAILER";

			break;

		default:

			showCreateWorkspaceMessage(
				"SaaS workspace is not available for this user's role.",
				"danger"
			);

			return;
	}

	var requestBody = {

		userId: userId,

		tenantName: tenantName,

		tenantType: tenantType,

		contactEmail:
			contactEmail || null,

		contactMobile:
			contactMobile || null,

		address:
			address || null,

		city:
			city || null,

		state:
			state || null,

		pincode:
			pincode || null
	};

	clearCreateWorkspaceMessage();

	if (createButton) {

		createButton.disabled = true;
	}

	var originalButtonHtml = "";

	if (createButton) {

		originalButtonHtml =
			createButton.innerHTML;

		createButton.innerHTML =
			"<span class=\"spinner-border spinner-border-sm me-1\" " +
			"role=\"status\" aria-hidden=\"true\"></span>" +
			"Creating...";
	}

	try {

		var response =
			await fetch(
				API_BASE + "/saas/tenants/admin",
				{
					method: "POST",

					headers: {

						"Authorization":
							"Bearer " + token,

						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify(
							requestBody
						)
				}
			);

		var responseData =
			await parseJsonResponse(
				response
			);

		if (!response.ok) {

			throw new Error(
				getErrorMessage(
					responseData,
					"Failed to create workspace."
				)
			);
		}

		var createdWorkspaceName =
			tenantName;

		if (
			responseData &&
			responseData.tenantName
		) {

			createdWorkspaceName =
				responseData.tenantName;
		}

		showCreateWorkspaceMessage(
			"Workspace \"" +
			createdWorkspaceName +
			"\" created successfully.",
			"success"
		);

		setTimeout(
			async function() {

				var modalElement =
					document.getElementById(
						"createSaasWorkspaceModal"
					);

				if (modalElement) {

					var modalInstance =
						bootstrap.Modal.getInstance(
							modalElement
						);

					if (!modalInstance) {

						modalInstance =
							new bootstrap.Modal(
								modalElement
							);
					}

					modalInstance.hide();
				}

				clearCreateWorkspaceMessage();

				await loadSaasWorkspaceUsers();

				await loadSaasWorkspaces();

			},
			700
		);

	} catch (error) {

		console.error(
			"Error creating SaaS workspace:",
			error
		);

		showCreateWorkspaceMessage(
			error.message ||
			"Failed to create workspace.",
			"danger"
		);

	} finally {

		if (createButton) {

			createButton.disabled = false;

			createButton.innerHTML =
				originalButtonHtml;
		}
	}

}


/* =========================================================
   SET VALIDITY MODAL
   ========================================================= */

function openSetValidityModal(tenantId) {

	var workspace =
		findWorkspaceById(tenantId);

	if (!workspace) {

		alert(
			"Workspace could not be found."
		);

		return;
	}

	var tenantIdElement =
		document.getElementById(
			"validityTenantId"
		);

	var workspaceNameElement =
		document.getElementById(
			"validityWorkspaceName"
		);

	var validFromElement =
		document.getElementById(
			"validFrom"
		);

	var validUntilElement =
		document.getElementById(
			"validUntil"
		);

	if (tenantIdElement) {

		tenantIdElement.value =
			tenantId;
	}

	if (workspaceNameElement) {

		workspaceNameElement.textContent =
			workspace.tenantName || "-";
	}

	if (validFromElement) {

		validFromElement.value =
			toInputDate(
				workspace.validFrom
			);
	}

	if (validUntilElement) {

		validUntilElement.value =
			toInputDate(
				workspace.validUntil
			);
	}

	clearValidityMessage();

	var modalElement =
		document.getElementById(
			"workspaceValidityModal"
		);

	if (!modalElement) {

		return;
	}

	var modal =
		bootstrap.Modal.getOrCreateInstance(
			modalElement
		);

	modal.show();

}


/* =========================================================
   SAVE VALIDITY
   ========================================================= */

async function saveWorkspaceValidity() {

	var tenantIdElement =
		document.getElementById(
			"validityTenantId"
		);

	var validFromElement =
		document.getElementById(
			"validFrom"
		);

	var validUntilElement =
		document.getElementById(
			"validUntil"
		);

	var button =
		document.getElementById(
			"saveValidityButton"
		);

	var tenantId =
		tenantIdElement
			? Number(tenantIdElement.value)
			: 0;

	var validFrom =
		validFromElement
			? validFromElement.value
			: "";

	var validUntil =
		validUntilElement
			? validUntilElement.value
			: "";

	if (!tenantId) {

		showValidityMessage(
			"Invalid workspace.",
			"danger"
		);

		return;
	}

	if (!validFrom || !validUntil) {

		showValidityMessage(
			"Please select both validity dates.",
			"warning"
		);

		return;
	}

	if (validUntil < validFrom) {

		showValidityMessage(
			"Valid until date cannot be before valid from date.",
			"warning"
		);

		return;
	}

	var token =
		localStorage.getItem("token");

	if (!token) {

		showValidityMessage(
			"Authentication token not found. Please login again.",
			"danger"
		);

		return;
	}

	if (button) {

		button.disabled = true;
	}

	var originalHtml = "";

	if (button) {

		originalHtml =
			button.innerHTML;

		button.innerHTML =
			"<span class=\"spinner-border spinner-border-sm me-1\"></span>" +
			"Saving...";
	}

	try {

		var response =
			await fetch(
				API_BASE +
				"/saas/tenants/admin/" +
				tenantId +
				"/validity",
				{
					method: "PUT",

					headers: {

						"Authorization":
							"Bearer " + token,

						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({

							validFrom:
								validFrom,

							validUntil:
								validUntil
						})
				}
			);

		var responseData =
			await parseJsonResponse(
				response
			);

		if (!response.ok) {

			throw new Error(
				getErrorMessage(
					responseData,
					"Failed to update workspace validity."
				)
			);
		}

		showValidityMessage(
			"Workspace validity updated successfully.",
			"success"
		);

		setTimeout(
			async function() {

				var modalElement =
					document.getElementById(
						"workspaceValidityModal"
					);

				if (modalElement) {

					var modalInstance =
						bootstrap.Modal.getInstance(
							modalElement
						);

					if (modalInstance) {

						modalInstance.hide();
					}
				}

				await loadSaasWorkspaces();

			},
			700
		);

	} catch (error) {

		console.error(
			"Set workspace validity error:",
			error
		);

		showValidityMessage(
			error.message ||
			"Failed to update workspace validity.",
			"danger"
		);

	} finally {

		if (button) {

			button.disabled = false;

			button.innerHTML =
				originalHtml;
		}
	}

}


/* =========================================================
   EXTEND VALIDITY MODAL
   ========================================================= */

function openExtendValidityModal(tenantId) {

	var workspace =
		findWorkspaceById(tenantId);

	if (!workspace) {

		alert(
			"Workspace could not be found."
		);

		return;
	}

	var tenantIdElement =
		document.getElementById(
			"extendTenantId"
		);

	var workspaceNameElement =
		document.getElementById(
			"extendWorkspaceName"
		);

	var currentValidUntilElement =
		document.getElementById(
			"currentValidUntil"
		);

	var extendValidUntilElement =
		document.getElementById(
			"extendValidUntil"
		);

	if (tenantIdElement) {

		tenantIdElement.value =
			tenantId;
	}

	if (workspaceNameElement) {

		workspaceNameElement.textContent =
			workspace.tenantName || "-";
	}

	if (currentValidUntilElement) {

		currentValidUntilElement.textContent =
			formatDateOnly(
				workspace.validUntil
			);
	}

	var suggestedDate =
		calculateExtensionDate(
			workspace.validUntil,
			30
		);

	if (extendValidUntilElement) {

		extendValidUntilElement.value =
			toInputDate(
				suggestedDate
			);
	}

	clearExtendMessage();

	var modalElement =
		document.getElementById(
			"workspaceExtendModal"
		);

	if (!modalElement) {

		return;
	}

	var modal =
		bootstrap.Modal.getOrCreateInstance(
			modalElement
		);

	modal.show();

}


/* =========================================================
   EXTEND VALIDITY
   ========================================================= */

async function extendWorkspaceValidity() {

	var tenantIdElement =
		document.getElementById(
			"extendTenantId"
		);

	var extendValidUntilElement =
		document.getElementById(
			"extendValidUntil"
		);

	var button =
		document.getElementById(
			"extendValidityButton"
		);

	var tenantId =
		tenantIdElement
			? Number(tenantIdElement.value)
			: 0;

	var validUntil =
		extendValidUntilElement
			? extendValidUntilElement.value
			: "";

	if (!tenantId) {

		showExtendMessage(
			"Invalid workspace.",
			"danger"
		);

		return;
	}

	if (!validUntil) {

		showExtendMessage(
			"Please select a new valid until date.",
			"warning"
		);

		return;
	}

	var workspace =
		findWorkspaceById(tenantId);

	if (
		workspace &&
		workspace.validUntil
	) {

		var currentEnd =
			toInputDate(
				workspace.validUntil
			);

		if (
			currentEnd &&
			validUntil < currentEnd
		) {

			showExtendMessage(
				"New validity date cannot be earlier than current validity date.",
				"warning"
			);

			return;
		}
	}

	var token =
		localStorage.getItem("token");

	if (!token) {

		showExtendMessage(
			"Authentication token not found. Please login again.",
			"danger"
		);

		return;
	}

	if (button) {

		button.disabled = true;
	}

	var originalHtml = "";

	if (button) {

		originalHtml =
			button.innerHTML;

		button.innerHTML =
			"<span class=\"spinner-border spinner-border-sm me-1\"></span>" +
			"Extending...";
	}

	try {

		var encodedDate =
			encodeURIComponent(
				validUntil
			);

		var response =
			await fetch(
				API_BASE +
				"/saas/tenants/admin/" +
				tenantId +
				"/validity/extend?validUntil=" +
				encodedDate,
				{
					method: "PUT",

					headers: {

						"Authorization":
							"Bearer " + token
					}
				}
			);

		var responseData =
			await parseJsonResponse(
				response
			);

		if (!response.ok) {

			throw new Error(
				getErrorMessage(
					responseData,
					"Failed to extend workspace validity."
				)
			);
		}

		showExtendMessage(
			"Workspace validity extended successfully.",
			"success"
		);

		setTimeout(
			async function() {

				var modalElement =
					document.getElementById(
						"workspaceExtendModal"
					);

				if (modalElement) {

					var modalInstance =
						bootstrap.Modal.getInstance(
							modalElement
						);

					if (modalInstance) {

						modalInstance.hide();
					}
				}

				await loadSaasWorkspaces();

			},
			700
		);

	} catch (error) {

		console.error(
			"Extend workspace validity error:",
			error
		);

		showExtendMessage(
			error.message ||
			"Failed to extend workspace validity.",
			"danger"
		);

	} finally {

		if (button) {

			button.disabled = false;

			button.innerHTML =
				originalHtml;
		}
	}

}


/* =========================================================
   SUSPEND WORKSPACE
   ========================================================= */

async function suspendWorkspace(tenantId) {

	var workspace =
		findWorkspaceById(tenantId);

	if (!workspace) {

		alert(
			"Workspace could not be found."
		);

		return;
	}

	var confirmed =
		window.confirm(
			"Suspend workspace \"" +
			workspace.tenantName +
			"\"?"
		);

	if (!confirmed) {

		return;
	}

	await performWorkspaceAction(
		tenantId,
		"suspend",
		"Workspace suspended successfully."
	);

}


/* =========================================================
   REACTIVATE WORKSPACE
   ========================================================= */

async function reactivateWorkspace(tenantId) {

	var workspace =
		findWorkspaceById(tenantId);

	if (!workspace) {

		alert(
			"Workspace could not be found."
		);

		return;
	}

	/*
	 * Backend does not allow reactivation
	 * if validity has already expired.
	 */

	var validUntil =
		parseDateOnly(
			workspace.validUntil
		);

	var today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	if (
		validUntil &&
		validUntil < today
	) {

		alert(
			"Workspace validity has expired. Please extend the validity before reactivating."
		);

		return;
	}

	var confirmed =
		window.confirm(
			"Reactivate workspace \"" +
			workspace.tenantName +
			"\"?"
		);

	if (!confirmed) {

		return;
	}

	await performWorkspaceAction(
		tenantId,
		"reactivate",
		"Workspace reactivated successfully."
	);

}


/* =========================================================
   PERFORM WORKSPACE ACTION
   ========================================================= */

async function performWorkspaceAction(
	tenantId,
	action,
	successMessage
) {

	var token =
		localStorage.getItem("token");

	if (!token) {

		alert(
			"Authentication token not found. Please login again."
		);

		return;
	}

	try {

		var response =
			await fetch(
				API_BASE +
				"/saas/tenants/admin/" +
				tenantId +
				"/" +
				action,
				{
					method: "PUT",

					headers: {

						"Authorization":
							"Bearer " + token
					}
				}
			);

		var responseData =
			await parseJsonResponse(
				response
			);

		if (!response.ok) {

			throw new Error(
				getErrorMessage(
					responseData,
					"Failed to " +
					action +
					" workspace."
				)
			);
		}

		alert(successMessage);

		await loadSaasWorkspaces();

	} catch (error) {

		console.error(
			"Workspace " +
			action +
			" error:",
			error
		);

		alert(
			error.message ||
			"Failed to " +
			action +
			" workspace."
		);
	}

}


/* =========================================================
   FIND WORKSPACE BY ID
   ========================================================= */

function findWorkspaceById(tenantId) {

	return saasWorkspaces.find(
		function(workspace) {

			return Number(workspace.tenantId) ===
				Number(tenantId);

		}
	);

}


/* =========================================================
   GET WORKSPACE DISPLAY STATUS
   ========================================================= */

function getWorkspaceDisplayStatus(workspace) {

	var status =
		normalizeWorkspaceStatus(
			workspace.status
		);

	var validUntil =
		parseDateOnly(
			workspace.validUntil
		);

	var today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	/*
	 * Expiry has display priority.
	 */

	if (
		validUntil &&
		validUntil < today
	) {

		return "EXPIRED";
	}

	if (status) {

		return status;
	}

	return "UNKNOWN";

}


/* =========================================================
   NORMALIZE WORKSPACE STATUS
   ========================================================= */

function normalizeWorkspaceStatus(status) {

	if (!status) {

		return "";
	}

	return String(status)
		.trim()
		.toUpperCase()
		.replace(/\s+/g, "_");

}


/* =========================================================
   WORKSPACE STATUS BADGE
   ========================================================= */

function getWorkspaceStatusBadge(status) {

	switch (status) {

		case "ACTIVE":

			return (
				"<span class=\"badge text-bg-success\">" +
				"<i class=\"bi bi-check-circle me-1\"></i>" +
				"Active" +
				"</span>"
			);

		case "SUSPENDED":

			return (
				"<span class=\"badge text-bg-warning\">" +
				"<i class=\"bi bi-pause-circle me-1\"></i>" +
				"Suspended" +
				"</span>"
			);

		case "EXPIRED":

			return (
				"<span class=\"badge text-bg-danger\">" +
				"<i class=\"bi bi-calendar-x me-1\"></i>" +
				"Expired" +
				"</span>"
			);

		default:

			return (
				"<span class=\"badge text-bg-secondary\">" +
				escapeHtml(
					status || "Unknown"
				) +
				"</span>"
			);
	}

}


/* =========================================================
   CALCULATE DAYS REMAINING
   ========================================================= */

function calculateDaysRemaining(validUntil) {

	var endDate =
		parseDateOnly(
			validUntil
		);

	if (!endDate) {

		return (
			"<span class=\"text-muted\">" +
			"-" +
			"</span>"
		);
	}

	var today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	var difference =
		endDate.getTime() -
		today.getTime();

	var days =
		Math.ceil(
			difference /
			(1000 * 60 * 60 * 24)
		);

	if (days < 0) {

		return (
			"<span class=\"text-danger fw-semibold\">" +
			"Expired" +
			"</span>"
		);
	}

	if (days === 0) {

		return (
			"<span class=\"text-danger fw-semibold\">" +
			"Expires today" +
			"</span>"
		);
	}

	if (days <= 7) {

		return (
			"<span class=\"text-warning fw-semibold\">" +
			days +
			" day" +
			(days === 1 ? "" : "s") +
			"</span>"
		);
	}

	return (
		"<span class=\"text-success\">" +
		days +
		" days" +
		"</span>"
	);

}


/* =========================================================
   VALIDITY TEXT
   ========================================================= */

function getValidityText(validUntil) {

	var endDate =
		parseDateOnly(
			validUntil
		);

	if (!endDate) {

		return "Validity not configured";
	}

	var days =
		calculateNumericDaysRemaining(
			endDate
		);

	if (days < 0) {

		return "Validity expired";
	}

	if (days === 0) {

		return "Expires today";
	}

	if (days === 1) {

		return "1 day remaining";
	}

	return (
		days +
		" days remaining"
	);

}


/* =========================================================
   NUMERIC DAYS REMAINING
   ========================================================= */

function calculateNumericDaysRemaining(endDate) {

	var today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	var difference =
		endDate.getTime() -
		today.getTime();

	return Math.ceil(
		difference /
		(1000 * 60 * 60 * 24)
	);

}


/* =========================================================
   CALCULATE EXTENSION DATE
   ========================================================= */

function calculateExtensionDate(
	currentValidUntil,
	extensionDays
) {

	var current =
		parseDateOnly(
			currentValidUntil
		);

	var today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	/*
	 * If already expired,
	 * extension starts from today.
	 *
	 * Otherwise extension starts
	 * from current end date.
	 */

	var base =
		current && current >= today
			? current
			: today;

	var result =
		new Date(base);

	result.setDate(
		result.getDate() +
		extensionDays
	);

	return result;

}


/* =========================================================
   DATE PARSER
   ========================================================= */

function parseDateOnly(value) {

	if (!value) {

		return null;
	}

	if (value instanceof Date) {

		return new Date(value);
	}

	var stringValue =
		String(value).trim();

	if (!stringValue) {

		return null;
	}

	/*
	 * Local date parsing avoids timezone
	 * shifting for yyyy-MM-dd.
	 */

	var match =
		stringValue.match(
			/^(\d{4})-(\d{2})-(\d{2})/
		);

	if (match) {

		return new Date(
			Number(match[1]),
			Number(match[2]) - 1,
			Number(match[3])
		);
	}

	var parsed =
		new Date(stringValue);

	if (
		Number.isNaN(
			parsed.getTime()
		)
	) {

		return null;
	}

	parsed.setHours(
		0,
		0,
		0,
		0
	);

	return parsed;

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDateOnly(value) {

	var date =
		parseDateOnly(value);

	if (!date) {

		return "-";
	}

	var day =
		String(
			date.getDate()
		).padStart(2, "0");

	var month =
		String(
			date.getMonth() + 1
		).padStart(2, "0");

	var year =
		date.getFullYear();

	return (
		day +
		"-" +
		month +
		"-" +
		year
	);

}


/* =========================================================
   INPUT DATE
   ========================================================= */

function toInputDate(value) {

	var date =
		parseDateOnly(value);

	if (!date) {

		return "";
	}

	var day =
		String(
			date.getDate()
		).padStart(2, "0");

	var month =
		String(
			date.getMonth() + 1
		).padStart(2, "0");

	var year =
		date.getFullYear();

	return (
		year +
		"-" +
		month +
		"-" +
		day
	);

}


/* =========================================================
   TENANT TYPE
   ========================================================= */

function normalizeTenantType(type) {

	if (!type) {

		return "Unknown";
	}

	var normalized =
		String(type)
			.trim()
			.toUpperCase();

	switch (normalized) {

		case "DOCTOR":

		case "DOCTOR_CLINIC":

			return "Doctor Clinic";

		case "HOSPITAL":

			return "Hospital";

		case "WHOLESALER":

			return "Wholesaler";

		case "RETAILER":

			return "Retailer";

		default:

			return normalized;
	}

}


/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

async function parseJsonResponse(response) {

	try {

		return await response.json();

	} catch (error) {

		return null;
	}

}


function getErrorMessage(
	responseData,
	fallback
) {

	if (!responseData) {

		return fallback;
	}

	if (
		typeof responseData ===
		"string"
	) {

		return responseData;
	}

	return (
		responseData.message ||
		responseData.error ||
		fallback
	);

}


/* =========================================================
   ROLE HELPERS
   ========================================================= */

function normalizeRole(role) {

	if (!role) {

		return "";
	}

	var normalized =
		String(role)
			.trim()
			.toUpperCase();

	if (
		normalized.startsWith(
			"ROLE_"
		)
	) {

		normalized =
			normalized.substring(5);
	}

	return normalized;

}


function formatRole(role) {

	var normalized =
		normalizeRole(role);

	switch (normalized) {

		case "DOCTOR":

			return "Doctor";

		case "HOSPITAL":

			return "Hospital";

		case "WHOLESALER":

			return "Wholesaler";

		case "RETAILER":

			return "Retailer";

		default:

			return normalized || "-";
	}

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

	return String(value)
		.replace(
			/&/g,
			"&amp;"
		)
		.replace(
			/</g,
			"&lt;"
		)
		.replace(
			/>/g,
			"&gt;"
		)
		.replace(
			/"/g,
			"&quot;"
		)
		.replace(
			/\x27/g,
			"&#039;"
		);

}


/* =========================================================
   CREATE MESSAGE
   ========================================================= */

function clearCreateWorkspaceMessage() {

	var message =
		document.getElementById(
			"createWorkspaceMessage"
		);

	if (message) {

		message.innerHTML = "";

		message.className =
			"mt-3 d-none";
	}

}


function showCreateWorkspaceMessage(
	text,
	type
) {

	var message =
		document.getElementById(
			"createWorkspaceMessage"
		);

	if (!message) {

		return;
	}

	message.className =
		"alert alert-" +
		type +
		" mt-3";

	message.textContent =
		text;

}


/* =========================================================
   VALIDITY MESSAGE
   ========================================================= */

function clearValidityMessage() {

	var message =
		document.getElementById(
			"validityMessage"
		);

	if (message) {

		message.innerHTML = "";

		message.className =
			"mt-3 d-none";
	}

}


function showValidityMessage(
	text,
	type
) {

	var message =
		document.getElementById(
			"validityMessage"
		);

	if (!message) {

		return;
	}

	message.className =
		"alert alert-" +
		type +
		" mt-3";

	message.textContent =
		text;

}


/* =========================================================
   EXTEND MESSAGE
   ========================================================= */

function clearExtendMessage() {

	var message =
		document.getElementById(
			"extendValidityMessage"
		);

	if (message) {

		message.innerHTML = "";

		message.className =
			"mt-3 d-none";
	}

}


function showExtendMessage(
	text,
	type
) {

	var message =
		document.getElementById(
			"extendValidityMessage"
		);

	if (!message) {

		return;
	}

	message.className =
		"alert alert-" +
		type +
		" mt-3";

	message.textContent =
		text;

}


/* =========================================================
   ERROR MESSAGE - USERS
   ========================================================= */

function showWorkspaceUsersError(message) {

	var tableBody =
		document.getElementById(
			"saasWorkspaceUsersTable"
		);

	if (tableBody) {

		var html = [];

		html.push("<tr>");

		html.push(
			"<td colspan=\"6\" " +
			"class=\"text-center py-5 text-danger\">"
		);

		html.push(
			"<i class=\"bi bi-exclamation-triangle fs-2 d-block mb-2\"></i>"
		);

		html.push(
			escapeHtml(message)
		);

		html.push("</td>");

		html.push("</tr>");

		tableBody.innerHTML =
			html.join("");
	}

}


/* =========================================================
   ERROR MESSAGE - WORKSPACES
   ========================================================= */

function showWorkspaceListError(message) {

	var tableBody =
		document.getElementById(
			"saasWorkspacesTable"
		);

	if (tableBody) {

		var html = [];

		html.push("<tr>");

		html.push(
			"<td colspan=\"8\" " +
			"class=\"text-center py-5 text-danger\">"
		);

		html.push(
			"<i class=\"bi bi-exclamation-triangle fs-2 d-block mb-2\"></i>"
		);

		html.push(
			escapeHtml(message)
		);

		html.push("</td>");

		html.push("</tr>");

		tableBody.innerHTML =
			html.join("");
	}

}