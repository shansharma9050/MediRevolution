let stockResults = [];
let isSearchingStock = false;

document.addEventListener("DOMContentLoaded", function() {
	allowOnlyRetailer();
	applyRoleBasedMenuForRetailer();
	updateCartCount();
});

function allowOnlyRetailer() {
	const role =
		localStorage.getItem("role");

	if (role !== "RETAILER") {
		alert("Access denied. Only RETAILER can search medicines.");
		window.location.href = "/dashboard";
	}
}

function applyRoleBasedMenuForRetailer() {
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

function getWholesalerName(stock) {
	if (!stock) {
		return "-";
	}

	return (
		stock.wholesalerCompanyName ||
		stock.wholesalerName ||
		stock.companyName ||
		stock.businessName ||
		stock.firmName ||
		stock.shopName ||
		stock.wholesaler?.companyName ||
		stock.wholesaler?.businessName ||
		stock.wholesalerProfile?.companyName ||
		stock.wholesalerProfile?.businessName ||
		"-"
	);
}

function searchOnEnter(event) {
	if (event.key === "Enter") {
		event.preventDefault();
		searchMedicineStock();
	}
}

async function searchMedicineStock() {
	if (isSearchingStock) {
		return;
	}

	const keyword =
		document
			.getElementById("keyword")
			?.value
			.trim() || "";

	if (!keyword) {
		showRetailerMessage(
			"Please enter medicine or brand name"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	isSearchingStock = true;

	showStockLoadingState();

	setButtonLoading(
		"searchMedicineBtn",
		"Searching...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/medicines/stock/search?keyword=${encodeURIComponent(keyword)}`,
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
			stockResults = [];

			showRetailerMessage(
				getErrorMessage(
					result,
					"Unable to search stock"
				)
			);

			renderStockResults([]);
			return;
		}

		stockResults =
			Array.isArray(result)
				? result
				: [];

		renderStockResults(
			stockResults
		);

	} catch (error) {
		console.error(
			"Medicine stock search error:",
			error
		);

		stockResults = [];

		showRetailerMessage(
			"Server not reachable. Please check medicine-service/api-gateway."
		);

		showStockErrorState(
			"Medicine stock service is currently unavailable."
		);

	} finally {
		isSearchingStock = false;

		setButtonLoading(
			"searchMedicineBtn",
			"Search Medicine",
			false
		);
	}
}

function renderStockResults(stocks) {
	const container =
		document.getElementById(
			"stockResultContainer"
		);

	if (!container) {
		return;
	}

	const list =
		Array.isArray(stocks)
			? stocks
			: [];

	setSummaryValue(
		"resultCount",
		list.length
	);

	const totalAvailable =
		list.reduce(
			(total, stock) =>
				total +
				Number(
					stock.availableQuantity || 0
				),
			0
		);

	setSummaryValue(
		"availableStockCount",
		totalAvailable
	);

	if (!list.length) {
		container.innerHTML = `
			<div class="col-12">

				<div class="retailer-state">

					<div class="retailer-state-icon">
						<i class="bi bi-box-seam"></i>
					</div>

					<h5 class="fw-bold text-primary">
						No stock found
					</h5>

					<p class="text-muted mb-0">
						No available wholesaler stock was found for this medicine.
					</p>

				</div>

			</div>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(stock, index) {

			const medicine =
				stock.medicine || {};

			const expiryStatus =
				getExpiryStatus(
					stock.expiryDate
				);

			const stockStatus =
				getStockStatus(
					stock.availableQuantity
				);

			const wholesalerName =
				getWholesalerName(stock);

			const disabled =
				Number(stock.availableQuantity || 0) <= 0 ||
				expiryStatus.label === "Expired";

			html += `
				<div class="col-xl-4 col-md-6">

					<article class="stock-card"
							 style="--card-delay:${Math.min(index * 65, 390)}ms">

						<div class="stock-card-content">

							<div class="d-flex justify-content-between align-items-start gap-3 mb-3">

								<div>

									<h5 class="fw-bold text-primary mb-1">
										${safe(medicine.medicineName)}
									</h5>

									<div class="stock-meta">
										${safe(medicine.brandName)}
										|
										${safe(medicine.manufacturer)}
									</div>

									<div class="stock-meta mt-2">
										<i class="bi bi-shop me-1"></i>
										<strong>Wholesaler:</strong>
										${safe(wholesalerName)}
									</div>

								</div>

								<div class="medicine-icon">
									<i class="bi bi-capsule-pill"></i>
								</div>

							</div>

							<div class="mb-3">

								<span class="stock-chip">
									<i class="bi bi-prescription2"></i>
									${safe(medicine.composition)}
								</span>

								<span class="stock-chip">
									<i class="bi bi-upc-scan"></i>
									Batch:
									${safe(stock.batchNumber)}
								</span>

							</div>

							<div class="row g-2 my-3">

								<div class="col-6">

									<div class="stock-stat-box">
										<small>Available Qty</small>
										<strong>${safe(stock.availableQuantity)}</strong>
									</div>

								</div>

								<div class="col-6">

									<div class="stock-stat-box">
										<small>Expiry</small>
										<strong>${formatDate(stock.expiryDate)}</strong>
									</div>

								</div>

								<div class="col-6">

									<div class="stock-stat-box">
										<small>MRP</small>
										<strong>₹${formatMoney(stock.mrp)}</strong>
									</div>

								</div>

								<div class="col-6">

									<div class="stock-stat-box">
										<small>GST</small>
										<strong>${formatMoney(stock.gstPercentage)}%</strong>
									</div>

								</div>

							</div>

							<div class="mb-3">

								<div class="stock-meta">
									Wholesale Price
								</div>

								<div class="stock-price">
									₹${formatMoney(stock.wholesalePrice)}
								</div>

							</div>

							<div class="stock-status-row mb-3">

								${statusPill(
				stockStatus.label,
				stockStatus.type
			)}

								${statusPill(
				expiryStatus.label,
				expiryStatus.type
			)}

							</div>

							<div class="stock-add-row">

								<input type="number"
									   class="form-control"
									   id="qty_${safeNumber(stock.id)}"
									   min="1"
									   max="${safeNumber(stock.availableQuantity)}"
									   placeholder="Quantity"
									   ${disabled ? "disabled" : ""}>

								<button type="button"
										class="btn btn-medi"
										onclick="addToCart(${safeNumber(stock.id)})"
										${disabled ? "disabled" : ""}>

									<i class="bi bi-cart-plus-fill me-1"></i>
									Add
								</button>

							</div>

						</div>

					</article>

				</div>
			`;

		}
	);

	container.innerHTML = html;
}

function addToCart(stockId) {
	const stock =
		stockResults.find(
			item =>
				Number(item.id) ===
				Number(stockId)
		);

	if (!stock) {
		showRetailerMessage(
			"Stock not found"
		);

		return;
	}

	const qtyInput =
		document.getElementById(
			"qty_" + stockId
		);

	const quantity =
		parseInt(
			qtyInput?.value,
			10
		);

	if (
		!Number.isFinite(quantity) ||
		quantity <= 0
	) {
		showRetailerMessage(
			"Please enter valid quantity"
		);

		return;
	}

	if (
		quantity >
		Number(stock.availableQuantity || 0)
	) {
		showRetailerMessage(
			"Quantity cannot exceed available stock"
		);

		return;
	}

	const expiryStatus =
		getExpiryStatus(
			stock.expiryDate
		);

	if (expiryStatus.label === "Expired") {
		showRetailerMessage(
			"Cannot add expired medicine to cart"
		);

		return;
	}

	let cart =
		getCart();

	const existingWholesalerId =
		cart.length
			? cart[0].wholesalerAuthUserId
			: null;

	if (
		existingWholesalerId &&
		String(existingWholesalerId) !==
		String(stock.wholesalerAuthUserId)
	) {
		showRetailerMessage(
			"Cart already contains medicines from another wholesaler. Place that order first."
		);

		return;
	}

	const existingItem =
		cart.find(
			item =>
				Number(item.stockId) ===
				Number(stock.id)
		);

	if (existingItem) {
		const updatedQuantity =
			Number(existingItem.quantity || 0) +
			quantity;

		if (
			updatedQuantity >
			Number(stock.availableQuantity || 0)
		) {
			showRetailerMessage(
				"Cart quantity cannot exceed available stock"
			);

			return;
		}

		existingItem.quantity =
			updatedQuantity;

		existingItem.availableQuantity =
			stock.availableQuantity;

	} else {
		cart.push({
			stockId:
				stock.id,

			medicineId:
				stock.medicine
					? stock.medicine.id
					: null,

			medicineName:
				stock.medicine
					? stock.medicine.medicineName
					: "",

			brandName:
				stock.medicine
					? stock.medicine.brandName
					: "",

			manufacturer:
				stock.medicine
					? stock.medicine.manufacturer
					: "",

			batchNumber:
				stock.batchNumber,

			wholesalerAuthUserId:
				stock.wholesalerAuthUserId,

			wholesalerName:
				getWholesalerName(stock),

			availableQuantity:
				stock.availableQuantity,

			quantity:
				quantity,

			wholesalePrice:
				stock.wholesalePrice,

			gstPercentage:
				stock.gstPercentage,

			expiryDate:
				stock.expiryDate
		});
	}

	saveCart(cart);
	updateCartCount();

	showRetailerMessage(
		"Medicine added to cart",
		"success"
	);

	if (qtyInput) {
		qtyInput.value = "";
	}
}

function getCart() {
	try {
		const stored =
			localStorage.getItem("mr_cart");

		const parsed =
			stored
				? JSON.parse(stored)
				: [];

		return Array.isArray(parsed)
			? parsed
			: [];

	} catch (error) {
		console.error(
			"Invalid cart data:",
			error
		);

		localStorage.removeItem(
			"mr_cart"
		);

		return [];
	}
}

function saveCart(cart) {
	localStorage.setItem(
		"mr_cart",
		JSON.stringify(cart)
	);
}

function updateCartCount() {
	const cart =
		getCart();

	const count =
		cart.length;

	setSummaryValue(
		"cartCountCard",
		count
	);

	setText(
		"cartCountBadge",
		count
	);
}

function sortResults() {
	const option =
		document.getElementById(
			"sortOption"
		)?.value || "";

	const sorted = [
		...stockResults
	];

	if (option === "priceLow") {
		sorted.sort(
			(a, b) =>
				Number(a.wholesalePrice || 0) -
				Number(b.wholesalePrice || 0)
		);
	}

	if (option === "priceHigh") {
		sorted.sort(
			(a, b) =>
				Number(b.wholesalePrice || 0) -
				Number(a.wholesalePrice || 0)
		);
	}

	if (option === "qtyHigh") {
		sorted.sort(
			(a, b) =>
				Number(b.availableQuantity || 0) -
				Number(a.availableQuantity || 0)
		);
	}

	if (option === "expiryFar") {
		sorted.sort(
			(a, b) =>
				safeDateTimestamp(b.expiryDate) -
				safeDateTimestamp(a.expiryDate)
		);
	}

	renderStockResults(sorted);
}

function getStockStatus(quantity) {
	const numericQuantity =
		Number(quantity || 0);

	if (numericQuantity <= 0) {
		return {
			label: "Out of Stock",
			type: "danger"
		};
	}

	if (numericQuantity <= 50) {
		return {
			label: "Limited Stock",
			type: "warning"
		};
	}

	return {
		label: "Available",
		type: "success"
	};
}

function getExpiryStatus(expiryDate) {
	if (!expiryDate) {
		return {
			label: "No Expiry",
			type: "secondary"
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
			type: "danger"
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
			type: "danger"
		};
	}

	if (diffDays <= 60) {
		return {
			label: "Near Expiry",
			type: "warning"
		};
	}

	return {
		label: "Valid",
		type: "success"
	};
}

function statusPill(
	label,
	type
) {
	return `
		<span class="stock-status-pill ${escapeHtml(type)}">
			<i class="${statusIcon(type)}"></i>
			${escapeHtml(label)}
		</span>
	`;
}

function statusIcon(type) {
	if (type === "success") {
		return "bi bi-check2-circle";
	}

	if (type === "warning") {
		return "bi bi-exclamation-triangle-fill";
	}

	if (type === "danger") {
		return "bi bi-x-circle-fill";
	}

	return "bi bi-info-circle-fill";
}

function showStockLoadingState() {
	const container =
		document.getElementById(
			"stockResultContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="col-12">

			<div class="retailer-state">

				<div class="retailer-state-icon retailer-loading-icon">
					<i class="bi bi-search"></i>
				</div>

				<h5 class="fw-bold text-primary">
					Searching available stock
				</h5>

				<p class="text-muted mb-0">
					Please wait while we check verified wholesaler inventory.
				</p>

			</div>

		</div>
	`;
}

function showStockErrorState(message) {
	const container =
		document.getElementById(
			"stockResultContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="col-12">

			<div class="retailer-state">

				<div class="retailer-state-icon bg-danger">
					<i class="bi bi-exclamation-triangle-fill"></i>
				</div>

				<h5 class="fw-bold text-danger">
					Unable to search stock
				</h5>

				<p class="text-muted mb-0">
					${escapeHtml(message)}
				</p>

			</div>

		</div>
	`;
}

function showRetailerMessage(
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

function setText(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
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

function safeDateTimestamp(value) {
	const date =
		new Date(value);

	return Number.isNaN(date.getTime())
		? 0
		: date.getTime();
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