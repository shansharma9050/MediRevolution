document.addEventListener("DOMContentLoaded", function() {
	const allowed = requireSaasRole();
	if (!allowed) return;

	applyWorkspaceRoleRules();
	loadMyTenants();
});

function requireSaasRole() {
    const role = localStorage.getItem("role");

    const allowedRoles = [
        "DOCTOR",
        "HOSPITAL",
        "WHOLESALER",
        "SAAS_STAFF"
    ];

    if (!allowedRoles.includes(role)) {
        alert("SaaS workspace is available only for Doctor, Hospital, Wholesaler and assigned SaaS Staff.");
        window.location.href = "/dashboard";
        return false;
    }

    localStorage.setItem("saasMode", "true");
    return true;
}

function applyWorkspaceRoleRules() {
	const role = localStorage.getItem("role");

	if (role === "SAAS_STAFF") {
		hideElement("createWorkspaceBtn");

		const subtitle = document.getElementById("workspaceSubtitle");
		if (subtitle) {
			subtitle.innerText = "Select your assigned clinic or hospital workspace.";
		}
	}
}

async function loadMyTenants() {
	const token = localStorage.getItem("token");
	const container = document.getElementById("tenantContainer");

	if (!container) {
		console.warn("tenantContainer not found.");
		return;
	}

	container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="text-muted mt-3">Loading workspaces...</p>
        </div>
    `;

	try {
		const response = await fetch(`${API_BASE}/saas/tenants/my`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to load workspaces.");
			container.innerHTML = "";
			return;
		}

		renderTenants(Array.isArray(result) ? result : []);

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
		container.innerHTML = "";
	}
}

function renderTenants(tenants) {
	const container = document.getElementById("tenantContainer");
	const role = localStorage.getItem("role");

	if (!container) {
		return;
	}

	if (!tenants || tenants.length === 0) {

		if (role === "SAAS_STAFF") {
			container.innerHTML = `
                <div class="col-12">
                    <div class="mr-card text-center py-5">
                        <h3>No Assigned Workspace Found</h3>
                        <p class="text-muted">
                            You are not added to any SaaS workspace yet.
                            Please contact your hospital, clinic or organization owner.
                        </p>
                    </div>
                </div>
            `;
			return;
		}

		container.innerHTML = `
            <div class="col-12">
                <div class="mr-card text-center py-5">
                    <h3>No Workspace Found</h3>
                    <p class="text-muted">
                        Create your personal SaaS workspace to use MediRevolution as your own software.
                    </p>
                    <button id="createWorkspaceBtnEmpty"
                            class="btn btn-medi"
                            data-bs-toggle="modal"
                            data-bs-target="#createTenantModal">
                        Create Workspace
                    </button>
                </div>
            </div>
        `;
		return;
	}

	let html = "";

	tenants.forEach(tenant => {
		html += `
            <div class="col-xl-4 col-md-6">
                <div class="mr-card h-100">
                    <span class="badge bg-success mb-3">${safe(tenant.status)}</span>

                    <h4 class="fw-bold text-primary">${safe(tenant.tenantName)}</h4>

                    <p class="text-muted">${safe(tenant.tenantCode)}</p>

                    <p>
                        <strong>Type:</strong> ${safe(tenant.tenantType)}
                    </p>

                    <button class="btn btn-medi w-100 mt-3"
                            onclick="selectTenant('${tenant.tenantId}', '${safeForJs(tenant.tenantName)}')">
                        Open Workspace
                    </button>
                </div>
            </div>
        `;
	});

	container.innerHTML = html;
}

async function createTenant() {
	const role = localStorage.getItem("role");

	if (role === "SAAS_STAFF") {
		showMsg("SaaS staff cannot create workspace. Please select assigned workspace.");
		return;
	}

	const token = localStorage.getItem("token");

	const payload = {
		tenantName: getValue("tenantName"),
		contactEmail: getValue("contactEmail"),
		contactMobile: getValue("contactMobile"),
		city: getValue("city"),
		state: getValue("state"),
		pincode: getValue("pincode"),
		address: getValue("address")
	};

	if (!payload.tenantName) {
		showMsg("Workspace name is required.");
		return;
	}

	try {
		const response = await fetch(`${API_BASE}/saas/tenants`, {
			method: "POST",
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to create workspace.");
			return;
		}

		showMsg("Workspace created successfully.", "success");

		const modalEl = document.getElementById("createTenantModal");
		const modal = bootstrap.Modal.getInstance(modalEl);

		if (modal) {
			modal.hide();
		}

		setTimeout(() => {
			window.location.reload();
		}, 700);

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

function selectTenant(tenantId, tenantName) {
	if (!tenantId) {
		showMsg("Invalid workspace selected.");
		return;
	}

	localStorage.setItem("tenantId", tenantId);
	localStorage.setItem("tenantName", tenantName || "Workspace");
	localStorage.setItem("saasMode", "true");

	localStorage.removeItem("saasMemberRole");
	localStorage.removeItem("saasOwnerOrAdmin");

	window.location.href = "/saas/dashboard";
}

async function safeJson(response) {
	try {
		return await response.json();
	} catch (e) {
		return {};
	}
}

function getValue(id) {
	const element = document.getElementById(id);
	return element ? element.value.trim() : "";
}

function hideElement(id) {
	const element = document.getElementById(id);
	if (element) {
		element.style.display = "none";
	}
}

function showMsg(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `
        <div class="alert alert-${type}">
            ${message}
        </div>
    `;
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}

function safeForJs(value) {
	return String(value || "")
		.replace(/\\/g, "\\\\")
		.replace(/'/g, "\\'")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "");
}