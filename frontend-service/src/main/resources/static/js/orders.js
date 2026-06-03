let allOrders = [];

document.addEventListener("DOMContentLoaded", function () {
    allowOnlyOrderRoles();
    applyRoleBasedMenuForOrders();
    setOrdersPageText();
    loadOrders();
});

function allowOnlyOrderRoles() {
    const role = localStorage.getItem("role");

    if (role !== "RETAILER" && role !== "WHOLESALER" && role !== "SUPER_ADMIN") {
        alert("Access denied.");
        window.location.href = "/dashboard";
    }
}

function applyRoleBasedMenuForOrders() {
    const role = localStorage.getItem("role");

    document.querySelectorAll("[data-role]").forEach(item => {
        const allowedRoles = item.getAttribute("data-role").split(" ");

        if (!allowedRoles.includes(role)) {
            item.style.display = "none";
        }
    });
}

function setOrdersPageText() {
    const role = localStorage.getItem("role");

    if (role === "RETAILER") {
        document.getElementById("pageTitle").innerText = "My Orders";
        document.getElementById("pageSubtitle").innerText =
            "Track your placed medicine orders and delivery status.";
    }

    if (role === "WHOLESALER") {
        document.getElementById("pageTitle").innerText = "Received Orders";
        document.getElementById("pageSubtitle").innerText =
            "Review retailer orders and update order lifecycle.";
    }

    if (role === "SUPER_ADMIN") {
        document.getElementById("pageTitle").innerText = "All Orders";
        document.getElementById("pageSubtitle").innerText =
            "Monitor all system orders.";
    }
}

async function loadOrders() {
    const token = localStorage.getItem("token");

    document.getElementById("ordersContainer").innerHTML = `
        <div class="col-12">
            <div class="text-center text-muted py-5">
                Loading orders...
            </div>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/orders/my`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const responseText = await response.text();
        console.log("Orders response:", responseText);

        const result = responseText ? JSON.parse(responseText) : [];

        if (!response.ok) {
            showOrderMessage(result.message || "Unable to load orders");
            renderOrders([]);
            return;
        }

        allOrders = Array.isArray(result) ? result : [];
        renderOrders(allOrders);

    } catch (error) {
        console.error("Order service error:", error);
        showOrderMessage("Order response invalid or service not reachable.");
        renderOrders([]);
    }
}

function filterOrders() {
    const status = document.getElementById("statusFilter").value;
    const keyword = document.getElementById("searchBox").value.toLowerCase();

    const filtered = allOrders.filter(order => {
        const statusMatch = !status || order.status === status;

        const orderText = JSON.stringify(order).toLowerCase();
        const keywordMatch = !keyword || orderText.includes(keyword);

        return statusMatch && keywordMatch;
    });

    renderOrders(filtered);
}

function renderOrders(orders) {
    const container = document.getElementById("ordersContainer");

    updateOrderCards(orders);

    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center text-muted py-5">
                    No orders found.
                </div>
            </div>
        `;
        return;
    }

    let html = "";

    orders.forEach(order => {
        html += `
            <div class="col-12">
                <div class="order-card">

                    <div class="order-header">

                        <div>
                            <h5 class="fw-bold text-primary mb-1">
                                ${safe(order.orderNumber)}
                            </h5>

                            <div class="text-muted small">
                                Order Date: ${formatDateTime(order.orderDate)}
                            </div>

                            <div class="text-muted small">
                                Retailer ID: ${safe(order.retailerAuthUserId)}
                                |
                                Wholesaler ID: ${safe(order.wholesalerAuthUserId)}
                            </div>
                        </div>

                        <div class="text-end">
                            ${statusBadge(order.status)}

                            <h5 class="mt-2 fw-bold">
                                Rs. ${formatMoney(order.totalAmount)}
                            </h5>
                        </div>

                    </div>

                    ${buildTimeline(order.status)}

                    <div class="mt-3">
                        <h6 class="fw-bold">Order Items</h6>
                        ${buildOrderItems(order.items)}
                    </div>

                    ${buildActionButtons(order)}

                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function buildOrderItems(items) {
    if (!items || items.length === 0) {
        return `<div class="text-muted">No items found.</div>`;
    }

    let html = "";

    items.forEach(item => {
        html += `
            <div class="order-item-row">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <strong>${safe(item.medicineName)}</strong>
                        <div class="text-muted small">Batch: ${safe(item.batchNumber)}</div>
                    </div>

                    <div class="col-md-2">
                        Qty: <strong>${safe(item.quantity)}</strong>
                    </div>

                    <div class="col-md-2">
                        Price: Rs. ${formatMoney(item.unitPrice)}
                    </div>

                    <div class="col-md-2">
                        GST: ${formatMoney(item.gstPercentage)}%
                    </div>

                    <div class="col-md-2 text-end">
                        <strong>Rs. ${formatMoney(item.lineTotal)}</strong>
                    </div>
                </div>
            </div>
        `;
    });

    return html;
}

function buildTimeline(status) {
    const steps = ["PENDING", "ACCEPTED", "DELIVERED"];

    if (status === "REJECTED") {
        return `
            <div class="order-timeline">
                <div class="timeline-step active">
                    <div class="timeline-dot">1</div>
                    <div class="timeline-label">Pending</div>
                </div>

                <div class="timeline-step active">
                    <div class="timeline-dot">✕</div>
                    <div class="timeline-label text-danger">Rejected</div>
                </div>

                <div class="timeline-step">
                    <div class="timeline-dot">3</div>
                    <div class="timeline-label">Delivered</div>
                </div>
            </div>
        `;
    }

    const currentIndex = steps.indexOf(status);

    return `
        <div class="order-timeline">
            ${steps.map((step, index) => {
                const active = index <= currentIndex ? "active" : "";
                const delivered = step === "DELIVERED" && status === "DELIVERED" ? "delivered" : "";

                return `
                    <div class="timeline-step ${active} ${delivered}">
                        <div class="timeline-dot">${index + 1}</div>
                        <div class="timeline-label">${formatStatus(step)}</div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function buildActionButtons(order) {
    const role = localStorage.getItem("role");

    if (role !== "WHOLESALER") {
        return "";
    }

    if (order.status === "PENDING") {
        return `
            <div class="mt-3 d-flex gap-2 flex-wrap">
                <button class="btn btn-success"
                        onclick="updateOrderStatus(${order.id}, 'ACCEPTED')">
                    Accept Order
                </button>

                <button class="btn btn-danger"
                        onclick="updateOrderStatus(${order.id}, 'REJECTED')">
                    Reject Order
                </button>
            </div>
        `;
    }

    if (order.status === "ACCEPTED") {
        return `
            <div class="mt-3 d-flex gap-2 flex-wrap">
                <button class="btn btn-medi" style="width:auto;"
                        onclick="updateOrderStatus(${order.id}, 'DELIVERED')">
                    Mark Delivered
                </button>
            </div>
        `;
    }

    return "";
}

async function updateOrderStatus(orderId, status) {

    const confirmMsg = "Are you sure you want to mark this order as " + status + "?";

    if (!confirm(confirmMsg)) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}/status?status=${status}`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const responseText = await response.text();
        console.log("Status update response:", response.status, responseText);

        if (!response.ok) {
            showOrderMessage("Unable to update order status");
            return;
        }

        window.location.reload();

    } catch (error) {
        console.error("Order update error:", error);
        showOrderMessage("Order service not reachable.");
    }
}
function updateOrderCards(orders) {
    document.getElementById("totalOrders").innerText = orders.length;

    document.getElementById("pendingOrders").innerText =
        orders.filter(o => o.status === "PENDING").length;

    document.getElementById("acceptedOrders").innerText =
        orders.filter(o => o.status === "ACCEPTED").length;

    document.getElementById("deliveredOrders").innerText =
        orders.filter(o => o.status === "DELIVERED").length;
}

function statusBadge(status) {
    if (status === "PENDING") {
        return `<span class="status-pill status-pending">PENDING</span>`;
    }

    if (status === "ACCEPTED") {
        return `<span class="status-pill status-accepted">ACCEPTED</span>`;
    }

    if (status === "REJECTED") {
        return `<span class="status-pill status-rejected">REJECTED</span>`;
    }

    if (status === "DELIVERED") {
        return `<span class="status-pill status-delivered">DELIVERED</span>`;
    }

    return `<span class="status-pill status-pending">${safe(status)}</span>`;
}

function showOrderMessage(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;

    setTimeout(() => {
        document.getElementById("msg").innerHTML = "";
    }, 3500);
}

function formatStatus(status) {
    if (!status) {
        return "-";
    }

    return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatMoney(value) {
    if (value === null || value === undefined) {
        return "0.00";
    }

    return Number(value).toFixed(2);
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString();
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}