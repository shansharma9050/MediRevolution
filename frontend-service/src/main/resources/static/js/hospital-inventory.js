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
	const panel = document.getElementById("inventoryFormPanel");
	panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function loadInventory() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE}/hospital/inventory`, {
			headers: { "Authorization": "Bearer " + token }
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to load inventory");
			return;
		}

		hospitalInventory = result;
		renderInventory();

	} catch (e) {
		showMsg("Hospital service not reachable.");
	}
}

async function createInventory() {
    const payload = {
        itemName: getVal("itemName"),
        category: getVal("category"),
        quantity: toInt(getVal("quantity")),
        minimumQuantity: toInt(getVal("minimumQuantity")),
        unitPrice: toDecimal(getVal("unitPrice"))
    };

    if (!payload.itemName || !payload.category || !payload.quantity) {
        showMsg("Item name, category and quantity are required");
        return;
    }

    const token = localStorage.getItem("token");

    const url = editingInventoryId
        ? `${API_BASE}/hospital/inventory/${editingInventoryId}`
        : `${API_BASE}/hospital/inventory`;

    const method = editingInventoryId ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            showMsg(result.message || "Unable to save inventory");
            return;
        }

        showMsg(editingInventoryId ? "Inventory updated successfully" : "Inventory item saved successfully", "success");

        editingInventoryId = null;
        clearForm();
        document.getElementById("inventoryFormPanel").style.display = "none";
        loadInventory();

    } catch (e) {
        showMsg("Hospital service not reachable.");
    }
}

function renderInventory() {
	const table = document.getElementById("inventoryTable");

	const totalQty = hospitalInventory.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
	const low = hospitalInventory.filter(i => Number(i.quantity || 0) <= Number(i.minimumQuantity || 0)).length;

	document.getElementById("itemCount").innerText = hospitalInventory.length;
	document.getElementById("totalQuantity").innerText = totalQty;
	document.getElementById("lowStock").innerText = low;

	if (!hospitalInventory.length) {
		table.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No inventory items found</td></tr>`;
		return;
	}

	let html = "";

	hospitalInventory.forEach((i, index) => {
		const isLow = Number(i.quantity || 0) <= Number(i.minimumQuantity || 0);

		html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(i.itemName)}</strong></td>
                <td>${safe(i.category)}</td>
                <td>${safe(i.quantity)}</td>
                <td>${safe(i.minimumQuantity)}</td>
                <td>Rs. ${formatMoney(i.unitPrice)}</td>
                <td>
    <button class="btn btn-sm btn-outline-primary me-1"
            onclick="editInventory(${i.id})">
        Edit
    </button>

    <button class="btn btn-sm btn-outline-warning me-1"
            onclick="useInventory(${i.id})">
        Use
    </button>

    <button class="btn btn-sm btn-outline-danger"
            onclick="deleteInventory(${i.id})">
        Delete
    </button>
</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function editInventory(id) {
    const i = hospitalInventory.find(item => item.id === id);

    if (!i) {
        showMsg("Inventory item not found");
        return;
    }

    editingInventoryId = id;

    document.getElementById("itemName").value = i.itemName || "";
    document.getElementById("category").value = i.category || "";
    document.getElementById("quantity").value = i.quantity || "";
    document.getElementById("minimumQuantity").value = i.minimumQuantity || "";
    document.getElementById("unitPrice").value = i.unitPrice || "";

    document.getElementById("inventoryFormPanel").style.display = "block";
}

async function deleteInventory(id) {
    if (!confirm("Are you sure you want to delete this inventory item?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/hospital/inventory/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultText = await response.text();

        if (!response.ok) {
            showMsg(resultText || "Unable to delete inventory item");
            return;
        }

        showMsg("Inventory item deleted successfully", "success");
        loadInventory();

    } catch (e) {
        showMsg("Hospital service not reachable.");
    }
}

async function useInventory(id) {
    const quantity = prompt("Enter used quantity:");

    if (!quantity || Number(quantity) <= 0) {
        showMsg("Please enter valid quantity");
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/hospital/inventory/${id}/use?quantity=${quantity}`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            showMsg(result.message || "Unable to update inventory");
            return;
        }

        showMsg("Inventory quantity updated successfully", "success");
        loadInventory();

    } catch (e) {
        showMsg("Hospital service not reachable.");
    }
}

function clearForm() {
    editingInventoryId = null;

    ["itemName", "category", "quantity", "minimumQuantity", "unitPrice"]
        .forEach(id => document.getElementById(id).value = "");
}

function getVal(id) { return document.getElementById(id).value.trim(); }
function toInt(v) { return v ? parseInt(v) : null; }
function toDecimal(v) { return v ? parseFloat(v) : null; }

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatMoney(value) {
	return value === null || value === undefined ? "0.00" : Number(value).toFixed(2);
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}