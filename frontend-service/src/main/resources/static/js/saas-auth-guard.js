window.SAAS_PERMISSIONS = window.SAAS_PERMISSIONS || [];
window.SAAS_MEMBER_ROLE = window.SAAS_MEMBER_ROLE || null;
window.SAAS_OWNER_OR_ADMIN = window.SAAS_OWNER_OR_ADMIN || false;
window.SAAS_ENABLED_MODULES = window.SAAS_ENABLED_MODULES || [];



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
	const token = localStorage.getItem("token");
	const tenantId = getSaasTenantId();

	if (!tenantId || !isSaasMode()) {
		clearSaasEnabledModuleCache();
		return [];
	}

	if (!token || token === "undefined" || token === "null") {
		clearSaasEnabledModuleCache();
		console.warn("JWT token not found while loading SaaS modules");
		return [];
	}

	try {
		const response = await fetch(
			`${getApiBase()}/saas/tenants/${encodeURIComponent(tenantId)}/modules`,
			{
				method: "GET",
				headers: {
					"Authorization": "Bearer " + token
				}
			}
		);

		const result = await safeSaasJson(response);

		if (!response.ok) {
			console.error("Unable to load SaaS enabled modules", {
				status: response.status,
				statusText: response.statusText,
				body: result
			});

			clearSaasEnabledModuleCache();
			return [];
		}

		const modules = extractEnabledSaasModules(result);

		window.SAAS_ENABLED_MODULES = modules;

		localStorage.setItem(
			"saasEnabledModules",
			JSON.stringify(window.SAAS_ENABLED_MODULES)
		);

		return window.SAAS_ENABLED_MODULES;

	} catch (error) {
		console.error("Unable to load SaaS enabled modules", error);

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

function clearSaasEnabledModuleCache() {
	window.SAAS_ENABLED_MODULES = [];
	localStorage.removeItem("saasEnabledModules");
}

function isSaasModuleEnabled(module) {
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

	/*
	 * Owner/Admin permission bypass sirf permission ke liye hai.
	 * Tenant type ke enabled modules ko kabhi bypass nahi kiya jayega.
	 * SETTINGS aur PERMISSIONS owner/admin-only modules hain.
	 */
	if (
		requiredModule === "SETTINGS" ||
		requiredModule === "PERMISSIONS"
	) {
		return window.SAAS_OWNER_OR_ADMIN === true;
	}

	return (window.SAAS_ENABLED_MODULES || [])
		.some(function(enabledModule) {
			return String(enabledModule)
				.trim()
				.toUpperCase() === requiredModule;
		});
}

async function loadCurrentSaasPermissions() {
	const token = localStorage.getItem("token");
	const tenantId = getSaasTenantId();

	if (!tenantId || !isSaasMode()) {
		clearSaasPermissionCache();
		return null;
	}

	if (!token || token === "undefined" || token === "null") {
		clearSaasPermissionCache();
		console.warn("JWT token not found while loading SaaS permissions");
		return null;
	}

	try {
		const response = await fetch(
			`${getApiBase()}/saas/permissions/current?tenantId=${encodeURIComponent(tenantId)}`,
			{
				method: "GET",
				headers: {
					"Authorization": "Bearer " + token
				}
			}
		);

		const result = await safeSaasJson(response);

		if (!response.ok) {
			console.error("Unable to load SaaS permissions", {
				status: response.status,
				statusText: response.statusText,
				body: result
			});

			clearSaasPermissionCache();
			return null;
		}

		const normalizedPermissions = normalizeSaasPermissions(result.permissions || []);

		window.SAAS_PERMISSIONS = normalizedPermissions;
		window.SAAS_MEMBER_ROLE = result.memberRole || null;
		window.SAAS_OWNER_OR_ADMIN = result.ownerOrAdmin === true;

		localStorage.setItem("saasPermissions", JSON.stringify(window.SAAS_PERMISSIONS));
		localStorage.setItem("saasMemberRole", window.SAAS_MEMBER_ROLE || "");
		localStorage.setItem("saasOwnerOrAdmin", window.SAAS_OWNER_OR_ADMIN ? "true" : "false");

		return {
			permissions: window.SAAS_PERMISSIONS,
			memberRole: window.SAAS_MEMBER_ROLE,
			ownerOrAdmin: window.SAAS_OWNER_OR_ADMIN
		};

	} catch (error) {
		console.error("Unable to load SaaS permissions", error);
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

async function protectSaasPage(module, action = "VIEW") {
	if (!requireSaasWorkspace()) {
		return false;
	}

	await Promise.all([
		loadCurrentSaasPermissions(),
		loadCurrentSaasEnabledModules()
	]);

	const moduleEnabled =
		isSaasModuleEnabled(module);

	if (!moduleEnabled) {
		alert(
			"This module is not enabled for the selected workspace."
		);

		window.location.href =
			"/saas/dashboard";

		return false;
	}

	const allowed =
		hasCachedSaasPermission(module, action);

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

	const sidebar =
		document.getElementById("saasSidebar") ||
		document.getElementById("sidebar");

	if (!sidebar) {
		return;
	}

	if (
		!isSaasMode() ||
		!getSaasTenantId()
	) {
		sidebar.style.display = "none";
		return;
	}

	/*
	 * API complete hone se pehle SaaS module links hide rahenge.
	 * Isse incorrect modules ka flash nahi dikhega.
	 */
	sidebar
		.querySelectorAll(
			"[data-saas-module], [data-saas]"
		)
		.forEach(function(link) {
			link.style.display = "none";
		});

	sidebar.style.display = "";

	await Promise.all([
		loadCurrentSaasPermissions(),
		loadCurrentSaasEnabledModules()
	]);

	sidebar
		.querySelectorAll(
			"[data-saas-module], [data-saas]"
		)
		.forEach(function(link) {

			const moduleName =
				link.getAttribute(
					"data-saas-module"
				) ||
				link.getAttribute(
					"data-saas"
				) ||
				"";

			const action =
				link.getAttribute(
					"data-saas-action"
				) ||
				link.getAttribute(
					"data-action"
				) ||
				"VIEW";

			const ownerAdminOnly =
				link.getAttribute(
					"data-owner-admin"
				) === "true";

			const tenantTypeAllowed =
				isModuleAllowedForCurrentTenantType(
					moduleName
				);

			const moduleEnabled =
				isSaasModuleEnabled(
					moduleName
				);

			let permissionAllowed =
				hasCachedSaasPermission(
					moduleName,
					action
				);

			if (
				ownerAdminOnly &&
				window.SAAS_OWNER_OR_ADMIN !== true
			) {
				permissionAllowed = false;
			}

			/*
			 * Final visibility:
			 *
			 * 1. Selected tenant type module support karta ho
			 * 2. Backend enabled modules me module available ho
			 * 3. User ke paas required permission ho
			 */
			const visible =
				tenantTypeAllowed &&
				moduleEnabled &&
				permissionAllowed;

			link.style.display =
				visible ? "" : "none";
		});

	updateSaasSidebarSectionVisibility();

	updateSaasSidebarWorkspaceDetails();
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