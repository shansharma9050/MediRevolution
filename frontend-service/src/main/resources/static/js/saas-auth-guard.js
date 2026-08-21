window.SAAS_PERMISSIONS = window.SAAS_PERMISSIONS || [];
window.SAAS_MEMBER_ROLE = window.SAAS_MEMBER_ROLE || null;
window.SAAS_OWNER_OR_ADMIN = window.SAAS_OWNER_OR_ADMIN || false;
window.SAAS_ENABLED_MODULES = window.SAAS_ENABLED_MODULES || [];

function isSaasModuleEnabled(module) {

	if (isSaasSubscriptionPage()) {
		return true;
	}

	if (!module) {
		return false;
	}

	const requiredModule =
		String(module)
			.trim()
			.toUpperCase();

	if (requiredModule === "DASHBOARD") {
		return true;
	}

	if (
		!isModuleAllowedForCurrentTenantType(
			requiredModule
		)
	) {
		return false;
	}

	if (
		requiredModule === "SETTINGS" ||
		requiredModule === "PERMISSIONS"
	) {
		return window.SAAS_OWNER_OR_ADMIN === true;
	}

	return (
		window.SAAS_ENABLED_MODULES || []
	).some(
		function(enabledModule) {

			return String(enabledModule)
				.trim()
				.toUpperCase() === requiredModule;
		}
	);
}

function getApiBase() {
	if (typeof API_BASE !== "undefined" && API_BASE) {
		return API_BASE;
	}

	return "http://localhost:8080";
}

function getSaasTenantId() {
	return localStorage.getItem("tenantId");
}

function isSaasMode() {
	return localStorage.getItem("saasMode") === "true";
}

function requireSaasWorkspace() {
	const tenantId = getSaasTenantId();

	if (!tenantId || !isSaasMode()) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return false;
	}

	return true;
}

async function loadCurrentSaasEnabledModules() {


	if (isSaasSubscriptionPage()) {

		return window.SAAS_ENABLED_MODULES || [];
	}


	const token =
		localStorage.getItem("token");


	const tenantId =
		getSaasTenantId();


	if (
		!tenantId ||
		!isSaasMode()
	) {

		clearSaasEnabledModuleCache();

		return [];
	}


	if (
		!token ||
		token === "undefined" ||
		token === "null"
	) {

		clearSaasEnabledModuleCache();

		console.warn(
			"JWT token not found while loading SaaS modules"
		);

		return [];
	}


	try {

		const response =
			await fetch(
				`${getApiBase()}/saas/tenants/${encodeURIComponent(tenantId)}/modules`,
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
			await safeSaasJson(response);


		if (!response.ok) {

			console.error(
				"Unable to load SaaS enabled modules",
				{
					status:
						response.status,

					statusText:
						response.statusText,

					body:
						result
				}
			);


			clearSaasEnabledModuleCache();

			return [];
		}


		const modules =
			extractEnabledSaasModules(
				result
			);


		window.SAAS_ENABLED_MODULES =
			modules;


		localStorage.setItem(
			"saasEnabledModules",
			JSON.stringify(
				window.SAAS_ENABLED_MODULES
			)
		);


		return window.SAAS_ENABLED_MODULES;


	} catch (error) {

		console.error(
			"Unable to load SaaS enabled modules",
			error
		);


		clearSaasEnabledModuleCache();

		return [];
	}
}
function extractEnabledSaasModules(result) {
	let modules = [];

	if (Array.isArray(result)) {
		modules = result;
	} else if (result && Array.isArray(result.modules)) {
		modules = result.modules;
	} else if (result && Array.isArray(result.enabledModules)) {
		modules = result.enabledModules;
	} else if (result && Array.isArray(result.data)) {
		modules = result.data;
	}

	return modules
		.map(function(moduleItem) {
			if (typeof moduleItem === "string") {
				return String(moduleItem)
					.trim()
					.toUpperCase();
			}

			if (typeof moduleItem === "object" && moduleItem !== null) {
				const enabled =
					moduleItem.enabled === undefined ||
					moduleItem.enabled === true;

				if (!enabled) {
					return null;
				}

				return String(
					moduleItem.module ||
					moduleItem.moduleName ||
					moduleItem.code ||
					moduleItem.name ||
					""
				)
					.trim()
					.toUpperCase();
			}

			return null;
		})
		.filter(function(moduleName) {
			return moduleName;
		});
}

function loadCachedSaasEnabledModulesFromLocalStorage() {
	try {
		const cachedModules =
			localStorage.getItem("saasEnabledModules");

		if (!cachedModules) {
			window.SAAS_ENABLED_MODULES = [];
			return;
		}

		window.SAAS_ENABLED_MODULES =
			extractEnabledSaasModules(
				JSON.parse(cachedModules)
			);

	} catch (error) {
		clearSaasEnabledModuleCache();
	}
}

function isSaasSubscriptionPage() {

	const currentPath =
		String(
			window.location.pathname || ""
		)
			.trim()
			.toLowerCase();

	return (
		currentPath === "/saas/subscription/plans" ||
		currentPath === "/saas/subscription/current"
	);
}

function clearSaasEnabledModuleCache() {
	window.SAAS_ENABLED_MODULES = [];
	localStorage.removeItem("saasEnabledModules");
}

async function loadCurrentSaasPermissions() {

	if (isSaasSubscriptionPage()) {

		return {
			permissions:
				window.SAAS_PERMISSIONS || [],

			memberRole:
				window.SAAS_MEMBER_ROLE || null,

			ownerOrAdmin:
				window.SAAS_OWNER_OR_ADMIN === true
		};
	}


	const token =
		localStorage.getItem("token");


	const tenantId =
		getSaasTenantId();


	if (
		!tenantId ||
		!isSaasMode()
	) {

		clearSaasPermissionCache();

		return null;
	}


	if (
		!token ||
		token === "undefined" ||
		token === "null"
	) {

		clearSaasPermissionCache();

		console.warn(
			"JWT token not found while loading SaaS permissions"
		);

		return null;
	}


	try {

		const response =
			await fetch(
				`${getApiBase()}/saas/permissions/current?tenantId=${encodeURIComponent(tenantId)}`,
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
			await safeSaasJson(response);


		if (!response.ok) {

			console.error(
				"Unable to load SaaS permissions",
				{
					status:
						response.status,

					statusText:
						response.statusText,

					body:
						result
				}
			);


			clearSaasPermissionCache();

			return null;
		}


		const normalizedPermissions =
			normalizeSaasPermissions(
				result.permissions || []
			);


		window.SAAS_PERMISSIONS =
			normalizedPermissions;


		window.SAAS_MEMBER_ROLE =
			result.memberRole || null;


		window.SAAS_OWNER_OR_ADMIN =
			result.ownerOrAdmin === true;


		localStorage.setItem(
			"saasPermissions",
			JSON.stringify(
				window.SAAS_PERMISSIONS
			)
		);


		localStorage.setItem(
			"saasMemberRole",
			window.SAAS_MEMBER_ROLE || ""
		);


		localStorage.setItem(
			"saasOwnerOrAdmin",
			window.SAAS_OWNER_OR_ADMIN
				? "true"
				: "false"
		);


		return {
			permissions:
				window.SAAS_PERMISSIONS,

			memberRole:
				window.SAAS_MEMBER_ROLE,

			ownerOrAdmin:
				window.SAAS_OWNER_OR_ADMIN
		};


	} catch (error) {

		console.error(
			"Unable to load SaaS permissions",
			error
		);


		clearSaasPermissionCache();

		return null;
	}
}

function normalizeSaasPermissions(permissions) {
	if (!Array.isArray(permissions)) {
		return [];
	}

	return permissions
		.map(permission => {
			/*
				Supports backend response format 1:

				{
					"module": "PATIENTS",
					"permissionAction": "VIEW",
					"allowed": true
				}

				Supports backend response format 2:

				"PATIENTS_VIEW"
			*/

			if (typeof permission === "string") {
				const parts = permission.split("_");

				if (parts.length < 2) {
					return null;
				}

				const action = parts.pop();
				const module = parts.join("_");

				return {
					module: module.trim().toUpperCase(),
					permissionAction: action.trim().toUpperCase(),
					allowed: true
				};
			}

			if (typeof permission === "object" && permission !== null) {
				return {
					module: String(permission.module || permission.moduleName || "")
						.trim()
						.toUpperCase(),

					permissionAction: String(
						permission.permissionAction ||
						permission.actionName ||
						permission.action ||
						""
					)
						.trim()
						.toUpperCase(),

					allowed: permission.allowed === true
				};
			}

			return null;
		})
		.filter(permission =>
			permission &&
			permission.module &&
			permission.permissionAction
		);
}

function clearSaasPermissionCache() {
	window.SAAS_PERMISSIONS = [];
	window.SAAS_MEMBER_ROLE = null;
	window.SAAS_OWNER_OR_ADMIN = false;

	localStorage.removeItem("saasPermissions");
	localStorage.removeItem("saasMemberRole");
	localStorage.removeItem("saasOwnerOrAdmin");
}

function loadCachedSaasPermissionsFromLocalStorage() {
	try {
		const cachedPermissions = localStorage.getItem("saasPermissions");
		const cachedMemberRole = localStorage.getItem("saasMemberRole");
		const cachedOwnerOrAdmin = localStorage.getItem("saasOwnerOrAdmin");

		if (cachedPermissions) {
			window.SAAS_PERMISSIONS = normalizeSaasPermissions(JSON.parse(cachedPermissions));
		}

		window.SAAS_MEMBER_ROLE = cachedMemberRole || null;
		window.SAAS_OWNER_OR_ADMIN = cachedOwnerOrAdmin === "true";

	} catch (error) {
		clearSaasPermissionCache();
	}
}

function hasCachedSaasPermission(module, action) {
	if (!isSaasMode()) {
		return true;
	}

	if (window.SAAS_OWNER_OR_ADMIN === true) {
		return true;
	}

	if (!module || !action) {
		return true;
	}

	const requiredModule = String(module).trim().toUpperCase();
	const requiredAction = String(action).trim().toUpperCase();

	return (window.SAAS_PERMISSIONS || []).some(permission =>
		String(permission.module || "").trim().toUpperCase() === requiredModule &&
		String(permission.permissionAction || "").trim().toUpperCase() === requiredAction &&
		permission.allowed === true
	);
}

async function hasSaasPermission(module, action) {
	if (!isSaasMode()) {
		return true;
	}

	if (!getSaasTenantId()) {
		return false;
	}

	if (window.SAAS_OWNER_OR_ADMIN === true) {
		return true;
	}

	if (!window.SAAS_PERMISSIONS || window.SAAS_PERMISSIONS.length === 0) {
		loadCachedSaasPermissionsFromLocalStorage();

		if (!window.SAAS_PERMISSIONS || window.SAAS_PERMISSIONS.length === 0) {
			await loadCurrentSaasPermissions();
		}
	}

	return hasCachedSaasPermission(module, action);
}

async function protectSaasPage(
	module,
	action = "VIEW"
) {
	if (isSaasSubscriptionPage()) {

		return true;
	}


	/*
	 * ============================================================
	 * WORKSPACE REQUIRED
	 * ============================================================
	 */

	if (
		!requireSaasWorkspace()
	) {

		return false;
	}


	/*
	 * ============================================================
	 * LOAD PERMISSIONS + MODULES
	 * ============================================================
	 */

	await Promise.all([
		loadCurrentSaasPermissions(),
		loadCurrentSaasEnabledModules()
	]);


	/*
	 * ============================================================
	 * MODULE CHECK
	 * ============================================================
	 */

	const moduleEnabled =
		isSaasModuleEnabled(
			module
		);


	if (!moduleEnabled) {

		alert(
			"This module is not enabled for the selected workspace."
		);


		window.location.href =
			"/saas/dashboard";


		return false;
	}


	/*
	 * ============================================================
	 * PERMISSION CHECK
	 * ============================================================
	 */

	const allowed =
		hasCachedSaasPermission(
			module,
			action
		);


	if (!allowed) {

		alert(
			"You do not have permission to access this page."
		);


		window.location.href =
			"/saas/dashboard";


		return false;
	}


	return true;
}

async function protectOwnerAdminPage() {
	if (!requireSaasWorkspace()) {
		return false;
	}

	await loadCurrentSaasPermissions();

	if (window.SAAS_OWNER_OR_ADMIN !== true) {
		alert("Only workspace owner/admin can access this page.");
		window.location.href = "/saas/dashboard";
		return false;
	}

	return true;
}

function getCurrentSaasTenantType() {

	return String(
		localStorage.getItem("tenantType") || ""
	)
		.trim()
		.toUpperCase();
}


function getAllowedModulesForTenantType(tenantType) {

	const normalizedType =
		String(tenantType || "")
			.trim()
			.toUpperCase();

	const commonModules = [
		"DASHBOARD",
		"STAFF",
		"REPORTS",
		"NOTIFICATIONS",
		"SETTINGS",
		"PERMISSIONS"
	];

	const moduleMap = {

		DOCTOR_CLINIC: [
			...commonModules,
			"PATIENTS",
			"DOCTOR_AVAILABILITY",
			"APPOINTMENTS",
			"DOCTORS",
			"PRESCRIPTIONS",
			"OPD",
			"BILLING",
			"PAYMENTS"
		],

		HOSPITAL: [
			...commonModules,
			"PATIENTS",
			"DOCTOR_AVAILABILITY",
			"APPOINTMENTS",
			"DOCTORS",
			"PRESCRIPTIONS",
			"OPD",
			"IPD",
			"PHARMACY",
			"INVENTORY",
			"LAB",
			"RADIOLOGY",
			"BILLING",
			"PAYMENTS"
		],

		WHOLESALER: [
			...commonModules,
			"MEDICINE_MASTER",
			"SUPPLIERS",
			"CUSTOMERS",
			"PURCHASES",
			"INVENTORY",
			"SALES",
			"SALES_ORDERS",
			"PURCHASE_RETURNS",
			"SALES_RETURNS",
			"BILLING",
			"PAYMENTS",
			"EXPIRY_MANAGEMENT"
		],

		RETAILER: [
			...commonModules,
			"MEDICINE_MASTER",
			"SUPPLIERS",
			"CUSTOMERS",
			"PURCHASES",
			"INVENTORY",
			"SALES",
			"SALES_ORDERS",
			"PURCHASE_RETURNS",
			"SALES_RETURNS",
			"BILLING",
			"PAYMENTS",
			"EXPIRY_MANAGEMENT"
		]
	};

	return new Set(
		moduleMap[normalizedType] || commonModules
	);
}


function isModuleAllowedForCurrentTenantType(moduleName) {

	const normalizedModule =
		String(moduleName || "")
			.trim()
			.toUpperCase();

	if (!normalizedModule) {
		return false;
	}

	const tenantType =
		getCurrentSaasTenantType();

	const allowedModules =
		getAllowedModulesForTenantType(
			tenantType
		);

	return allowedModules.has(
		normalizedModule
	);
}

async function applySaasPermissionMenu() {

	if (isSaasSubscriptionPage()) {

		console.log(
			"SaaS subscription page detected. " +
			"Skipping SaaS permission/module menu loading."
		);

		return;
	}


	/*
	 * ============================================================
	 * SIDEBAR
	 * ============================================================
	 */

	const sidebar =
		document.getElementById(
			"saasSidebar"
		) ||
		document.getElementById(
			"sidebar"
		);


	if (!sidebar) {
		return;
	}


	/*
	 * ============================================================
	 * SaaS MODE / WORKSPACE
	 * ============================================================
	 */

	if (
		!isSaasMode() ||
		!getSaasTenantId()
	) {

		sidebar.style.display =
			"none";

		return;
	}


	sidebar.style.display =
		"";


	/*
	 * ============================================================
	 * LOAD CURRENT SAAS PERMISSION + MODULES
	 * ============================================================
	 *
	 * Ye sirf normal SaaS application pages par chalega.
	 */

	await Promise.all([
		loadCurrentSaasPermissions(),
		loadCurrentSaasEnabledModules()
	]);


	/*
	 * ============================================================
	 * MENU ITEMS
	 * ============================================================
	 */

	const menuItems =
		sidebar.querySelectorAll(
			"[data-saas-module], [data-saas]"
		);


	menuItems.forEach(
		function(item) {

			/*
			 * Sabse pehle hide.
			 */
			item.style.display =
				"none";


			/*
			 * Module
			 */
			const moduleName =
				String(
					item.getAttribute(
						"data-saas-module"
					) ||
					item.getAttribute(
						"data-saas"
					) ||
					""
				)
					.trim()
					.toUpperCase();


			if (!moduleName) {
				return;
			}


			/*
			 * Action
			 */
			const action =
				String(
					item.getAttribute(
						"data-saas-action"
					) ||
					item.getAttribute(
						"data-action"
					) ||
					"VIEW"
				)
					.trim()
					.toUpperCase();


			/*
			 * Owner/Admin only
			 */
			const ownerOnly =
				item.getAttribute(
					"data-owner-admin"
				) === "true";


			if (
				ownerOnly &&
				!window.SAAS_OWNER_OR_ADMIN
			) {

				return;
			}


			/*
			 * ====================================================
			 * TENANT TYPE CHECK
			 * ====================================================
			 */

			if (
				!isModuleAllowedForCurrentTenantType(
					moduleName
				)
			) {

				return;
			}


			/*
			 * ====================================================
			 * ENABLED MODULE CHECK
			 * ====================================================
			 */

			if (
				!isSaasModuleEnabled(
					moduleName
				)
			) {

				return;
			}


			/*
			 * ====================================================
			 * PERMISSION CHECK
			 * ====================================================
			 */

			if (
				!hasCachedSaasPermission(
					moduleName,
					action
				)
			) {

				return;
			}


			/*
			 * ====================================================
			 * SHOW
			 * ====================================================
			 */

			item.style.display =
				"";
		}
	);


	/*
	 * ============================================================
	 * SECTION VISIBILITY
	 * ============================================================
	 */

	updateSaasSidebarSectionVisibility();


	/*
	 * ============================================================
	 * WORKSPACE DETAILS
	 * ============================================================
	 */

	updateSaasSidebarWorkspaceDetails();
}

function openBillingPage(event) {

	if (event) {
		event.preventDefault();
	}

	const tenantType = (
		localStorage.getItem("tenantType") || ""
	).trim().toUpperCase();

	console.log("Opening Billing Page for tenantType:", tenantType);

	switch (tenantType) {

		case "DOCTOR_CLINIC":
			window.location.href = "/saas/doctor/billing";
			break;

		case "HOSPITAL":
			window.location.href = "/saas/hospital/billing";
			break;

		case "WHOLESALER":
			window.location.href = "/saas/wholesaler/billing";
			break;

		case "RETAILER":
			window.location.href = "/saas/retailer/billing";
			break;

		default:
			alert("Invalid SaaS workspace type.");
			window.location.href = "/saas/dashboard";
			break;
	}
}

function updateSaasSidebarWorkspaceDetails() {

	const tenantName =
		localStorage.getItem("tenantName") ||
		"Private Workspace";

	const tenantType =
		getCurrentSaasTenantType();

	const nameElement =
		document.getElementById(
			"sidebarTenantName"
		);

	const typeElement =
		document.getElementById(
			"sidebarWorkspaceType"
		);

	const iconElement =
		document.getElementById(
			"sidebarWorkspaceIcon"
		);

	if (nameElement) {
		nameElement.innerText =
			tenantName;
	}

	if (typeElement) {

		switch (tenantType) {

			case "DOCTOR_CLINIC":
				typeElement.innerText =
					"Doctor Clinic";
				break;

			case "HOSPITAL":
				typeElement.innerText =
					"Hospital Workspace";
				break;

			case "WHOLESALER":
				typeElement.innerText =
					"Wholesale Workspace";
				break;

			case "RETAILER":
				typeElement.innerText =
					"Retail Pharmacy";
				break;

			default:
				typeElement.innerText =
					"SaaS Workspace";
		}
	}

	if (!iconElement) {
		return;
	}

	switch (tenantType) {

		case "DOCTOR_CLINIC":
			iconElement.className =
				"bi bi-heart-pulse-fill";
			break;

		case "HOSPITAL":
			iconElement.className =
				"bi bi-hospital-fill";
			break;

		case "WHOLESALER":
			iconElement.className =
				"bi bi-box-seam-fill";
			break;

		case "RETAILER":
			iconElement.className =
				"bi bi-shop-window";
			break;

		default:
			iconElement.className =
				"bi bi-building-gear";
	}
}

function updateSaasSidebarSectionVisibility() {

	const sidebar =
		document.getElementById("saasSidebar") ||
		document.getElementById("sidebar");

	if (!sidebar) {
		return;
	}

	const children =
		Array.from(
			sidebar.children
		);

	children.forEach(
		function(sectionTitle, index) {

			if (
				!sectionTitle.hasAttribute(
					"data-sidebar-section-title"
				)
			) {
				return;
			}

			let visibleLinkFound =
				false;

			for (
				let nextIndex = index + 1;
				nextIndex < children.length;
				nextIndex++
			) {

				const nextElement =
					children[nextIndex];

				if (
					nextElement.hasAttribute(
						"data-sidebar-section-title"
					)
				) {
					break;
				}

				const isModuleLink =
					nextElement.matches(
						"a[data-saas-module], a[data-saas]"
					);

				if (
					isModuleLink &&
					!isElementHidden(nextElement)
				) {
					visibleLinkFound =
						true;

					break;
				}
			}

			sectionTitle.style.display =
				visibleLinkFound
					? ""
					: "none";
		}
	);
}

function isElementHidden(element) {
	if (!element) {
		return true;
	}

	return (
		element.style.display === "none" ||
		window.getComputedStyle(element).display === "none"
	);
}

async function safeSaasJson(response) {
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

function showOrHideById(elementId, allowed) {
	const element = document.getElementById(elementId);

	if (element) {
		element.style.display = allowed ? "" : "none";
	}
}

function showOrHideByClass(className, allowed) {
	document.querySelectorAll("." + className).forEach(element => {
		element.style.display = allowed ? "" : "none";
	});
}

function disableByClass(className, disabled) {
	document.querySelectorAll("." + className).forEach(element => {
		element.disabled = disabled;
	});
}


/* ===========================================================
   COMMON SAAS MODAL FORM ALERT
   MediRevolution
=========================================================== */

/**
 * Get the alert container belonging to the current modal.
 *
 * Pass the modal element or any element inside the modal.
 */
function getModalFormAlertContainer(
	modalElement
) {

	if (!modalElement) {
		return null;
	}

	/*
	 * If the supplied element itself is the modal.
	 */
	if (
		modalElement.classList &&
		modalElement.classList.contains("modal")
	) {

		return modalElement.querySelector(
			".common-modal-form-alert"
		);
	}

	/*
	 * Otherwise find the nearest modal.
	 */
	const modal =
		modalElement.closest
			? modalElement.closest(".modal")
			: null;

	if (!modal) {
		return null;
	}

	return modal.querySelector(
		".common-modal-form-alert"
	);
}


/**
 * Show an alert inside a specific modal.
 *
 * Usage:
 *
 * showModalFormAlert(
 *     saleModalElement,
 *     "Customer is required.",
 *     "danger"
 * );
 */
function showModalFormAlert(
	modalElement,
	message,
	type = "danger"
) {

	const alertBox =
		getModalFormAlertContainer(
			modalElement
		);

	if (!alertBox) {

		if (typeof showMsg === "function") {

			showMsg(
				message,
				type
			);

		} else {

			alert(message);
		}

		return;
	}

	const alertMessage =
		alertBox.querySelector(
			".common-modal-form-alert-message"
		);

	const alertIcon =
		alertBox.querySelector(
			".common-modal-form-alert-icon"
		);

	/*
	 * Remove previous Bootstrap alert classes.
	 */
	alertBox.classList.remove(
		"alert-danger",
		"alert-success",
		"alert-warning",
		"alert-info",
		"alert-primary",
		"alert-secondary"
	);

	/*
	 * Add current alert type.
	 */
	alertBox.classList.add(
		`alert-${type}`
	);

	/*
	 * Set message safely.
	 */
	if (alertMessage) {

		alertMessage.textContent =
			message ||
			"Something went wrong.";
	}

	/*
	 * Change icon according to message type.
	 */
	if (alertIcon) {

		alertIcon.className =
			getModalFormAlertIcon(
				type
			);
	}

	/*
	 * Show alert.
	 */
	alertBox.classList.remove(
		"d-none"
	);

	/*
	 * Scroll alert into visible area.
	 */
	try {

		alertBox.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});

	} catch (error) {

		/*
		 * Ignore scroll error.
		 */
	}
}


/**
 * Hide alert inside a specific modal.
 */
function hideModalFormAlert(
	modalElement
) {

	const alertBox =
		getModalFormAlertContainer(
			modalElement
		);

	if (!alertBox) {
		return;
	}

	alertBox.classList.add(
		"d-none"
	);

	const alertMessage =
		alertBox.querySelector(
			".common-modal-form-alert-message"
		);

	if (alertMessage) {

		alertMessage.textContent =
			"";
	}

	alertBox.classList.remove(
		"alert-danger",
		"alert-success",
		"alert-warning",
		"alert-info",
		"alert-primary",
		"alert-secondary"
	);
}


/**
 * Error shortcut.
 */
function showModalFormError(modalElement, message) {

	if (!modalElement) {
		alert(message || "Something went wrong.");
		return;
	}

	let errorBox =
		modalElement.querySelector(
			".modal-form-error"
		);

	if (!errorBox) {

		errorBox =
			document.createElement("div");

		errorBox.className =
			"alert alert-danger modal-form-error mb-3";

		const modalBody =
			modalElement.querySelector(
				".modal-body"
			);

		if (modalBody) {
			modalBody.prepend(errorBox);
		} else {
			modalElement.prepend(errorBox);
		}
	}

	window.clearTimeout(
		errorBox._hideTimer
	);

	errorBox.textContent =
		message ||
		"Something went wrong.";

	errorBox.style.display = "block";

	errorBox._hideTimer =
		window.setTimeout(
			function() {
				errorBox.style.display = "none";
			},
			5000
		);
}

/**
 * Success shortcut.
 */
function showModalFormSuccess(
	modalElement,
	message
) {

	showModalFormAlert(
		modalElement,
		message,
		"success"
	);
}


/**
 * Warning shortcut.
 */
function showModalFormWarning(
	modalElement,
	message
) {

	showModalFormAlert(
		modalElement,
		message,
		"warning"
	);
}


/**
 * Information shortcut.
 */
function showModalFormInfo(
	modalElement,
	message
) {

	showModalFormAlert(
		modalElement,
		message,
		"info"
	);
}


/**
 * Alert icon helper.
 */
function getModalFormAlertIcon(
	type
) {

	switch (
	String(type || "")
		.toLowerCase()
	) {

		case "success":

			return "common-modal-form-alert-icon bi bi-check-circle-fill";

		case "warning":

			return "common-modal-form-alert-icon bi bi-exclamation-triangle-fill";

		case "info":

			return "common-modal-form-alert-icon bi bi-info-circle-fill";

		case "primary":

			return "common-modal-form-alert-icon bi bi-info-circle-fill";

		default:

			return "common-modal-form-alert-icon bi bi-exclamation-triangle-fill";
	}
}

function clearModalFormError(modalElement) {

	if (!modalElement) {
		return;
	}

	const errorBox =
		modalElement.querySelector(
			".modal-form-error"
		);

	if (!errorBox) {
		return;
	}

	window.clearTimeout(
		errorBox._hideTimer
	);

	errorBox._hideTimer = null;

	errorBox.remove();
}