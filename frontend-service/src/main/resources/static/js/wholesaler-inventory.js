let medicineOptions = [];
let stockList = [];
let isLoadingStock = false;
let isSavingStock = false;

document.addEventListener("DOMContentLoaded", function() {
	allowOnlyWholesaler();
	applyRoleBasedMenuForInventory();
	setInventoryDateLimits();
	loadMedicineDropdown();
	loadMyStock();
});

function allowOnlyWholesaler() {
	const role =
		localStorage.getItem("role");

	if (role !== "WHOLESALER") {
		alert("Access denied. Only WHOLESALER can access Inventory.");
		window.location.href = "/dashboard";
	}
}

function applyRoleBasedMenuForInventory() {
	const role =
		localStorage.getItem("role");

	document
		.querySelectorAll("[data-role]")
		.forEach(
			function(item) {

				const allowedRoles =
					item
						.getAttribute("data-role")
						.split(" ");

				if (!allowedRoles.includes(role)) {
					item.style.display = "none";
				}

			}
		);
}

function setInventoryDateLimits() {
	const today =
		new Date();

	const todayText =
		[
			today.getFullYear(),
			String(today.getMonth() + 1).padStart(2, "0"),
			String(today.getDate()).padStart(2, "0")
		].join("-");

	const manufacturingDate =
		document.getElementById(
			"manufacturingDate"
		);

	const expiryDate =
		document.getElementById(
			"expiryDate"
		);

	if (manufacturingDate) {
		manufacturingDate.max =
			todayText;
	}

	if (expiryDate) {
		const tomorrow =
			new Date(today);

		tomorrow.setDate(
			tomorrow.getDate() + 1
		);

		expiryDate.min =
			[
				tomorrow.getFullYear(),
				String(tomorrow.getMonth() + 1).padStart(2, "0"),
				String(tomorrow.getDate()).padStart(2, "0")
			].join("-");
	}
}

function openAddStockPanel() {
	const panel =
		document.getElementById(
			"addStockPanel"
		);

	if (!panel) {
		return;
	}

	panel.style.display = "block";

	window.setTimeout(
		function() {
			panel.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		},
		80
	);
}

function closeAddStockPanel() {
	const panel =
		document.getElementById(
			"addStockPanel"
		);

	if (panel) {
		panel.style.display = "none";
	}

	clearStockForm();
}

async function loadMedicineDropdown() {
	const token =
		localStorage.getItem("token");

	const dropdown =
		document.getElementById(
			"medicineId"
		);

	if (!dropdown) {
		return;
	}

	dropdown.innerHTML =
		`<option value="">Loading medicines...</option>`;

	try {
		const response =
			await fetch(
				`${API_BASE}/medicines`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			dropdown.innerHTML =
				`<option value="">Unable to load medicines</option>`;

			showInventoryMessage(
				getErrorMessage(
					result,
					"Unable to load medicines"
				)
			);

			return;
		}

		medicineOptions =
			Array.isArray(result)
				? result
				: [];

		if (!medicineOptions.length) {
			dropdown.innerHTML =
				`<option value="">No medicine master found</option>`;

			return;
		}

		let html =
			`<option value="">Select Medicine</option>`;

		medicineOptions.forEach(
			function(medicine) {

				html += `
					<option value="${safeNumber(medicine.id)}">
						${safe(medicine.medicineName)}
						-
						${safe(medicine.brandName)}
					</option>
				`;

			}
		);

		dropdown.innerHTML = html;

	} catch (error) {
		console.error(
			"Load medicine dropdown error:",
			error
		);

		dropdown.innerHTML =
			`<option value="">Medicine service unavailable</option>`;

		showInventoryMessage(
			"Medicine service not reachable."
		);
	}
}

async function loadMyStock() {
	if (isLoadingStock) {
		return;
	}

	isLoadingStock = true;

	const token =
		localStorage.getItem("token");

	showInventoryLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/medicines/stock/my`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			stockList = [];

			showInventoryMessage(
				getErrorMessage(
					result,
					"Unable to load inventory"
				)
			);

			showInventoryErrorState(
				getErrorMessage(
					result,
					"Unable to load inventory"
				)
			);

			updateInventorySummary([]);
			return;
		}

		stockList =
			Array.isArray(result)
				? result
				: [];

		renderStock(stockList);

	} catch (error) {
		console.error(
			"Load wholesaler stock error:",
			error
		);

		stockList = [];

		showInventoryMessage(
			"Server not reachable. Please check medicine-service/api-gateway."
		);

		showInventoryErrorState(
			"Medicine stock service is currently unavailable."
		);

		updateInventorySummary([]);

	} finally {
		isLoadingStock = false;
	}
}

async function addStock() {
	if (isSavingStock) {
		return;
	}

	const medicineId =
		document.getElementById(
			"medicineId"
		)?.value || "";

	const data = {
		batchNumber:
			getValue("batchNumber"),

		manufacturingDate:
			getValue("manufacturingDate") || null,

		expiryDate:
			getValue("expiryDate"),

		availableQuantity:
			toInt(
				getValue("availableQuantity")
			),

		minimumStockLevel:
			toInt(
				getValue("minimumStockLevel")
			),

		mrp:
			toDecimal(
				getValue("mrp")
			),

		wholesalePrice:
			toDecimal(
				getValue("wholesalePrice")
			),

		ptr:
			toDecimal(
				getValue("ptr")
			),

		gstPercentage:
			toDecimal(
				getValue("gstPercentage")
			)
	};

	if (!medicineId) {
		showInventoryMessage(
			"Please select medicine"
		);

		return;
	}

	if (!data.batchNumber) {
		showInventoryMessage(
			"Batch number is required"
		);

		return;
	}

	if (!data.expiryDate) {
		showInventoryMessage(
			"Expiry date is required"
		);

		return;
	}

	if (
		data.availableQuantity === null ||
		data.availableQuantity <= 0
	) {
		showInventoryMessage(
			"Available quantity must be greater than zero"
		);

		return;
	}

	if (
		data.minimumStockLevel === null ||
		data.minimumStockLevel < 0
	) {
		showInventoryMessage(
			"Minimum stock level is required"
		);

		return;
	}

	if (
		data.mrp === null ||
		data.mrp <= 0
	) {
		showInventoryMessage(
			"MRP must be greater than zero"
		);

		return;
	}

	if (
		data.wholesalePrice === null ||
		data.wholesalePrice <= 0
	) {
		showInventoryMessage(
			"Wholesale price must be greater than zero"
		);

		return;
	}

	if (
		data.wholesalePrice >
		data.mrp
	) {
		showInventoryMessage(
			"Wholesale price cannot be greater than MRP"
		);

		return;
	}

	if (
		data.ptr !== null &&
		data.ptr < 0
	) {
		showInventoryMessage(
			"PTR cannot be negative"
		);

		return;
	}

	if (
		data.gstPercentage !== null &&
		(
			data.gstPercentage < 0 ||
			data.gstPercentage > 100
		)
	) {
		showInventoryMessage(
			"GST percentage must be between 0 and 100"
		);

		return;
	}

	const today =
		getLocalDateText(
			new Date()
		);

	if (
		data.expiryDate <= today
	) {
		showInventoryMessage(
			"Expiry date must be a future date"
		);

		return;
	}

	if (
		data.manufacturingDate &&
		data.manufacturingDate > today
	) {
		showInventoryMessage(
			"Manufacturing date cannot be in the future"
		);

		return;
	}

	if (
		data.manufacturingDate &&
		data.manufacturingDate >=
		data.expiryDate
	) {
		showInventoryMessage(
			"Manufacturing date must be before expiry date"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	isSavingStock = true;

	setButtonLoading(
		"saveStockBtn",
		"Saving Stock...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/medicines/stock/${encodeURIComponent(medicineId)}`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json",

						"Authorization":
							"Bearer " + token
					},

					body:
						JSON.stringify(data)
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showInventoryMessage(
				getErrorMessage(
					result,
					"Unable to add stock"
				)
			);

			return;
		}

		showInventoryMessage(
			"Stock added successfully",
			"success"
		);

		closeAddStockPanel();

		await loadMyStock();

	} catch (error) {
		console.error(
			"Add stock error:",
			error
		);

		showInventoryMessage(
			"Server not reachable. Please try again."
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

function renderStock(stocks) {
	const table =
		document.getElementById(
			"stockTable"
		);

	if (!table) {
		return;
	}

	const list =
		Array.isArray(stocks)
			? stocks
			: [];

	updateInventorySummary(list);

	if (!list.length) {
		table.innerHTML = `
			<tr>
				<td colspan="10">

					<div class="inventory-state">

						<div class="inventory-state-icon">
							<i class="bi bi-box-seam"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No stock found
						</h5>

						<p class="text-muted mb-3">
							Add your first medicine batch to start inventory management.
						</p>

						<button type="button"
								class="btn btn-medi"
								style="width:auto;"
								onclick="openAddStockPanel()">

							<i class="bi bi-plus-circle-fill me-1"></i>
							Add Stock
						</button>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(stock, index) {

			const medicine =
				stock.medicine || {};

			const qty =
				Number(
					stock.availableQuantity || 0
				);

			const min =
				Number(
					stock.minimumStockLevel || 0
				);

			const low =
				qty <= min;

			const expiryStatus =
				getExpiryStatus(
					stock.expiryDate
				);

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>

						<div class="inventory-medicine">

							<div class="inventory-medicine-icon">
								<i class="bi bi-capsule-pill"></i>
							</div>

							<div>

								<strong class="text-primary">
									${safe(medicine.medicineName)}
								</strong>

								<div class="text-muted small">
									${safe(medicine.brandName)}
									|
									${safe(medicine.manufacturer)}
								</div>

							</div>

						</div>

					</td>

					<td>
						${safe(stock.batchNumber)}
					</td>

					<td>
						<strong>${qty}</strong>
					</td>

					<td>
						${min}
					</td>

					<td>
						₹${formatMoney(stock.mrp)}
					</td>

					<td>
						<span class="inventory-price">
							₹${formatMoney(stock.wholesalePrice)}
						</span>
					</td>

					<td>
						${formatMoney(stock.gstPercentage)}%
					</td>

					<td>
						${formatDate(stock.expiryDate)}
					</td>

					<td>

						<div class="inventory-status-stack">

							${inventoryStatusPill(
				low
					? "Low Stock"
					: "Stock OK",
				low
					? "danger"
					: "success",
				low
					? "bi bi-exclamation-triangle-fill"
					: "bi bi-check2-circle"
			)}

							${inventoryStatusPill(
				expiryStatus.label,
				expiryStatus.type,
				expiryStatus.icon
			)}

						</div>

					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function updateInventorySummary(stocks) {
	const list =
		Array.isArray(stocks)
			? stocks
			: [];

	const totalQty =
		list.reduce(
			(total, stock) =>
				total +
				Number(
					stock.availableQuantity || 0
				),
			0
		);

	const lowStock =
		list.filter(
			stock =>
				Number(
					stock.availableQuantity || 0
				) <=
				Number(
					stock.minimumStockLevel || 0
				)
		).length;

	const expiryRisk =
		list.filter(
			stock =>
				getExpiryStatus(
					stock.expiryDate
				).risk
		).length;

	setSummaryValue(
		"totalStockItems",
		list.length
	);

	setSummaryValue(
		"totalQuantity",
		totalQty
	);

	setSummaryValue(
		"lowStockCount",
		lowStock
	);

	setSummaryValue(
		"expiryCount",
		expiryRisk
	);
}

function filterStockTable() {
	const keyword =
		document
			.getElementById("searchBox")
			?.value
			.trim()
			.toLowerCase() || "";

	const filtered =
		stockList.filter(
			function(stock) {

				const medicine =
					stock.medicine || {};

				return (
					String(
						medicine.medicineName || ""
					)
						.toLowerCase()
						.includes(keyword) ||

					String(
						medicine.brandName || ""
					)
						.toLowerCase()
						.includes(keyword) ||

					String(
						medicine.manufacturer || ""
					)
						.toLowerCase()
						.includes(keyword) ||

					String(
						stock.batchNumber || ""
					)
						.toLowerCase()
						.includes(keyword)
				);

			}
		);

	renderStock(filtered);
}

function getExpiryStatus(expiryDate) {
	if (!expiryDate) {
		return {
			label: "No Expiry",
			type: "secondary",
			icon: "bi bi-info-circle-fill",
			risk: true
		};
	}

	const today =
		new Date();

	today.setHours(
		0,
		0,
		0,
		0
	);

	const expiry =
		new Date(expiryDate);

	if (Number.isNaN(expiry.getTime())) {
		return {
			label: "Invalid Expiry",
			type: "danger",
			icon: "bi bi-x-circle-fill",
			risk: true
		};
	}

	expiry.setHours(
		0,
		0,
		0,
		0
	);

	const diffTime =
		expiry.getTime() -
		today.getTime();

	const diffDays =
		Math.ceil(
			diffTime /
			(1000 * 60 * 60 * 24)
		);

	if (diffDays < 0) {
		return {
			label: "Expired",
			type: "danger",
			icon: "bi bi-calendar-x-fill",
			risk: true
		};
	}

	if (diffDays <= 60) {
		return {
			label: "Near Expiry",
			type: "warning",
			icon: "bi bi-exclamation-triangle-fill",
			risk: true
		};
	}

	return {
		label: "Valid",
		type: "success",
		icon: "bi bi-calendar-check-fill",
		risk: false
	};
}

function inventoryStatusPill(
	label,
	type,
	icon
) {
	return `
		<span class="inventory-status-pill ${escapeHtml(type)}">

			<i class="${escapeHtml(icon)}"></i>

			${escapeHtml(label)}

		</span>
	`;
}

function clearStockForm() {
	[
		"medicineId",
		"batchNumber",
		"manufacturingDate",
		"expiryDate",
		"availableQuantity",
		"minimumStockLevel",
		"mrp",
		"wholesalePrice",
		"ptr",
		"gstPercentage"
	].forEach(
		function(id) {

			const element =
				document.getElementById(id);

			if (element) {
				element.value = "";
			}

		}
	);
}

function showInventoryLoadingState() {
	const table =
		document.getElementById(
			"stockTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="10">

				<div class="inventory-state">

					<div class="inventory-state-icon inventory-loading-icon">
						<i class="bi bi-boxes"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading inventory
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare your stock records.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showInventoryErrorState(message) {
	const table =
		document.getElementById(
			"stockTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="10">

				<div class="inventory-state">

					<div class="inventory-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load inventory
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showInventoryMessage(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type}">
			${escapeHtml(message)}
		</div>
	`;

	setTimeout(
		function() {
			if (msg) {
				msg.innerHTML = "";
			}
		},
		3500
	);
}

function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {
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

function setSummaryValue(
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

function getValue(id) {
	const element =
		document.getElementById(id);

	return element
		? element.value.trim()
		: "";
}

function toInt(value) {
	if (
		value === null ||
		value === undefined ||
		value === ""
	) {
		return null;
	}

	const numericValue =
		parseInt(value, 10);

	return Number.isFinite(numericValue)
		? numericValue
		: null;
}

function toDecimal(value) {
	if (
		value === null ||
		value === undefined ||
		value === ""
	) {
		return null;
	}

	const numericValue =
		parseFloat(value);

	return Number.isFinite(numericValue)
		? numericValue
		: null;
}

function formatMoney(value) {
	const numericValue =
		Number(value);

	return Number.isFinite(numericValue)
		? numericValue.toFixed(2)
		: "0.00";
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

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

function getLocalDateText(date) {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0")
	].join("-");
}

async function readJsonSafely(response) {
	try {
		return await response.json();
	} catch (error) {
		return null;
	}
}

function getErrorMessage(
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

	if (typeof data === "string") {
		return data;
	}

	return fallback;
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

function safeNumber(value) {
	const numericValue =
		Number(value);

	return Number.isFinite(numericValue)
		? numericValue
		: 0;
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}