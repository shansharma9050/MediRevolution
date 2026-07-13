let medicineModal = null;
let stockModal = null;
let adjustStockModal = null;

let allStocks = [];
let allMedicines = [];

let isLoadingStocks = false;
let isLoadingMedicines = false;
let isSavingMedicine = false;
let isSavingStock = false;
let isAdjustingStock = false;

let inventoryPermissions = {
	create: false,
	update: false,
	delete: false,
	export: false
};

document.addEventListener("DOMContentLoaded", async function() {
	const allowed =
		await protectSaasPage(
			"INVENTORY",
			"VIEW"
		);

	if (!allowed) {
		return;
	}

	const tenantId =
		localStorage.getItem("tenantId");

	const tenantName =
		localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText(
		"tenantNameText",
		tenantName || "your workspace"
	);

	medicineModal =
		bootstrap.Modal.getOrCreateInstance(
			document.getElementById(
				"medicineModal"
			)
		);

	stockModal =
		bootstrap.Modal.getOrCreateInstance(
			document.getElementById(
				"stockModal"
			)
		);

	adjustStockModal =
		bootstrap.Modal.getOrCreateInstance(
			document.getElementById(
				"adjustStockModal"
			)
		);

	const medicineForm =
		document.getElementById(
			"medicineForm"
		);

	const stockForm =
		document.getElementById(
			"stockForm"
		);

	if (medicineForm) {
		medicineForm.addEventListener(
			"submit",
			function(event) {
				event.preventDefault();
				saveMedicine();
			}
		);
	}

	if (stockForm) {
		stockForm.addEventListener(
			"submit",
			function(event) {
				event.preventDefault();
				saveStock();
			}
		);
	}

	await applyInventoryButtonPermissions();

	await Promise.all([
		loadMedicinesDropdown(),
		loadStocks()
	]);
});

function openMedicineModal() {
	if (!inventoryPermissions.create) {
		showMsg(
			"You do not have permission to create medicines."
		);

		return;
	}

	resetForm("medicineForm");
	setValue("reorderLevel", "10");

	if (medicineModal) {
		medicineModal.show();
	}
}

function openStockModal() {
	if (!inventoryPermissions.create) {
		showMsg(
			"You do not have permission to create stock."
		);

		return;
	}

	resetForm("stockForm");
	resetStockDefaultValues();

	if (!allMedicines.length) {
		showMsg(
			"Please add a medicine before creating stock."
		);

		return;
	}

	if (stockModal) {
		stockModal.show();
	}
}

async function saveMedicine() {
	if (isSavingMedicine) {
		return;
	}

	if (!inventoryPermissions.create) {
		showMsg(
			"You do not have permission to create medicines."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const payload = {
		tenantId:
			toPositiveNumberOrNull(
				tenantId
			),

		medicineName:
			getValue("medicineName"),

		medicineType:
			getValue("medicineType"),

		manufacturer:
			getValue("manufacturer"),

		saltName:
			getValue("saltName"),

		strength:
			getValue("strength"),

		unit:
			getValue("unit"),

		reorderLevel:
			toNonNegativeInteger(
				getValue("reorderLevel"),
				10
			)
	};

	if (!payload.tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!payload.medicineName) {
		showMsg(
			"Medicine name is required."
		);

		return;
	}

	isSavingMedicine = true;

	setButtonLoading(
		"saveMedicineBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/saas/inventory/medicines`,
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
					"Unable to save medicine."
				)
			);

			return;
		}

		showMsg(
			"Medicine saved successfully.",
			"success"
		);

		resetForm("medicineForm");
		setValue("reorderLevel", "10");

		if (medicineModal) {
			medicineModal.hide();
		}

		await loadMedicinesDropdown();

	} catch (error) {
		console.error(
			"Save medicine error:",
			error
		);

		showMsg(
			"Something went wrong while saving medicine."
		);

	} finally {
		isSavingMedicine = false;

		setButtonLoading(
			"saveMedicineBtn",
			"Save Medicine",
			false
		);
	}
}

async function saveStock() {
	if (isSavingStock) {
		return;
	}

	if (!inventoryPermissions.create) {
		showMsg(
			"You do not have permission to create stock."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const payload = {
		tenantId:
			toPositiveNumberOrNull(
				tenantId
			),

		medicineId:
			toPositiveNumberOrNull(
				getValue("stockMedicineId")
			),

		batchNumber:
			getValue("batchNumber"),

		expiryDate:
			getValue("expiryDate") || null,

		quantity:
			toPositiveInteger(
				getValue("quantity")
			),

		purchasePrice:
			toNonNegativeNumber(
				getValue("purchasePrice")
			),

		salePrice:
			toNonNegativeNumber(
				getValue("salePrice")
			),

		supplierName:
			getValue("supplierName")
	};

	if (!payload.tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!payload.medicineId) {
		showMsg(
			"Please select medicine."
		);

		return;
	}

	if (!payload.quantity) {
		showMsg(
			"Quantity must be greater than 0."
		);

		return;
	}

	if (
		payload.salePrice > 0 &&
		payload.purchasePrice > 0 &&
		payload.salePrice < payload.purchasePrice
	) {
		showMsg(
			"Sale price cannot be lower than purchase price."
		);

		return;
	}

	if (
		payload.expiryDate &&
		payload.expiryDate <
		getLocalDateText(new Date())
	) {
		showMsg(
			"Expiry date cannot be in the past."
		);

		return;
	}

	isSavingStock = true;

	setButtonLoading(
		"saveStockBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/saas/inventory/stocks`,
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
					"Unable to save stock."
				)
			);

			return;
		}

		showMsg(
			"Stock added successfully.",
			"success"
		);

		resetForm("stockForm");
		resetStockDefaultValues();

		if (stockModal) {
			stockModal.hide();
		}

		await loadStocks();

	} catch (error) {
		console.error(
			"Save stock error:",
			error
		);

		showMsg(
			"Something went wrong while saving stock."
		);

	} finally {
		isSavingStock = false;

		setButtonLoading(
			"saveStockBtn",
			"Save Stock",
			false
		);
	}
}

async function loadStocks() {
	if (isLoadingStocks) {
		return;
	}

	isLoadingStocks = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showStocksLoadingState();

	setButtonLoading(
		"loadAllStockBtn",
		"Loading...",
		true
	);

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/inventory/stocks?${query.toString()}`,
				{
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
			allStocks = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load stock."
				);

			showMsg(message);
			showStocksErrorState(message);
			updateInventorySummary();

			return;
		}

		allStocks =
			Array.isArray(result)
				? result
				: [];

		sortStocks();
		renderStocks(allStocks);
		updateInventorySummary();
		applyInventoryButtonPermissions();

	} catch (error) {
		console.error(
			"Load stock error:",
			error
		);

		allStocks = [];

		showMsg(
			"SaaS service not reachable."
		);

		showStocksErrorState(
			"SaaS inventory service is currently unavailable."
		);

		updateInventorySummary();

	} finally {
		isLoadingStocks = false;

		setButtonLoading(
			"loadAllStockBtn",
			"All Stock",
			false
		);
	}
}

async function loadLowStock() {
	if (isLoadingStocks) {
		return;
	}

	isLoadingStocks = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showStocksLoadingState();

	setButtonLoading(
		"loadLowStockBtn",
		"Loading...",
		true
	);

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/inventory/stocks/low?${query.toString()}`,
				{
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
					"Unable to load low stock."
				);

			showMsg(message);
			showStocksErrorState(message);

			return;
		}

		const lowStocks =
			Array.isArray(result)
				? result
				: [];

		renderStocks(lowStocks);

		setValue(
			"stockStatusFilter",
			"LOW_STOCK"
		);

	} catch (error) {
		console.error(
			"Load low stock error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

		showStocksErrorState(
			"Unable to load low-stock inventory."
		);

	} finally {
		isLoadingStocks = false;

		setButtonLoading(
			"loadLowStockBtn",
			"Low Stock",
			false
		);
	}
}

function sortStocks() {
	allStocks.sort(
		function(a, b) {
			const first =
				String(
					a.medicineName || ""
				);

			const second =
				String(
					b.medicineName || ""
				);

			return first.localeCompare(
				second,
				"en",
				{
					sensitivity: "base"
				}
			);
		}
	);
}

function filterStocks() {
	const keyword =
		getValue(
			"stockSearchBox"
		).toLowerCase();

	const status =
		getValue(
			"stockStatusFilter"
		);

	const filtered =
		allStocks.filter(
			function(stock) {
				const searchableText = [
					stock.medicineName,
					stock.medicineType,
					stock.manufacturer,
					stock.batchNumber,
					stock.supplierName,
					stock.strength
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				const keywordMatches =
					!keyword ||
					searchableText.includes(keyword);

				const stockStatus =
					getStockStatus(stock);

				const statusMatches =
					!status ||
					stockStatus === status;

				return (
					keywordMatches &&
					statusMatches
				);
			}
		);

	renderStocks(filtered);
}

function renderStocks(stocks) {
	const tbody =
		document.getElementById(
			"stockTableBody"
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
				<td colspan="8">

					<div class="inventory-state">

						<div class="inventory-state-icon">
							<i class="bi bi-box-seam"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No stock found
						</h5>

						<p class="text-muted mb-0">
							Add a stock batch or change the selected filters.
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
				const stockId =
					safeNumber(stock.id);

				const status =
					getStockStatus(stock);

				return `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>

							<div class="inventory-medicine-cell">

								<div class="inventory-medicine-icon">
									<i class="bi bi-capsule-pill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(stock.medicineName)}
									</strong>

									<div class="text-muted small">
										${safe(stock.medicineType)}
										•
										${safe(stock.manufacturer)}
									</div>

								</div>

							</div>

						</td>

						<td>
							${safe(stock.batchNumber)}
						</td>

						<td>
							${formatDate(stock.expiryDate)}
						</td>

						<td>
							<strong>
								${formatQuantity(stock.currentQuantity)}
							</strong>
						</td>

						<td>
							₹${formatAmount(stock.purchasePrice)}
						</td>

						<td>
							₹${formatAmount(stock.salePrice)}
						</td>

						<td>
							${stockStatusBadge(status)}
						</td>

						<td>

							<button type="button"
									class="btn btn-sm btn-outline-warning adjust-stock-btn"
									onclick="openAdjustStockModal(${stockId})"
									${stockId ? "" : "disabled"}>

								<i class="bi bi-arrow-left-right me-1"></i>
								Adjust
							</button>

						</td>

					</tr>
				`;
			}
		).join("");

	applyInventoryButtonPermissions();
}

function getStockStatus(stock) {
	if (
		stock.expired === true ||
		isPastDate(stock.expiryDate)
	) {
		return "EXPIRED";
	}

	if (stock.lowStock === true) {
		return "LOW_STOCK";
	}

	return "OK";
}

function stockStatusBadge(status) {
	if (status === "EXPIRED") {
		return `
			<span class="inventory-status-pill expired">

				<i class="bi bi-calendar-x-fill"></i>
				Expired

			</span>
		`;
	}

	if (status === "LOW_STOCK") {
		return `
			<span class="inventory-status-pill low-stock">

				<i class="bi bi-exclamation-triangle-fill"></i>
				Low Stock

			</span>
		`;
	}

	return `
		<span class="inventory-status-pill ok">

			<i class="bi bi-check-circle-fill"></i>
			Available

		</span>
	`;
}

async function applyInventoryButtonPermissions() {
	const [
		canCreate,
		canUpdate,
		canDelete,
		canExport
	] =
		await Promise.all([
			hasSaasPermission(
				"INVENTORY",
				"CREATE"
			),
			hasSaasPermission(
				"INVENTORY",
				"UPDATE"
			),
			hasSaasPermission(
				"INVENTORY",
				"DELETE"
			),
			hasSaasPermission(
				"INVENTORY",
				"EXPORT"
			)
		]);

	inventoryPermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete),

		export:
			Boolean(canExport)
	};

	showOrHideById(
		"addMedicineBtn",
		inventoryPermissions.create
	);

	showOrHideById(
		"addStockBtn",
		inventoryPermissions.create
	);

	showOrHideById(
		"exportInventoryBtn",
		inventoryPermissions.export
	);

	showOrHideByClass(
		"edit-stock-btn",
		inventoryPermissions.update
	);

	showOrHideByClass(
		"adjust-stock-btn",
		inventoryPermissions.update
	);

	showOrHideByClass(
		"delete-stock-btn",
		inventoryPermissions.delete
	);
}

function openAdjustStockModal(stockId) {
	if (!inventoryPermissions.update) {
		showMsg(
			"You do not have permission to adjust stock."
		);

		return;
	}

	const numericId =
		Number(stockId);

	if (
		!Number.isFinite(numericId) ||
		numericId <= 0
	) {
		showMsg(
			"Invalid stock selected."
		);

		return;
	}

	const stock =
		allStocks.find(
			item =>
				Number(item.id) === numericId
		);

	setValue(
		"adjustStockId",
		numericId
	);

	setValue(
		"movementType",
		"ADJUSTMENT_OUT"
	);

	setValue(
		"adjustQuantity",
		"1"
	);

	setValue(
		"adjustRemarks",
		""
	);

	const info =
		document.getElementById(
			"adjustStockInfo"
		);

	if (info) {
		info.innerHTML = `
			<strong>${safe(stock?.medicineName)}</strong>

			<div class="small">
				Batch:
				${safe(stock?.batchNumber)}
				•
				Current Quantity:
				${formatQuantity(stock?.currentQuantity)}
			</div>
		`;
	}

	if (adjustStockModal) {
		adjustStockModal.show();
	}
}

async function submitStockAdjustment() {
	if (isAdjustingStock) {
		return;
	}

	if (!inventoryPermissions.update) {
		showMsg(
			"You do not have permission to adjust stock."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const payload = {
		tenantId:
			toPositiveNumberOrNull(
				tenantId
			),

		stockId:
			toPositiveNumberOrNull(
				getValue("adjustStockId")
			),

		movementType:
			getValue("movementType"),

		quantity:
			toPositiveInteger(
				getValue("adjustQuantity")
			),

		remarks:
			getValue("adjustRemarks")
	};

	const allowedMovementTypes = [
		"ADJUSTMENT_IN",
		"ADJUSTMENT_OUT",
		"EXPIRED",
		"DAMAGED"
	];

	if (!payload.tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!payload.stockId) {
		showMsg(
			"Invalid stock selected."
		);

		return;
	}

	if (
		!allowedMovementTypes.includes(
			payload.movementType
		)
	) {
		showMsg(
			"Please select valid movement type."
		);

		return;
	}

	if (!payload.quantity) {
		showMsg(
			"Quantity must be greater than 0."
		);

		return;
	}

	const stock =
		allStocks.find(
			item =>
				Number(item.id) === payload.stockId
		);

	const isOutward =
		[
			"ADJUSTMENT_OUT",
			"EXPIRED",
			"DAMAGED"
		].includes(
			payload.movementType
		);

	if (
		isOutward &&
		stock &&
		payload.quantity >
		toNonNegativeNumber(
			stock.currentQuantity
		)
	) {
		showMsg(
			"Adjustment quantity cannot exceed current stock."
		);

		return;
	}

	isAdjustingStock = true;

	setButtonLoading(
		"saveAdjustmentBtn",
		"Adjusting...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/saas/inventory/stocks/adjust`,
				{
					method: "PUT",

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
					"Unable to adjust stock."
				)
			);

			return;
		}

		if (adjustStockModal) {
			adjustStockModal.hide();
		}

		showMsg(
			"Stock adjusted successfully.",
			"success"
		);

		await loadStocks();

	} catch (error) {
		console.error(
			"Adjust stock error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		isAdjustingStock = false;

		setButtonLoading(
			"saveAdjustmentBtn",
			"Adjust Stock",
			false
		);
	}
}

async function loadMedicinesDropdown() {
	if (isLoadingMedicines) {
		return;
	}

	isLoadingMedicines = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const select =
		document.getElementById(
			"stockMedicineId"
		);

	if (!select) {
		isLoadingMedicines = false;
		return;
	}

	select.innerHTML = `
		<option value="">
			Loading medicines...
		</option>
	`;

	try {
		const query =
			new URLSearchParams({
				tenantId: tenantId
			});

		const response =
			await fetch(
				`${API_BASE}/saas/inventory/medicines?${query.toString()}`,
				{
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

		select.innerHTML = `
			<option value="">
				Select Medicine
			</option>
		`;

		if (!response.ok) {
			allMedicines = [];

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load medicines."
				)
			);

			return;
		}

		allMedicines =
			Array.isArray(result)
				? result
				: [];

		allMedicines.sort(
			function(a, b) {
				return String(
					a.medicineName || ""
				).localeCompare(
					String(
						b.medicineName || ""
					),
					"en",
					{
						sensitivity: "base"
					}
				);
			}
		);

		allMedicines.forEach(
			function(medicine) {
				if (!medicine.id) {
					return;
				}

				const option =
					document.createElement(
						"option"
					);

				option.value =
					String(medicine.id);

				option.textContent =
					`${medicine.medicineName || "Medicine"} - ` +
					`${medicine.strength || "No strength"}`;

				select.appendChild(option);
			}
		);

	} catch (error) {
		console.error(
			"Load medicines error:",
			error
		);

		allMedicines = [];

		select.innerHTML = `
			<option value="">
				Service unavailable
			</option>
		`;

		showMsg(
			"SaaS service not reachable while loading medicines."
		);

	} finally {
		isLoadingMedicines = false;
	}
}

function updateInventorySummary() {
	setAnimatedNumber(
		"totalBatchCount",
		allStocks.length
	);

	setAnimatedNumber(
		"totalQuantityCount",
		allStocks.reduce(
			(sum, stock) =>
				sum +
				toNonNegativeNumber(
					stock.currentQuantity
				),
			0
		)
	);

	setAnimatedNumber(
		"lowStockCount",
		allStocks.filter(
			stock =>
				getStockStatus(stock) ===
				"LOW_STOCK"
		).length
	);

	setAnimatedNumber(
		"expiredStockCount",
		allStocks.filter(
			stock =>
				getStockStatus(stock) ===
				"EXPIRED"
		).length
	);
}

function showStocksLoadingState() {
	const tbody =
		document.getElementById(
			"stockTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="inventory-state">

					<div class="inventory-state-icon inventory-loading">
						<i class="bi bi-box-seam-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading stock
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare inventory batches.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showStocksErrorState(message) {
	const tbody =
		document.getElementById(
			"stockTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="inventory-state">

					<div class="inventory-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load stock
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function resetForm(formId) {
	const form =
		document.getElementById(
			formId
		);

	if (form) {
		form.reset();
	}
}

function resetStockDefaultValues() {
	setValue(
		"purchasePrice",
		"0"
	);

	setValue(
		"salePrice",
		"0"
	);
}

function getValue(id) {
	const element =
		document.getElementById(id);

	return element
		? String(element.value || "").trim()
		: "";
}

function setValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value =
			value === null ||
				value === undefined
				? ""
				: String(value);
	}
}

function setText(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
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

function getApiErrorMessage(data, fallback) {
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

function showMsg(message, type = "danger") {
	const msg =
		document.getElementById("msg");

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
					data-bs-dismiss="alert"></button>

		</div>
	`;
}

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button =
		document.getElementById(buttonId);

	if (!button) {
		return;
	}

	if (isLoading) {
		button.dataset.originalHtml =
			button.innerHTML;

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"
				  role="status"
				  aria-hidden="true"></span>

			${escapeHtml(loadingText)}
		`;

		button.disabled = true;
	} else {
		button.innerHTML =
			button.dataset.originalHtml ||
			button.innerHTML;

		button.disabled = false;
	}
}

function setAnimatedNumber(id, value) {
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

function toPositiveNumberOrNull(value) {
	const number =
		Number(value);

	return Number.isFinite(number) &&
		number > 0
		? number
		: null;
}

function toPositiveInteger(value) {
	const number =
		Number(value);

	return Number.isInteger(number) &&
		number > 0
		? number
		: 0;
}

function toNonNegativeInteger(value, fallback = 0) {
	const number =
		Number(value);

	return Number.isInteger(number) &&
		number >= 0
		? number
		: fallback;
}

function toNonNegativeNumber(value) {
	const number =
		Number(value);

	return Number.isFinite(number) &&
		number >= 0
		? number
		: 0;
}

function isPastDate(value) {
	if (!value) {
		return false;
	}

	return value <
		getLocalDateText(
			new Date()
		);
}

function getLocalDateText(date) {
	return [
		date.getFullYear(),
		String(
			date.getMonth() + 1
		).padStart(2, "0"),
		String(
			date.getDate()
		).padStart(2, "0")
	].join("-");
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(
			`${value}T00:00:00`
		);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleDateString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric"
		}
	);
}

function formatAmount(value) {
	const number =
		Number(value);

	if (!Number.isFinite(number)) {
		return "0.00";
	}

	return number.toLocaleString(
		"en-IN",
		{
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}
	);
}

function formatQuantity(value) {
	const number =
		Number(value);

	if (!Number.isFinite(number)) {
		return "0";
	}

	return number.toLocaleString("en-IN");
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
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}