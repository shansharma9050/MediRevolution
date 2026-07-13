let hospitalInventory = [];
let editingInventoryId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadInventory();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleInventoryForm() {
	const panel =
		document.getElementById(
			"inventoryFormPanel"
		);

	if (!panel) {
		return;
	}

	const isHidden =
		panel.style.display === "none" ||
		window.getComputedStyle(panel).display === "none";

	panel.style.display =
		isHidden
			? "block"
			: "none";
}

function openCreateInventoryForm() {
	clearForm();

	const title =
		document.getElementById(
			"inventoryFormTitle"
		);

	if (title) {
		title.innerText =
			"Add Inventory Item";
	}

	setSaveInventoryButtonLabel(
		"Save Item"
	);

	const panel =
		document.getElementById(
			"inventoryFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		window.setTimeout(function() {
			panel.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		}, 80);
	}
}

function closeInventoryForm() {
	clearForm();

	const panel =
		document.getElementById(
			"inventoryFormPanel"
		);

	if (panel) {
		panel.style.display = "none";
	}
}

async function loadInventory() {
	const token =
		localStorage.getItem("token");

	showInventoryLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/inventory`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			hospitalInventory = [];

			updateInventorySummary();

			showInventoryErrorState(
				getErrorMessage(
					result,
					"Unable to load inventory"
				)
			);

			showMsg(
				getErrorMessage(
					result,
					"Unable to load inventory"
				)
			);

			return;
		}

		hospitalInventory =
			Array.isArray(result)
				? result
				: [];

		renderInventory(
			hospitalInventory
		);

		updateInventorySummary();

	} catch (e) {
		console.error(
			"Load hospital inventory error:",
			e
		);

		hospitalInventory = [];

		updateInventorySummary();

		showInventoryErrorState(
			"Hospital service not reachable."
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

async function createInventory() {
	const payload = {
		itemName:
			getVal("itemName"),

		category:
			getVal("category"),

		quantity:
			toInt(
				getVal("quantity")
			),

		minimumQuantity:
			toInt(
				getVal("minimumQuantity")
			),

		unitPrice:
			toDecimal(
				getVal("unitPrice")
			)
	};

	if (
		!payload.itemName ||
		!payload.category ||
		payload.quantity === null ||
		payload.quantity < 0
	) {
		showMsg(
			"Item name, category and valid quantity are required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const url =
		editingInventoryId
			? `${API_BASE}/hospital/inventory/${editingInventoryId}`
			: `${API_BASE}/hospital/inventory`;

	const method =
		editingInventoryId
			? "PUT"
			: "POST";

	setButtonLoading(
		"saveHospitalInventoryBtn",
		editingInventoryId
			? "Updating Item..."
			: "Saving Item...",
		true
	);

	try {
		const response =
			await fetch(
				url,
				{
					method: method,

					headers: {
						"Content-Type":
							"application/json",

						"Authorization":
							"Bearer " + token
					},

					body:
						JSON.stringify(payload)
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMsg(
				getErrorMessage(
					result,
					"Unable to save inventory"
				)
			);

			return;
		}

		showMsg(
			editingInventoryId
				? "Inventory updated successfully"
				: "Inventory item saved successfully",
			"success"
		);

		clearForm();

		const panel =
			document.getElementById(
				"inventoryFormPanel"
			);

		if (panel) {
			panel.style.display = "none";
		}

		loadInventory();

	} catch (e) {
		console.error(
			"Save hospital inventory error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);

	} finally {
		setButtonLoading(
			"saveHospitalInventoryBtn",
			editingInventoryId
				? "Update Item"
				: "Save Item",
			false
		);
	}
}

function renderInventory(list = hospitalInventory) {
	const table =
		document.getElementById(
			"inventoryTable"
		);

	if (!table) {
		return;
	}

	const items =
		Array.isArray(list)
			? list
			: [];

	if (!items.length) {
		table.innerHTML = `
			<tr>
				<td colspan="8">

					<div class="hospital-inventory-state">

						<div class="hospital-inventory-state-icon">
							<i class="bi bi-box-seam"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No inventory items found
						</h5>

						<p class="text-muted mb-0">
							Add the first item to begin hospital inventory management.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	items.forEach(
		function(item, index) {

			const isLow =
				Number(item.quantity || 0) <=
				Number(item.minimumQuantity || 0);

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<div class="hospital-inventory-item">

							<div class="hospital-inventory-avatar">
								<i class="bi bi-box-fill"></i>
							</div>

							<strong class="text-primary">
								${safe(item.itemName)}
							</strong>

						</div>
					</td>

					<td>
						<span class="hospital-inventory-category">
							<i class="bi bi-tag-fill"></i>
							${safe(item.category)}
						</span>
					</td>

					<td>
						<strong>
							${safe(item.quantity)}
						</strong>
					</td>

					<td>
						${safe(item.minimumQuantity)}
					</td>

					<td>
						₹${formatMoney(item.unitPrice)}
					</td>

					<td>
						${inventoryStatusBadge(isLow)}
					</td>

					<td>

						<div class="hospital-inventory-actions">

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="editInventory(${safeNumber(item.id)})">

								<i class="bi bi-pencil-square me-1"></i>
								Edit
							</button>

							<button type="button"
									class="btn btn-sm btn-outline-warning"
									onclick="useInventory(${safeNumber(item.id)})">

								<i class="bi bi-dash-circle me-1"></i>
								Use
							</button>

							<button type="button"
									class="btn btn-sm btn-outline-danger"
									onclick="deleteInventory(${safeNumber(item.id)})">

								<i class="bi bi-trash-fill me-1"></i>
								Delete
							</button>

						</div>

					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function inventoryStatusBadge(isLow) {
	if (isLow) {
		return `
			<span class="hospital-inventory-status low">
				<i class="bi bi-exclamation-triangle-fill"></i>
				LOW STOCK
			</span>
		`;
	}

	return `
		<span class="hospital-inventory-status normal">
			<i class="bi bi-check2-circle"></i>
			IN STOCK
		</span>
	`;
}

function showInventoryLoadingState() {
	const table =
		document.getElementById(
			"inventoryTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="hospital-inventory-state">

					<div class="hospital-inventory-state-icon hospital-inventory-loading-icon">
						<i class="bi bi-box-seam-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading inventory
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare inventory records.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showInventoryErrorState(message) {
	const table =
		document.getElementById(
			"inventoryTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="hospital-inventory-state">

					<div class="hospital-inventory-state-icon bg-danger">
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

function editInventory(id) {
	const item =
		hospitalInventory.find(
			inventoryItem =>
				Number(inventoryItem.id) ===
				Number(id)
		);

	if (!item) {
		showMsg(
			"Inventory item not found"
		);

		return;
	}

	editingInventoryId = id;

	setInputValue(
		"itemName",
		item.itemName || ""
	);

	setInputValue(
		"category",
		item.category || ""
	);

	setInputValue(
		"quantity",
		item.quantity ?? ""
	);

	setInputValue(
		"minimumQuantity",
		item.minimumQuantity ?? ""
	);

	setInputValue(
		"unitPrice",
		item.unitPrice ?? ""
	);

	const title =
		document.getElementById(
			"inventoryFormTitle"
		);

	if (title) {
		title.innerText =
			"Edit Inventory Item";
	}

	setSaveInventoryButtonLabel(
		"Update Item"
	);

	const panel =
		document.getElementById(
			"inventoryFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		panel.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
}

async function deleteInventory(id) {
	if (
		!confirm(
			"Are you sure you want to delete this inventory item?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/inventory/${id}`,
				{
					method: "DELETE",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const resultText =
			await response.text();

		if (!response.ok) {
			showMsg(
				resultText ||
				"Unable to delete inventory item"
			);

			return;
		}

		showMsg(
			"Inventory item deleted successfully",
			"success"
		);

		loadInventory();

	} catch (e) {
		console.error(
			"Delete hospital inventory error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

async function useInventory(id) {
	const quantity =
		prompt(
			"Enter used quantity:"
		);

	const numericQuantity =
		Number(quantity);

	if (
		!quantity ||
		!Number.isFinite(numericQuantity) ||
		numericQuantity <= 0
	) {
		showMsg(
			"Please enter valid quantity"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/inventory/${id}/use?quantity=${encodeURIComponent(numericQuantity)}`,
				{
					method: "PUT",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMsg(
				getErrorMessage(
					result,
					"Unable to update inventory"
				)
			);

			return;
		}

		showMsg(
			"Inventory quantity updated successfully",
			"success"
		);

		loadInventory();

	} catch (e) {
		console.error(
			"Use hospital inventory error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

function filterInventory() {
	const keyword =
		document
			.getElementById("searchBox")
			?.value
			.trim()
			.toLowerCase() || "";

	const filtered =
		hospitalInventory.filter(
			item =>
				JSON.stringify(item)
					.toLowerCase()
					.includes(keyword)
		);

	renderInventory(filtered);
}

function updateInventorySummary() {
	const list =
		Array.isArray(hospitalInventory)
			? hospitalInventory
			: [];

	const totalQty =
		list.reduce(
			(sum, item) =>
				sum +
				Number(item.quantity || 0),
			0
		);

	const low =
		list.filter(
			item =>
				Number(item.quantity || 0) <=
				Number(item.minimumQuantity || 0)
		).length;

	const totalValue =
		list.reduce(
			(sum, item) =>
				sum +
				(
					Number(item.quantity || 0) *
					Number(item.unitPrice || 0)
				),
			0
		);

	setSummaryValue(
		"itemCount",
		list.length
	);

	setSummaryValue(
		"totalQuantity",
		totalQty
	);

	setSummaryValue(
		"lowStock",
		low
	);

	const inventoryValue =
		document.getElementById(
			"inventoryValue"
		);

	if (inventoryValue) {
		inventoryValue.textContent =
			`₹${formatMoney(totalValue)}`;
	}
}

function clearForm() {
	editingInventoryId = null;

	[
		"itemName",
		"category",
		"quantity",
		"minimumQuantity",
		"unitPrice"
	].forEach(
		function(id) {
			setInputValue(id, "");
		}
	);

	const title =
		document.getElementById(
			"inventoryFormTitle"
		);

	if (title) {
		title.innerText =
			"Add Inventory Item";
	}

	setSaveInventoryButtonLabel(
		"Save Item"
	);
}

function setInputValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value = value;
	}
}

function setSaveInventoryButtonLabel(label) {
	const button =
		document.getElementById(
			"saveHospitalInventoryBtn"
		);

	if (!button) {
		return;
	}

	button.innerHTML = `
		<i class="bi bi-check2-circle me-1"></i>
		${escapeHtml(label)}
	`;
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
				  aria-hidden="true">
			</span>
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

function setSummaryValue(id, value) {
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
	const startTime = performance.now();

	if (
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches ||
		difference === 0
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

function getVal(id) {
	const element =
		document.getElementById(id);

	return element
		? element.value.trim()
		: "";
}

function toInt(value) {
	const numberValue =
		parseInt(value, 10);

	return Number.isFinite(numberValue)
		? numberValue
		: null;
}

function toDecimal(value) {
	const numberValue =
		parseFloat(value);

	return Number.isFinite(numberValue)
		? numberValue
		: null;
}

function showMsg(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	setTimeout(function() {
		if (msg) {
			msg.innerHTML = "";
		}
	}, 4000);
}

function formatMoney(value) {
	return value === null ||
		value === undefined
		? "0.00"
		: Number(value).toFixed(2);
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
	const numberValue =
		Number(value);

	return Number.isFinite(numberValue)
		? numberValue
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