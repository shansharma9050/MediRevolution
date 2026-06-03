const API_BASE = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", function () {
    protectPage();
    loadUserInfo();
    applyRoleBasedMenu();
    loadNotificationCount();
    loadDashboardByRole();
    loadRealDashboardCounts();
});

function protectPage() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
    }
}

function loadUserInfo() {
    document.getElementById("userEmail").innerText =
        localStorage.getItem("email") || "user@email.com";

    document.getElementById("userRole").innerText =
        localStorage.getItem("role") || "USER";
}

function applyRoleBasedMenu() {
    const role = localStorage.getItem("role");

    document.querySelectorAll("[data-role]").forEach(item => {
        const allowedRoles = item.getAttribute("data-role").split(" ");

        if (!allowedRoles.includes(role)) {
            item.style.display = "none";
        }
    });
}

async function loadNotificationCount() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/notifications/my/unread-count`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (response.ok) {
            const count = await response.json();

            document.getElementById("notificationCount").innerText = count;
            document.getElementById("card4Value").innerText = count;
        }

    } catch (error) {
        console.log("Notification service unavailable");
    }
}

function loadDashboardByRole() {
    const role = localStorage.getItem("role");

    if (role === "SUPER_ADMIN") {
        setDashboard(
            "System control center for approvals, users and reports.",
            "Pending Approvals", "0",
            "Total Users", "0",
            "Orders", "0",
            "Notifications", document.getElementById("card4Value").innerText,
            [
                ["Pending Approvals", "/admin/approvals"],
                ["Medicine Master", "/wholesaler/medicines"],
                ["All Orders", "/orders"]
            ]
        );
    }

    if (role === "WHOLESALER") {
        setDashboard(
            "Manage medicine inventory, retailer orders and invoices.",
            "Total Medicines", "0",
            "Stock Items", "0",
            "Pending Orders", "0",
            "Notifications", document.getElementById("card4Value").innerText,
            [
                ["Add Medicine", "/wholesaler/medicines"],
                ["Add Stock", "/wholesaler/inventory"],
                ["Orders", "/orders"],
                ["Invoices", "/invoices"],
                ["Profile", "/profile"]
            ]
        );
    }

    if (role === "RETAILER") {
        setDashboard(
            "Search medicines, place orders and download invoices.",
            "My Orders", "0",
            "Pending Orders", "0",
            "Delivered Orders", "0",
            "Notifications", document.getElementById("card4Value").innerText,
            [
                ["Search Medicines", "/retailer/search-medicines"],
                ["View Cart", "/retailer/cart"],
                ["My Orders", "/orders"],
                ["Invoices", "/invoices"],
                ["Profile", "/profile"]
            ]
        );
    }

    if (role === "DOCTOR") {
        setDashboard(
            "Create prescriptions and manage patient medicine recommendations.",
            "Prescriptions", "0",
            "Patients", "0",
            "Appointments", "0",
            "Notifications", document.getElementById("card4Value").innerText,
            [
                ["Create Prescription", "#"],
                ["Patient Records", "#"],
                ["Profile", "/profile"]
            ]
        );
    }

    if (role === "HOSPITAL") {
        setDashboard(
            "Manage hospital procurement, pharmacy inventory and departments.",
            "Departments", "0",
            "Doctors", "0",
            "Procurements", "0",
            "Notifications", document.getElementById("card4Value").innerText,
            [
                ["Hospital Procurement", "#"],
                ["Pharmacy Inventory", "#"],
                ["Profile", "/profile"]
            ]
        );
    }
}

async function loadRealDashboardCounts() {
    const role = localStorage.getItem("role");

    if (role === "SUPER_ADMIN") {
        await loadAdminCounts();
        await loadOrderCounts();
    }

    if (role === "WHOLESALER") {
        await loadWholesalerMedicineCounts();
        await loadOrderCounts();
    }

    if (role === "RETAILER") {
        await loadOrderCounts();
    }
}

async function loadAdminCounts() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/auth/admin/users/dashboard-counts`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return;
        }

        document.getElementById("card1Value").innerText = data.pendingApprovals;
        document.getElementById("card2Value").innerText = data.totalUsers;

    } catch (error) {
        console.log("Admin count service unavailable");
    }
}

async function loadWholesalerMedicineCounts() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/medicines/stock/dashboard-counts`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return;
        }

        document.getElementById("card1Value").innerText = data.totalMedicines;
        document.getElementById("card2Value").innerText = data.stockItems;

    } catch (error) {
        console.log("Medicine dashboard count unavailable");
    }
}

async function loadOrderCounts() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    try {
        const response = await fetch(`${API_BASE}/orders/dashboard-counts`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return;
        }

        if (role === "SUPER_ADMIN") {
            document.getElementById("card3Value").innerText = data.totalOrders;
        }

        if (role === "WHOLESALER") {
            document.getElementById("card3Value").innerText = data.pendingOrders;
        }

        if (role === "RETAILER") {
            document.getElementById("card1Value").innerText = data.totalOrders;
            document.getElementById("card2Value").innerText = data.pendingOrders;
            document.getElementById("card3Value").innerText = data.deliveredOrders;
        }

    } catch (error) {
        console.log("Order dashboard count unavailable");
    }
}

function setDashboard(description,
                      c1Title, c1Value,
                      c2Title, c2Value,
                      c3Title, c3Value,
                      c4Title, c4Value,
                      actions) {

    document.getElementById("roleDescription").innerText = description;

    document.getElementById("card1Title").innerText = c1Title;
    document.getElementById("card1Value").innerText = c1Value;

    document.getElementById("card2Title").innerText = c2Title;
    document.getElementById("card2Value").innerText = c2Value;

    document.getElementById("card3Title").innerText = c3Title;
    document.getElementById("card3Value").innerText = c3Value;

    document.getElementById("card4Title").innerText = c4Title;
    document.getElementById("card4Value").innerText = c4Value;

    let html = "";

    actions.forEach(action => {
        html += `
            <a href="${action[1]}" class="btn btn-medi mb-2">
                ${action[0]}
            </a>
        `;
    });

    document.getElementById("quickActions").innerHTML = html;
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("show");
}

function openNotifications() {
    window.location.href = "/notifications";
}

function logout() {
    localStorage.clear();
    window.location.href = "/";
}

/*===================================websocket===========================================*/
function connectNotificationSocket() {

    const userId = localStorage.getItem("userId");

    if (!userId) {
        console.log("UserId not found for websocket");
        return;
    }

    const socket = new SockJS("http://localhost:8080/notifications-ws");

    const stompClient = Stomp.over(socket);

    stompClient.connect({}, function () {

        console.log("Notification WebSocket connected");

        stompClient.subscribe("/topic/user-" + userId, function (message) {

            const notification = JSON.parse(message.body);

            console.log("New notification:", notification);

            loadCommonNotificationCount();

            showLiveNotification(notification);
        });

    });
}

function showLiveNotification(notification) {

    const toast = document.createElement("div");

    toast.className = "live-toast";

    toast.innerHTML = `
        <strong>${notification.title}</strong>
        <p>${notification.message}</p>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}