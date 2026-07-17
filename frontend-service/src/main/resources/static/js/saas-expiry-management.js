const API_BASE = "http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let expiryConfiguration = null;

let expiryBatchList = [];
let supplierExpiryList = [];
let expiryActionList = [];
let expiryAlertList = [];

let currentExpiryView = "ALL";
let selectedExpiryBatch = null;

let expiryConfigurationModal = null;
let expiryActionModal = null;
let expiryActionDetailsModal = null;

let expiryPermissions = {
	create: false,
	update: false
};

let isLoadingExpiryBatches = false;
let isSavingExpiryAction = false;
let isSavingExpiryConfiguration = false;
let isRunningAutoQuarantine = false;


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"EXPIRY_MANAGEMENT",
				"VIEW"
			);

		if (!allowed) {
			return;
		}

		const tenantId =
			getCurrentTenantId();

		if (!tenantId) {

			alert(
				"Please select SaaS workspace first."
			);

			window.location.href =
				"/saas/workspaces";

			return;
		}

		initializeExpiryPage();

		initializeExpiryModals();

		initializeExpirySearchEvents();

		await loadExpiryPermissions();

		setDefaultExpiryActionDate();

		await loadExpiryConfiguration();

		await refreshExpiryPage();
	}
);


function initializeExpiryPage() {

	const tenantName =
		getCurrentTenantName();

	const tenantType =
		getCurrentTenantType();

	setText(
		"tenantNameText",
		tenantName
	);

	setText(
		"tenantTypeText",
		formatTenantType(
			tenantType
		)
	);

	setText(
		"sidebarTenantName",
		tenantName
	);

	setText(
		"navbarTenantName",
		tenantName
	);
}


function initializeExpiryModals() {

	const configurationElement =
		document.getElementById(
			"expiryConfigurationModal"
		);

	if (configurationElement) {

		expiryConfigurationModal =
			new bootstrap.Modal(
				configurationElement
			);
	}

	const actionElement =
		document.getElementById(
			"expiryActionModal"
		);

	if (actionElement) {

		expiryActionModal =
			new bootstrap.Modal(
				actionElement
			);
	}

	const actionDetailsElement =
		document.getElementById(
			"expiryActionDetailsModal"
		);

	if (actionDetailsElement) {

		expiryActionDetailsModal =
			new bootstrap.Modal(
				actionDetailsElement
			);
	}
}


function initializeExpirySearchEvents() {

	const expiryKeyword =
		document.getElementById(
			"expiryKeyword"
		);

	if (expiryKeyword) {

		expiryKeyword.addEventListener(
			"keydown",
			function(event) {

				if (event.key === "Enter") {

					event.preventDefault();

					searchExpiryBatches();
				}
			}
		);
	}

	const actionKeyword =
		document.getElementById(
			"expiryActionSearchKeyword"
		);

	if (actionKeyword) {

		actionKeyword.addEventListener(
			"keydown",
			function(event) {

				if (event.key === "Enter") {

					event.preventDefault();

					searchExpiryActions();
				}
			}
		);
	}
}


async function loadExpiryPermissions() {

	expiryPermissions.create =
		await canExpiry(
			"CREATE"
		);

	expiryPermissions.update =
		await canExpiry(
			"UPDATE"
		);

	showOrHideById(
		"expiryConfigurationBtn",
		expiryPermissions.update
	);

	showOrHideById(
		"autoQuarantineBtn",
		expiryPermissions.update
	);
}


async function canExpiry(
	action
) {

	try {

		return Boolean(
			await Promise.resolve(
				hasSaasPermission(
					"EXPIRY_MANAGEMENT",
					action
				)
			)
		);

	} catch (error) {

		console.error(
			"Expiry permission check failed:",
			error
		);

		return false;
	}
}


async function refreshExpiryPage() {

	setButtonLoading(
		"refreshExpiryBtn",
		"Refreshing...",
		true
	);

	await Promise.all([
		loadExpirySummary(),
		loadExpiryAlerts(),
		loadExpiryBatchesByCurrentView(),
		loadSupplierExpiryAnalysis(),
		loadExpiryActions()
	]);

	setButtonLoading(
		"refreshExpiryBtn",
		"Refresh",
		false
	);
}


async function loadExpiryConfiguration() {

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/configuration` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		showMsg(
			getExpiryErrorMessage(
				result.data,
				"Unable to load expiry configuration."
			)
		);

		return;
	}

	expiryConfiguration =
		result.data || {};

	populateExpiryConfigurationForm(
		expiryConfiguration
	);

	setValue(
		"includeZeroStockFilter",
		Boolean(
			expiryConfiguration
				.includeZeroStockBatches
		)
			? "true"
			: "false"
	);
}


function populateExpiryConfigurationForm(
	configuration
) {

	setValue(
		"nearExpiryDays",
		configuration.nearExpiryDays ?? 90
	);

	setValue(
		"criticalExpiryDays",
		configuration.criticalExpiryDays ?? 30
	);

	setChecked(
		"expiryAlertEnabled",
		configuration.alertEnabled !== false
	);

	setChecked(
		"dailyExpiryAlertEnabled",
		configuration.dailyAlertEnabled !== false
	);

	setChecked(
		"includeZeroStockBatches",
		Boolean(
			configuration.includeZeroStockBatches
		)
	);

	setChecked(
		"autoQuarantineExpiredStock",
		Boolean(
			configuration.autoQuarantineExpiredStock
		)
	);
}


function openExpiryConfigurationModal() {

	if (!expiryPermissions.update) {

		showMsg(
			"You do not have permission to update expiry configuration."
		);

		return;
	}

	if (expiryConfiguration) {

		populateExpiryConfigurationForm(
			expiryConfiguration
		);
	}

	if (expiryConfigurationModal) {

		expiryConfigurationModal.show();
	}
}


async function saveExpiryConfiguration() {

	if (isSavingExpiryConfiguration) {
		return;
	}

	if (!expiryPermissions.update) {

		showMsg(
			"You do not have permission to update expiry configuration."
		);

		return;
	}

	const payload = {

		tenantId:
			getCurrentTenantId(),

		nearExpiryDays:
			getNumberValue(
				"nearExpiryDays"
			),

		criticalExpiryDays:
			getNumberValue(
				"criticalExpiryDays"
			),

		alertEnabled:
			isChecked(
				"expiryAlertEnabled"
			),

		dailyAlertEnabled:
			isChecked(
				"dailyExpiryAlertEnabled"
			),

		includeZeroStockBatches:
			isChecked(
				"includeZeroStockBatches"
			),

		autoQuarantineExpiredStock:
			isChecked(
				"autoQuarantineExpiredStock"
			)
	};

	const validationMessage =
		validateExpiryConfigurationPayload(
			payload
		);

	if (validationMessage) {

		showMsg(
			validationMessage
		);

		return;
	}

	isSavingExpiryConfiguration = true;

	setButtonLoading(
		"saveExpiryConfigurationBtn",
		"Saving...",
		true
	);

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/configuration`,
			{
				method: "PUT",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify(
						payload
					)
			}
		);

	isSavingExpiryConfiguration = false;

	setButtonLoading(
		"saveExpiryConfigurationBtn",
		"Save Configuration",
		false
	);

	if (!result.ok) {

		showMsg(
			getExpiryErrorMessage(
				result.data,
				"Unable to save expiry configuration."
			)
		);

		return;
	}

	expiryConfiguration =
		result.data || payload;

	setValue(
		"includeZeroStockFilter",
		Boolean(
			expiryConfiguration
				.includeZeroStockBatches
		)
			? "true"
			: "false"
	);

	if (expiryConfigurationModal) {

		expiryConfigurationModal.hide();
	}

	showMsg(
		"Expiry configuration saved successfully.",
		"success"
	);

	await refreshExpiryPage();
}


function validateExpiryConfigurationPayload(
	payload
) {

	if (
		!payload.nearExpiryDays ||
		payload.nearExpiryDays < 1
	) {

		return "Near-expiry days must be greater than 0.";
	}

	if (
		!payload.criticalExpiryDays ||
		payload.criticalExpiryDays < 1
	) {

		return "Critical-expiry days must be greater than 0.";
	}

	if (
		payload.criticalExpiryDays >
		payload.nearExpiryDays
	) {

		return "Critical-expiry days cannot exceed near-expiry days.";
	}

	if (
		payload.nearExpiryDays > 3650 ||
		payload.criticalExpiryDays > 3650
	) {

		return "Expiry-day configuration cannot exceed 3650 days.";
	}

	return "";
}


async function loadExpirySummary() {

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/summary` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		resetExpirySummary();

		return;
	}

	const summary =
		result.data || {};

	setAnimatedNumber(
		"totalTrackedBatches",
		summary.totalTrackedBatches
	);

	setAnimatedNumber(
		"totalExpiredBatches",
		summary.expiredBatches
	);

	setAnimatedNumber(
		"totalExpiresTodayBatches",
		summary.expiresTodayBatches
	);

	setAnimatedNumber(
		"totalCriticalBatches",
		summary.criticalBatches
	);

	setAnimatedNumber(
		"totalNearExpiryBatches",
		summary.nearExpiryBatches
	);

	setText(
		"totalStockValueAtRisk",
		formatCurrency(
			summary.totalStockValueAtRisk
		)
	);
}


function resetExpirySummary() {

	setText(
		"totalTrackedBatches",
		"0"
	);

	setText(
		"totalExpiredBatches",
		"0"
	);

	setText(
		"totalExpiresTodayBatches",
		"0"
	);

	setText(
		"totalCriticalBatches",
		"0"
	);

	setText(
		"totalNearExpiryBatches",
		"0"
	);

	setText(
		"totalStockValueAtRisk",
		formatCurrency(0)
	);
}


async function loadExpiryAlerts() {

	const container =
		document.getElementById(
			"expiryAlertList"
		);

	if (container) {

		container.innerHTML =
			buildExpiryLoadingState(
				"Loading expiry alerts..."
			);
	}

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/alerts` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		expiryAlertList = [];

		renderExpiryAlertError(
			getExpiryErrorMessage(
				result.data,
				"Unable to load expiry alerts."
			)
		);

		return;
	}

	expiryAlertList =
		normalizeArrayResponse(
			result.data
		);

	renderExpiryAlerts(
		expiryAlertList
	);
}


function renderExpiryAlerts(
	alerts
) {

	const container =
		document.getElementById(
			"expiryAlertList"
		);

	if (!container) {
		return;
	}

	const list =
		Array.isArray(alerts)
			? alerts
			: [];

	if (!list.length) {

		container.innerHTML = `

			<div class="expiry-state">

				<div class="expiry-state-icon">

					<i class="bi bi-shield-check"></i>

				</div>

				<h5 class="fw-bold text-primary">
					No active expiry alerts
				</h5>

				<p class="text-muted mb-0">
					No expired or near-expiry stock currently requires attention.
				</p>

			</div>
		`;

		return;
	}

	container.innerHTML =
		list.map(
			function(alert) {

				const severity =
					String(
						alert.severity || "INFO"
					)
						.toLowerCase();

				const icon =
					severity === "danger"
						? "bi-exclamation-octagon-fill"
						: severity === "warning"
							? "bi-exclamation-triangle-fill"
							: "bi-info-circle-fill";

				return `

					<article class="expiry-alert-card ${escapeHtml(severity)}">

						<div class="expiry-alert-main">

							<div class="expiry-alert-icon">

								<i class="bi ${icon}"></i>

							</div>

							<div>

								<h6>

									${escapeHtml(
					alert.title || "Expiry alert"
				)}

								</h6>

								<p>

									${escapeHtml(
					alert.message || ""
				)}

								</p>

								<div class="d-flex flex-wrap gap-2 mt-2">

									<span class="badge text-bg-light">

										${Number(
					alert.affectedBatchCount || 0
				)}
										batches

									</span>

									<span class="badge text-bg-light">

										${Number(
					alert.affectedQuantity || 0
				)}
										units

									</span>

									<span class="badge text-bg-light">

										${formatCurrency(
					alert.stockValueAtRisk
				)}

									</span>

								</div>

							</div>

						</div>

						<button type="button"
								class="btn btn-sm btn-outline-primary"
								onclick="openExpiryAlertView('${escapeJsString(
					extractExpiryStatusFromUrl(
						alert.actionUrl
					)
				)}')">

							View Stock

						</button>

					</article>
				`;
			}
		)
			.join("");
}


function renderExpiryAlertError(
	message
) {

	const container =
		document.getElementById(
			"expiryAlertList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `

		<div class="expiry-state text-danger">

			<i class="bi bi-exclamation-triangle-fill fs-1"></i>

			<h5 class="fw-bold mt-3">
				Unable to load alerts
			</h5>

			<p class="text-muted mb-0">

				${escapeHtml(message)}

			</p>

		</div>
	`;
}


function openExpiryAlertView(
	status
) {

	const normalizedStatus =
		String(status || "")
			.trim()
			.toUpperCase();

	currentExpiryView =
		normalizedStatus || "ALL";

	setValue(
		"expiryStatusFilter",
		normalizedStatus
	);

	updateExpiryTabSelection(
		currentExpiryView
	);

	searchExpiryBatches();

	const table =
		document.getElementById(
			"expiryBatchTableBody"
		);

	if (table) {

		table.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
}


function extractExpiryStatusFromUrl(
	url
) {

	if (!url) {
		return "";
	}

	try {

		const parsed =
			new URL(
				url,
				window.location.origin
			);

		return parsed.searchParams.get(
			"status"
		) || "";

	} catch (error) {

		const match =
			String(url).match(
				/[?&]status=([^&]+)/
			);

		return match
			? decodeURIComponent(match[1])
			: "";
	}
}


async function loadExpiryBatchesByCurrentView() {

	switch (currentExpiryView) {

		case "EXPIRED":

			await loadExpiryBatchesFromEndpoint(
				"/batches/expired"
			);

			break;

		case "EXPIRES_TODAY":

			await loadExpiryBatchesFromEndpoint(
				"/batches/expires-today"
			);

			break;

		case "CRITICAL":

			await loadExpiryBatchesFromEndpoint(
				"/batches/critical"
			);

			break;

		case "NEAR_EXPIRY":

			await loadExpiryBatchesFromEndpoint(
				"/batches/near-expiry"
			);

			break;

		default:

			await loadExpiryBatchesFromEndpoint(
				"/batches"
			);
	}
}


async function loadExpiryBatchesFromEndpoint(
	endpoint
) {

	if (isLoadingExpiryBatches) {
		return;
	}

	isLoadingExpiryBatches = true;

	showExpiryBatchLoadingState();

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management${endpoint}` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	isLoadingExpiryBatches = false;

	if (!result.ok) {

		expiryBatchList = [];

		const message =
			getExpiryErrorMessage(
				result.data,
				"Unable to load expiry batches."
			);

		showExpiryBatchErrorState(
			message
		);

		return;
	}

	expiryBatchList =
		normalizeArrayResponse(
			result.data
		);

	renderExpiryBatches(
		expiryBatchList
	);

	populateExpirySupplierFilter(
		expiryBatchList
	);
}


async function searchExpiryBatches() {

	showExpiryBatchLoadingState();

	setButtonLoading(
		"searchExpiryBtn",
		"Searching...",
		true
	);

	const tenantId =
		getCurrentTenantId();

	const params =
		new URLSearchParams();

	params.set(
		"tenantId",
		String(tenantId)
	);

	const keyword =
		getValue(
			"expiryKeyword"
		);

	const expiryStatus =
		getValue(
			"expiryStatusFilter"
		);

	const supplierId =
		getValue(
			"expirySupplierFilter"
		);

	const days =
		getValue(
			"expiryDaysFilter"
		);

	const includeZeroStock =
		getValue(
			"includeZeroStockFilter"
		);

	if (keyword) {
		params.set(
			"keyword",
			keyword
		);
	}

	if (expiryStatus) {
		params.set(
			"expiryStatus",
			expiryStatus
		);
	}

	if (supplierId) {
		params.set(
			"supplierId",
			supplierId
		);
	}

	if (days) {
		params.set(
			"days",
			days
		);
	}

	if (includeZeroStock) {
		params.set(
			"includeZeroStock",
			includeZeroStock
		);
	}

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/batches/search?${params.toString()}`
		);

	setButtonLoading(
		"searchExpiryBtn",
		"Search",
		false
	);

	if (!result.ok) {

		expiryBatchList = [];

		showExpiryBatchErrorState(
			getExpiryErrorMessage(
				result.data,
				"Unable to search expiry batches."
			)
		);

		return;
	}

	expiryBatchList =
		normalizeArrayResponse(
			result.data
		);

	renderExpiryBatches(
		expiryBatchList
	);

	currentExpiryView =
		expiryStatus || "ALL";

	updateExpiryTabSelection(
		currentExpiryView
	);
}


function resetExpiryFilters() {

	setValue(
		"expiryKeyword",
		""
	);

	setValue(
		"expiryStatusFilter",
		""
	);

	setValue(
		"expirySupplierFilter",
		""
	);

	setValue(
		"expiryDaysFilter",
		""
	);

	setValue(
		"includeZeroStockFilter",
		Boolean(
			expiryConfiguration
				?.includeZeroStockBatches
		)
			? "true"
			: "false"
	);

	currentExpiryView =
		"ALL";

	updateExpiryTabSelection(
		"ALL"
	);

	loadExpiryBatchesByCurrentView();
}


async function changeExpiryView(
	view,
	button
) {

	currentExpiryView =
		String(view || "ALL")
			.toUpperCase();

	document
		.querySelectorAll(
			"#expiryBatchTabs .nav-link"
		)
		.forEach(
			function(tab) {

				tab.classList.remove(
					"active"
				);
			}
		);

	if (button) {

		button.classList.add(
			"active"
		);
	}

	setValue(
		"expiryStatusFilter",
		currentExpiryView === "ALL"
			? ""
			: currentExpiryView
	);

	await loadExpiryBatchesByCurrentView();
}


function updateExpiryTabSelection(
	view
) {

	const mapping = {
		ALL:
			"allExpiryTab",

		EXPIRED:
			"expiredExpiryTab",

		EXPIRES_TODAY:
			"todayExpiryTab",

		CRITICAL:
			"criticalExpiryTab",

		NEAR_EXPIRY:
			"nearExpiryTab"
	};

	document
		.querySelectorAll(
			"#expiryBatchTabs .nav-link"
		)
		.forEach(
			function(tab) {

				tab.classList.remove(
					"active"
				);
			}
		);

	const activeId =
		mapping[view] ||
		mapping.ALL;

	const activeElement =
		document.getElementById(
			activeId
		);

	if (activeElement) {

		activeElement.classList.add(
			"active"
		);
	}
}


function populateExpirySupplierFilter(
	batches
) {

	const select =
		document.getElementById(
			"expirySupplierFilter"
		);

	if (!select) {
		return;
	}

	const selectedValue =
		select.value;

	const supplierMap =
		new Map();

	[
		...expiryBatchList,
		...supplierExpiryList
	].forEach(
		function(item) {

			const supplierId =
				item.supplierId;

			if (!supplierId) {
				return;
			}

			if (
				!supplierMap.has(
					String(supplierId)
				)
			) {

				supplierMap.set(
					String(supplierId),
					{
						id:
							supplierId,

						code:
							item.supplierCode || "",

						name:
							item.supplierName ||
							"Supplier"
					}
				);
			}
		}
	);

	select.innerHTML = `

		<option value="">
			All Suppliers
		</option>
	`;

	Array.from(
		supplierMap.values()
	)
		.sort(
			function(a, b) {

				return String(a.name)
					.localeCompare(
						String(b.name)
					);
			}
		)
		.forEach(
			function(supplier) {

				const option =
					document.createElement(
						"option"
					);

				option.value =
					supplier.id;

				option.textContent =
					supplier.code
						? `${supplier.name} (${supplier.code})`
						: supplier.name;

				select.appendChild(
					option
				);
			}
		);

	if (
		selectedValue &&
		supplierMap.has(
			String(selectedValue)
		)
	) {

		select.value =
			selectedValue;
	}
}


function renderExpiryBatches(
	batches
) {

	const tbody =
		document.getElementById(
			"expiryBatchTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(batches)
			? batches
			: [];

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="12">

					<div class="expiry-state">

						<div class="expiry-state-icon">

							<i class="bi bi-box-seam"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No expiry batches found
						</h5>

						<p class="text-muted mb-0">
							No medicine batches match the selected expiry filters.
						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(batch, index) {

				const availableQuantity =
					Number(
						batch.availableQuantity || 0
					);

				const quarantinedQuantity =
					Number(
						batch.quarantinedQuantity || 0
					);

				return `

					<tr>

						<td>

							<strong>
								${index + 1}
							</strong>

						</td>

						<td>

							<strong class="text-primary">

								${escapeHtml(
					batch.medicineName || "-"
				)}

							</strong>

							<div class="small text-muted">

								Batch:
								${escapeHtml(
					batch.batchNumber || "-"
				)}

							</div>

							${batch.manufacturer
						? `
									<div class="small text-muted">

										${escapeHtml(
							batch.manufacturer
						)}

									</div>
								`
						: ""
					}

						</td>

						<td>

							<strong>

								${formatDate(
						batch.expiryDate
					)}

							</strong>

							<div class="small text-muted">

								${formatDaysToExpiry(
						batch.daysToExpiry
					)}

							</div>

						</td>

						<td>

							${expiryStatusBadge(
						batch.expiryStatus
					)}

						</td>

						<td>

							<span class="expiry-quantity">

								<i class="bi bi-boxes"></i>

								${Number(
						batch.currentQuantity || 0
					)}

							</span>

						</td>

						<td>

							${quarantinedQuantity > 0
						? `
									<span class="expiry-quarantine-chip">

										<i class="bi bi-shield-lock-fill"></i>

										${quarantinedQuantity}

									</span>
								`
						: "-"
					}

						</td>

						<td>

							<strong>

								${availableQuantity}

							</strong>

						</td>

						<td>

							${formatCurrency(
						batch.purchaseRate
					)}

						</td>

						<td>

							<strong>

								${formatCurrency(
						batch.stockValueAtRisk
					)}

							</strong>

						</td>

						<td>

							${escapeHtml(
						batch.supplierName || "-"
					)}

							<div class="small text-muted">

								${escapeHtml(
						batch.supplierCode || ""
					)}

							</div>

						</td>

						<td>

							${escapeHtml(
						batch.purchaseNumber || "-"
					)}

						</td>

						<td>

							${buildExpiryBatchActions(
						batch
					)}

						</td>

					</tr>
				`;
			}
		)
			.join("");
}


function buildExpiryBatchActions(
	batch
) {

	if (!expiryPermissions.create) {

		return `
			<span class="small text-muted">
				View only
			</span>
		`;
	}

	const buttons = [];

	const availableQuantity =
		Number(
			batch.availableQuantity || 0
		);

	const quarantinedQuantity =
		Number(
			batch.quarantinedQuantity || 0
		);

	if (availableQuantity > 0) {

		buttons.push(`

			<button type="button"
					class="btn btn-sm btn-outline-warning"
					onclick="openExpiryActionModal(
						${Number(batch.stockId)},
						'QUARANTINE'
					)">

				<i class="bi bi-shield-lock me-1"></i>
				Quarantine

			</button>
		`);

		buttons.push(`

			<button type="button"
					class="btn btn-sm btn-outline-danger"
					onclick="openExpiryActionModal(
						${Number(batch.stockId)},
						'DISPOSAL'
					)">

				<i class="bi bi-trash3 me-1"></i>
				Dispose

			</button>
		`);

		buttons.push(`

			<button type="button"
					class="btn btn-sm btn-outline-secondary"
					onclick="openExpiryActionModal(
						${Number(batch.stockId)},
						'STOCK_ADJUSTMENT'
					)">

				<i class="bi bi-sliders me-1"></i>
				Adjust

			</button>
		`);
	}

	if (
		availableQuantity > 0 &&
		Boolean(
			batch.returnToSupplierAvailable
		)
	) {

		buttons.push(`

			<button type="button"
					class="btn btn-sm btn-outline-primary"
					onclick="openExpiryActionModal(
						${Number(batch.stockId)},
						'RETURN_TO_SUPPLIER'
					)">

				<i class="bi bi-truck me-1"></i>
				Return

			</button>
		`);
	}

	if (quarantinedQuantity > 0) {

		buttons.push(`

			<button type="button"
					class="btn btn-sm btn-outline-success"
					onclick="openExpiryActionModal(
						${Number(batch.stockId)},
						'RELEASE_FROM_QUARANTINE'
					)">

				<i class="bi bi-shield-check me-1"></i>
				Release

			</button>
		`);
	}

	if (!buttons.length) {

		return `
			<span class="small text-muted">
				No action available
			</span>
		`;
	}

	return `

		<div class="d-flex flex-wrap gap-2">

			${buttons.join("")}

		</div>
	`;
}


function showExpiryBatchLoadingState() {

	const tbody =
		document.getElementById(
			"expiryBatchTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="12">

				${buildExpiryLoadingState(
		"Loading expiry batches..."
	)}

			</td>

		</tr>
	`;
}


function showExpiryBatchErrorState(
	message
) {

	const tbody =
		document.getElementById(
			"expiryBatchTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="12">

				<div class="expiry-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<h5 class="fw-bold mt-3">
						Unable to load expiry batches
					</h5>

					<p class="text-muted mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


async function loadSupplierExpiryAnalysis() {

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/suppliers` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		supplierExpiryList = [];

		renderSupplierExpiryError(
			getExpiryErrorMessage(
				result.data,
				"Unable to load supplier expiry analysis."
			)
		);

		return;
	}

	supplierExpiryList =
		normalizeArrayResponse(
			result.data
		);

	renderSupplierExpiryAnalysis(
		supplierExpiryList
	);

	populateExpirySupplierFilter(
		expiryBatchList
	);
}


function renderSupplierExpiryAnalysis(
	suppliers
) {

	const tbody =
		document.getElementById(
			"supplierExpiryTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(suppliers)
			? suppliers
			: [];

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="9">

					<div class="expiry-state">

						<div class="expiry-state-icon">

							<i class="bi bi-truck"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No supplier expiry risk
						</h5>

						<p class="text-muted mb-0">
							No supplier-linked batches currently require expiry action.
						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(supplier, index) {

				return `

					<tr>

						<td>
							${index + 1}
						</td>

						<td>

							${escapeHtml(
					supplier.supplierCode || "-"
				)}

						</td>

						<td>

							<strong class="text-primary">

								${escapeHtml(
					supplier.supplierName || "-"
				)}

							</strong>

						</td>

						<td>

							${Number(
					supplier.affectedBatchCount || 0
				)}

						</td>

						<td>

							<span class="expiry-status expired">

								${Number(
					supplier.expiredBatchCount || 0
				)}

							</span>

						</td>

						<td>

							<span class="expiry-status near">

								${Number(
					supplier.nearExpiryBatchCount || 0
				)}

							</span>

						</td>

						<td>

							${Number(
					supplier.affectedQuantity || 0
				)}

						</td>

						<td>

							<strong>

								${formatCurrency(
					supplier.stockValueAtRisk
				)}

							</strong>

						</td>

						<td>

							${Boolean(
					supplier.returnToSupplierAvailable
				)
						? `
									<span class="badge text-bg-success">
										Available
									</span>
								`
						: `
									<span class="badge text-bg-secondary">
										Unavailable
									</span>
								`
					}

						</td>

					</tr>
				`;
			}
		)
			.join("");
}


function renderSupplierExpiryError(
	message
) {

	const tbody =
		document.getElementById(
			"supplierExpiryTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="9">

				<div class="expiry-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<p class="text-muted mt-3 mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


function openExpiryActionModal(
	stockId,
	actionType = ""
) {

	if (!expiryPermissions.create) {

		showMsg(
			"You do not have permission to create expiry actions."
		);

		return;
	}

	selectedExpiryBatch =
		expiryBatchList.find(
			function(batch) {

				return (
					Number(batch.stockId) ===
					Number(stockId)
				);
			}
		) || null;

	if (!selectedExpiryBatch) {

		showMsg(
			"Selected expiry batch was not found. Please refresh the page."
		);

		return;
	}

	clearExpiryActionForm();

	setValue(
		"expiryActionStockId",
		selectedExpiryBatch.stockId
	);

	setValue(
		"expiryActionType",
		actionType
	);

	setDefaultExpiryActionDate();

	populateSelectedExpiryBatchCard(
		selectedExpiryBatch
	);

	handleExpiryActionTypeChange();

	if (actionType) {

		setText(
			"expiryActionModalTitle",
			formatEnumText(actionType)
		);
	}

	if (expiryActionModal) {

		expiryActionModal.show();
	}
}


function populateSelectedExpiryBatchCard(
	batch
) {

	const card =
		document.getElementById(
			"selectedExpiryBatchCard"
		);

	if (card) {

		card.classList.add(
			"active"
		);
	}

	setText(
		"selectedExpiryMedicineName",
		batch.medicineName || "-"
	);

	setText(
		"selectedExpiryBatchNumber",
		batch.batchNumber || "-"
	);

	setText(
		"selectedExpiryDate",
		formatDate(
			batch.expiryDate
		)
	);

	setText(
		"selectedExpiryAvailableQuantity",
		Number(
			batch.availableQuantity || 0
		)
	);

	setText(
		"selectedExpiryQuarantinedQuantity",
		Number(
			batch.quarantinedQuantity || 0
		)
	);
}


function handleExpiryActionTypeChange() {

	hideAllExpiryActionFields();

	const actionType =
		getValue(
			"expiryActionType"
		);

	let title =
		"Create Expiry Action";

	let maximumQuantity = 0;

	if (selectedExpiryBatch) {

		maximumQuantity =
			actionType ===
				"RELEASE_FROM_QUARANTINE"
				? Number(
					selectedExpiryBatch
						.quarantinedQuantity || 0
				)
				: Number(
					selectedExpiryBatch
						.availableQuantity || 0
				);
	}

	const quantityInput =
		document.getElementById(
			"expiryActionQuantity"
		);

	if (quantityInput) {

		quantityInput.max =
			String(
				Math.max(
					maximumQuantity,
					1
				)
			);

		quantityInput.value =
			maximumQuantity > 0
				? String(maximumQuantity)
				: "1";
	}

	switch (actionType) {

		case "DISPOSAL":

			title =
				"Dispose Expiry Stock";

			showExpiryActionField(
				"expiryDisposalFields"
			);

			break;

		case "STOCK_ADJUSTMENT":

			title =
				"Adjust Expiry Stock";

			showExpiryActionField(
				"expiryAdjustmentFields"
			);

			break;

		case "RETURN_TO_SUPPLIER":

			title =
				"Return Expiry Stock to Supplier";

			showExpiryActionField(
				"expirySupplierReturnFields"
			);

			break;

		case "QUARANTINE":

			title =
				"Quarantine Expiry Stock";

			break;

		case "RELEASE_FROM_QUARANTINE":

			title =
				"Release Stock from Quarantine";

			break;
	}

	setText(
		"expiryActionModalTitle",
		title
	);
}


function hideAllExpiryActionFields() {

	[
		"expiryDisposalFields",
		"expiryAdjustmentFields",
		"expirySupplierReturnFields"
	].forEach(
		function(id) {

			const element =
				document.getElementById(id);

			if (element) {

				element.classList.remove(
					"active"
				);
			}
		}
	);
}


function showExpiryActionField(
	id
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.classList.add(
			"active"
		);
	}
}


async function saveExpiryAction() {

	if (isSavingExpiryAction) {
		return;
	}

	if (!expiryPermissions.create) {

		showMsg(
			"You do not have permission to create expiry actions."
		);

		return;
	}

	const payload =
		buildExpiryActionPayload();

	const validationMessage =
		validateExpiryActionPayload(
			payload
		);

	if (validationMessage) {

		showMsg(
			validationMessage
		);

		return;
	}

	isSavingExpiryAction = true;

	setButtonLoading(
		"saveExpiryActionBtn",
		"Saving Action...",
		true
	);

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/actions`,
			{
				method: "POST",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify(
						payload
					)
			}
		);

	isSavingExpiryAction = false;

	setButtonLoading(
		"saveExpiryActionBtn",
		"Save Action",
		false
	);

	if (!result.ok) {

		showMsg(
			getExpiryErrorMessage(
				result.data,
				"Unable to save expiry action."
			)
		);

		return;
	}

	if (expiryActionModal) {

		expiryActionModal.hide();
	}

	showMsg(
		"Expiry action saved successfully.",
		"success"
	);

	selectedExpiryBatch = null;

	await refreshExpiryPage();
}


function buildExpiryActionPayload() {

	return {

		tenantId:
			getCurrentTenantId(),

		stockId:
			getNumberValue(
				"expiryActionStockId"
			),

		actionDate:
			getValue(
				"expiryActionDate"
			) || null,

		actionType:
			getValue(
				"expiryActionType"
			),

		quantity:
			getNumberValue(
				"expiryActionQuantity"
			),

		disposalMethod:
			getValue(
				"expiryDisposalMethod"
			),

		adjustmentReason:
			getValue(
				"expiryAdjustmentReason"
			),

		referenceNumber:
			getValue(
				"expiryReferenceNumber"
			),

		authorizedBy:
			getValue(
				"expiryAuthorizedBy"
			),

		witnessName:
			getValue(
				"expiryWitnessName"
			),

		disposalLocation:
			getValue(
				"expiryDisposalLocation"
			),

		reasonDetails:
			getValue(
				"expiryReasonDetails"
			),

		remarks:
			getValue(
				"expiryActionRemarks"
			),

		purchaseReturnId:
			getOptionalNumberValue(
				"expiryPurchaseReturnId"
			)
	};
}


function validateExpiryActionPayload(
	payload
) {

	if (!payload.stockId) {

		return "Stock batch is required.";
	}

	if (!selectedExpiryBatch) {

		return "Selected stock batch information is unavailable.";
	}

	if (!payload.actionDate) {

		return "Action date is required.";
	}

	if (
		payload.actionDate >
		getTodayDateString()
	) {

		return "Action date cannot be in the future.";
	}

	if (!payload.actionType) {

		return "Please select expiry action type.";
	}

	if (
		!payload.quantity ||
		payload.quantity <= 0
	) {

		return "Action quantity must be greater than 0.";
	}

	const availableQuantity =
		Number(
			selectedExpiryBatch
				.availableQuantity || 0
		);

	const quarantinedQuantity =
		Number(
			selectedExpiryBatch
				.quarantinedQuantity || 0
		);

	if (
		payload.actionType ===
		"RELEASE_FROM_QUARANTINE"
	) {

		if (
			payload.quantity >
			quarantinedQuantity
		) {

			return (
				"Release quantity cannot exceed quarantined quantity. " +
				`Quarantined: ${quarantinedQuantity}`
			);
		}

		if (
			[
				"EXPIRED",
				"EXPIRES_TODAY"
			].includes(
				String(
					selectedExpiryBatch
						.expiryStatus || ""
				).toUpperCase()
			)
		) {

			return "Expired stock cannot be released from quarantine.";
		}

	} else if (
		payload.quantity >
		availableQuantity
	) {

		return (
			"Action quantity cannot exceed available stock. " +
			`Available: ${availableQuantity}`
		);
	}

	if (
		payload.actionType ===
		"DISPOSAL"
	) {

		if (!payload.disposalMethod) {

			return "Disposal method is required.";
		}

		if (!payload.authorizedBy) {

			return "Authorized-by name is required for disposal.";
		}
	}

	if (
		payload.actionType ===
		"STOCK_ADJUSTMENT" &&
		!payload.adjustmentReason
	) {

		return "Stock-adjustment reason is required.";
	}

	if (
		payload.actionType ===
		"RETURN_TO_SUPPLIER"
	) {

		if (
			!selectedExpiryBatch
				.supplierId
		) {

			return "Supplier information is unavailable for this stock batch.";
		}

		if (
			!selectedExpiryBatch
				.purchaseId
		) {

			return "Original purchase information is unavailable for this stock batch.";
		}
	}

	return "";
}


function clearExpiryActionForm() {

	setValue(
		"expiryActionStockId",
		""
	);

	setDefaultExpiryActionDate();

	setValue(
		"expiryActionType",
		""
	);

	setValue(
		"expiryActionQuantity",
		"1"
	);

	setValue(
		"expiryDisposalMethod",
		""
	);

	setValue(
		"expiryDisposalLocation",
		""
	);

	setValue(
		"expiryAuthorizedBy",
		""
	);

	setValue(
		"expiryWitnessName",
		""
	);

	setValue(
		"expiryAdjustmentReason",
		""
	);

	setValue(
		"expiryPurchaseReturnId",
		""
	);

	setValue(
		"expiryReferenceNumber",
		""
	);

	setValue(
		"expiryReasonDetails",
		""
	);

	setValue(
		"expiryActionRemarks",
		""
	);

	hideAllExpiryActionFields();

	const card =
		document.getElementById(
			"selectedExpiryBatchCard"
		);

	if (card) {

		card.classList.remove(
			"active"
		);
	}
}


function setDefaultExpiryActionDate() {

	setValue(
		"expiryActionDate",
		getTodayDateString()
	);
}


async function runAutoQuarantine() {

	if (isRunningAutoQuarantine) {
		return;
	}

	if (!expiryPermissions.update) {

		showMsg(
			"You do not have permission to run auto-quarantine."
		);

		return;
	}

	if (
		!Boolean(
			expiryConfiguration
				?.autoQuarantineExpiredStock
		)
	) {

		showMsg(
			"Auto-quarantine is disabled. Enable it in Expiry Configuration first.",
			"warning"
		);

		return;
	}

	const confirmed =
		window.confirm(
			"Automatically quarantine all currently expired, non-quarantined stock?"
		);

	if (!confirmed) {
		return;
	}

	isRunningAutoQuarantine = true;

	setButtonLoading(
		"autoQuarantineBtn",
		"Running...",
		true
	);

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/auto-quarantine` +
			`?tenantId=${encodeURIComponent(tenantId)}`,
			{
				method: "POST"
			}
		);

	isRunningAutoQuarantine = false;

	setButtonLoading(
		"autoQuarantineBtn",
		"Auto Quarantine",
		false
	);

	if (!result.ok) {

		showMsg(
			getExpiryErrorMessage(
				result.data,
				"Unable to run auto-quarantine."
			)
		);

		return;
	}

	const affected =
		typeof result.data === "number"
			? result.data
			: Number(
				result.data?.value ||
				result.data?.count ||
				0
			);

	showMsg(
		`${affected} expired batch${affected === 1 ? "" : "es"} quarantined successfully.`,
		"success"
	);

	await refreshExpiryPage();
}


async function loadExpiryActions() {

	const tbody =
		document.getElementById(
			"expiryActionTableBody"
		);

	if (tbody) {

		tbody.innerHTML = `

			<tr>

				<td colspan="11">

					${buildExpiryLoadingState(
			"Loading expiry action history..."
		)}

				</td>

			</tr>
		`;
	}

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/actions` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		expiryActionList = [];

		renderExpiryActionsError(
			getExpiryErrorMessage(
				result.data,
				"Unable to load expiry actions."
			)
		);

		return;
	}

	expiryActionList =
		normalizeArrayResponse(
			result.data
		);

	renderExpiryActions(
		expiryActionList
	);
}


async function searchExpiryActions() {

	const keyword =
		getValue(
			"expiryActionSearchKeyword"
		);

	if (!keyword) {

		await loadExpiryActions();

		return;
	}

	setButtonLoading(
		"searchExpiryActionBtn",
		"Searching...",
		true
	);

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/actions/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`
		);

	setButtonLoading(
		"searchExpiryActionBtn",
		"Search",
		false
	);

	if (!result.ok) {

		renderExpiryActionsError(
			getExpiryErrorMessage(
				result.data,
				"Unable to search expiry actions."
			)
		);

		return;
	}

	expiryActionList =
		normalizeArrayResponse(
			result.data
		);

	renderExpiryActions(
		expiryActionList
	);
}


function renderExpiryActions(
	actions
) {

	const tbody =
		document.getElementById(
			"expiryActionTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(actions)
			? actions
			: [];

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="11">

					<div class="expiry-state">

						<div class="expiry-state-icon">

							<i class="bi bi-clock-history"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No expiry actions found
						</h5>

						<p class="text-muted mb-0">
							Disposal, quarantine, adjustment and supplier-return actions will appear here.
						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(action, index) {

				return `

					<tr>

						<td>
							${index + 1}
						</td>

						<td>

							<strong class="text-primary">

								${escapeHtml(
					action.actionNumber || "-"
				)}

							</strong>

						</td>

						<td>

							${formatDate(
					action.actionDate
				)}

						</td>

						<td>

							${expiryActionTypeBadge(
					action.actionType
				)}

						</td>

						<td>

							<strong>

								${escapeHtml(
					action.medicineName || "-"
				)}

							</strong>

							<div class="small text-muted">

								Batch:
								${escapeHtml(
					action.batchNumber || "-"
				)}

							</div>

						</td>

						<td>

							${Number(
					action.actionQuantity || 0
				)}

						</td>

						<td>

							${Number(
					action.quantityBefore || 0
				)}

						</td>

						<td>

							${Number(
					action.quantityAfter || 0
				)}

						</td>

						<td>

							${formatCurrency(
					action.stockValue
				)}

						</td>

						<td>

							${expiryActionStatusBadge(
					action.actionStatus
				)}

						</td>

						<td>

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="showExpiryActionDetails(${Number(action.id)})">

								<i class="bi bi-eye me-1"></i>
								View

							</button>

						</td>

					</tr>
				`;
			}
		)
			.join("");
}


function renderExpiryActionsError(
	message
) {

	const tbody =
		document.getElementById(
			"expiryActionTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="11">

				<div class="expiry-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<p class="text-muted mt-3 mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


async function showExpiryActionDetails(
	actionId
) {

	const content =
		document.getElementById(
			"expiryActionDetailsContent"
		);

	if (content) {

		content.innerHTML =
			buildExpiryLoadingState(
				"Loading expiry action details..."
			);
	}

	if (expiryActionDetailsModal) {

		expiryActionDetailsModal.show();
	}

	const tenantId =
		getCurrentTenantId();

	const result =
		await expiryApiRequest(
			`${API_BASE}/saas/expiry-management/actions/${encodeURIComponent(actionId)}` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		renderExpiryActionDetailsError(
			getExpiryErrorMessage(
				result.data,
				"Unable to load expiry action details."
			)
		);

		return;
	}

	renderExpiryActionDetails(
		result.data || {}
	);
}


function renderExpiryActionDetails(
	action
) {

	const content =
		document.getElementById(
			"expiryActionDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="row g-3">

			${buildExpiryDetailCard(
		"Action Number",
		escapeHtml(
			action.actionNumber || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Action Date",
		formatDate(
			action.actionDate
		)
	)}

			${buildExpiryDetailCard(
		"Action Type",
		formatEnumText(
			action.actionType
		)
	)}

			${buildExpiryDetailCard(
		"Status",
		formatEnumText(
			action.actionStatus
		)
	)}

			${buildExpiryDetailCard(
		"Medicine",
		escapeHtml(
			action.medicineName || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Batch Number",
		escapeHtml(
			action.batchNumber || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Expiry Date",
		formatDate(
			action.expiryDate
		)
	)}

			${buildExpiryDetailCard(
		"Action Quantity",
		Number(
			action.actionQuantity || 0
		)
	)}

			${buildExpiryDetailCard(
		"Quantity Before",
		Number(
			action.quantityBefore || 0
		)
	)}

			${buildExpiryDetailCard(
		"Quantity After",
		Number(
			action.quantityAfter || 0
		)
	)}

			${buildExpiryDetailCard(
		"Purchase Rate",
		formatCurrency(
			action.purchaseRate
		)
	)}

			${buildExpiryDetailCard(
		"Stock Value",
		formatCurrency(
			action.stockValue
		)
	)}

			${buildExpiryDetailCard(
		"Supplier",
		escapeHtml(
			action.supplierName || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Purchase Number",
		escapeHtml(
			action.purchaseNumber || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Purchase Return",
		escapeHtml(
			action.purchaseReturnNumber || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Disposal Method",
		formatEnumText(
			action.disposalMethod
		)
	)}

			${buildExpiryDetailCard(
		"Adjustment Reason",
		formatEnumText(
			action.adjustmentReason
		)
	)}

			${buildExpiryDetailCard(
		"Reference Number",
		escapeHtml(
			action.referenceNumber || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Authorized By",
		escapeHtml(
			action.authorizedBy || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Witness",
		escapeHtml(
			action.witnessName || "-"
		)
	)}

			${buildExpiryDetailCard(
		"Disposal Location",
		escapeHtml(
			action.disposalLocation || "-"
		)
	)}

		</div>

		${action.reasonDetails
			? `
				<div class="expiry-detail-card mt-3">

					<span class="expiry-detail-label">
						Reason Details
					</span>

					<div class="expiry-detail-value">

						${escapeHtml(
				action.reasonDetails
			)}

					</div>

				</div>
			`
			: ""
		}

		${action.remarks
			? `
				<div class="expiry-detail-card mt-3">

					<span class="expiry-detail-label">
						Remarks
					</span>

					<div class="expiry-detail-value">

						${escapeHtml(
				action.remarks
			)}

					</div>

				</div>
			`
			: ""
		}
	`;
}


function buildExpiryDetailCard(
	label,
	value
) {

	return `

		<div class="col-md-4">

			<div class="expiry-detail-card h-100">

				<span class="expiry-detail-label">

					${escapeHtml(label)}

				</span>

				<div class="expiry-detail-value">

					${value}

				</div>

			</div>

		</div>
	`;
}


function renderExpiryActionDetailsError(
	message
) {

	const content =
		document.getElementById(
			"expiryActionDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="expiry-state text-danger">

			<i class="bi bi-exclamation-triangle-fill fs-1"></i>

			<h5 class="fw-bold mt-3">
				Unable to load action details
			</h5>

			<p class="text-muted mb-0">

				${escapeHtml(message)}

			</p>

		</div>
	`;
}


function expiryStatusBadge(
	status
) {

	const normalized =
		String(status || "")
			.trim()
			.toUpperCase();

	switch (normalized) {

		case "EXPIRED":

			return `

				<span class="expiry-status expired">

					<i class="bi bi-calendar-x-fill"></i>
					Expired

				</span>
			`;

		case "EXPIRES_TODAY":

			return `

				<span class="expiry-status today">

					<i class="bi bi-calendar-event-fill"></i>
					Expires Today

				</span>
			`;

		case "CRITICAL":

			return `

				<span class="expiry-status critical">

					<i class="bi bi-exclamation-octagon-fill"></i>
					Critical

				</span>
			`;

		case "NEAR_EXPIRY":

			return `

				<span class="expiry-status near">

					<i class="bi bi-clock-history"></i>
					Near Expiry

				</span>
			`;

		case "SAFE":

			return `

				<span class="expiry-status safe">

					<i class="bi bi-check-circle-fill"></i>
					Safe

				</span>
			`;

		default:

			return `

				<span class="expiry-status none">

					<i class="bi bi-question-circle-fill"></i>
					No Expiry Date

				</span>
			`;
	}
}


function expiryActionTypeBadge(
	actionType
) {

	const normalized =
		String(actionType || "")
			.toUpperCase();

	const config = {

		QUARANTINE: {
			icon:
				"bi-shield-lock-fill",
			label:
				"Quarantine",
			className:
				"text-bg-warning"
		},

		RELEASE_FROM_QUARANTINE: {
			icon:
				"bi-shield-check",
			label:
				"Release",
			className:
				"text-bg-success"
		},

		DISPOSAL: {
			icon:
				"bi-trash3-fill",
			label:
				"Disposal",
			className:
				"text-bg-danger"
		},

		STOCK_ADJUSTMENT: {
			icon:
				"bi-sliders",
			label:
				"Adjustment",
			className:
				"text-bg-secondary"
		},

		RETURN_TO_SUPPLIER: {
			icon:
				"bi-truck",
			label:
				"Supplier Return",
			className:
				"text-bg-primary"
		}
	};

	const selected =
		config[normalized] || {
			icon:
				"bi-clock-history",
			label:
				formatEnumText(normalized),
			className:
				"text-bg-light"
		};

	return `

		<span class="badge ${selected.className}">

			<i class="bi ${selected.icon} me-1"></i>

			${escapeHtml(
		selected.label
	)}

		</span>
	`;
}


function expiryActionStatusBadge(
	status
) {

	if (
		String(status || "")
			.toUpperCase() ===
		"CANCELLED"
	) {

		return `

			<span class="expiry-action-badge cancelled">

				<i class="bi bi-x-circle-fill"></i>
				Cancelled

			</span>
		`;
	}

	return `

		<span class="expiry-action-badge posted">

			<i class="bi bi-check-circle-fill"></i>
			Posted

		</span>
	`;
}


function formatDaysToExpiry(
	value
) {

	if (
		value === null ||
		value === undefined ||
		value === ""
	) {

		return "Expiry not available";
	}

	const days =
		Number(value);

	if (!Number.isFinite(days)) {

		return "-";
	}

	if (days < 0) {

		const expiredDays =
			Math.abs(days);

		return (
			`Expired ${expiredDays} ` +
			`day${expiredDays === 1 ? "" : "s"} ago`
		);
	}

	if (days === 0) {

		return "Expires today";
	}

	return (
		`${days} day${days === 1 ? "" : "s"} remaining`
	);
}


function buildExpiryLoadingState(
	message
) {

	return `

		<div class="expiry-state">

			<div class="spinner-border text-primary"
				 role="status">
			</div>

			<p class="text-muted mt-3 mb-0">

				${escapeHtml(message)}

			</p>

		</div>
	`;
}


async function expiryApiRequest(
	url,
	options = {}
) {

	const token =
		getCurrentToken();

	const headers = {

		"Accept":
			"application/json",

		...(options.headers || {})
	};

	if (token) {

		headers.Authorization =
			"Bearer " + token;
	}

	try {

		const response =
			await fetch(
				url,
				{
					...options,
					headers
				}
			);

		const data =
			await readExpiryResponse(
				response
			);

		if (
			response.status === 401
		) {

			console.warn(
				"Expiry API authentication failed."
			);
		}

		return {
			ok:
				response.ok,

			status:
				response.status,

			data
		};

	} catch (error) {

		console.error(
			"Expiry API error:",
			error
		);

		return {
			ok:
				false,

			status:
				0,

			data: {
				message:
					"Expiry management service is not reachable."
			}
		};
	}
}


async function readExpiryResponse(
	response
) {

	try {

		const text =
			await response.text();

		if (!text.trim()) {
			return {};
		}

		try {

			return JSON.parse(
				text
			);

		} catch (error) {

			return {
				message:
					text
			};
		}

	} catch (error) {

		return {};
	}
}


function normalizeArrayResponse(
	data
) {

	if (Array.isArray(data)) {
		return data;
	}

	if (
		data &&
		Array.isArray(data.content)
	) {
		return data.content;
	}

	if (
		data &&
		Array.isArray(data.data)
	) {
		return data.data;
	}

	if (
		data &&
		Array.isArray(data.items)
	) {
		return data.items;
	}

	if (
		data &&
		Array.isArray(data.results)
	) {
		return data.results;
	}

	return [];
}


function getExpiryErrorMessage(
	data,
	fallback
) {

	if (!data) {
		return fallback;
	}

	if (
		typeof data === "string"
	) {
		return data;
	}

	if (
		Array.isArray(
			data.errors
		) &&
		data.errors.length
	) {

		return data.errors
			.map(
				function(error) {

					return (
						error.defaultMessage ||
						error.message ||
						String(error)
					);
				}
			)
			.join(", ");
	}

	return (
		data.message ||
		data.error ||
		data.detail ||
		fallback
	);
}


function getCurrentTenantId() {

	const directTenantId =
		localStorage.getItem(
			"tenantId"
		);

	if (
		directTenantId &&
		Number(directTenantId) > 0
	) {

		return Number(
			directTenantId
		);
	}

	const selectedTenantId =
		localStorage.getItem(
			"selectedTenantId"
		);

	if (
		selectedTenantId &&
		Number(selectedTenantId) > 0
	) {

		return Number(
			selectedTenantId
		);
	}

	const selectedTenant =
		parseJsonSafely(
			localStorage.getItem(
				"selectedTenant"
			)
		);

	const nestedTenantId =
		selectedTenant?.id ||
		selectedTenant?.tenantId;

	return nestedTenantId
		? Number(nestedTenantId)
		: 0;
}


function getCurrentTenantName() {

	const tenantName =
		localStorage.getItem(
			"tenantName"
		);

	if (tenantName) {
		return tenantName;
	}

	const selectedTenant =
		parseJsonSafely(
			localStorage.getItem(
				"selectedTenant"
			)
		);

	return (
		selectedTenant?.tenantName ||
		selectedTenant?.name ||
		"your workspace"
	);
}


function getCurrentTenantType() {

	const tenantType =
		localStorage.getItem(
			"tenantType"
		);

	if (tenantType) {
		return tenantType;
	}

	const selectedTenant =
		parseJsonSafely(
			localStorage.getItem(
				"selectedTenant"
			)
		);

	return (
		selectedTenant?.tenantType ||
		selectedTenant?.type ||
		"Workspace"
	);
}


function getCurrentToken() {

	return (
		localStorage.getItem(
			"token"
		) ||
		localStorage.getItem(
			"accessToken"
		) ||
		localStorage.getItem(
			"jwtToken"
		) ||
		""
	);
}


function parseJsonSafely(
	value
) {

	if (!value) {
		return null;
	}

	try {

		return JSON.parse(
			value
		);

	} catch (error) {

		return null;
	}
}


function getValue(
	id
) {

	const element =
		document.getElementById(
			id
		);

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
		document.getElementById(
			id
		);

	if (!element) {
		return;
	}

	element.value =
		value === null ||
			value === undefined
			? ""
			: value;
}


function getNumberValue(
	id
) {

	const value =
		Number(
			getValue(id)
		);

	return Number.isFinite(value)
		? value
		: 0;
}


function getOptionalNumberValue(
	id
) {

	const rawValue =
		getValue(id);

	if (!rawValue) {
		return null;
	}

	const value =
		Number(rawValue);

	return Number.isFinite(value)
		? value
		: null;
}


function setText(
	id,
	value
) {

	const element =
		document.getElementById(
			id
		);

	if (!element) {
		return;
	}

	element.textContent =
		value === null ||
			value === undefined
			? ""
			: value;
}


function isChecked(
	id
) {

	const element =
		document.getElementById(
			id
		);

	return Boolean(
		element?.checked
	);
}


function setChecked(
	id,
	checked
) {

	const element =
		document.getElementById(
			id
		);

	if (!element) {
		return;
	}

	element.checked =
		Boolean(checked);
}


function showOrHideById(
	id,
	visible
) {

	const element =
		document.getElementById(
			id
		);

	if (!element) {
		return;
	}

	element.style.display =
		visible
			? ""
			: "none";
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
		document.getElementById(
			id
		);

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
		450;

	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {

		element.textContent =
			String(target);

		return;
	}

	function update(
		currentTime
	) {

		const progress =
			Math.min(
				(currentTime - startTime) /
				duration,
				1
			);

		const eased =
			1 -
			Math.pow(
				1 - progress,
				3
			);

		element.textContent =
			String(
				Math.round(
					start +
					difference *
					eased
				)
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


function getTodayDateString() {

	const now =
		new Date();

	const localDate =
		new Date(
			now.getTime() -
			now.getTimezoneOffset() *
			60000
		);

	return localDate
		.toISOString()
		.substring(
			0,
			10
		);
}


function formatTenantType(
	value
) {

	const normalized =
		String(value || "")
			.trim()
			.toUpperCase();

	switch (normalized) {

		case "WHOLESALER":
			return "Wholesaler";

		case "RETAILER":
			return "Retailer";

		case "HOSPITAL":
			return "Hospital";

		case "CLINIC":
			return "Clinic";

		case "DOCTOR":
			return "Doctor";

		default:
			return "Workspace";
	}
}


function formatCurrency(
	value
) {

	return new Intl.NumberFormat(
		"en-IN",
		{
			style:
				"currency",

			currency:
				"INR",

			maximumFractionDigits:
				2
		}
	).format(
		Number(value || 0)
	);
}


function formatDate(
	value
) {

	if (!value) {
		return "-";
	}

	const normalized =
		String(value)
			.substring(
				0,
				10
			);

	const parts =
		normalized.split("-");

	if (parts.length !== 3) {
		return "-";
	}

	const year =
		Number(parts[0]);

	const month =
		Number(parts[1]);

	const day =
		Number(parts[2]);

	const date =
		new Date(
			year,
			month - 1,
			day
		);

	if (
		Number.isNaN(
			date.getTime()
		)
	) {
		return "-";
	}

	return date.toLocaleDateString(
		"en-IN"
	);
}


function formatEnumText(
	value
) {

	if (!value) {
		return "-";
	}

	return String(value)
		.toLowerCase()
		.replace(
			/_/g,
			" "
		)
		.replace(
			/\b\w/g,
			function(character) {

				return character
					.toUpperCase();
			}
		);
}


function showMsg(
	message,
	type = "danger"
) {

	const element =
		document.getElementById(
			"msg"
		);

	if (!element) {

		alert(message);

		return;
	}

	element.innerHTML = `

		<div class="alert alert-${escapeHtml(type)} alert-dismissible fade show"
			 role="alert">

			${escapeHtml(message)}

			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert">
			</button>

		</div>
	`;

	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}


function escapeHtml(
	value
) {

	return String(
		value ?? ""
	)
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
			/'/g,
			"&#039;"
		);
}


function escapeJsString(
	value
) {

	return String(
		value ?? ""
	)
		.replace(
			/\\/g,
			"\\\\"
		)
		.replace(
			/'/g,
			"\\'"
		)
		.replace(
			/\r/g,
			""
		)
		.replace(
			/\n/g,
			"\\n"
		);
}