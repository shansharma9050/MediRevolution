let pendingUsers = [];

document.addEventListener("DOMContentLoaded", function () {
    requireRole("SUPER_ADMIN");
    loadPendingUsers();
});

async function loadPendingUsers() {
    const token = localStorage.getItem("token");

    const table = document.getElementById("pendingUsersTable");
    table.innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-muted py-4">
                Loading pending users...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE}/auth/admin/users/pending`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            showAdminMessage(result.message || "Unable to load pending users");
            return;
        }

        pendingUsers = result;
        renderPendingUsers(pendingUsers);

    } catch (error) {
        showAdminMessage("Server not reachable. Please check auth-service/api-gateway.");
    }
}

function renderPendingUsers(users) {
    const table = document.getElementById("pendingUsersTable");
    document.getElementById("pendingCount").innerText = users.length;

    if (!users || users.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    No pending approvals found.
                </td>
            </tr>
        `;
        return;
    }

    let html = "";

    users.forEach((user, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${safe(user.fullName)}</strong>
                </td>
                <td>${safe(user.email)}</td>
                <td>${safe(user.mobile)}</td>
                <td>
                    <span class="badge bg-info text-dark">${safe(user.role)}</span>
                </td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <span class="badge bg-warning text-dark">Pending</span>
                </td>
                <td class="text-end">
                    <button class="btn btn-success btn-sm me-1"
                            onclick="approveUser(${user.id})">
                        Approve
                    </button>

                    <button class="btn btn-danger btn-sm"
                            onclick="rejectUser(${user.id})">
                        Reject
                    </button>
                </td>
            </tr>
        `;
    });

    table.innerHTML = html;
}

async function approveUser(userId) {
    if (!confirm("Are you sure you want to approve this user?")) {
        return;
    }

    await updateUserApproval(userId, "approve");
}

async function rejectUser(userId) {
    if (!confirm("Are you sure you want to reject this user?")) {
        return;
    }

    await updateUserApproval(userId, "reject");
}

async function updateUserApproval(userId, action) {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/auth/admin/users/${userId}/${action}`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultText = await response.text();

        if (!response.ok) {
            showAdminMessage(resultText || "Action failed");
            return;
        }

        showAdminMessage(resultText, "success");
        loadPendingUsers();

    } catch (error) {
        showAdminMessage("Server not reachable. Please try again.");
    }
}

function filterTable() {
    const keyword = document.getElementById("searchBox").value.toLowerCase();

    const filtered = pendingUsers.filter(user =>
        (user.fullName || "").toLowerCase().includes(keyword) ||
        (user.email || "").toLowerCase().includes(keyword) ||
        (user.mobile || "").toLowerCase().includes(keyword) ||
        (user.role || "").toLowerCase().includes(keyword)
    );

    renderPendingUsers(filtered);
}

function showAdminMessage(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;

    setTimeout(() => {
        document.getElementById("msg").innerHTML = "";
    }, 3500);
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    return date.toLocaleString();
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}