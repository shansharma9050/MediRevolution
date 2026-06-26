let stockResults = [];

document.addEventListener("DOMContentLoaded", function() {
	allowOnlyRetailer();
	applyRoleBasedMenuForRetailer();
	updateCartCount();
});

function allowOnlyRetailer() {
	const role = localStorage.getItem("role");

	if (role !== "RETAILER") {
		alert("Access denied. Only RETAILER can search medicines.");
		window.location.href = "/dashboard";
	}
}

function applyRoleBasedMenuForRetailer() {
	const role = localStorage.getItem("role");

	document.querySelectorAll("[data-role]").forEach(item => {
		const allowedRoles = item.getAttribute("data-role").split(" ");

		if (!allowedRoles.includes(role)) {
			item.style.display = "none";
		}
	});
}

function getWholesalerName(stock) {
    if (!stock) {
        return "-";
    }

    return stock.wholesalerCompanyName ||
        stock.wholesalerName ||
        stock.companyName ||
        stock.businessName ||
        stock.firmName ||
        stock.shopName ||
        stock.wholesaler?.companyName ||
        stock.wholesaler?.businessName ||
        stock.wholesalerProfile?.companyName ||
        stock.wholesalerProfile?.businessName ||
        "-";
}

function searchOnEnter(event) {
	if (event.key === "Enter") {
		searchMedicineStock();
	}
}

async function searchMedicineStock() {
	const keyword = document.getElementById("keyword").value.trim();

	if (!keyword) {
		showRetailerMessage("Please enter medicine or brand name");
		return;
	}

	const token = localStorage.getItem("token");

	document.getElementById("stockResultContainer").innerHTML = `
        <div class="col-12">
            <div class="text-center text-muted py-5">
                Searching available stock...
            </div>
        </div>
    `;

	try {
		const response = await fetch(`${API_BASE}/medicines/stock/search?keyword=${encodeURIComponent(keyword)}`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await response.json();

		if (!response.ok) {
			showRetailerMessage(result.message || "Unable to search stock");
			renderStockResults([]);
			return;
		}

		stockResults = result;
		renderStockResults(stockResults);

	} catch (error) {
		showRetailerMessage("Server not reachable. Please check medicine-service/api-gateway.");
		renderStockResults([]);
	}
}

function renderStockResults(stocks) {
	const container = document.getElementById("stockResultContainer");

	document.getElementById("resultCount").innerText = stocks.length;

	let totalAvailable = 0;

	stocks.forEach(stock => {
		totalAvailable += stock.availableQuantity || 0;
	});

	document.getElementById("availableStockCount").innerText = totalAvailable;

	if (!stocks || stocks.length === 0) {
		container.innerHTML = `
            <div class="col-12">
                <div class="text-center text-muted py-5">
                    No stock found for this medicine.
                </div>
            </div>
        `;
		return;
	}

	let html = "";

	stocks.forEach(stock => {
		const medicine = stock.medicine || {};
		const expiryStatus = getExpiryStatus(stock.expiryDate);
		const stockStatus = getStockStatus(stock.availableQuantity);
		const wholesalerName = getWholesalerName(stock);

		html += `
            <div class="col-xl-4 col-md-6">
                <div class="stock-card">

                    <div class="d-flex justify-content-between align-items-start mb-3">
   				 <div>
     				   <h5 class="fw-bold text-primary mb-1">
      				      ${safe(medicine.medicineName)}
       					 </h5>

       					 <div class="stock-meta">
            				${safe(medicine.brandName)} | ${safe(medicine.manufacturer)}
       					 </div>

       				 <div class="stock-meta mt-1">
           					 <strong>Wholesaler:</strong> ${safe(wholesalerName)}
        			</div>
    			    </div>
			
 				   <div class="medicine-icon">💊</div>
				</div>

                    <div class="mb-2">
                        <span class="stock-chip">${safe(medicine.composition)}</span>
                        <span class="stock-chip">Batch: ${safe(stock.batchNumber)}</span>
                    </div>

                    <div class="row g-2 my-3">
                        <div class="col-6">
                            <div class="stock-meta">Available Qty</div>
                            <strong>${safe(stock.availableQuantity)}</strong>
                        </div>

                        <div class="col-6">
                            <div class="stock-meta">Expiry</div>
                            <strong>${formatDate(stock.expiryDate)}</strong>
                        </div>

                        <div class="col-6">
                            <div class="stock-meta">MRP</div>
                            <strong>Rs. ${formatMoney(stock.mrp)}</strong>
                        </div>

                        <div class="col-6">
                            <div class="stock-meta">GST</div>
                            <strong>${formatMoney(stock.gstPercentage)}%</strong>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <div class="stock-meta">Wholesale Price</div>
                            <div class="stock-price">Rs. ${formatMoney(stock.wholesalePrice)}</div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <span class="badge bg-${stockStatus.type}">
                            ${stockStatus.label}
                        </span>

                        <span class="badge bg-${expiryStatus.type}">
                            ${expiryStatus.label}
                        </span>
                    </div>

                    <div class="d-flex gap-2 align-items-center">
                        <input type="number"
                               class="form-control qty-input"
                               id="qty_${stock.id}"
                               min="1"
                               max="${stock.availableQuantity}"
                               placeholder="Qty">

                        <button class="btn btn-medi"
                                onclick="addToCart(${stock.id})">
                            Add
                        </button>
                    </div>

                </div>
            </div>
        `;
	});

	container.innerHTML = html;
}

function addToCart(stockId) {
	const stock = stockResults.find(item => item.id === stockId);

	if (!stock) {
		showRetailerMessage("Stock not found");
		return;
	}

	const qtyInput = document.getElementById("qty_" + stockId);
	const quantity = parseInt(qtyInput.value);

	if (!quantity || quantity <= 0) {
		showRetailerMessage("Please enter valid quantity");
		return;
	}

	if (quantity > stock.availableQuantity) {
		showRetailerMessage("Quantity cannot exceed available stock");
		return;
	}

	const expiryStatus = getExpiryStatus(stock.expiryDate);

	if (expiryStatus.label === "Expired") {
		showRetailerMessage("Cannot add expired medicine to cart");
		return;
	}

	let cart = getCart();

	const existingItem = cart.find(item => item.stockId === stock.id);

	if (existingItem) {
		existingItem.quantity += quantity;

		if (existingItem.quantity > stock.availableQuantity) {
			showRetailerMessage("Cart quantity cannot exceed available stock");
			return;
		}
	} else {
		cart.push({
			stockId: stock.id,
			medicineId: stock.medicine ? stock.medicine.id : null,
			medicineName: stock.medicine ? stock.medicine.medicineName : "",
			brandName: stock.medicine ? stock.medicine.brandName : "",
			manufacturer: stock.medicine ? stock.medicine.manufacturer : "",
			batchNumber: stock.batchNumber,
			wholesalerAuthUserId: stock.wholesalerAuthUserId,
			wholesalerName: getWholesalerName(stock),
			availableQuantity: stock.availableQuantity,
			quantity: quantity,
			wholesalePrice: stock.wholesalePrice,
			gstPercentage: stock.gstPercentage,
			expiryDate: stock.expiryDate
		});
	}

	saveCart(cart);
	updateCartCount();
	showRetailerMessage("Medicine added to cart", "success");
	qtyInput.value = "";
}

function getCart() {
	return JSON.parse(localStorage.getItem("mr_cart") || "[]");
}

function saveCart(cart) {
	localStorage.setItem("mr_cart", JSON.stringify(cart));
}

function updateCartCount() {
	const cart = getCart();
	const count = cart.length;

	document.getElementById("cartCountBadge").innerText = count;
	document.getElementById("cartCountCard").innerText = count;
}

function sortResults() {
	const option = document.getElementById("sortOption").value;

	let sorted = [...stockResults];

	if (option === "priceLow") {
		sorted.sort((a, b) => Number(a.wholesalePrice || 0) - Number(b.wholesalePrice || 0));
	}

	if (option === "priceHigh") {
		sorted.sort((a, b) => Number(b.wholesalePrice || 0) - Number(a.wholesalePrice || 0));
	}

	if (option === "qtyHigh") {
		sorted.sort((a, b) => Number(b.availableQuantity || 0) - Number(a.availableQuantity || 0));
	}

	if (option === "expiryFar") {
		sorted.sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));
	}

	renderStockResults(sorted);
}

function getStockStatus(quantity) {
	if (!quantity || quantity <= 0) {
		return {
			label: "Out of Stock",
			type: "danger"
		};
	}

	if (quantity <= 50) {
		return {
			label: "Limited Stock",
			type: "warning text-dark"
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

	const today = new Date();
	const expiry = new Date(expiryDate);

	const diffTime = expiry.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return {
			label: "Expired",
			type: "danger"
		};
	}

	if (diffDays <= 60) {
		return {
			label: "Near Expiry",
			type: "warning text-dark"
		};
	}

	return {
		label: "Valid",
		type: "success"
	};
}

function showRetailerMessage(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;

	setTimeout(() => {
		document.getElementById("msg").innerHTML = "";
	}, 3500);
}

function formatMoney(value) {
	if (value === null || value === undefined) {
		return "0.00";
	}

	return Number(value).toFixed(2);
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	return new Date(value).toLocaleDateString();
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}