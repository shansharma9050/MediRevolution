let reportOrders = [];
let reportStock = [];
let currentReportRows = [];

document.addEventListener("DOMContentLoaded", function () {
    validateReportRole();
    applyRoleBasedReportMenu();
    configureReportPageByRole();
    loadReports();
});

function validateReportRole() {
    const role = localStorage.getItem("role");

    if (!["SUPER_ADMIN", "WHOLESALER", "RETAILER"].includes(role)) {
        alert("Reports are available for Admin, Wholesaler and Retailer only.");
        window.location.href = "/dashboard";
    }
}

function applyRoleBasedReportMenu() {
    const role = localStorage.getItem("role");

    document.querySelectorAll("[data-role]").forEach(item => {
        const allowedRoles = item.getAttribute("data-role").split(" ");
        if (!allowedRoles.includes(role)) {
            item.style.display = "none";
        }
    });

    document.querySelectorAll("#reportType option[data-role]").forEach(option => {
        const allowedRoles = option.getAttribute("data-role").split(" ");
        if (!allowedRoles.includes(role)) {
            option.remove();
        }
    });
}

function configureReportPageByRole() {
    const role = localStorage.getItem("role");

    if (role === "WHOLESALER") {
        document.getElementById("reportSubtitle").innerText =
            "View sales, delivered orders, invoice and medicine stock analytics.";
    }

    if (role === "RETAILER") {
        document.getElementById("reportSubtitle").innerText =
            "View purchase history, delivered orders and invoice analytics.";
    }

    if (role === "SUPER_ADMIN") {
        document.getElementById("reportSubtitle").innerText =
            "Monitor platform orders, approvals and business performance.";
    }
}

async function loadReports() {
    await loadOrderReport();

    const role = localStorage.getItem("role");
    if (role === "WHOLESALER") {
        await loadStockReport();
    }

    renderCurrentReport();
}

async function loadOrderReport() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/orders/my`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            showReportMessage(result.message || "Unable to load orders");
            reportOrders = [];
            return;
        }

        reportOrders = result;

    } catch (error) {
        showReportMessage("Order service not reachable.");
        reportOrders = [];
    }
}

async function loadStockReport() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/medicines/stock/my`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            reportStock = [];
            return;
        }

        reportStock = result;

    } catch (error) {
        reportStock = [];
    }
}

function switchReportType() {
    const type = document.getElementById("reportType").value;

    if (type === "STOCK") {
        document.getElementById("statusFilter").style.display = "none";
    } else {
        document.getElementById("statusFilter").style.display = "block";
    }

    renderCurrentReport();
}

function renderCurrentReport() {
    const type = document.getElementById("reportType").value;

    if (type === "ORDER") {
        renderOrderReport();
    }

    if (type === "STOCK") {
        renderStockReport();
    }

    if (type === "INVOICE") {
        renderInvoiceReport();
    }

    if (type === "PLATFORM") {
        renderPlatformReport();
    }
}

function renderOrderReport() {
    const status = document.getElementById("statusFilter").value;
    let orders = [...reportOrders];

    if (status) {
        orders = orders.filter(order => order.status === status);
    }

    const role = localStorage.getItem("role");
    const title = role === "WHOLESALER" ? "Wholesaler Sales Report" :
                  role === "RETAILER" ? "Retailer Purchase Report" :
                  "Admin Order Report";

    document.getElementById("mainReportTitle").innerText = title;

    currentReportRows = orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items ? order.items.length : 0,
        amount: order.totalAmount,
        date: formatDateTime(order.orderDate)
    }));

    updateOrderCards(orders);

    let html = `
        <div class="table-responsive">
            <table class="table table-hover report-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Order No</th>
                        <th>Status</th>
                        <th>Items</th>
                        <th>Amount</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (orders.length === 0) {
        html += `<tr><td colspan="6" class="text-center text-muted py-4">No orders found</td></tr>`;
    }

    orders.forEach((order, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(order.orderNumber)}</strong></td>
                <td>${orderStatusBadge(order.status)}</td>
                <td>${order.items ? order.items.length : 0}</td>
                <td>Rs. ${formatMoney(order.totalAmount)}</td>
                <td>${formatDateTime(order.orderDate)}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;

    document.getElementById("reportTableContainer").innerHTML = html;
    renderOrderAnalytics(orders);
}

function renderStockReport() {
    document.getElementById("mainReportTitle").innerText = "Medicine Stock Report";

    currentReportRows = reportStock.map(stock => ({
        medicine: stock.medicine ? stock.medicine.medicineName : "",
        brand: stock.medicine ? stock.medicine.brandName : "",
        batch: stock.batchNumber,
        quantity: stock.availableQuantity,
        minimumStock: stock.minimumStockLevel,
        wholesalePrice: stock.wholesalePrice,
        expiryDate: stock.expiryDate
    }));

    const totalQty = reportStock.reduce((sum, s) => sum + Number(s.availableQuantity || 0), 0);
    const lowStock = reportStock.filter(s => Number(s.availableQuantity || 0) <= Number(s.minimumStockLevel || 0)).length;
    const stockValue = reportStock.reduce((sum, s) => sum + (Number(s.availableQuantity || 0) * Number(s.wholesalePrice || 0)), 0);

    document.getElementById("rCard1Title").innerText = "Stock Items";
    document.getElementById("rCard1Value").innerText = reportStock.length;
    document.getElementById("rCard2Title").innerText = "Total Quantity";
    document.getElementById("rCard2Value").innerText = totalQty;
    document.getElementById("rCard3Title").innerText = "Stock Value";
    document.getElementById("rCard3Value").innerText = formatShortMoney(stockValue);
    document.getElementById("rCard4Title").innerText = "Low Stock";
    document.getElementById("rCard4Value").innerText = lowStock;

    let html = `
        <div class="table-responsive">
            <table class="table table-hover report-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Medicine</th>
                        <th>Batch</th>
                        <th>Qty</th>
                        <th>Min</th>
                        <th>Price</th>
                        <th>Expiry</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (reportStock.length === 0) {
        html += `<tr><td colspan="7" class="text-center text-muted py-4">No stock found</td></tr>`;
    }

    reportStock.forEach((stock, index) => {
        const medicine = stock.medicine || {};
        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(medicine.medicineName)}</strong><br><span class="text-muted small">${safe(medicine.brandName)}</span></td>
                <td>${safe(stock.batchNumber)}</td>
                <td>${safe(stock.availableQuantity)}</td>
                <td>${safe(stock.minimumStockLevel)}</td>
                <td>Rs. ${formatMoney(stock.wholesalePrice)}</td>
                <td>${formatDate(stock.expiryDate)}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    document.getElementById("reportTableContainer").innerHTML = html;

    document.getElementById("analyticsSummary").innerHTML = `
        ${summaryItem("Stock Items", reportStock.length)}
        ${summaryItem("Total Quantity", totalQty)}
        ${summaryItem("Low Stock Items", lowStock)}
        ${summaryItem("Estimated Stock Value", "Rs. " + formatMoney(stockValue))}
    `;
}

function renderInvoiceReport() {
    const deliveredOrders = reportOrders.filter(order => order.status === "DELIVERED");

    document.getElementById("mainReportTitle").innerText = "Invoice Report";

    currentReportRows = deliveredOrders.map(order => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        status: "Invoice Eligible",
        date: formatDateTime(order.orderDate)
    }));

    updateOrderCards(deliveredOrders);

    let html = `
        <div class="alert alert-info">
            Invoice report shows delivered orders. Use invoice page to generate/download PDF invoices.
        </div>
        <div class="table-responsive">
            <table class="table table-hover report-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Order ID</th>
                        <th>Order No</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Invoice</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (deliveredOrders.length === 0) {
        html += `<tr><td colspan="6" class="text-center text-muted py-4">No delivered orders found</td></tr>`;
    }

    deliveredOrders.forEach((order, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${order.id}</td>
                <td><strong>${safe(order.orderNumber)}</strong></td>
                <td>Rs. ${formatMoney(order.totalAmount)}</td>
                <td><span class="badge bg-success">Eligible</span></td>
                <td><a href="/invoices" class="btn btn-sm btn-medi" style="width:auto;">Open Invoice</a></td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    document.getElementById("reportTableContainer").innerHTML = html;

    const totalInvoiceAmount = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    document.getElementById("analyticsSummary").innerHTML = `
        ${summaryItem("Invoice Eligible Orders", deliveredOrders.length)}
        ${summaryItem("Total Invoice Value", "Rs. " + formatMoney(totalInvoiceAmount))}
        ${summaryItem("Status", "Delivered Orders Only")}
    `;
}

function renderPlatformReport() {
    document.getElementById("mainReportTitle").innerText = "Admin Platform Report";

    renderOrderReport();

    document.getElementById("mainReportTitle").innerText = "Admin Platform Report";

    document.getElementById("analyticsSummary").innerHTML += `
        ${summaryItem("Platform Scope", "All registered order data")}
        ${summaryItem("Admin View", "System-wide monitoring")}
    `;
}

function updateOrderCards(orders) {
    const total = orders.length;
    const delivered = orders.filter(o => o.status === "DELIVERED").length;
    const pending = orders.filter(o => o.status === "PENDING").length;
    const amount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    document.getElementById("rCard1Title").innerText = "Total Orders";
    document.getElementById("rCard1Value").innerText = total;
    document.getElementById("rCard2Title").innerText = "Delivered";
    document.getElementById("rCard2Value").innerText = delivered;
    document.getElementById("rCard3Title").innerText = "Value";
    document.getElementById("rCard3Value").innerText = formatShortMoney(amount);
    document.getElementById("rCard4Title").innerText = "Pending";
    document.getElementById("rCard4Value").innerText = pending;
}

function renderOrderAnalytics(orders) {
    const pending = orders.filter(o => o.status === "PENDING").length;
    const accepted = orders.filter(o => o.status === "ACCEPTED").length;
    const rejected = orders.filter(o => o.status === "REJECTED").length;
    const delivered = orders.filter(o => o.status === "DELIVERED").length;
    const amount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    document.getElementById("analyticsSummary").innerHTML = `
        ${summaryItem("Pending Orders", pending)}
        ${summaryItem("Accepted Orders", accepted)}
        ${summaryItem("Rejected Orders", rejected)}
        ${summaryItem("Delivered Orders", delivered)}
        ${summaryItem("Total Value", "Rs. " + formatMoney(amount))}
    `;
}

function exportReportCsv() {
    if (!currentReportRows || currentReportRows.length === 0) {
        showReportMessage("No data available to export");
        return;
    }

    const headers = Object.keys(currentReportRows[0]);
    const csvRows = [];

    csvRows.push(headers.join(","));

    currentReportRows.forEach(row => {
        csvRows.push(headers.map(header => `"${safe(row[header])}"`).join(","));
    });

    const blob = new Blob([csvRows.join("\n")], {type: "text/csv"});
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "medirevolution-report.csv";
    a.click();

    window.URL.revokeObjectURL(url);
}

function summaryItem(label, value) {
    return `
        <div class="report-summary-item">
            <div class="report-summary-label">${label}</div>
            <div class="report-summary-value">${value}</div>
        </div>
    `;
}

function orderStatusBadge(status) {
    if (status === "PENDING") {
        return `<span class="badge bg-warning text-dark">PENDING</span>`;
    }

    if (status === "ACCEPTED") {
        return `<span class="badge bg-info text-dark">ACCEPTED</span>`;
    }

    if (status === "REJECTED") {
        return `<span class="badge bg-danger">REJECTED</span>`;
    }

    if (status === "DELIVERED") {
        return `<span class="badge bg-success">DELIVERED</span>`;
    }

    return `<span class="badge bg-secondary">${safe(status)}</span>`;
}

function showReportMessage(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;

    setTimeout(() => {
        document.getElementById("msg").innerHTML = "";
    }, 3500);
}

function formatShortMoney(value) {
    value = Number(value || 0);

    if (value >= 100000) {
        return "Rs. " + (value / 100000).toFixed(1) + "L";
    }

    if (value >= 1000) {
        return "Rs. " + (value / 1000).toFixed(1) + "K";
    }

    return "Rs. " + value.toFixed(0);
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

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString();
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}