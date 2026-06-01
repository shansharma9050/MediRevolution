let medicineOptions = [];
let stockList = [];

document.addEventListener("DOMContentLoaded", function () {
    allowOnlyWholesaler();
    applyRoleBasedMenuForInventory();
    loadMedicineDropdown();
    loadMyStock();
});

function allowOnlyWholesaler() {
    const role = localStorage.getItem("role");

    if (role !== "WHOLESALER") {
        alert("Access denied. Only WHOLESALER can access Inventory.");
        window.location.href = "/dashboard";
    }
}

function applyRoleBasedMenuForInventory() {
    const role = localStorage.getItem("role");

    document.querySelectorAll("[data-role]").forEach(item => {
        const allowedRoles = item.getAttribute("data-role").split(" ");

        if (!allowedRoles.includes(role)) {
            item.style.display = "none";
        }
    });
}

function openAddStockPanel() {
    document.getElementById("addStockPanel").style.display = "block";
}

function closeAddStockPanel() {
    document.getElementById("addStockPanel").style.display = "none";
    clearStockForm();
}

async function loadMedicineDropdown() {
    const token = localStorage.getItem("token");

    const dropdown = document.getElementById("medicineId");
    dropdown.innerHTML = `<option value="">Loading medicines...</option>`;

    try {
        const response = await fetch(`${API_BASE}/medicines`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            dropdown.innerHTML = `<option value="">Unable to load medicines</option>`;
            showInventoryMessage(result.message || "Unable to load medicines");
            return;
        }

        medicineOptions = result;

        if (!medicineOptions || medicineOptions.length === 0) {
            dropdown.innerHTML = `<option value="">No medicine master found</option>`;
            return;
        }

        let html = `<option value="">Select Medicine</option>`;

        medicineOptions.forEach(medicine => {
            html += `
                <option value="${medicine.id}">
                    ${safe(medicine.medicineName)} - ${safe(medicine.brandName)}
                </option>
            `;
        });

        dropdown.innerHTML = html;

    } catch (error) {
        dropdown.innerHTML = `<option value="">Medicine service unavailable</option>`;
        showInventoryMessage("Medicine service not reachable.");
    }
}

async function loadMyStock() {
    const token = localStorage.getItem("token");

    document.getElementById("stockTable").innerHTML = `
        <tr>
            <td colspan="10" class="text-center text-muted py-4">
                Loading inventory...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE}/medicines/stock/my`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            showInventoryMessage(result.message || "Unable to load inventory");
            return;
        }

        stockList = result;
        renderStock(stockList);

    } catch (error) {
        showInventoryMessage("Server not reachable. Please check medicine-service/api-gateway.");
    }
}

async function addStock() {
    const medicineId = document.getElementById("medicineId").value;

    const data = {
        batchNumber: document.getElementById("batchNumber").value.trim(),
        manufacturingDate: document.getElementById("manufacturingDate").value,
        expiryDate: document.getElementById("expiryDate").value,
        availableQuantity: toInt(document.getElementById("availableQuantity").value),
        minimumStockLevel: toInt(document.getElementById("minimumStockLevel").value),
        mrp: toDecimal(document.getElementById("mrp").value),
        wholesalePrice: toDecimal(document.getElementById("wholesalePrice").value),
        ptr: toDecimal(document.getElementById("ptr").value),
        gstPercentage: toDecimal(document.getElementById("gstPercentage").value)
    };

    if (!medicineId) {
        showInventoryMessage("Please select medicine");
        return;
    }

    if (!data.batchNumber) {
        showInventoryMessage("Batch number is required");
        return;
    }

    if (!data.expiryDate) {
        showInventoryMessage("Expiry date is required");
        return;
    }

    if (!data.availableQuantity || data.availableQuantity <= 0) {
        showInventoryMessage("Available quantity must be greater than zero");
        return;
    }

    if (!data.minimumStockLevel || data.minimumStockLevel < 0) {
        showInventoryMessage("Minimum stock level is required");
        return;
    }

    if (!data.mrp || data.mrp <= 0) {
        showInventoryMessage("MRP must be greater than zero");
        return;
    }

    if (!data.wholesalePrice || data.wholesalePrice <= 0) {
        showInventoryMessage("Wholesale price must be greater than zero");
        return;
    }

    if (data.wholesalePrice > data.mrp) {
        showInventoryMessage("Wholesale price cannot be greater than MRP");
        return;
    }

    const today = new Date().toISOString().split("T")[0];

    if (data.expiryDate <= today) {
        showInventoryMessage("Expiry date must be a future date");
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/medicines/stock/${medicineId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showInventoryMessage(result.message || "Unable to add stock");
            return;
        }

        showInventoryMessage("Stock added successfully", "success");
        closeAddStockPanel();
        loadMyStock();

    } catch (error) {
        showInventoryMessage("Server not reachable. Please try again.");
    }
}

function renderStock(stocks) {
    const table = document.getElementById("stockTable");

    document.getElementById("totalStockItems").innerText = stocks.length;

    let totalQty = 0;
    let lowStock = 0;
    let expiryRisk = 0;

    if (!stocks || stocks.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-4">
                    No stock found. Add your first batch.
                </td>
            </tr>
        `;

        document.getElementById("totalQuantity").innerText = 0;
        document.getElementById("lowStockCount").innerText = 0;
        document.getElementById("expiryCount").innerText = 0;

        return;
    }

    let html = "";

    stocks.forEach((stock, index) => {
        const medicine = stock.medicine || {};
        const qty = stock.availableQuantity || 0;
        const min = stock.minimumStockLevel || 0;

        totalQty += qty;

        const low = qty <= min;
        if (low) {
            lowStock++;
        }

        const expiryStatus = getExpiryStatus(stock.expiryDate);
        if (expiryStatus.type !== "success") {
            expiryRisk++;
        }

        html += `
            <tr>
                <td>${index + 1}</td>

                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="medicine-icon">💊</div>
                        <div>
                            <strong>${safe(medicine.medicineName)}</strong>
                            <div class="text-muted small">
                                ${safe(medicine.brandName)} | ${safe(medicine.manufacturer)}
                            </div>
                        </div>
                    </div>
                </td>

                <td>${safe(stock.batchNumber)}</td>

                <td>
                    <strong>${qty}</strong>
                </td>

                <td>${min}</td>

                <td>Rs. ${formatMoney(stock.mrp)}</td>

                <td>
                    <strong>Rs. ${formatMoney(stock.wholesalePrice)}</strong>
                </td>

                <td>${formatMoney(stock.gstPercentage)}%</td>

                <td>${formatDate(stock.expiryDate)}</td>

                <td>
                    ${low
                        ? '<span class="badge bg-danger mb-1">Low Stock</span><br>'
                        : '<span class="badge bg-success mb-1">Stock OK</span><br>'
                    }
                    <span class="badge bg-${expiryStatus.type}">
                        ${expiryStatus.label}
                    </span>
                </td>
            </tr>
        `;
    });

    table.innerHTML = html;

    document.getElementById("totalQuantity").innerText = totalQty;
    document.getElementById("lowStockCount").innerText = lowStock;
    document.getElementById("expiryCount").innerText = expiryRisk;
}

function filterStockTable() {
    const keyword = document.getElementById("searchBox").value.toLowerCase();

    const filtered = stockList.filter(stock => {
        const medicine = stock.medicine || {};

        return (
            (medicine.medicineName || "").toLowerCase().includes(keyword) ||
            (medicine.brandName || "").toLowerCase().includes(keyword) ||
            (medicine.manufacturer || "").toLowerCase().includes(keyword) ||
            (stock.batchNumber || "").toLowerCase().includes(keyword)
        );
    });

    renderStock(filtered);
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

function clearStockForm() {
    document.getElementById("medicineId").value = "";
    document.getElementById("batchNumber").value = "";
    document.getElementById("manufacturingDate").value = "";
    document.getElementById("expiryDate").value = "";
    document.getElementById("availableQuantity").value = "";
    document.getElementById("minimumStockLevel").value = "";
    document.getElementById("mrp").value = "";
    document.getElementById("wholesalePrice").value = "";
    document.getElementById("ptr").value = "";
    document.getElementById("gstPercentage").value = "";
}

function showInventoryMessage(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;

    setTimeout(() => {
        document.getElementById("msg").innerHTML = "";
    }, 3500);
}

function toInt(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    return parseInt(value);
}

function toDecimal(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    return parseFloat(value);
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