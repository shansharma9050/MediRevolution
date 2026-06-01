let medicineList = [];

document.addEventListener("DOMContentLoaded", function () {
    allowOnlyMedicineMasterRoles();
    applyRoleBasedMenuForPage();
    loadMedicines();
});

function allowOnlyMedicineMasterRoles() {
    const role = localStorage.getItem("role");

    if (role !== "WHOLESALER" && role !== "SUPER_ADMIN") {
        alert("Access denied. Only WHOLESALER or SUPER_ADMIN can access Medicine Master.");
        window.location.href = "/dashboard";
    }
}

function applyRoleBasedMenuForPage() {
    const role = localStorage.getItem("role");

    document.querySelectorAll("[data-role]").forEach(item => {
        const allowedRoles = item.getAttribute("data-role").split(" ");

        if (!allowedRoles.includes(role)) {
            item.style.display = "none";
        }
    });
}

function openAddMedicinePanel() {
    document.getElementById("addMedicinePanel").style.display = "block";
}

function closeAddMedicinePanel() {
    document.getElementById("addMedicinePanel").style.display = "none";
    clearMedicineForm();
}

async function loadMedicines() {
    const token = localStorage.getItem("token");

    document.getElementById("medicineTable").innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-muted py-4">
                Loading medicines...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE}/medicines`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            showMedicineMessage(result.message || "Unable to load medicines");
            return;
        }

        medicineList = result;
        renderMedicines(medicineList);

    } catch (error) {
        showMedicineMessage("Server not reachable. Please check medicine-service/api-gateway.");
    }
}

async function searchMedicines() {
    const keyword = document.getElementById("searchKeyword").value.trim();

    if (!keyword) {
        loadMedicines();
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/medicines/search?keyword=${encodeURIComponent(keyword)}`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            showMedicineMessage(result.message || "Search failed");
            return;
        }

        medicineList = result;
        renderMedicines(medicineList);

    } catch (error) {
        showMedicineMessage("Server not reachable. Please try again.");
    }
}

async function addMedicine() {
    const data = {
        medicineName: document.getElementById("medicineName").value.trim(),
        brandName: document.getElementById("brandName").value.trim(),
        composition: document.getElementById("composition").value.trim(),
        manufacturer: document.getElementById("manufacturer").value.trim(),
        category: document.getElementById("category").value,
        medicineType: document.getElementById("medicineType").value,
        imageUrl: document.getElementById("imageUrl").value.trim(),
        description: document.getElementById("description").value.trim()
    };

    if (!data.medicineName) {
        showMedicineMessage("Medicine name is required");
        return;
    }

    if (!data.brandName) {
        showMedicineMessage("Brand name is required");
        return;
    }

    if (!data.composition) {
        showMedicineMessage("Composition is required");
        return;
    }

    if (!data.manufacturer) {
        showMedicineMessage("Manufacturer is required");
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/medicines`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showMedicineMessage(result.message || "Unable to add medicine");
            return;
        }

        showMedicineMessage("Medicine added successfully", "success");
        clearMedicineForm();
        closeAddMedicinePanel();
        loadMedicines();

    } catch (error) {
        showMedicineMessage("Server not reachable. Please try again.");
    }
}

function renderMedicines(medicines) {
    const table = document.getElementById("medicineTable");
    document.getElementById("totalMedicines").innerText = medicines.length;

    if (!medicines || medicines.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    No medicines found.
                </td>
            </tr>
        `;
        return;
    }

    let html = "";

    medicines.forEach((medicine, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>

                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="medicine-icon">💊</div>
                        <div>
                            <strong>${safe(medicine.medicineName)}</strong>
                            <div class="text-muted small">${safe(medicine.description)}</div>
                        </div>
                    </div>
                </td>

                <td>${safe(medicine.brandName)}</td>
                <td>${safe(medicine.composition)}</td>
                <td>${safe(medicine.manufacturer)}</td>
                <td>
                    <span class="badge bg-info text-dark">${safe(medicine.category)}</span>
                </td>
                <td>${safe(medicine.medicineType)}</td>
                <td>
                    ${medicine.active
                        ? '<span class="badge bg-success">Active</span>'
                        : '<span class="badge bg-danger">Inactive</span>'
                    }
                </td>
            </tr>
        `;
    });

    table.innerHTML = html;
}

function clearMedicineForm() {
    document.getElementById("medicineName").value = "";
    document.getElementById("brandName").value = "";
    document.getElementById("composition").value = "";
    document.getElementById("manufacturer").value = "";
    document.getElementById("category").value = "";
    document.getElementById("medicineType").value = "";
    document.getElementById("imageUrl").value = "";
    document.getElementById("description").value = "";
}

function showMedicineMessage(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;

    setTimeout(() => {
        document.getElementById("msg").innerHTML = "";
    }, 3500);
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}