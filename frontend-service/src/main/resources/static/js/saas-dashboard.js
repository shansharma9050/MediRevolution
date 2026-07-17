const API_BASE =
	"http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let visibleDashboardModules = [];

let enabledWorkspaceModules =
	new Set();

let selectedDashboardTenantType = "";

let isLoadingSaasDashboard = false;
let isResolvingDashboardTenant = false;


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		if (!protectSaasDashboardPage()) {
			return;
		}

		setSaasMode();

		if (
			typeof requireSaasWorkspace ===
			"function"
		) {

			if (!requireSaasWorkspace()) {
				return;
			}

		} else {

			const tenantId =
				localStorage.getItem(
					"tenantId"
				);

			if (!tenantId) {

				window.location.replace(
					"/saas/workspaces"
				);

				return;
			}
		}

		selectedDashboardTenantType =
			await resolveDashboardTenantType();

		if (
			typeof loadCurrentSaasPermissions ===
			"function"
		) {

			await loadCurrentSaasPermissions();
		}

		initializeSaasShell();

		updateDashboardForTenantType(
			selectedDashboardTenantType
		);

		updateWorkspaceAccessLevel();

		await Promise.all([
			loadSaasDashboard(),
			loadSaasNotificationCount()
		]);

		markActiveSaasSidebarLink();

		hideSaasEntryOverlay();
	}
);


function protectSaasDashboardPage() {

	const token =
		localStorage.getItem("token");

	if (!token) {

		window.location.replace("/");

		return false;
	}

	const activeModule =
		localStorage.getItem(
			"activeModule"
		);

	if (
		activeModule &&
		activeModule !== "SAAS"
	) {

		window.location.replace(
			"/module-selection"
		);

		return false;
	}

	return true;
}


function setSaasMode() {

	localStorage.setItem(
		"activeModule",
		"SAAS"
	);

	localStorage.setItem(
		"saasMode",
		"true"
	);
}


async function resolveDashboardTenantType() {

	const storedTenantType =
		normalizeTenantType(
			localStorage.getItem(
				"tenantType"
			)
		);

	if (storedTenantType) {
		return storedTenantType;
	}

	if (isResolvingDashboardTenant) {
		return "";
	}

	isResolvingDashboardTenant = true;

	const tenantId =
		localStorage.getItem("tenantId");

	const token =
		localStorage.getItem("token");

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

		if (
			result.tenantName &&
			!localStorage.getItem("tenantName")
		) {

			localStorage.setItem(
				"tenantName",
				result.tenantName
			);
		}

		return tenantType;

	} catch (error) {

		console.error(
			"Resolve workspace type error:",
			error
		);

		showMsg(
			"Unable to load workspace details."
		);

		return "";

	} finally {

		isResolvingDashboardTenant = false;
	}
}


function normalizeTenantType(value) {

	return String(value || "")
		.trim()
		.toUpperCase();
}


function initializeSaasShell() {

	const tenantName =
		localStorage.getItem(
			"tenantName"
		) || "Workspace";

	setText(
		"tenantNameText",
		tenantName
	);

	setText(
		"heroWorkspaceName",
		tenantName
	);

	setText(
		"navbarTenantName",
		tenantName
	);

	setText(
		"sidebarTenantName",
		tenantName
	);
}


function updateDashboardForTenantType(
	tenantType
) {

	const normalizedType =
		normalizeTenantType(
			tenantType
		);

	const config =
		getTenantDashboardConfig(
			normalizedType
		);

	setText(
		"dashboardKickerText",
		config.kicker
	);

	setText(
		"dashboardHeroDescription",
		config.description
	);

	setText(
		"heroWorkspaceType",
		config.typeLabel
	);

	setText(
		"dashboardWorkspaceType",
		config.typeLabel
	);

	setText(
		"workspaceModulesHeading",
		config.modulesHeading
	);

	setText(
		"moduleEntryText",
		config.entryText
	);

	setText(
		"sidebarWorkspaceType",
		config.sidebarTitle
	);

	setElementIcon(
		"dashboardKickerIcon",
		config.kickerIcon
	);

	setElementIcon(
		"dashboardWorkspaceIcon",
		config.workspaceIcon
	);

	setElementIcon(
		"sidebarWorkspaceIcon",
		config.workspaceIcon
	);
}


function getTenantDashboardConfig(
	tenantType
) {

	switch (tenantType) {

		case "DOCTOR_CLINIC":

			return {
				kicker:
					"Private Doctor Clinic Workspace",

				description:
					"Manage patients, appointments, prescriptions, billing and daily clinic operations from one secure workspace.",

				typeLabel:
					"Doctor Clinic",

				modulesHeading:
					"Clinic Modules",

				entryText:
					"Opening Doctor Clinic Workspace",

				sidebarTitle:
					"Doctor Clinic",

				kickerIcon:
					"bi bi-heart-pulse-fill",

				workspaceIcon:
					"bi bi-heart-pulse-fill"
			};

		case "HOSPITAL":

			return {
				kicker:
					"Private Hospital Workspace",

				description:
					"Manage clinical, operational, pharmacy, laboratory, billing and administrative hospital workflows.",

				typeLabel:
					"Hospital",

				modulesHeading:
					"Hospital Modules",

				entryText:
					"Opening Hospital Workspace",

				sidebarTitle:
					"Hospital Workspace",

				kickerIcon:
					"bi bi-hospital-fill",

				workspaceIcon:
					"bi bi-hospital-fill"
			};

		case "WHOLESALER":

			return {
				kicker:
					"Medicine Wholesale Workspace",

				description:
					"Manage medicines, suppliers, purchases, warehouse inventory, customers, sales orders, returns, billing and payments.",

				typeLabel:
					"Wholesaler",

				modulesHeading:
					"Wholesale Business Modules",

				entryText:
					"Opening Wholesale Workspace",

				sidebarTitle:
					"Wholesale Business",

				kickerIcon:
					"bi bi-box-seam-fill",

				workspaceIcon:
					"bi bi-box-seam-fill"
			};

		case "RETAILER":

			return {
				kicker:
					"Retail Pharmacy Workspace",

				description:
					"Manage retail pharmacy purchases, medicine inventory, customers, counter sales, billing, payments and expiry control.",

				typeLabel:
					"Retailer",

				modulesHeading:
					"Retail Pharmacy Modules",

				entryText:
					"Opening Retail Pharmacy Workspace",

				sidebarTitle:
					"Retail Pharmacy",

				kickerIcon:
					"bi bi-shop-window",

				workspaceIcon:
					"bi bi-shop-window"
			};

		default:

			return {
				kicker:
					"Private SaaS Workspace",

				description:
					"Manage organization operations securely using permission-based workspace modules.",

				typeLabel:
					"Workspace",

				modulesHeading:
					"Workspace Modules",

				entryText:
					"Opening Private SaaS Workspace",

				sidebarTitle:
					"SaaS Workspace",

				kickerIcon:
					"bi bi-building-gear",

				workspaceIcon:
					"bi bi-buildings-fill"
			};
	}
}


function setElementIcon(
	elementId,
	iconClass
) {

	const element =
		document.getElementById(
			elementId
		);

	if (!element) {
		return;
	}

	element.className =
		iconClass;
}


function updateWorkspaceAccessLevel() {

	const element =
		document.getElementById(
			"workspaceAccessLevel"
		);

	if (!element) {
		return;
	}

	const memberRole =
		String(
			localStorage.getItem(
				"saasMemberRole"
			) || ""
		)
			.trim()
			.toUpperCase();

	if (
		window.SAAS_OWNER_OR_ADMIN === true
	) {

		element.textContent =
			memberRole === "OWNER"
				? "Owner"
				: "Admin";

		return;
	}

	element.textContent =
		formatModuleName(
			memberRole || "MEMBER"
		);
}


async function loadSaasDashboard() {

	if (isLoadingSaasDashboard) {
		return;
	}

	isLoadingSaasDashboard = true;

	const tenantId =
		localStorage.getItem("tenantId");

	const token =
		localStorage.getItem("token");

	showModulesLoadingState();

	try {

		const response = await fetch(
			`${API_BASE}/saas/tenants/${encodeURIComponent(tenantId)}/modules`,
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

		const responseBody =
			await safeJson(response);

		if (!response.ok) {

			const message =
				getApiErrorMessage(
					responseBody,
					"Unable to load workspace modules."
				);

			showMsg(message);

			showModulesErrorState(
				message
			);

			setAnimatedNumber(
				"availableModuleCount",
				0
			);

			enabledWorkspaceModules =
				new Set();

			applySaasSidebarVisibility();

			return;
		}

		const modules =
			Array.isArray(responseBody)
				? responseBody
				: [];

		updateEnabledWorkspaceModules(
			modules
		);

		renderModules(
			modules
		);

		applySaasSidebarVisibility();

	} catch (error) {

		console.error(
			"Load SaaS dashboard error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

		showModulesErrorState(
			"SaaS workspace service is currently unavailable."
		);

		setAnimatedNumber(
			"availableModuleCount",
			0
		);

		enabledWorkspaceModules =
			new Set();

		applySaasSidebarVisibility();

	} finally {

		isLoadingSaasDashboard = false;
	}
}


function updateEnabledWorkspaceModules(
	modules
) {

	enabledWorkspaceModules =
		new Set(
			modules
				.filter(
					function(item) {

						return (
							item &&
							item.enabled === true
						);
					}
				)
				.map(
					function(item) {

						return normalizeModuleName(
							getModuleName(item)
						);
					}
				)
				.filter(Boolean)
		);
}


function renderModules(modules) {

	const container =
		document.getElementById(
			"moduleContainer"
		);

	if (!container) {
		return;
	}

	const enabledModules =
		modules.filter(
			function(item) {

				return (
					item &&
					item.enabled === true
				);
			}
		);

	visibleDashboardModules =
		enabledModules.filter(
			function(item) {

				const moduleName =
					normalizeModuleName(
						getModuleName(item)
					);

				if (!moduleName) {
					return false;
				}

				if (
					(
						moduleName === "SETTINGS" ||
						moduleName === "PERMISSIONS"
					) &&
					window.SAAS_OWNER_OR_ADMIN !== true
				) {
					return false;
				}

				if (
					typeof hasCachedSaasPermission ===
					"function"
				) {

					return hasCachedSaasPermission(
						moduleName,
						"VIEW"
					);
				}

				return true;
			}
		);

	visibleDashboardModules.sort(
		function(first, second) {

			return (
				getModuleSortOrder(
					getModuleName(first)
				) -
				getModuleSortOrder(
					getModuleName(second)
				)
			);
		}
	);

	setAnimatedNumber(
		"availableModuleCount",
		visibleDashboardModules.length
	);

	if (
		visibleDashboardModules.length === 0
	) {

		container.innerHTML = `
			<div class="col-12">

				<div class="empty-saas-modules-card">

					<div class="empty-module-icon">
						<i class="bi bi-grid"></i>
					</div>

					<h4 class="text-primary fw-bold">
						No Modules Available
					</h4>

					<p class="text-muted mb-0">
						No modules are enabled or permitted
						for this workspace.
					</p>

				</div>

			</div>
		`;

		return;
	}

	container.innerHTML =
		visibleDashboardModules
			.map(
				function(item, index) {

					const module =
						normalizeModuleName(
							getModuleName(item)
						);

					const description =
						getModuleDescription(
							module
						);

					const moduleUrl =
						getModuleUrl(
							module
						);

					return `
						<div class="col-xl-3 col-lg-4 col-md-6">

							<article class="saas-module-card"
									 style="--module-delay:${Math.min(index * 70, 700)}ms">

								<div class="saas-module-card-glow"></div>

								<div class="saas-module-top">

									<div class="saas-module-icon">
										${getModuleIcon(module)}
									</div>

									<span class="saas-module-status">
										Active
									</span>

								</div>

								<h5>
									${escapeHtml(
						formatModuleName(module)
					)}
								</h5>

								<p>
									${escapeHtml(description)}
								</p>

								<a href="${escapeAttribute(moduleUrl)}"
								   class="saas-module-open-button">

									<span>
										Open Module
									</span>

									<i class="bi bi-arrow-up-right"></i>

								</a>

							</article>

						</div>
					`;
				}
			)
			.join("");
}


function applySaasSidebarVisibility() {

	document
		.querySelectorAll(
			"#saasSidebar [data-saas-module]"
		)
		.forEach(
			function(item) {

				const moduleName =
					normalizeModuleName(
						item.dataset.saasModule
					);

				const action =
					item.dataset.saasAction ||
					"VIEW";

				let visible =
					enabledWorkspaceModules.has(
						moduleName
					);

				if (
					visible &&
					(
						moduleName === "SETTINGS" ||
						moduleName === "PERMISSIONS"
					) &&
					window.SAAS_OWNER_OR_ADMIN !== true
				) {

					visible = false;
				}

				if (
					visible &&
					typeof hasCachedSaasPermission ===
					"function"
				) {

					visible =
						hasCachedSaasPermission(
							moduleName,
							action
						);
				}

				item.style.display =
					visible
						? ""
						: "none";
			}
		);

	hideEmptySidebarSections();
}


function hideEmptySidebarSections() {

	const sidebar =
		document.getElementById(
			"saasSidebar"
		);

	if (!sidebar) {
		return;
	}

	const titles =
		Array.from(
			sidebar.querySelectorAll(
				"[data-sidebar-section-title]"
			)
		);

	titles.forEach(
		function(title) {

			let currentElement =
				title.nextElementSibling;

			let hasVisibleItem =
				false;

			while (
				currentElement &&
				!currentElement.matches(
					"[data-sidebar-section-title]"
				)
			) {

				const isNavigationItem =
					currentElement.matches(
						"a[data-saas-module]"
					);

				const isVisible =
					currentElement.style.display !==
					"none";

				if (
					isNavigationItem &&
					isVisible
				) {

					hasVisibleItem = true;

					break;
				}

				currentElement =
					currentElement.nextElementSibling;
			}

			title.style.display =
				hasVisibleItem
					? ""
					: "none";
		}
	);
}


function markActiveSaasSidebarLink() {

	const currentPath =
		window.location.pathname;

	document
		.querySelectorAll(
			"#saasSidebar a[href]"
		)
		.forEach(
			function(link) {

				const href =
					link.getAttribute(
						"href"
					);

				if (!href) {
					return;
				}

				link.classList.remove(
					"active"
				);

				if (
					currentPath === href ||
					(
						href !== "/saas/dashboard" &&
						currentPath.startsWith(href)
					)
				) {

					link.classList.add(
						"active"
					);
				}
			}
		);
}


async function loadSaasNotificationCount() {

	const tenantId =
		localStorage.getItem("tenantId");

	const token =
		localStorage.getItem("token");

	const badge =
		document.getElementById(
			"saasNotificationCount"
		);

	const dashboardCount =
		document.getElementById(
			"dashboardNotificationCount"
		);

	if (
		!tenantId ||
		!token
	) {
		return;
	}

	try {

		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response = await fetch(
			`${API_BASE}/saas/notifications/count?${query.toString()}`,
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

		if (!response.ok) {
			return;
		}

		const result =
			await safeJson(response);

		const count =
			Number(
				typeof result === "number"
					? result
					: result.count
			) || 0;

		if (badge) {

			badge.textContent =
				count;

			badge.style.display =
				count > 0
					? "inline-block"
					: "none";
		}

		if (dashboardCount) {

			setAnimatedNumber(
				"dashboardNotificationCount",
				count
			);
		}

	} catch (error) {

		console.log(
			"SaaS notification count unavailable"
		);
	}
}


function getModuleName(item) {

	if (!item) {
		return "";
	}

	if (
		typeof item === "string"
	) {
		return item;
	}

	return (
		item.module ||
		item.moduleName ||
		item.name ||
		""
	);
}


function normalizeModuleName(value) {

	return String(value || "")
		.trim()
		.toUpperCase()
		.replace(/\s+/g, "_");
}


function getModuleSortOrder(module) {

	const moduleName =
		normalizeModuleName(
			module
		);

	const order = [
		"DASHBOARD",

		"PATIENTS",
		"DOCTOR_AVAILABILITY",
		"APPOINTMENTS",
		"DOCTORS",
		"PRESCRIPTIONS",
		"OPD",
		"IPD",
		"PHARMACY",
		"LAB",
		"RADIOLOGY",

		"MEDICINE_MASTER",
		"SUPPLIERS",
		"CUSTOMERS",
		"PURCHASES",
		"INVENTORY",
		"SALES",
		"SALES_ORDERS",
		"PURCHASE_RETURNS",
		"SALES_RETURNS",
		"EXPIRY_MANAGEMENT",

		"BILLING",
		"PAYMENTS",
		"REPORTS",

		"STAFF",
		"NOTIFICATIONS",
		"SETTINGS",
		"PERMISSIONS"
	];

	const index =
		order.indexOf(
			moduleName
		);

	return index === -1
		? 999
		: index;
}


function getModuleIcon(module) {

	const icons = {

		DASHBOARD:
			'<i class="bi bi-grid-fill"></i>',

		PATIENTS:
			'<i class="bi bi-person-vcard-fill"></i>',

		APPOINTMENTS:
			'<i class="bi bi-calendar-check-fill"></i>',

		DOCTOR_AVAILABILITY:
			'<i class="bi bi-clock-fill"></i>',

		DOCTORS:
			'<i class="bi bi-person-badge-fill"></i>',

		STAFF:
			'<i class="bi bi-people-fill"></i>',

		PRESCRIPTIONS:
			'<i class="bi bi-file-medical-fill"></i>',

		OPD:
			'<i class="bi bi-hospital-fill"></i>',

		IPD:
			'<i class="bi bi-bed-fill"></i>',

		BILLING:
			'<i class="bi bi-receipt-cutoff"></i>',

		PHARMACY:
			'<i class="bi bi-capsule-pill"></i>',

		INVENTORY:
			'<i class="bi bi-box-seam-fill"></i>',

		LAB:
			'<i class="bi bi-droplet-half"></i>',

		RADIOLOGY:
			'<i class="bi bi-radioactive"></i>',

		REPORTS:
			'<i class="bi bi-bar-chart-line-fill"></i>',

		NOTIFICATIONS:
			'<i class="bi bi-bell-fill"></i>',

		SETTINGS:
			'<i class="bi bi-gear-fill"></i>',

		PERMISSIONS:
			'<i class="bi bi-shield-lock-fill"></i>',

		MEDICINE_MASTER:
			'<i class="bi bi-capsule"></i>',

		SUPPLIERS:
			'<i class="bi bi-truck-front-fill"></i>',

		CUSTOMERS:
			'<i class="bi bi-person-lines-fill"></i>',

		PURCHASES:
			'<i class="bi bi-bag-plus-fill"></i>',

		SALES:
			'<i class="bi bi-cart-check-fill"></i>',

		SALES_ORDERS:
			'<i class="bi bi-clipboard-check-fill"></i>',

		PURCHASE_RETURNS:
			'<i class="bi bi-arrow-return-left"></i>',

		SALES_RETURNS:
			'<i class="bi bi-arrow-return-right"></i>',

		PAYMENTS:
			'<i class="bi bi-credit-card-fill"></i>',

		EXPIRY_MANAGEMENT:
			'<i class="bi bi-calendar-x-fill"></i>'
	};

	return (
		icons[module] ||
		'<i class="bi bi-folder-fill"></i>'
	);
}


function getModuleDescription(module) {

	const descriptions = {

		DASHBOARD:
			"View workspace activity and operational overview.",

		PATIENTS:
			"Manage patient records and healthcare information.",

		APPOINTMENTS:
			"Manage bookings, schedules and consultations.",

		DOCTOR_AVAILABILITY:
			"Create and manage doctor availability slots.",

		DOCTORS:
			"Manage doctors connected with this workspace.",

		STAFF:
			"Manage employees, roles and workspace access.",

		PRESCRIPTIONS:
			"Create and manage patient prescriptions.",

		OPD:
			"Manage outpatient visits and consultations.",

		IPD:
			"Manage admissions, beds and inpatient records.",

		BILLING:
			"Create invoices, manage billing records and account balances.",

		PHARMACY:
			"Manage hospital or clinic pharmacy operations.",

		INVENTORY:
			"Monitor medicine stock, batches, quantities and inventory movements.",

		LAB:
			"Manage laboratory tests and patient reports.",

		RADIOLOGY:
			"Manage radiology services and imaging reports.",

		REPORTS:
			"View operational, inventory, sales and financial analytics.",

		NOTIFICATIONS:
			"View workspace alerts and important updates.",

		SETTINGS:
			"Configure workspace and organization preferences.",

		PERMISSIONS:
			"Control staff roles and module permissions.",

		MEDICINE_MASTER:
			"Maintain the reusable medicine catalogue, strengths, forms, packs and manufacturers.",

		SUPPLIERS:
			"Manage medicine suppliers, contact details, tax information and balances.",

		CUSTOMERS:
			"Manage retail, pharmacy, hospital and business customer records.",

		PURCHASES:
			"Record supplier purchases, medicine batches, taxes, discounts and invoices.",

		SALES:
			"Create medicine sales, counter bills and customer invoices.",

		SALES_ORDERS:
			"Manage customer orders, order fulfilment and wholesale dispatch workflows.",

		PURCHASE_RETURNS:
			"Return damaged, expired or incorrect medicines to suppliers.",

		SALES_RETURNS:
			"Process customer medicine returns, refunds and stock adjustments.",

		PAYMENTS:
			"Track supplier payments, customer receipts and outstanding balances.",

		EXPIRY_MANAGEMENT:
			"Monitor near-expiry and expired medicine batches and take corrective action."
	};

	return (
		descriptions[module] ||
		"Open and manage this workspace module."
	);
}


function formatModuleName(module) {

	return String(module || "")
		.replace(/_/g, " ")
		.toLowerCase()
		.replace(
			/\b\w/g,
			function(character) {

				return character.toUpperCase();
			}
		);
}


function getModuleUrl(module) {

	const urls = {

		DASHBOARD:
			"/saas/dashboard",

		PATIENTS:
			"/saas/patients",

		APPOINTMENTS:
			"/saas/appointments",

		DOCTOR_AVAILABILITY:
			"/saas/doctor-availability",

		DOCTORS:
			"/saas/doctors",

		STAFF:
			"/saas/staff",

		PRESCRIPTIONS:
			"/saas/prescriptions",

		OPD:
			"/saas/opd",

		IPD:
			"/saas/ipd",

		BILLING:
			"/saas/billing",

		PHARMACY:
			"/saas/pharmacy",

		INVENTORY:
			"/saas/inventory",

		LAB:
			"/saas/lab",

		RADIOLOGY:
			"/saas/radiology",

		REPORTS:
			"/saas/reports",

		NOTIFICATIONS:
			"/saas/notifications",

		SETTINGS:
			"/saas/settings",

		PERMISSIONS:
			"/saas/permissions",

		MEDICINE_MASTER:
			"/saas/medicine-master",

		SUPPLIERS:
			"/saas/suppliers",

		CUSTOMERS:
			"/saas/customers",

		PURCHASES:
			"/saas/purchases",

		SALES:
			"/saas/sales",

		SALES_ORDERS:
			"/saas/sales-orders",

		PURCHASE_RETURNS:
			"/saas/purchase-returns",

		SALES_RETURNS:
			"/saas/sales-returns",

		PAYMENTS:
			"/saas/payments",

		EXPIRY_MANAGEMENT:
			"/saas/expiry-management"
	};

	return (
		urls[module] ||
		"/saas/dashboard"
	);
}


function showModulesLoadingState() {

	const container =
		document.getElementById(
			"moduleContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="col-12">

			<div class="saas-dashboard-loading-state">

				<div class="saas-dashboard-loading-icon">
					<i class="bi bi-grid-fill"></i>
				</div>

				<h4 class="text-primary fw-bold">
					Loading workspace modules
				</h4>

				<p class="text-muted mb-0">
					Please wait while module access and permissions are prepared.
				</p>

			</div>

		</div>
	`;
}


function showModulesErrorState(message) {

	const container =
		document.getElementById(
			"moduleContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="col-12">

			<div class="empty-saas-modules-card">

				<div class="empty-module-icon bg-danger">
					<i class="bi bi-exclamation-triangle-fill"></i>
				</div>

				<h4 class="text-danger fw-bold">
					Unable to load modules
				</h4>

				<p class="text-muted mb-0">
					${escapeHtml(message)}
				</p>

			</div>

		</div>
	`;
}


function hideSaasEntryOverlay() {

	const overlay =
		document.getElementById(
			"modulePageEntryOverlay"
		);

	if (!overlay) {
		return;
	}

	window.setTimeout(
		function() {

			overlay.classList.add(
				"hidden"
			);

			window.setTimeout(
				function() {

					overlay.remove();
				},
				500
			);
		},
		350
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
				rawBody: text
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

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	if (data.rawBody) {
		return data.rawBody;
	}

	if (
		typeof data === "string"
	) {
		return data;
	}

	return fallback;
}


function showMsg(
	message,
	type = "danger"
) {

	const msgBox =
		document.getElementById(
			"msg"
		);

	if (!msgBox) {
		return;
	}

	msgBox.innerHTML = `
		<div class="alert alert-${type} shadow-sm">
			${escapeHtml(message)}
		</div>
	`;

	window.setTimeout(
		function() {

			if (msgBox) {
				msgBox.innerHTML = "";
			}
		},
		5000
	);
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


function setText(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.textContent =
			value ?? "";
	}
}


function escapeHtml(value) {

	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

	return escapeHtml(value);
}