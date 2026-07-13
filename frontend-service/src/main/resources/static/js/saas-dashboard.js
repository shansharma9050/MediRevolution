const API_BASE = "http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let visibleDashboardModules = [];
let isLoadingSaasDashboard = false;

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
				localStorage.getItem("tenantId");

			if (!tenantId) {

				window.location.replace(
					"/saas/workspaces"
				);

				return;
			}
		}

		if (
			typeof loadCurrentSaasPermissions ===
			"function"
		) {

			await loadCurrentSaasPermissions();
		}

		initializeSaasShell();
		applySaasSidebarPermissions();
		markActiveSaasSidebarLink();
		updateWorkspaceAccessLevel();

		await Promise.all([
			loadSaasDashboard(),
			loadSaasNotificationCount()
		]);

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
		localStorage.getItem("activeModule");

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

function initializeSaasShell() {
	const tenantName =
		localStorage.getItem("tenantName") ||
		"Workspace";

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

function updateWorkspaceAccessLevel() {
	const element =
		document.getElementById(
			"workspaceAccessLevel"
		);

	if (!element) {
		return;
	}

	element.textContent =
		window.SAAS_OWNER_OR_ADMIN === true
			? "Admin"
			: "Member";
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
		const response =
			await fetch(
				`${API_BASE}/saas/tenants/${encodeURIComponent(tenantId)}/modules`,
				{
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
			showModulesErrorState(message);
			setAnimatedNumber(
				"availableModuleCount",
				0
			);

			return;
		}

		renderModules(
			Array.isArray(responseBody)
				? responseBody
				: []
		);

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

	} finally {
		isLoadingSaasDashboard = false;
	}
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
			item =>
				item &&
				item.enabled === true
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
		visibleDashboardModules.map(
			function(item, index) {

				const module =
					normalizeModuleName(
						getModuleName(item)
					);

				const description =
					getModuleDescription(module);

				const moduleUrl =
					getModuleUrl(module);

				return `
					<div class="col-xl-3 col-lg-4 col-md-6">

						<article class="saas-module-card"
								 style="--module-delay:${Math.min(index * 70, 560)}ms">

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

								<span>Open Module</span>

								<i class="bi bi-arrow-up-right"></i>

							</a>

						</article>

					</div>
				`;
			}
		).join("");
}

function applySaasSidebarPermissions() {
	document
		.querySelectorAll(
			"#saasSidebar [data-owner-admin='true']"
		)
		.forEach(
			function(item) {

				if (
					window.SAAS_OWNER_OR_ADMIN !== true
				) {
					item.style.display = "none";
				}
			}
		);

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

				if (
					typeof hasCachedSaasPermission ===
						"function" &&
					!hasCachedSaasPermission(
						moduleName,
						action
					)
				) {
					item.style.display = "none";
				}
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
					link.getAttribute("href");

				if (!href) {
					return;
				}

				link.classList.remove("active");

				if (
					currentPath === href ||
					(
						href !== "/saas/dashboard" &&
						currentPath.startsWith(href)
					)
				) {
					link.classList.add("active");
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

		const response =
			await fetch(
				`${API_BASE}/saas/notifications/unread-count?${query.toString()}`,
				{
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
			badge.textContent = count;

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

	if (typeof item === "string") {
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
			'<i class="bi bi-shield-lock-fill"></i>'
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
			"Manage healthcare invoices and payments.",

		PHARMACY:
			"Manage pharmacy operations and medicines.",

		INVENTORY:
			"Monitor stock, supplies and inventory movements.",

		LAB:
			"Manage laboratory tests and patient reports.",

		RADIOLOGY:
			"Manage radiology services and imaging reports.",

		REPORTS:
			"View operational and financial analytics.",

		NOTIFICATIONS:
			"View workspace alerts and important updates.",

		SETTINGS:
			"Configure workspace and organization preferences.",

		PERMISSIONS:
			"Control staff roles and module permissions."
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
			character =>
				character.toUpperCase()
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
			"/saas/permissions"
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
					Please wait while access and module permissions are prepared.
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

	if (typeof data === "string") {
		return data;
	}

	return fallback;
}

function showMsg(
	message,
	type = "danger"
) {
	const msgBox =
		document.getElementById("msg");

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
		Number(element.textContent) || 0;

	const difference =
		target - start;

	const duration = 500;
	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {
		element.textContent = target;
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
			1 - Math.pow(1 - progress, 3);

		element.textContent =
			Math.round(
				start +
					difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function setText(id, value) {
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