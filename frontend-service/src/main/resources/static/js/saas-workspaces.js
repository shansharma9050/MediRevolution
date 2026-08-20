let createTenantModal;

let allTenants = [];

let isLoadingTenants = false;
let isCreatingTenant = false;

let deletingTenantId = null;


document.addEventListener("DOMContentLoaded", async function() {

	enforceWorkspaceSelectionLayout();

	const allowed =
		requireSaasRole();

	if (!allowed) {
		return;
	}

	const modalElement =
		document.getElementById(
			"createTenantModal"
		);

	if (modalElement) {
		createTenantModal =
			bootstrap.Modal.getOrCreateInstance(
				modalElement
			);
	}

	applyWorkspaceRoleRules();

	await loadMyTenants();
});


function enforceWorkspaceSelectionLayout() {
	document.body.classList.add("workspace-selection-page");
}


window.addEventListener("pageshow", function() {
	enforceWorkspaceSelectionLayout();
});


function requireSaasRole() {

	const role =
		getNormalizedLoginRole();

	const allowedRoles = [
		"DOCTOR",
		"HOSPITAL",
		"WHOLESALER",
		"RETAILER",
		"SAAS_STAFF"
	];

	if (!allowedRoles.includes(role)) {

		alert(
			"SaaS workspace is available only for Doctor, Hospital, Wholesaler, Retailer and assigned SaaS Staff."
		);

		window.location.href =
			"/dashboard";

		return false;
	}

	localStorage.setItem(
		"saasMode",
		"true"
	);

	return true;
}


function applyWorkspaceRoleRules() {

	const role =
		getNormalizedLoginRole();

	if (role === "SAAS_STAFF") {

		hideElement(
			"createWorkspaceBtn"
		);

		setText(
			"workspaceSubtitle",
			"Select your assigned clinic, hospital, wholesale or retail workspace."
		);

		setText(
			"workspaceAccessMode",
			"Assigned"
		);

		return;
	}

	setText(
		"workspaceAccessMode",
		"Owner"
	);

	const tenantType =
		resolveTenantTypeFromRole(role);

	setText(
		"workspaceSubtitle",
		getWorkspaceSubtitleByType(
			tenantType
		)
	);
}


async function loadMyTenants() {

	if (isLoadingTenants) {
		return;
	}

	isLoadingTenants = true;

	const token =
		localStorage.getItem("token");

	showWorkspacesLoadingState();

	setButtonLoading(
		"refreshWorkspacesBtn",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/tenants/my`,
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

			allTenants = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load workspaces."
				);

			showMsg(message);
			showWorkspacesErrorState(message);
			updateWorkspaceSummary();

			return;
		}

		allTenants =
			Array.isArray(result)
				? result
				: [];

		renderTenants(allTenants);
		updateWorkspaceSummary();

	} catch (error) {

		console.error(
			"Unable to load workspaces:",
			error
		);

		allTenants = [];

		showMsg(
			"SaaS service not reachable."
		);

		showWorkspacesErrorState(
			"SaaS workspace service is currently unavailable."
		);

		updateWorkspaceSummary();

	} finally {

		isLoadingTenants = false;

		setButtonLoading(
			"refreshWorkspacesBtn",
			"Refresh",
			false
		);
	}
}


function renderTenants(tenants) {

	const container =
		document.getElementById(
			"tenantContainer"
		);

	if (!container) {
		return;
	}

	const role =
		getNormalizedLoginRole();

	const list =
		Array.isArray(tenants)
			? tenants
			: [];

	/*
	 * ========================================================
	 * NO WORKSPACES
	 * ========================================================
	 */

	if (!list.length) {

		/*
		 * SAAS STAFF
		 */
		if (role === "SAAS_STAFF") {

			container.innerHTML = `
				<div class="saas-workspaces-state">

					<div class="saas-workspaces-state-icon">
						<i class="bi bi-person-x-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						No assigned workspace found
					</h5>

					<p class="text-muted mb-0">
						You are not added to any SaaS workspace yet.
						Please contact your clinic, hospital, wholesale
						or retail workspace owner.
					</p>

				</div>
			`;

			return;
		}

		/*
		 * OWNER / NORMAL SaaS USER
		 */
		container.innerHTML = `
			<div class="saas-workspaces-state">

				<div class="saas-workspaces-state-icon">
					<i class="bi bi-grid-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No workspace found
				</h5>

				<p class="text-muted mb-3">
					Create your personal SaaS workspace to use
					MediRevolution as your own business software.
				</p>

				<button
					type="button"
					id="createWorkspaceBtnEmpty"
					class="btn btn-medi"
					onclick="openCreateTenantModal()">

					<i class="bi bi-plus-circle-fill me-1"></i>

					Create Workspace

				</button>

			</div>
		`;

		return;
	}

	/*
	 * ========================================================
	 * WORKSPACE CARDS
	 * ========================================================
	 */

	container.innerHTML =
		list
			.map(
				function(tenant, index) {

					const tenantId =
						String(
							tenant?.tenantId ??
							tenant?.id ??
							""
						).trim();

					const tenantName =
						String(
							tenant?.tenantName ??
							""
						).trim();

					const tenantCode =
						String(
							tenant?.tenantCode ??
							""
						).trim();

					const tenantType =
						String(
							tenant?.tenantType ??
							""
						)
							.trim()
							.toUpperCase();

					const tenantStatus =
						String(
							tenant?.status ??
							""
						)
							.trim()
							.toUpperCase();

					/*
					 * Data passed to button.
					 */
					const tenantData =
						encodeURIComponent(
							JSON.stringify({

								tenantId:
									tenantId,

								tenantName:
									tenantName,

								tenantType:
									tenantType,

								status:
									tenantStatus

							})
						);

					/*
					 * ==================================================
					 * STATUS UI
					 * ==================================================
					 */

					let statusIcon =
						"bi-dash-circle-fill";

					let statusClass =
						"text-secondary";

					let statusLabel =
						tenantStatus || "UNKNOWN";


					if (
						tenantStatus === "ACTIVE"
					) {

						statusIcon =
							"bi-check-circle-fill";

						statusClass =
							"text-success";

					} else if (
						tenantStatus === "PENDING"
					) {

						statusIcon =
							"bi-credit-card-fill";

						statusClass =
							"text-warning";

						statusLabel =
							"SUBSCRIPTION REQUIRED";

					} else if (
						tenantStatus === "SUSPENDED"
					) {

						statusIcon =
							"bi-exclamation-triangle-fill";

						statusClass =
							"text-danger";

						statusLabel =
							"SUBSCRIPTION EXPIRED";

					} else if (
						tenantStatus === "INACTIVE"
					) {

						statusIcon =
							"bi-x-circle-fill";

						statusClass =
							"text-secondary";

						statusLabel =
							"INACTIVE";
					}

					/*
					 * ==================================================
					 * ACTION BUTTON
					 * ==================================================
					 */

					let actionHtml = "";

					let primaryActionHtml = "";

					if (tenantStatus === "ACTIVE") {

						primaryActionHtml = `
		<button
			type="button"
			class="btn btn-medi w-100"
			data-tenant="${tenantData}"
			onclick="selectTenantFromButton(this)">

			<i class="bi bi-box-arrow-in-right me-1"></i>

			Open Workspace

		</button>
	`;

					} else if (tenantStatus === "PENDING") {

						primaryActionHtml = `
		<button
			type="button"
			class="btn btn-warning w-100"
			data-tenant="${tenantData}"
			onclick="selectPendingTenantFromButton(this)">

			<i class="bi bi-credit-card-fill me-1"></i>

			Choose Subscription

		</button>
	`;

					} else if (tenantStatus === "SUSPENDED") {

						primaryActionHtml = `
		<button
			type="button"
			class="btn btn-danger w-100"
			data-tenant="${tenantData}"
			onclick="selectSuspendedTenantFromButton(this)">

			<i class="bi bi-arrow-repeat me-1"></i>

			Renew Subscription

		</button>
	`;

					} else {

						primaryActionHtml = `
		<button
			type="button"
			class="btn btn-secondary w-100"
			disabled>

			<i class="bi bi-lock-fill me-1"></i>

			Workspace Unavailable

		</button>
	`;
					}

					/*
					 * =========================================================
					 * DELETE WORKSPACE
					 * =========================================================
					 *
					 * SaaS Staff ko delete action nahi dikhana hai.
					 *
					 * Actual owner authorization backend par hoti hai.
					 */
					let deleteActionHtml = "";

					if (role !== "SAAS_STAFF") {

						deleteActionHtml = `
		<button
			type="button"
			class="btn btn-outline-danger w-100"
			data-tenant="${tenantData}"
			onclick="deleteWorkspaceFromButton(this)">

			<i class="bi bi-trash3-fill me-1"></i>

			Delete Workspace

		</button>
	`;
					}

					actionHtml = `
	<div class="d-grid gap-2">

		${primaryActionHtml}

		${deleteActionHtml}

	</div>
`;
					/*
					 * ==================================================
					 * STATUS MESSAGE
					 * ==================================================
					 */

					let subscriptionNoticeHtml =
						"";

					if (
						tenantStatus === "PENDING"
					) {

						subscriptionNoticeHtml = `

							<div class="
								alert
								alert-warning
								small
								py-2
								px-3
								mt-3
								mb-0
							">

								<i class="
									bi
									bi-info-circle-fill
									me-1
								"></i>

								Choose a subscription plan
								to activate this workspace.

							</div>
						`;

					} else if (
						tenantStatus === "SUSPENDED"
					) {

						subscriptionNoticeHtml = `

							<div class="
								alert
								alert-danger
								small
								py-2
								px-3
								mt-3
								mb-0
							">

								<i class="
									bi
									bi-exclamation-triangle-fill
									me-1
								"></i>

								This workspace subscription
								has expired. Renew to continue.

							</div>
						`;
					}

					/*
					 * ==================================================
					 * CARD
					 * ==================================================
					 */

					return `

						<article
							class="saas-workspace-item"
							style="
								--workspace-delay:
								${Math.min(
						index * 75,
						450
					)}ms
							">

							<!-- STATUS -->

							<span
								class="
									saas-workspace-status
									${statusClass}
								">

								<i class="
									bi
									${statusIcon}
								"></i>

								${escapeHtml(
						statusLabel
					)}

							</span>


							<!-- ICON -->

							<div class="saas-workspace-icon">

								<i class="
									${getWorkspaceIcon(
						tenantType
					)}
								"></i>

							</div>


							<!-- NAME -->

							<h4>

								${safe(
						tenantName
					)}

							</h4>


							<!-- CODE -->

							<div class="saas-workspace-code">

								${safe(
						tenantCode
					)}

							</div>


							<!-- DETAILS -->

							<div class="saas-workspace-details">

								<div class="saas-workspace-detail">

									<i class="
										bi
										bi-tag-fill
									"></i>

									<strong>
										Type:
									</strong>

									${safe(
						formatTenantType(
							tenantType
						)
					)}

								</div>


								<div class="saas-workspace-detail">

									<i class="
										bi
										${statusIcon}
									"></i>

									<strong>
										Status:
									</strong>

									${escapeHtml(
						statusLabel
					)}

								</div>

							</div>


							<!-- MODULE PREVIEW -->

							${renderWorkspaceModulePreview(
						tenantType
					)}


							<!-- SUBSCRIPTION NOTICE -->

							${subscriptionNoticeHtml}


							<!-- ACTION -->

							<div class="mt-auto pt-3">

								${actionHtml}

							</div>

						</article>
					`;
				}
			)
			.join("");
}



async function deleteWorkspaceFromButton(button) {

	if (!button) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	const encodedData =
		button.getAttribute("data-tenant");

	if (!encodedData) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	let tenant;

	try {

		tenant =
			JSON.parse(
				decodeURIComponent(
					encodedData
				)
			);

	} catch (error) {

		console.error(
			"Unable to read workspace data:",
			error
		);

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	const tenantId =
		String(
			tenant?.tenantId ??
			tenant?.id ??
			""
		).trim();

	const tenantName =
		String(
			tenant?.tenantName ??
			"Workspace"
		).trim();

	if (!tenantId) {

		showMsg(
			"Workspace ID is missing."
		);

		return;
	}

	/*
	 * ---------------------------------------------------------
	 * CONFIRMATION
	 * ---------------------------------------------------------
	 */

	const confirmed = window.confirm(
		`Delete "${tenantName}" permanently?\n\n` +
		`This will permanently delete the workspace and all ` +
		`workspace-related data including patients, staff, ` +
		`appointments, billing, medicines, purchases, sales, ` +
		`inventory, reports and subscriptions.\n\n` +
		`This action cannot be undone.`
	);

	if (!confirmed) {

		return;
	}

	if (deletingTenantId !== null) {

		return;
	}

	const token =
		localStorage.getItem("token");

	if (!token) {

		showMsg(
			"Your login session has expired. Please login again."
		);

		return;
	}

	/*
	 * ---------------------------------------------------------
	 * START DELETE
	 * ---------------------------------------------------------
	 */

	deletingTenantId = tenantId;

	const originalHtml =
		button.innerHTML;

	button.disabled = true;

	button.innerHTML = `
		<span
			class="spinner-border spinner-border-sm me-2"
			role="status"
			aria-hidden="true">
		</span>

		Deleting...
	`;

	try {

		const response =
			await fetch(
				`${API_BASE}/saas/tenants/${encodeURIComponent(tenantId)}`,
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

		/*
		 * -----------------------------------------------------
		 * ERROR
		 * -----------------------------------------------------
		 */

		if (!response.ok) {

			const message =
				getApiErrorMessage(
					result,
					"Unable to delete workspace."
				);

			showMsg(message);

			button.disabled = false;

			button.innerHTML =
				originalHtml;

			return;
		}

		/*
		 * -----------------------------------------------------
		 * CURRENT WORKSPACE CHECK
		 * -----------------------------------------------------
		 */

		const selectedTenantId =
			String(
				localStorage.getItem(
					"tenantId"
				) || ""
			).trim();

		/*
		 * Agar delete kiya gaya workspace
		 * currently selected workspace tha,
		 * to stale workspace context remove karo.
		 */

		if (
			selectedTenantId ===
			tenantId
		) {

			localStorage.removeItem(
				"tenantId"
			);

			localStorage.removeItem(
				"tenantName"
			);

			localStorage.removeItem(
				"tenantType"
			);

			localStorage.removeItem(
				"saasMemberRole"
			);

			localStorage.removeItem(
				"saasOwnerOrAdmin"
			);

			localStorage.removeItem(
				"saasPermissions"
			);
		}

		/*
		 * -----------------------------------------------------
		 * SUCCESS
		 * -----------------------------------------------------
		 */

		showMsg(
			`Workspace "${tenantName}" deleted successfully.`,
			"success"
		);

		/*
		 * Reload the workspace list.
		 */
		await loadMyTenants();

	} catch (error) {

		console.error(
			"Unable to delete workspace:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

		button.disabled = false;

		button.innerHTML =
			originalHtml;

	} finally {

		deletingTenantId = null;
	}
}

function selectPendingTenantFromButton(button) {

	if (!button) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	const encodedData =
		button.getAttribute(
			"data-tenant"
		);

	if (!encodedData) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	try {

		const tenant =
			JSON.parse(
				decodeURIComponent(
					encodedData
				)
			);

		setSelectedWorkspaceContext(
			tenant
		);

		/*
		 * PENDING workspace:
		 * dashboard par nahi jana.
		 * Direct subscription plans par jana hai.
		 */
		window.location.href =
			"/saas/subscription/plans";

	} catch (error) {

		console.error(
			"Unable to open pending workspace subscription:",
			error
		);

		showMsg(
			"Unable to open subscription plans."
		);
	}
}

function selectSuspendedTenantFromButton(button) {

	if (!button) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	const encodedData =
		button.getAttribute(
			"data-tenant"
		);

	if (!encodedData) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	try {

		const tenant =
			JSON.parse(
				decodeURIComponent(
					encodedData
				)
			);

		setSelectedWorkspaceContext(
			tenant
		);

		/*
		 * Expired/suspended workspace:
		 * renewal ke liye plans page.
		 */
		window.location.href =
			"/saas/subscription/plans";

	} catch (error) {

		console.error(
			"Unable to open suspended workspace subscription:",
			error
		);

		showMsg(
			"Unable to open subscription plans."
		);
	}
}


function setSelectedWorkspaceContext(tenant) {

	if (!tenant) {

		throw new Error(
			"Workspace data is missing"
		);
	}

	const tenantId =
		String(
			tenant.tenantId ??
			tenant.id ??
			""
		).trim();

	const tenantName =
		String(
			tenant.tenantName ??
			"Workspace"
		).trim();

	const tenantType =
		String(
			tenant.tenantType ??
			""
		)
			.trim()
			.toUpperCase();

	if (!tenantId) {

		throw new Error(
			"Workspace ID is missing"
		);
	}

	if (!tenantType) {

		throw new Error(
			"Workspace type is missing"
		);
	}

	/*
	 * Selected workspace
	 */
	localStorage.setItem(
		"tenantId",
		tenantId
	);

	localStorage.setItem(
		"tenantName",
		tenantName || "Workspace"
	);

	localStorage.setItem(
		"tenantType",
		tenantType
	);

	localStorage.setItem(
		"saasMode",
		"true"
	);

	/*
	 * Old permission cache clear.
	 */
	localStorage.removeItem(
		"saasMemberRole"
	);

	localStorage.removeItem(
		"saasOwnerOrAdmin"
	);

	localStorage.removeItem(
		"saasPermissions"
	);

	/*
	 * Sidebar refresh.
	 */
	if (
		typeof updateSaasSidebarWorkspaceDetails ===
		"function"
	) {

		updateSaasSidebarWorkspaceDetails();
	}
}
function renderWorkspaceModulePreview(tenantType) {

	const modules =
		getWorkspaceModules(
			tenantType
		);

	if (!modules.length) {
		return "";
	}

	const visibleModules =
		modules.slice(0, 6);

	const remainingCount =
		Math.max(
			modules.length -
			visibleModules.length,
			0
		);

	const chips =
		visibleModules
			.map(
				function(module) {

					return `
						<span class="saas-workspace-module-chip">
							<i class="${module.icon}"></i>
							${escapeHtml(module.label)}
						</span>
					`;
				}
			)
			.join("");

	const moreChip =
		remainingCount > 0
			? `
				<span class="saas-workspace-module-chip saas-workspace-module-more">
					<i class="bi bi-plus-circle-fill"></i>
					${remainingCount} more
				</span>
			`
			: "";

	return `
		<div class="saas-workspace-modules"
			 aria-label="${escapeHtml(formatTenantType(tenantType))} modules">
			${chips}
			${moreChip}
		</div>
	`;
}


function getWorkspaceModules(tenantType) {

	const normalizedType =
		String(
			tenantType || ""
		)
			.trim()
			.toUpperCase();

	const sharedBusinessModules = [
		{ label: "Medicine Master", icon: "bi bi-capsule" },
		{ label: "Suppliers", icon: "bi bi-truck-front-fill" },
		{ label: "Purchases", icon: "bi bi-bag-plus-fill" },
		{ label: "Inventory", icon: "bi bi-box-seam-fill" },
		{ label: "Sales", icon: "bi bi-cart-check-fill" },
		{ label: "Payments & Ledger", icon: "bi bi-credit-card-fill" },
		{ label: "Expiry Management", icon: "bi bi-calendar-x-fill" },
		{ label: "Reports", icon: "bi bi-bar-chart-line-fill" }
	];

	switch (normalizedType) {

		case "WHOLESALER":
		case "RETAILER":
			return [
				...sharedBusinessModules,
				{ label: "Customers", icon: "bi bi-person-lines-fill" },
				{ label: "Sales Orders", icon: "bi bi-clipboard-check-fill" },
				{ label: "Purchase Returns", icon: "bi bi-arrow-return-left" },
				{ label: "Sales Returns", icon: "bi bi-arrow-return-right" }
			];

		case "DOCTOR_CLINIC":
			return [
				{ label: "Patients", icon: "bi bi-person-vcard-fill" },
				{ label: "Appointments", icon: "bi bi-calendar-check-fill" },
				{ label: "Prescriptions", icon: "bi bi-file-medical-fill" },
				{ label: "Billing", icon: "bi bi-receipt-cutoff" },
				{ label: "Reports", icon: "bi bi-bar-chart-line-fill" }
			];

		case "HOSPITAL":
			return [
				{ label: "Patients", icon: "bi bi-person-vcard-fill" },
				{ label: "Doctors", icon: "bi bi-person-badge-fill" },
				{ label: "OPD", icon: "bi bi-hospital-fill" },
				{ label: "IPD", icon: "bi bi-bed-fill" },
				{ label: "Pharmacy", icon: "bi bi-capsule-pill" },
				{ label: "Billing", icon: "bi bi-receipt-cutoff" },
				{ label: "Reports", icon: "bi bi-bar-chart-line-fill" }
			];

		default:
			return [];
	}
}


function openCreateTenantModal() {

	const role =
		getNormalizedLoginRole();

	if (role === "SAAS_STAFF") {

		showMsg(
			"SaaS staff cannot create a workspace. Please select an assigned workspace."
		);

		return;
	}

	clearTenantForm();

	setWorkspaceTypePreview();

	if (createTenantModal) {
		createTenantModal.show();
	}
}


async function createTenant() {

	if (isCreatingTenant) {
		return;
	}

	const role =
		getNormalizedLoginRole();

	if (role === "SAAS_STAFF") {

		showMsg(
			"SaaS staff cannot create a workspace. Please select an assigned workspace."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantType =
		resolveTenantTypeFromRole(role);

	const payload = {

		tenantName:
			getValue("tenantName"),

		tenantType:
			tenantType,

		contactEmail:
			getValue("contactEmail"),

		contactMobile:
			getValue("contactMobile"),

		city:
			getValue("city"),

		state:
			getValue("state"),

		pincode:
			getValue("pincode"),

		address:
			getValue("address")
	};

	if (!payload.tenantName) {
		showModalFormError(
			document.getElementById("createTenantModal"),
			"Workspace name is required."
		);
		return;
	}

	if (!payload.tenantType) {

		showModalFormError(
			document.getElementById("createTenantModal"),
			"Unable to determine workspace type from your login role."
		);

		return;
	}

	if (
		payload.contactEmail &&
		!isValidEmail(payload.contactEmail)
	) {

		showModalFormError(
			document.getElementById("createTenantModal"),
			"Please enter a valid contact email."
		);

		return;
	}

	if (
		payload.contactMobile &&
		!isValidMobile(payload.contactMobile)
	) {

		showModalFormError(
			document.getElementById("createTenantModal"),
			"Please enter a valid contact mobile number."
		);

		return;
	}

	if (
		payload.pincode &&
		!isValidPincode(payload.pincode)
	) {

		showModalFormError(
			document.getElementById("createTenantModal"),
			"Please enter a valid 6-digit pincode."
		);

		return;
	}

	isCreatingTenant = true;

	setButtonLoading(
		"createTenantBtn",
		"Creating...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/tenants`,
			{
				method: "POST",

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

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to create workspace."
				)
			);

			return;
		}

		if (createTenantModal) {
			createTenantModal.hide();
		}

		clearTenantForm();

		showMsg(
			"Workspace created successfully.",
			"success"
		);

		await loadMyTenants();

	} catch (error) {

		console.error(
			"Unable to create workspace:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {

		isCreatingTenant = false;

		setButtonLoading(
			"createTenantBtn",
			"Create Workspace",
			false
		);
	}
}


function selectTenantFromButton(button) {

	if (!button) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	const encodedData =
		button.getAttribute(
			"data-tenant"
		);

	if (!encodedData) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	try {

		const tenant =
			JSON.parse(
				decodeURIComponent(
					encodedData
				)
			);

		selectTenant(
			tenant.tenantId ??
			tenant.id,

			tenant.tenantName,

			tenant.tenantType
		);

	} catch (error) {

		console.error(
			"Unable to read workspace selection:",
			error
		);

		showMsg(
			"Invalid workspace selected."
		);
	}
}

function selectTenant(
	tenantId,
	tenantName,
	tenantType
) {

	const selectedTenantId =
		String(
			tenantId ?? ""
		).trim();

	const selectedTenantName =
		String(
			tenantName || "Workspace"
		).trim();

	const selectedTenantType =
		String(
			tenantType ?? ""
		)
			.trim()
			.toUpperCase();

	if (!selectedTenantId) {

		showMsg(
			"Invalid workspace selected."
		);

		return;
	}

	if (!selectedTenantType) {

		showMsg(
			"Workspace type is missing. Please refresh and select the workspace again."
		);

		return;
	}

	localStorage.setItem(
		"tenantId",
		selectedTenantId
	);

	localStorage.setItem(
		"tenantName",
		selectedTenantName || "Workspace"
	);

	localStorage.setItem(
		"tenantType",
		selectedTenantType
	);


	updateSaasSidebarWorkspaceDetails();

	localStorage.setItem(
		"saasMode",
		"true"
	);

	/*
	 * Ye values selected workspace ke liye
	 * dashboard/permission API se dobara load hongi.
	 */
	localStorage.removeItem(
		"saasMemberRole"
	);

	localStorage.removeItem(
		"saasOwnerOrAdmin"
	);

	localStorage.removeItem(
		"saasPermissions"
	);

	window.location.href =
		"/saas/dashboard";
}


async function refreshWorkspaces() {

	await loadMyTenants();
}


function resolveTenantTypeFromRole(role) {

	const normalizedRole =
		String(role || "")
			.trim()
			.toUpperCase()
			.replace(/^ROLE_/, "");

	switch (normalizedRole) {

		case "DOCTOR":
			return "DOCTOR_CLINIC";

		case "HOSPITAL":
			return "HOSPITAL";

		case "WHOLESALER":
			return "WHOLESALER";

		case "RETAILER":
			return "RETAILER";

		default:
			return "";
	}
}


function setWorkspaceTypePreview() {

	const role =
		getNormalizedLoginRole();

	const tenantType =
		resolveTenantTypeFromRole(role);

	setValue(
		"tenantType",
		tenantType
	);

	setText(
		"tenantTypeText",
		formatTenantType(
			tenantType
		)
	);
}


function getWorkspaceSubtitleByType(tenantType) {

	switch (tenantType) {

		case "DOCTOR_CLINIC":
			return "Create and manage your personal doctor clinic workspace.";

		case "HOSPITAL":
			return "Create and manage your hospital workspace.";

		case "WHOLESALER":
			return "Create and manage your wholesale medicine business workspace.";

		case "RETAILER":
			return "Create and manage your retail pharmacy workspace.";

		default:
			return "Create and manage your MediRevolution SaaS workspace.";
	}
}


function getWorkspaceIcon(tenantType) {

	switch (tenantType) {

		case "DOCTOR_CLINIC":
			return "bi bi-heart-pulse-fill";

		case "HOSPITAL":
			return "bi bi-hospital-fill";

		case "WHOLESALER":
			return "bi bi-box-seam-fill";

		case "RETAILER":
			return "bi bi-shop-window";

		default:
			return "bi bi-building-fill";
	}
}


function formatTenantType(tenantType) {

	const normalizedType =
		String(
			tenantType || ""
		)
			.trim()
			.toUpperCase();

	switch (normalizedType) {

		case "DOCTOR_CLINIC":
			return "Doctor Clinic";

		case "HOSPITAL":
			return "Hospital";

		case "WHOLESALER":
			return "Wholesaler";

		case "RETAILER":
			return "Retailer";

		default:
			return normalizedType || "-";
	}
}


function updateWorkspaceSummary() {

	setAnimatedNumber(
		"totalWorkspaceCount",
		allTenants.length
	);

	setAnimatedNumber(
		"activeWorkspaceCount",
		allTenants.filter(
			function(tenant) {

				return (
					String(
						tenant.status || ""
					)
						.trim()
						.toUpperCase() === "ACTIVE"
				);
			}
		).length
	);

	const types =
		new Set(
			allTenants
				.map(
					function(tenant) {

						return String(
							tenant.tenantType || ""
						)
							.trim()
							.toUpperCase();
					}
				)
				.filter(Boolean)
		);

	setAnimatedNumber(
		"workspaceTypeCount",
		types.size
	);
}


function showWorkspacesLoadingState() {

	const container =
		document.getElementById(
			"tenantContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="saas-workspaces-state">

			<div class="saas-workspaces-state-icon saas-workspaces-loading">
				<i class="bi bi-grid-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading workspaces
			</h5>

			<p class="text-muted mb-0">
				Please wait while we prepare your SaaS workspaces.
			</p>

		</div>
	`;
}


function showWorkspacesErrorState(message) {

	const container =
		document.getElementById(
			"tenantContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="saas-workspaces-state">

			<div class="saas-workspaces-state-icon bg-danger">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load workspaces
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}


function clearTenantForm() {

	[
		"tenantName",
		"contactEmail",
		"contactMobile",
		"city",
		"state",
		"pincode",
		"address"
	].forEach(
		function(id) {
			setValue(id, "");
		}
	);

	setWorkspaceTypePreview();
}


function getNormalizedLoginRole() {

	return String(
		localStorage.getItem("role") || ""
	)
		.trim()
		.toUpperCase()
		.replace(/^ROLE_/, "");
}


function isValidEmail(email) {

	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
		String(email || "").trim()
	);
}


function isValidMobile(mobile) {

	return /^[6-9][0-9]{9}$/.test(
		String(mobile || "").trim()
	);
}


function isValidPincode(pincode) {

	return /^[1-9][0-9]{5}$/.test(
		String(pincode || "").trim()
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

		if (!button.dataset.originalHtml) {
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


function hideElement(id) {

	const element =
		document.getElementById(id);

	if (element) {
		element.style.display =
			"none";
	}
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

	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}