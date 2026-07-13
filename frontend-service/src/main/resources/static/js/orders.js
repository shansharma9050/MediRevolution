let allOrders = [];
let isLoadingOrders = false;

document.addEventListener("DOMContentLoaded", function() {
	allowOnlyOrderRoles();
	applyRoleBasedMenuForOrders();
	setOrdersPageText();
	loadOrders();
});

function allowOnlyOrderRoles() {
	const role =
		localStorage.getItem("role");

	if (
		role !== "RETAILER" &&
		role !== "WHOLESALER" &&
		role !== "SUPER_ADMIN"
	) {
		alert("Access denied.");
		window.location.href = "/dashboard";
	}
}

function applyRoleBasedMenuForOrders() {
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

function setOrdersPageText() {
	const role =
		localStorage.getItem("role");

	const pageTitle =
		document.getElementById("pageTitle");

	const pageSubtitle =
		document.getElementById("pageSubtitle");

	if (!pageTitle || !pageSubtitle) {
		return;
	}

	if (role === "RETAILER") {
		pageTitle.innerHTML =
			'My <span>orders</span>';

		pageSubtitle.innerText =
			"Track your placed medicine orders and delivery status.";
	}

	if (role === "WHOLESALER") {
		pageTitle.innerHTML =
			'Received <span>orders</span>';

		pageSubtitle.innerText =
			"Review retailer orders and update order lifecycle.";
	}

	if (role === "SUPER_ADMIN") {
		pageTitle.innerHTML =
			'All <span>orders</span>';

		pageSubtitle.innerText =
			"Monitor all system orders.";
	}
}

async function loadOrders() {
	if (isLoadingOrders) {
		return;
	}

	isLoadingOrders = true;

	const token =
		localStorage.getItem("token");

	showOrdersLoadingState();

	setButtonLoading(
		"refreshOrdersBtn",
		"Refreshing...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/orders/my`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const responseText =
			await response.text();

		console.log(
			"Orders response:",
			responseText
		);

		const result =
			parseJsonSafely(
				responseText,
				[]
			);

		if (!response.ok) {
			allOrders = [];

			showOrderMessage(
				getErrorMessage(
					result,
					"Unable to load orders"
				)
			);

			renderOrders([]);
			return;
		}

		allOrders =
			Array.isArray(result)
				? result
				: [];

		renderOrders(allOrders);

	} catch (error) {
		console.error(
			"Order service error:",
			error
		);

		allOrders = [];

		showOrderMessage(
			"Order response invalid or service not reachable."
		);

		renderOrders([]);

	} finally {
		isLoadingOrders = false;

		setButtonLoading(
			"refreshOrdersBtn",
			"Refresh Orders",
			false
		);
	}
}

function filterOrders() {
	const status =
		document
			.getElementById("statusFilter")
			?.value || "";

	const keyword =
		document
			.getElementById("searchBox")
			?.value
			.trim()
			.toLowerCase() || "";

	const filtered =
		allOrders.filter(
			function(order) {

				const statusMatch =
					!status ||
					order.status === status;

				const orderText =
					JSON.stringify(order)
						.toLowerCase();

				const keywordMatch =
					!keyword ||
					orderText.includes(keyword);

				return (
					statusMatch &&
					keywordMatch
				);

			}
		);

	renderOrders(filtered);
}

function renderOrders(orders) {
	const container =
		document.getElementById(
			"ordersContainer"
		);

	if (!container) {
		return;
	}

	const list =
		Array.isArray(orders)
			? orders
			: [];

	updateOrderCards(list);

	if (!list.length) {
		container.innerHTML = `
			<div class="orders-state">

				<div class="orders-state-icon">
					<i class="bi bi-bag-x-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No orders found
				</h5>

				<p class="text-muted mb-0">
					There are no orders matching the selected filters.
				</p>

			</div>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(order, index) {

			html += `
				<article class="order-card"
						 style="--card-delay:${Math.min(index * 65, 390)}ms">

					<div class="order-header">

						<div>

							<div class="order-number-wrap">

								<div class="order-number-icon">
									<i class="bi bi-receipt-cutoff"></i>
								</div>

								<div>

									<h5 class="fw-bold text-primary mb-1">
										${safe(order.orderNumber)}
									</h5>

									<div class="text-muted small">
										Order Date:
										${formatDateTime(order.orderDate)}
									</div>

								</div>

							</div>

							<div class="order-identifiers">

								<span class="order-meta-chip">
									<i class="bi bi-shop"></i>
									Retailer ID:
									${safe(order.retailerAuthUserId)}
								</span>

								<span class="order-meta-chip">
									<i class="bi bi-truck"></i>
									Wholesaler ID:
									${safe(order.wholesalerAuthUserId)}
								</span>

							</div>

						</div>

						<div class="text-end">

							${statusBadge(order.status)}

							<div class="order-amount">
								₹${formatMoney(order.totalAmount)}
							</div>

						</div>

					</div>

					${buildTimeline(order.status)}

					<div class="order-items-panel">

						<h6 class="fw-bold text-primary mb-3">
							<i class="bi bi-capsule-pill me-1"></i>
							Order Items
						</h6>

						${buildOrderItems(order.items)}

					</div>

					${buildActionButtons(order)}

				</article>
			`;

		}
	);

	container.innerHTML = html;
}

function buildOrderItems(items) {
	if (
		!Array.isArray(items) ||
		!items.length
	) {
		return `
			<div class="text-muted">
				No items found.
			</div>
		`;
	}

	let html = "";

	items.forEach(
		function(item) {

			html += `
				<div class="order-item-row">

					<div class="row align-items-center g-3">

						<div class="col-lg-4">

							<div class="order-medicine-name">
								${safe(item.medicineName)}
							</div>

							<div class="text-muted small">
								Batch:
								${safe(item.batchNumber)}
							</div>

						</div>

						<div class="col-lg-2 col-md-4">
							Qty:
							<strong>${safe(item.quantity)}</strong>
						</div>

						<div class="col-lg-2 col-md-4">
							Price:
							₹${formatMoney(item.unitPrice)}
						</div>

						<div class="col-lg-2 col-md-4">
							GST:
							${formatMoney(item.gstPercentage)}%
						</div>

						<div class="col-lg-2 text-lg-end">
							<span class="order-item-total">
								₹${formatMoney(item.lineTotal)}
							</span>
						</div>

					</div>

				</div>
			`;

		}
	);

	return html;
}

function buildTimeline(status) {
	const steps = [
		"PENDING",
		"ACCEPTED",
		"DELIVERED"
	];

	if (status === "REJECTED") {
		return `
			<div class="order-timeline">

				<div class="timeline-step active">

					<div class="timeline-dot">1</div>
					<div class="timeline-label">Pending</div>

				</div>

				<div class="timeline-step active rejected">

					<div class="timeline-dot">
						<i class="bi bi-x-lg"></i>
					</div>

					<div class="timeline-label text-danger">
						Rejected
					</div>

				</div>

				<div class="timeline-step">

					<div class="timeline-dot">3</div>
					<div class="timeline-label">Delivered</div>

				</div>

			</div>
		`;
	}

	const currentIndex =
		steps.indexOf(status);

	return `
		<div class="order-timeline">

			${steps.map(
		function(step, index) {

			const active =
				index <= currentIndex
					? "active"
					: "";

			const delivered =
				step === "DELIVERED" &&
					status === "DELIVERED"
					? "delivered"
					: "";

			return `
						<div class="timeline-step ${active} ${delivered}">

							<div class="timeline-dot">
								${index + 1}
							</div>

							<div class="timeline-label">
								${formatStatus(step)}
							</div>

						</div>
					`;

		}
	).join("")}

		</div>
	`;
}

function buildActionButtons(order) {
	const role =
		localStorage.getItem("role");

	if (role !== "WHOLESALER") {
		return "";
	}

	if (order.status === "PENDING") {
		return `
			<div class="order-actions">

				<button type="button"
						class="btn btn-success"
						onclick="updateOrderStatus(${safeNumber(order.id)}, 'ACCEPTED')">

					<i class="bi bi-check2-circle me-1"></i>
					Accept Order
				</button>

				<button type="button"
						class="btn btn-danger"
						onclick="updateOrderStatus(${safeNumber(order.id)}, 'REJECTED')">

					<i class="bi bi-x-circle me-1"></i>
					Reject Order
				</button>

			</div>
		`;
	}

	if (order.status === "ACCEPTED") {
		return `
			<div class="order-actions">

				<button type="button"
						class="btn btn-medi"
						style="width:auto;"
						onclick="updateOrderStatus(${safeNumber(order.id)}, 'DELIVERED')">

					<i class="bi bi-truck me-1"></i>
					Mark Delivered
				</button>

			</div>
		`;
	}

	return "";
}

async function updateOrderStatus(
	orderId,
	status
) {
	const confirmMsg =
		"Are you sure you want to mark this order as " +
		status +
		"?";

	if (!confirm(confirmMsg)) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/orders/${orderId}/status?status=${encodeURIComponent(status)}`,
				{
					method: "PUT",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const responseText =
			await response.text();

		console.log(
			"Status update response:",
			response.status,
			responseText
		);

		if (!response.ok) {
			const parsed =
				parseJsonSafely(
					responseText,
					null
				);

			showOrderMessage(
				getErrorMessage(
					parsed,
					responseText ||
					"Unable to update order status"
				)
			);

			return;
		}

		showOrderMessage(
			`Order marked as ${formatStatus(status)}`,
			"success"
		);

		await loadOrders();

	} catch (error) {
		console.error(
			"Order update error:",
			error
		);

		showOrderMessage(
			"Order service not reachable."
		);
	}
}

function updateOrderCards(orders) {
	setSummaryValue(
		"totalOrders",
		orders.length
	);

	setSummaryValue(
		"pendingOrders",
		orders.filter(
			order =>
				order.status === "PENDING"
		).length
	);

	setSummaryValue(
		"acceptedOrders",
		orders.filter(
			order =>
				order.status === "ACCEPTED"
		).length
	);

	setSummaryValue(
		"deliveredOrders",
		orders.filter(
			order =>
				order.status === "DELIVERED"
		).length
	);
}

function statusBadge(status) {
	if (status === "PENDING") {
		return `
			<span class="status-pill status-pending">
				<i class="bi bi-hourglass-split"></i>
				PENDING
			</span>
		`;
	}

	if (status === "ACCEPTED") {
		return `
			<span class="status-pill status-accepted">
				<i class="bi bi-check2-circle"></i>
				ACCEPTED
			</span>
		`;
	}

	if (status === "REJECTED") {
		return `
			<span class="status-pill status-rejected">
				<i class="bi bi-x-circle"></i>
				REJECTED
			</span>
		`;
	}

	if (status === "DELIVERED") {
		return `
			<span class="status-pill status-delivered">
				<i class="bi bi-truck"></i>
				DELIVERED
			</span>
		`;
	}

	return `
		<span class="status-pill status-pending">
			${safe(status)}
		</span>
	`;
}

function showOrdersLoadingState() {
	const container =
		document.getElementById(
			"ordersContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="orders-state">

			<div class="orders-state-icon orders-loading-icon">
				<i class="bi bi-bag-check-fill"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading orders
			</h5>

			<p class="text-muted mb-0">
				Please wait while we prepare your order records.
			</p>

		</div>
	`;
}

function showOrderMessage(
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

function formatStatus(status) {
	if (!status) {
		return "-";
	}

	return (
		status.charAt(0) +
		status.slice(1).toLowerCase()
	);
}

function formatMoney(value) {
	const numberValue =
		Number(value);

	return Number.isFinite(numberValue)
		? numberValue.toFixed(2)
		: "0.00";
}

function formatDateTime(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		}
	);
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

function parseJsonSafely(
	text,
	fallback
) {
	try {
		return text
			? JSON.parse(text)
			: fallback;
	} catch (error) {
		return fallback;
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