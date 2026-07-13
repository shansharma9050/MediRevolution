let cart = [];

document.addEventListener("DOMContentLoaded", function() {
	requireRetailerRole();
	loadCart();
});

function requireRetailerRole() {
	const role =
		localStorage.getItem("role");

	if (role !== "RETAILER") {
		alert("Access denied. Only RETAILER can access this page.");
		window.location.href = "/dashboard";
	}
}

function loadCart() {
	try {
		const storedCart =
			localStorage.getItem("mr_cart");

		cart =
			storedCart
				? JSON.parse(storedCart)
				: [];

		if (!Array.isArray(cart)) {
			cart = [];
		}

	} catch (error) {
		console.error(
			"Invalid cart data:",
			error
		);

		cart = [];

		localStorage.removeItem(
			"mr_cart"
		);
	}

	renderCart();
}

function renderCart() {
	const table =
		document.getElementById(
			"cartTable"
		);

	if (!table) {
		return;
	}

	let subtotal = 0;
	let gst = 0;

	if (!cart.length) {
		table.innerHTML = `
			<tr>
				<td colspan="7">

					<div class="cart-state">

						<div class="cart-state-icon">
							<i class="bi bi-cart-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							Your cart is empty
						</h5>

						<p class="text-muted mb-3">
							Search medicines and add items before placing an order.
						</p>

						<a href="/retailer/search-medicines"
						   class="btn btn-medi"
						   style="width:auto;">

							<i class="bi bi-search me-1"></i>
							Search Medicines
						</a>

					</div>

				</td>
			</tr>
		`;

		updateSummary(
			0,
			0,
			0
		);

		updatePlaceOrderButton();

		return;
	}

	let html = "";

	cart.forEach(
		function(item, index) {

			const quantity =
				Number(item.quantity || 0);

			const price =
				Number(item.wholesalePrice || 0);

			const gstPercentage =
				Number(item.gstPercentage || 0);

			const lineTotal =
				quantity * price;

			const gstAmount =
				lineTotal *
				gstPercentage /
				100;

			subtotal += lineTotal;
			gst += gstAmount;

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<div class="cart-medicine">

							<div class="cart-medicine-icon">
								<i class="bi bi-capsule-pill"></i>
							</div>

							<div>
								<strong class="text-primary">
									${safe(item.medicineName)}
								</strong>

								<div class="text-muted small">
									Stock ID: ${safe(item.stockId)}
								</div>
							</div>

						</div>
					</td>

					<td>
						${safe(item.batchNumber)}
					</td>

					<td>

						<div class="cart-quantity-control">

							<button type="button"
									onclick="changeQuantity(${index}, -1)"
									title="Decrease quantity">

								<i class="bi bi-dash"></i>
							</button>

							<strong>${quantity}</strong>

							<button type="button"
									onclick="changeQuantity(${index}, 1)"
									title="Increase quantity">

								<i class="bi bi-plus"></i>
							</button>

						</div>

					</td>

					<td>
						₹${formatMoney(price)}
					</td>

					<td>
						${formatMoney(gstPercentage)}%
					</td>

					<td>
						<span class="cart-line-total">
							₹${formatMoney(lineTotal + gstAmount)}
						</span>
					</td>

					<td>

						<button type="button"
								class="btn btn-sm btn-outline-danger"
								onclick="removeItem(${index})">

							<i class="bi bi-trash-fill me-1"></i>
							Remove
						</button>

					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;

	updateSummary(
		cart.length,
		subtotal,
		gst
	);

	updatePlaceOrderButton();
}

function changeQuantity(
	index,
	change
) {
	const item =
		cart[index];

	if (!item) {
		return;
	}

	const currentQuantity =
		Number(item.quantity || 0);

	const nextQuantity =
		currentQuantity + change;

	if (nextQuantity <= 0) {
		removeItem(index);
		return;
	}

	if (
		item.availableQuantity !== undefined &&
		item.availableQuantity !== null &&
		nextQuantity >
		Number(item.availableQuantity)
	) {
		showMessage(
			"Requested quantity exceeds available stock"
		);

		return;
	}

	item.quantity =
		nextQuantity;

	saveCart();
	renderCart();
}

function removeItem(index) {
	if (
		index < 0 ||
		index >= cart.length
	) {
		return;
	}

	cart.splice(index, 1);

	saveCart();
	renderCart();

	showMessage(
		"Item removed from cart",
		"success"
	);
}

function saveCart() {
	localStorage.setItem(
		"mr_cart",
		JSON.stringify(cart)
	);
}

function updateSummary(
	itemCount,
	subtotal,
	gst
) {
	setText(
		"itemCount",
		itemCount
	);

	setText(
		"subTotal",
		formatMoney(subtotal)
	);

	setText(
		"gstTotal",
		formatMoney(gst)
	);

	setText(
		"grandTotal",
		formatMoney(
			Number(subtotal || 0) +
			Number(gst || 0)
		)
	);
}

function updatePlaceOrderButton() {
	const button =
		document.getElementById(
			"placeOrderBtn"
		);

	if (!button) {
		return;
	}

	button.disabled =
		cart.length === 0;
}

async function placeOrder() {
	if (!cart.length) {
		showMessage(
			"Cart is empty"
		);

		return;
	}

	const wholesalerId =
		cart[0].wholesalerAuthUserId;

	if (!wholesalerId) {
		showMessage(
			"Wholesaler information is missing"
		);

		return;
	}

	const mixedWholesaler =
		cart.some(
			item =>
				String(
					item.wholesalerAuthUserId
				) !==
				String(wholesalerId)
		);

	if (mixedWholesaler) {
		showMessage(
			"All cart items must belong to the same wholesaler"
		);

		return;
	}

	const invalidItem =
		cart.some(
			item =>
				!item.stockId ||
				Number(item.quantity || 0) <= 0
		);

	if (invalidItem) {
		showMessage(
			"Cart contains invalid item data"
		);

		return;
	}

	const payload = {
		wholesalerAuthUserId:
			wholesalerId,

		items:
			cart.map(
				item => ({
					stockId:
						item.stockId,

					quantity:
						Number(item.quantity)
				})
			)
	};

	const token =
		localStorage.getItem("token");

	setButtonLoading(
		"placeOrderBtn",
		"Placing Order...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/orders`,
				{
					method: "POST",

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
			showMessage(
				getErrorMessage(
					result,
					"Order failed"
				)
			);

			return;
		}

		localStorage.removeItem(
			"mr_cart"
		);

		cart = [];

		renderCart();

		showMessage(
			"Order placed successfully",
			"success"
		);

		setTimeout(
			function() {
				window.location.href =
					"/orders";
			},
			1800
		);

	} catch (error) {
		console.error(
			"Place order error:",
			error
		);

		showMessage(
			"Server unavailable"
		);

	} finally {
		setButtonLoading(
			"placeOrderBtn",
			"Place Order",
			false
		);

		updatePlaceOrderButton();
	}
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

function setText(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
}

function showMessage(
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

function formatMoney(value) {
	const numericValue =
		Number(value);

	return Number.isFinite(numericValue)
		? numericValue.toFixed(2)
		: "0.00";
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
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}