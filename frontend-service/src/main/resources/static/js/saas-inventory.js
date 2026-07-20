let inventoryStocks = [];
let tenantMedicines = [];
let tenantSuppliers = [];

let currentInventoryFilter = "ALL";
let inventorySearchActive = false;

let isLoadingInventory = false;
let isSavingManualStock = false;
let isSavingAdjustment = false;

let addStockModal = null;
let adjustmentModal = null;
let stockDetailsModal = null;
let movementsModal = null;

let inventoryPermissions = {
	create: false,
	update: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"INVENTORY",
				"VIEW"
			);

		if (!allowed) {
			return;
		}

		const tenantId =
			localStorage.getItem(
				"tenantId"
			);

		if (!tenantId) {

			alert(
				"Please select SaaS workspace first."
			);

			window.location.href =
				"/saas/workspaces";

			return;
		}

		initializeInventoryPage();

		initializeInventoryModals();

		await loadInventoryPermissions();

		await Promise.all([
			loadTenantMedicines(),
			loadTenantSuppliers(),
			loadInventorySummary(),
			loadInventoryStocks()
		]);

		const searchInput =
			document.getElementById(
				"inventorySearchKeyword"
			);

		if (searchInput) {

			searchInput.addEventListener(
				"keydown",
				function(event) {

					if (event.key === "Enter") {

						event.preventDefault();

						searchInventory();
					}
				}
			);
		}
	}
);


function initializeInventoryPage() {

	const tenantName =
		localStorage.getItem(
			"tenantName"
		) || "your workspace";

	const tenantType =
		localStorage.getItem(
			"tenantType"
		) || "Workspace";

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


function initializeInventoryModals() {

	const addStockElement =
		document.getElementById(
			"addStockModal"
		);

	const adjustmentElement =
		document.getElementById(
			"stockAdjustmentModal"
		);

	const stockDetailsElement =
		document.getElementById(
			"stockDetailsModal"
		);

	const movementsElement =
		document.getElementById(
			"stockMovementsModal"
		);

	if (addStockElement) {

		addStockModal =
			new bootstrap.Modal(
				addStockElement
			);
	}

	if (adjustmentElement) {

		adjustmentModal =
			new bootstrap.Modal(
				adjustmentElement
			);
	}

	if (stockDetailsElement) {

		stockDetailsModal =
			new bootstrap.Modal(
				stockDetailsElement
			);
	}

	if (movementsElement) {

		movementsModal =
			new bootstrap.Modal(
				movementsElement
			);
	}
}


async function loadInventoryPermissions() {

	const [
		canCreate,
		canUpdate
	] = await Promise.all([

		hasSaasPermission(
			"INVENTORY",
			"CREATE"
		),

		hasSaasPermission(
			"INVENTORY",
			"UPDATE"
		)
	]);

	inventoryPermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate)
	};

	showOrHideById(
		"addStockBtn",
		inventoryPermissions.create
	);

	applyInventoryActionVisibility();
}


async function loadTenantMedicines() {

	const tenantId =
		localStorage.getItem("tenantId");

	if (!tenantId) {

		tenantMedicines = [];

		populateMedicineDropdown();

		return false;
	}

	/*
	 * IMPORTANT:
	 * Yahan Medicine Master ka wahi exact endpoint use karein
	 * jo Purchase page mein medicines return kar raha hai.
	 */
	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/medicine-master` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		tenantMedicines = [];

		console.error(
			"Unable to load tenant medicines:",
			{
				status: result.status,
				response: result.data
			}
		);

		showMsg(
			getInventoryErrorMessage(
				result.data,
				"Unable to load medicines from Medicine Master."
			)
		);

		populateMedicineDropdown();

		return false;
	}

	const responseData =
		result.data;

	if (Array.isArray(responseData)) {

		tenantMedicines =
			responseData;

	} else if (
		responseData &&
		Array.isArray(responseData.medicines)
	) {

		tenantMedicines =
			responseData.medicines;

	} else if (
		responseData &&
		Array.isArray(responseData.content)
	) {

		tenantMedicines =
			responseData.content;

	} else if (
		responseData &&
		Array.isArray(responseData.data)
	) {

		tenantMedicines =
			responseData.data;

	} else if (
		responseData &&
		Array.isArray(responseData.items)
	) {

		tenantMedicines =
			responseData.items;

	} else {

		tenantMedicines = [];
	}

	console.log(
		"Loaded inventory tenant medicines:",
		tenantMedicines
	);

	populateMedicineDropdown();

	return tenantMedicines.length > 0;
}


async function loadTenantSuppliers() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	if (!tenantId) {

		tenantSuppliers = [];

		populateSupplierDropdown();

		return false;
	}

	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/suppliers` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&activeOnly=true`
		);

	if (!result.ok) {

		tenantSuppliers = [];

		console.error(
			"Unable to load tenant suppliers:",
			{
				status: result.status,
				response: result.data
			}
		);

		populateSupplierDropdown();

		return false;
	}

	const responseData =
		result.data;

	if (Array.isArray(responseData)) {

		tenantSuppliers =
			responseData;

	} else if (
		responseData &&
		Array.isArray(responseData.suppliers)
	) {

		tenantSuppliers =
			responseData.suppliers;

	} else if (
		responseData &&
		Array.isArray(responseData.content)
	) {

		tenantSuppliers =
			responseData.content;

	} else if (
		responseData &&
		Array.isArray(responseData.data)
	) {

		tenantSuppliers =
			responseData.data;

	} else if (
		responseData &&
		Array.isArray(responseData.items)
	) {

		tenantSuppliers =
			responseData.items;

	} else {

		tenantSuppliers = [];
	}

	console.log(
		"Loaded inventory suppliers:",
		tenantSuppliers
	);

	populateSupplierDropdown();

	return tenantSuppliers.length > 0;
}


function populateSupplierDropdown() {

	const select =
		document.getElementById(
			"stockSupplierName"
		);

	if (!select) {
		return;
	}

	select.innerHTML = `
		<option value="">
			Select Supplier
		</option>
	`;

	tenantSuppliers.forEach(
		function(supplier) {

			const supplierName =
				String(
					supplier.supplierName ||
					supplier.name ||
					supplier.businessName ||
					""
				).trim();

			if (!supplierName) {
				return;
			}

			const details = [
				supplier.mobile,
				supplier.city
			]
				.filter(
					function(value) {

						return Boolean(
							String(
								value || ""
							).trim()
						);
					}
				)
				.join(" - ");

			const option =
				document.createElement(
					"option"
				);

			option.value =
				supplierName;

			option.textContent =
				supplierName +
				(
					details
						? ` (${details})`
						: ""
				);

			select.appendChild(
				option
			);
		}
	);
}
function getTenantMedicineId(medicine) {

	return Number(
		medicine?.tenantMedicineId ??
		medicine?.saasMedicineId ??
		medicine?.workspaceMedicineId ??
		medicine?.id ??
		medicine?.medicineId ??
		0
	);
}


function populateMedicineDropdown() {

	const select =
		document.getElementById(
			"stockMedicineId"
		);

	if (!select) {
		return;
	}

	select.innerHTML = `
		<option value="">
			Select Medicine
		</option>
	`;

	tenantMedicines.forEach(
		function(medicine) {

			const tenantMedicineId =
				getTenantMedicineId(
					medicine
				);

			if (!tenantMedicineId) {

				console.warn(
					"Medicine skipped because tenant medicine ID is missing:",
					medicine
				);

				return;
			}

			const details = [
				medicine.strength,
				medicine.unit,
				medicine.manufacturer
			]
				.filter(
					function(value) {

						return Boolean(
							String(
								value || ""
							).trim()
						);
					}
				)
				.join(" - ");

			const option =
				document.createElement(
					"option"
				);

			option.value =
				String(
					tenantMedicineId
				);

			option.textContent =
				(medicine.medicineName || medicine.name || medicine.brandName || "Medicine") +
				(
					details
						? ` (${details})`
						: ""
				);

			select.appendChild(
				option
			);
		}
	);
}


async function loadInventorySummary() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/inventory/summary` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		resetInventorySummary();

		return;
	}

	const summary =
		result.data || {};

	setAnimatedInventoryNumber(
		"totalMedicines",
		summary.totalMedicines
	);

	setAnimatedInventoryNumber(
		"totalBatches",
		summary.totalBatches
	);

	setAnimatedInventoryNumber(
		"totalAvailableQuantity",
		summary.totalAvailableQuantity
	);

	setAnimatedInventoryNumber(
		"lowStockBatches",
		summary.lowStockBatches
	);

	setAnimatedInventoryNumber(
		"expiredBatches",
		summary.expiredBatches
	);

	setAnimatedInventoryNumber(
		"nearExpiryBatches",
		summary.nearExpiryBatches
	);

	setText(
		"totalPurchaseValue",
		formatInventoryCurrency(
			summary.totalPurchaseValue
		)
	);

	setText(
		"totalSaleValue",
		formatInventoryCurrency(
			summary.totalSaleValue
		)
	);
}


function resetInventorySummary() {

	[
		"totalMedicines",
		"totalBatches",
		"totalAvailableQuantity",
		"lowStockBatches",
		"expiredBatches",
		"nearExpiryBatches"
	].forEach(
		function(id) {

			setText(
				id,
				"0"
			);
		}
	);

	setText(
		"totalPurchaseValue",
		formatInventoryCurrency(0)
	);

	setText(
		"totalSaleValue",
		formatInventoryCurrency(0)
	);
}


async function loadInventoryStocks() {

	if (isLoadingInventory) {
		return;
	}

	isLoadingInventory = true;

	currentInventoryFilter =
		"ALL";

	inventorySearchActive =
		false;

	setActiveInventoryFilterButton(
		"ALL"
	);

	updateInventoryListHeading(
		"Batch Inventory",
		"All Stock Batches"
	);

	showInventoryLoadingState();

	setButtonLoading(
		"refreshInventoryBtn",
		"Refreshing...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/inventory/stocks` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		inventoryStocks = [];

		const message =
			getInventoryErrorMessage(
				result.data,
				"Unable to load inventory."
			);

		showInventoryErrorState(
			message
		);

		showMsg(message);

	} else {

		inventoryStocks =
			Array.isArray(result.data)
				? result.data
				: [];

		renderInventoryStocks(
			inventoryStocks
		);
	}

	isLoadingInventory = false;

	setButtonLoading(
		"refreshInventoryBtn",
		"Refresh",
		false
	);
}


async function applyInventoryFilter(
	filter
) {

	currentInventoryFilter =
		filter;

	inventorySearchActive =
		false;

	setValue(
		"inventorySearchKeyword",
		""
	);

	setActiveInventoryFilterButton(
		filter
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	let url =
		`${API_BASE}/saas/inventory/stocks` +
		`?tenantId=${encodeURIComponent(tenantId)}`;

	let eyebrow =
		"Batch Inventory";

	let title =
		"All Stock Batches";

	if (filter === "LOW") {

		url =
			`${API_BASE}/saas/inventory/stocks/low` +
			`?tenantId=${encodeURIComponent(tenantId)}`;

		eyebrow =
			"Reorder Attention";

		title =
			"Low Stock Batches";
	}

	if (filter === "EXPIRED") {

		url =
			`${API_BASE}/saas/inventory/stocks/expired` +
			`?tenantId=${encodeURIComponent(tenantId)}`;

		eyebrow =
			"Expired Inventory";

		title =
			"Expired Stock Batches";
	}

	if (filter === "NEAR_EXPIRY") {

		const days =
			getSafeNearExpiryDays();

		url =
			`${API_BASE}/saas/inventory/stocks/near-expiry` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&days=${encodeURIComponent(days)}`;

		eyebrow =
			"Expiry Monitoring";

		title =
			`Expiring Within ${days} Days`;
	}

	updateInventoryListHeading(
		eyebrow,
		title
	);

	showInventoryLoadingState();

	const result =
		await inventoryApiRequest(url);

	if (!result.ok) {

		showInventoryErrorState(
			getInventoryErrorMessage(
				result.data,
				"Unable to apply inventory filter."
			)
		);

		return;
	}

	renderInventoryStocks(
		Array.isArray(result.data)
			? result.data
			: []
	);
}


async function handleNearExpiryDaysChange() {

	const days =
		getSafeNearExpiryDays();

	setValue(
		"nearExpiryDays",
		days
	);

	if (
		currentInventoryFilter ===
		"NEAR_EXPIRY"
	) {

		await applyInventoryFilter(
			"NEAR_EXPIRY"
		);
	}
}


function getSafeNearExpiryDays() {

	let days =
		parseInt(
			getValue(
				"nearExpiryDays"
			),
			10
		);

	if (
		!Number.isFinite(days) ||
		days < 1
	) {
		days = 90;
	}

	if (days > 730) {
		days = 730;
	}

	return days;
}


async function searchInventory() {

	const keyword =
		getValue(
			"inventorySearchKeyword"
		);

	if (!keyword) {

		await applyInventoryFilter(
			currentInventoryFilter
		);

		return;
	}

	inventorySearchActive =
		true;

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	showInventoryLoadingState();

	setButtonLoading(
		"searchInventoryBtn",
		"Searching...",
		true
	);

	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/inventory/stocks/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`
		);

	setButtonLoading(
		"searchInventoryBtn",
		"Search",
		false
	);

	if (!result.ok) {

		showInventoryErrorState(
			getInventoryErrorMessage(
				result.data,
				"Unable to search inventory."
			)
		);

		return;
	}

	updateInventoryListHeading(
		"Inventory Search",
		`Results for "${keyword}"`
	);

	renderInventoryStocks(
		Array.isArray(result.data)
			? result.data
			: []
	);
}


async function refreshInventory() {

	setValue(
		"inventorySearchKeyword",
		""
	);

	await Promise.all([
		loadInventorySummary(),
		applyInventoryFilter(
			currentInventoryFilter
		)
	]);
}


function renderInventoryStocks(
	stocks
) {

	const tbody =
		document.getElementById(
			"inventoryTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(stocks)
			? stocks
			: [];

	if (!list.length) {

		tbody.innerHTML = `
			<tr>

				<td colspan="10">

					<div class="inventory-state">

						<div class="inventory-state-icon">

							<i class="bi bi-box-seam"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No inventory records found
						</h5>

						<p class="text-muted mb-0">
							No stock batches match the selected filter or search.
						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(stock, index) {

				const status =
					resolveInventoryStatus(
						stock
					);

				return `
					<tr>

						<td>

							<strong>
								${index + 1}
							</strong>

						</td>

						<td>

							<div class="inventory-medicine-profile">

								<div class="inventory-medicine-icon">

									<i class="bi bi-capsule-pill"></i>

								</div>

								<div>

									<strong class="text-primary">

										${safeInventoryText(
					stock.medicineName
				)}

									</strong>

									<div class="small text-muted">

										${safeInventoryText(
					buildMedicineDetail(
						stock
					)
				)}

									</div>

								</div>

							</div>

						</td>

						<td>

							<span class="inventory-chip">

								<i class="bi bi-upc-scan"></i>

								${safeInventoryText(
					stock.batchNumber
				)}

							</span>

						</td>

						<td>

							<div>

								<strong>
									${formatInventoryDate(
					stock.expiryDate
				)}
								</strong>

							</div>

							<div class="small text-muted">

								Mfg:
								${formatInventoryDate(
					stock.manufacturingDate
				)}

							</div>

						</td>

						<td>

							<span class="inventory-stock-quantity">

								${Number(
					stock.currentQuantity || 0
				)}

							</span>

							<div class="small text-muted mt-1">

								Opening:
								${Number(
					stock.openingQuantity || 0
				)}

							</div>

						</td>

						<td>

							<strong>

								${formatInventoryCurrency(
					stock.purchasePrice
				)}

							</strong>

							<div class="small text-muted">

								GST:
								${formatInventoryPercentage(
					stock.gstPercentage
				)}

							</div>

						</td>

						<td>

							<div>

								<strong>

									${formatInventoryCurrency(
					stock.salePrice
				)}

								</strong>

							</div>

							<div class="small text-muted">

								MRP:
								${formatInventoryCurrency(
					stock.mrp
				)}

							</div>

						</td>

						<td>

							<div>

								<strong>

									${safeInventoryText(
					stock.supplierName
				)}

								</strong>

							</div>

							<div class="small text-muted">

								Purchase:
								${stock.lastPurchaseId
						? "#" +
						escapeInventoryHtml(
							stock.lastPurchaseId
						)
						: "-"
					}

							</div>

						</td>

						<td>

							${inventoryStatusBadge(
						status
					)}

						</td>

						<td>

							<div class="inventory-actions">

								<button type="button"
										class="btn btn-sm btn-outline-primary"
										onclick="showStockDetails(${Number(stock.id)})">

									<i class="bi bi-eye"></i>
									View

								</button>

								<button type="button"
										class="btn btn-sm btn-outline-secondary"
										onclick="openStockMovements(${Number(stock.id)})">

									<i class="bi bi-clock-history"></i>
									History

								</button>

								<button type="button"
										class="btn btn-sm btn-outline-success adjustment-action-btn"
										onclick="openStockAdjustment(${Number(stock.id)})">

									<i class="bi bi-arrow-left-right"></i>
									Adjust

								</button>

							</div>

						</td>

					</tr>
				`;
			}
		)
			.join("");

	applyInventoryActionVisibility();
}


function resolveInventoryStatus(
	stock
) {

	if (
		Boolean(stock.expired)
	) {
		return "EXPIRED";
	}

	if (
		isNearExpiryStock(stock)
	) {
		return "NEAR_EXPIRY";
	}

	if (
		Boolean(stock.lowStock)
	) {
		return "LOW";
	}

	return "NORMAL";
}


function isNearExpiryStock(
	stock
) {

	if (
		!stock.expiryDate ||
		Boolean(stock.expired)
	) {
		return false;
	}

	const expiryDate =
		new Date(
			stock.expiryDate +
			"T00:00:00"
		);

	const today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	const limitDate =
		new Date(today);

	limitDate.setDate(
		limitDate.getDate() +
		getSafeNearExpiryDays()
	);

	return (
		expiryDate >= today &&
		expiryDate <= limitDate
	);
}


function inventoryStatusBadge(
	status
) {

	if (status === "EXPIRED") {

		return `
			<span class="inventory-status expired">

				<i class="bi bi-calendar-x-fill"></i>
				Expired

			</span>
		`;
	}

	if (status === "NEAR_EXPIRY") {

		return `
			<span class="inventory-status near-expiry">

				<i class="bi bi-calendar2-week-fill"></i>
				Near Expiry

			</span>
		`;
	}

	if (status === "LOW") {

		return `
			<span class="inventory-status low">

				<i class="bi bi-exclamation-circle-fill"></i>
				Low Stock

			</span>
		`;
	}

	return `
		<span class="inventory-status normal">

			<i class="bi bi-check-circle-fill"></i>
			Available

		</span>
	`;
}


function applyInventoryActionVisibility() {

	document
		.querySelectorAll(
			".adjustment-action-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					inventoryPermissions.update
						? ""
						: "none";
			}
		);
}


async function openAddStockModal() {

	if (!inventoryPermissions.create) {

		showMsg(
			"You do not have permission to add inventory stock."
		);

		return;
	}

	clearManualStockForm();

	hideAddStockFormAlert();

	setButtonLoading(
		"addStockBtn",
		"Loading...",
		true
	);

	await Promise.all([
		loadTenantMedicines(),
		loadTenantSuppliers()
	]);

	setButtonLoading(
		"addStockBtn",
		"Add Stock",
		false
	);

	if (!tenantMedicines.length) {

		showMsg(
			"No medicine was found in Medicine Master for this workspace."
		);

		return;
	}

	populateMedicineDropdown();

	populateSupplierDropdown();

	if (addStockModal) {
		addStockModal.show();
	}
}


async function saveManualStock() {

	if (isSavingManualStock) {
		return;
	}

	if (!inventoryPermissions.create) {

		showAddStockFormAlert(
			"You do not have permission to add inventory stock."
		);

		return;
	}

	hideAddStockFormAlert();

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const payload = {

		tenantId:
			Number(tenantId),

		medicineId:
			getInventoryNumberValue(
				"stockMedicineId"
			),

		batchNumber:
			getValue(
				"stockBatchNumber"
			),

		manufacturingDate:
			getValue(
				"stockManufacturingDate"
			) || null,

		expiryDate:
			getValue(
				"stockExpiryDate"
			) || null,

		quantity:
			getInventoryIntegerValue(
				"stockQuantity"
			),

		purchasePrice:
			getInventoryNumberValue(
				"stockPurchasePrice"
			),

		salePrice:
			getInventoryNumberValue(
				"stockSalePrice"
			),

		mrp:
			getInventoryNumberValue(
				"stockMrp"
			),

		gstPercentage:
			getInventoryNumberValue(
				"stockGstPercentage"
			),

		supplierName:
			getValue(
				"stockSupplierName"
			)
	};

	console.log(
		"Saving manual stock payload:",
		payload
	);

	console.log(
		"Selected tenant medicine:",
		tenantMedicines.find(
			function(medicine) {

				return (
					getTenantMedicineId(
						medicine
					) ===
					Number(
						payload.medicineId
					)
				);
			}
		)
	);

	const validationMessage =
		validateManualStockPayload(
			payload
		);

	if (validationMessage) {

		showAddStockFormAlert(
			validationMessage,
			"danger"
		);

		return;
	}

	isSavingManualStock =
		true;

	setButtonLoading(
		"saveStockBtn",
		"Saving Stock...",
		true
	);

	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/inventory/stocks`,
			{
				method:
					"POST",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify(payload)
			}
		);

	isSavingManualStock =
		false;

	setButtonLoading(
		"saveStockBtn",
		"Save Stock",
		false
	);

	if (!result.ok) {

		showAddStockFormAlert(
			getInventoryErrorMessage(
				result.data,
				"Unable to save stock."
			),
			"danger"
		);

		return;
	}

	if (addStockModal) {
		addStockModal.hide();
	}

	showMsg(
		"Stock added successfully.",
		"success"
	);

	clearManualStockForm();

	await Promise.all([
		loadInventorySummary(),
		applyInventoryFilter(
			currentInventoryFilter
		)
	]);
}


function validateManualStockPayload(
	payload
) {

	if (!payload.medicineId) {
		return "Please select medicine.";
	}

	if (!payload.batchNumber) {
		return "Batch number is required.";
	}

	if (
		!payload.quantity ||
		payload.quantity <= 0
	) {
		return "Quantity must be greater than 0.";
	}

	if (
		payload.purchasePrice < 0 ||
		payload.salePrice < 0 ||
		payload.mrp < 0
	) {
		return "Prices cannot be negative.";
	}

	if (
		payload.gstPercentage < 0 ||
		payload.gstPercentage > 100
	) {
		return "GST percentage must be between 0 and 100.";
	}

	if (
		payload.manufacturingDate &&
		payload.expiryDate &&
		payload.expiryDate <
		payload.manufacturingDate
	) {
		return "Expiry date cannot be before manufacturing date.";
	}

	return "";
}


function clearManualStockForm() {

	hideAddStockFormAlert();

	setValue(
		"stockMedicineId",
		""
	);

	setValue(
		"stockBatchNumber",
		""
	);

	setValue(
		"stockManufacturingDate",
		""
	);

	setValue(
		"stockExpiryDate",
		""
	);

	setValue(
		"stockQuantity",
		"1"
	);

	setValue(
		"stockPurchasePrice",
		"0"
	);

	setValue(
		"stockSalePrice",
		"0"
	);

	setValue(
		"stockMrp",
		"0"
	);

	setValue(
		"stockGstPercentage",
		"0"
	);

	setValue(
		"stockSupplierName",
		""
	);
}


function openStockAdjustment(
	stockId
) {

	if (!inventoryPermissions.update) {

		showMsg(
			"You do not have permission to adjust stock."
		);

		return;
	}

	const stock =
		findInventoryStock(
			stockId
		);

	if (!stock) {

		showMsg(
			"Stock batch not found."
		);

		return;
	}

	setValue(
		"adjustmentStockId",
		stock.id
	);

	setText(
		"adjustmentStockLabel",
		`${stock.medicineName || "Medicine"} — Batch ${stock.batchNumber || "-"} — Current ${Number(stock.currentQuantity || 0)}`
	);

	setValue(
		"adjustmentMovementType",
		""
	);

	setValue(
		"adjustmentQuantity",
		"1"
	);

	setValue(
		"adjustmentRemarks",
		""
	);

	if (adjustmentModal) {
		adjustmentModal.show();
	}
}


async function saveStockAdjustment() {

	if (isSavingAdjustment) {
		return;
	}

	if (!inventoryPermissions.update) {

		showMsg(
			"You do not have permission to adjust stock."
		);

		return;
	}

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const payload = {

		tenantId:
			Number(tenantId),

		stockId:
			getInventoryNumberValue(
				"adjustmentStockId"
			),

		movementType:
			getValue(
				"adjustmentMovementType"
			),

		quantity:
			getInventoryIntegerValue(
				"adjustmentQuantity"
			),

		remarks:
			getValue(
				"adjustmentRemarks"
			)
	};

	if (!payload.stockId) {

		showMsg(
			"Stock batch is required."
		);

		return;
	}

	if (!payload.movementType) {

		showMsg(
			"Please select adjustment type."
		);

		return;
	}

	if (
		!payload.quantity ||
		payload.quantity <= 0
	) {

		showMsg(
			"Adjustment quantity must be greater than 0."
		);

		return;
	}

	isSavingAdjustment =
		true;

	setButtonLoading(
		"saveAdjustmentBtn",
		"Updating...",
		true
	);

	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/inventory/stocks/adjust`,
			{
				method:
					"PUT",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify(payload)
			}
		);

	isSavingAdjustment =
		false;

	setButtonLoading(
		"saveAdjustmentBtn",
		"Update Stock",
		false
	);

	if (!result.ok) {

		showMsg(
			getInventoryErrorMessage(
				result.data,
				"Unable to adjust stock."
			)
		);

		return;
	}

	if (adjustmentModal) {
		adjustmentModal.hide();
	}

	showMsg(
		"Stock adjusted successfully.",
		"success"
	);

	await Promise.all([
		loadInventorySummary(),
		applyInventoryFilter(
			currentInventoryFilter
		)
	]);
}


function showStockDetails(
	stockId
) {

	const stock =
		findInventoryStock(
			stockId
		);

	if (!stock) {

		showMsg(
			"Stock details not found."
		);

		return;
	}

	const status =
		resolveInventoryStatus(
			stock
		);

	const content =
		document.getElementById(
			"stockDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="row g-3">

			<div class="col-md-6">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Medicine
					</span>

					<div class="inventory-modal-value">
						${safeInventoryText(stock.medicineName)}
					</div>

				</div>

			</div>

			<div class="col-md-6">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Batch Number
					</span>

					<div class="inventory-modal-value">
						${safeInventoryText(stock.batchNumber)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Current Quantity
					</span>

					<div class="inventory-modal-value">
						${Number(stock.currentQuantity || 0)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Opening Quantity
					</span>

					<div class="inventory-modal-value">
						${Number(stock.openingQuantity || 0)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Reorder Level
					</span>

					<div class="inventory-modal-value">
						${Number(stock.reorderLevel || 0)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Manufacturing Date
					</span>

					<div class="inventory-modal-value">
						${formatInventoryDate(stock.manufacturingDate)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Expiry Date
					</span>

					<div class="inventory-modal-value">
						${formatInventoryDate(stock.expiryDate)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Status
					</span>

					<div class="inventory-modal-value">
						${inventoryStatusBadge(status)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Purchase Price
					</span>

					<div class="inventory-modal-value">
						${formatInventoryCurrency(stock.purchasePrice)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Sale Price
					</span>

					<div class="inventory-modal-value">
						${formatInventoryCurrency(stock.salePrice)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						MRP
					</span>

					<div class="inventory-modal-value">
						${formatInventoryCurrency(stock.mrp)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						GST
					</span>

					<div class="inventory-modal-value">
						${formatInventoryPercentage(stock.gstPercentage)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Supplier
					</span>

					<div class="inventory-modal-value">
						${safeInventoryText(stock.supplierName)}
					</div>

				</div>

			</div>

			<div class="col-md-4">

				<div class="inventory-modal-card">

					<span class="inventory-modal-label">
						Last Purchase
					</span>

					<div class="inventory-modal-value">
						${stock.lastPurchaseId
			? "#" +
			escapeInventoryHtml(
				stock.lastPurchaseId
			)
			: "-"
		}
					</div>

				</div>

			</div>

		</div>
	`;

	if (stockDetailsModal) {
		stockDetailsModal.show();
	}
}


async function openStockMovements(
	stockId
) {

	const stock =
		findInventoryStock(
			stockId
		);

	if (!stock) {

		showMsg(
			"Stock batch not found."
		);

		return;
	}

	setText(
		"movementModalTitle",
		`${stock.medicineName || "Medicine"} — Batch ${stock.batchNumber || "-"}`
	);

	showMovementLoadingState();

	if (movementsModal) {
		movementsModal.show();
	}

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/inventory/movements/stock` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&stockId=${encodeURIComponent(stockId)}`
		);

	if (!result.ok) {

		showMovementErrorState(
			getInventoryErrorMessage(
				result.data,
				"Unable to load stock movements."
			)
		);

		return;
	}

	renderInventoryMovements(
		Array.isArray(result.data)
			? result.data
			: []
	);
}


async function openAllMovementsModal() {

	setText(
		"movementModalTitle",
		"All Inventory Movements"
	);

	showMovementLoadingState();

	if (movementsModal) {
		movementsModal.show();
	}

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await inventoryApiRequest(
			`${API_BASE}/saas/inventory/movements` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		showMovementErrorState(
			getInventoryErrorMessage(
				result.data,
				"Unable to load movements."
			)
		);

		return;
	}

	renderInventoryMovements(
		Array.isArray(result.data)
			? result.data
			: []
	);
}


function renderInventoryMovements(
	movements
) {

	const content =
		document.getElementById(
			"stockMovementsContent"
		);

	if (!content) {
		return;
	}

	if (!movements.length) {

		content.innerHTML = `

			<div class="inventory-state">

				<div class="inventory-state-icon">

					<i class="bi bi-clock-history"></i>

				</div>

				<h5 class="fw-bold text-primary">
					No stock movements found
				</h5>

				<p class="text-muted mb-0">
					No inventory movement has been recorded yet.
				</p>

			</div>
		`;

		return;
	}

	content.innerHTML =
		movements.map(
			function(movement) {

				return `

					<div class="inventory-movement-item">

						<div class="inventory-movement-icon">

							<i class="${movementTypeIcon(
					movement.movementType
				)}"></i>

						</div>

						<div class="d-flex justify-content-between gap-3">

							<div>

								<strong>

									${formatMovementType(
					movement.movementType
				)}

								</strong>

								<div class="small text-muted">

									${safeInventoryText(
					movement.medicineName
				)}

									${movement.batchNumber
						? " — Batch " +
						safeInventoryText(
							movement.batchNumber
						)
						: ""
					}

								</div>

							</div>

							<div class="text-end">

								<strong>

									${movementQuantityPrefix(
						movement.movementType
					)}

									${Number(
						movement.quantity || 0
					)}

								</strong>

								<small>

									${formatInventoryDateTime(
						movement.createdAt
					)}

								</small>

							</div>

						</div>

						${movement.remarks
						? `
								<small>
									${escapeInventoryHtml(
							movement.remarks
						)}
								</small>
							`
						: ""
					}

						${movement.referenceId
						? `
								<small>
									Reference:
									#${escapeInventoryHtml(
							movement.referenceId
						)}
								</small>
							`
						: ""
					}

					</div>
				`;
			}
		)
			.join("");
}


function movementTypeIcon(
	type
) {

	switch (
	String(type || "")
		.toUpperCase()
	) {

		case "PURCHASE":
			return "bi bi-bag-check-fill";

		case "SALE":
			return "bi bi-cart-check-fill";

		case "ADJUSTMENT_IN":
			return "bi bi-plus-circle-fill";

		case "ADJUSTMENT_OUT":
			return "bi bi-dash-circle-fill";

		case "RETURN":
			return "bi bi-arrow-counterclockwise";

		case "DAMAGED":
			return "bi bi-exclamation-diamond-fill";

		case "EXPIRED":
			return "bi bi-calendar-x-fill";

		default:
			return "bi bi-arrow-left-right";
	}
}


function movementQuantityPrefix(
	type
) {

	const normalized =
		String(type || "")
			.toUpperCase();

	if (
		normalized === "PURCHASE" ||
		normalized === "ADJUSTMENT_IN" ||
		normalized === "RETURN"
	) {
		return "+";
	}

	return "-";
}


function formatMovementType(
	type
) {

	return String(type || "")
		.toLowerCase()
		.replace(
			/_/g,
			" "
		)
		.replace(
			/\b\w/g,
			function(character) {

				return character.toUpperCase();
			}
		);
}


function showMovementLoadingState() {

	const content =
		document.getElementById(
			"stockMovementsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="inventory-state">

			<div class="spinner-border text-primary"
				 role="status">
			</div>

			<p class="text-muted mt-3 mb-0">
				Loading stock movements...
			</p>

		</div>
	`;
}


function showMovementErrorState(
	message
) {

	const content =
		document.getElementById(
			"stockMovementsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="inventory-state text-danger">

			<i class="bi bi-exclamation-triangle-fill fs-1"></i>

			<p class="mt-3 mb-0">

				${escapeInventoryHtml(message)}

			</p>

		</div>
	`;
}


function findInventoryStock(
	stockId
) {

	return inventoryStocks.find(
		function(stock) {

			return (
				Number(stock.id) ===
				Number(stockId)
			);
		}
	);
}


function buildMedicineDetail(
	stock
) {

	return [
		stock.medicineType,
		stock.manufacturer
	]
		.filter(
			function(value) {

				return Boolean(
					String(
						value || ""
					).trim()
				);
			}
		)
		.join(" • ");
}


function setActiveInventoryFilterButton(
	filter
) {

	const mapping = {
		ALL:
			"filterAllBtn",

		LOW:
			"filterLowBtn",

		EXPIRED:
			"filterExpiredBtn",

		NEAR_EXPIRY:
			"filterNearExpiryBtn"
	};

	Object.values(mapping)
		.forEach(
			function(buttonId) {

				const button =
					document.getElementById(
						buttonId
					);

				if (button) {

					button.classList.remove(
						"active"
					);
				}
			}
		);

	const activeButton =
		document.getElementById(
			mapping[filter]
		);

	if (activeButton) {

		activeButton.classList.add(
			"active"
		);
	}
}


function updateInventoryListHeading(
	eyebrow,
	title
) {

	setText(
		"inventoryListEyebrow",
		eyebrow
	);

	setText(
		"inventoryListTitle",
		title
	);
}


function showInventoryLoadingState() {

	const tbody =
		document.getElementById(
			"inventoryTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="10">

				<div class="inventory-state">

					<div class="spinner-border text-primary"
						 role="status">
					</div>

					<p class="text-muted mt-3 mb-0">
						Loading inventory...
					</p>

				</div>

			</td>

		</tr>
	`;
}


function showInventoryErrorState(
	message
) {

	const tbody =
		document.getElementById(
			"inventoryTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="10">

				<div class="inventory-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<h5 class="fw-bold mt-3">
						Unable to load inventory
					</h5>

					<p class="text-muted mb-0">

						${escapeInventoryHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


async function inventoryApiRequest(
	url,
	options = {}
) {

	const token =
		localStorage.getItem(
			"token"
		);

	const headers = {
		"Authorization":
			"Bearer " + token,

		"Accept":
			"application/json",

		...(options.headers || {})
	};

	try {

		const response =
			await fetch(
				url,
				{
					...options,
					headers: headers
				}
			);

		const data =
			await readInventoryResponse(
				response
			);

		return {
			ok:
				response.ok,

			status:
				response.status,

			data:
				data
		};

	} catch (error) {

		console.error(
			"Inventory API error:",
			error
		);

		return {
			ok:
				false,

			status:
				0,

			data: {
				message:
					"Inventory service is not reachable."
			}
		};
	}
}


async function readInventoryResponse(
	response
) {

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
				message:
					text
			};
		}

	} catch (error) {

		return {};
	}
}


function getInventoryErrorMessage(
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

	return (
		data.message ||
		data.error ||
		fallback
	);
}


function formatTenantType(
	value
) {

	switch (
	String(value || "")
		.trim()
		.toUpperCase()
	) {

		case "WHOLESALER":
			return "Wholesaler";

		case "RETAILER":
			return "Retailer";

		case "HOSPITAL":
			return "Hospital";

		case "DOCTOR_CLINIC":
			return "Doctor Clinic";

		default:
			return "Workspace";
	}
}


function formatInventoryCurrency(
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


function formatInventoryPercentage(
	value
) {

	const percentage =
		Number(value || 0);

	return `${percentage.toFixed(2)}%`;
}


function formatInventoryDate(
	value
) {

	if (!value) {
		return "-";
	}

	const date =
		new Date(
			value + "T00:00:00"
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


function formatInventoryDateTime(
	value
) {

	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (
		Number.isNaN(
			date.getTime()
		)
	) {
		return "-";
	}

	return date.toLocaleString(
		"en-IN"
	);
}


function setAnimatedInventoryNumber(
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
			target;

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
				  aria-hidden="true">
			</span>

			${escapeInventoryHtml(loadingText)}
		`;

		button.disabled =
			true;

		return;
	}

	button.innerHTML =
		button.dataset.originalHtml ||
		button.innerHTML;

	button.disabled =
		false;
}


function getInventoryNumberValue(
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


function getInventoryIntegerValue(
	id
) {

	const value =
		parseInt(
			getValue(id),
			10
		);

	return Number.isFinite(value)
		? value
		: 0;
}


function getValue(
	id
) {

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

		element.textContent =
			value === null ||
				value === undefined
				? ""
				: value;
	}
}


function showOrHideById(
	id,
	visible
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.style.display =
			visible
				? ""
				: "none";
	}
}


function showAddStockFormAlert(
	message,
	type = "danger"
) {

	const alertBox =
		document.getElementById(
			"addStockFormAlert"
		);

	const alertMessage =
		document.getElementById(
			"addStockFormAlertMessage"
		);

	if (!alertBox || !alertMessage) {

		showMsg(message, type);

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
		"Unable to save stock.";

	alertBox.scrollIntoView({
		behavior: "smooth",
		block: "center"
	});
}


function hideAddStockFormAlert() {

	const alertBox =
		document.getElementById(
			"addStockFormAlert"
		);

	if (!alertBox) {
		return;
	}

	alertBox.classList.add(
		"d-none"
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

		<div class="alert alert-${escapeInventoryHtml(type)} alert-dismissible fade show"
			 role="alert">

			${escapeInventoryHtml(message)}

			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert">
			</button>

		</div>
	`;

	window.scrollTo({
		top:
			0,

		behavior:
			"smooth"
	});
}


function safeInventoryText(
	value
) {

	return (
		value === null ||
		value === undefined ||
		value === ""
	)
		? "-"
		: escapeInventoryHtml(
			value
		);
}


function escapeInventoryHtml(
	value
) {

	return String(value ?? "")
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