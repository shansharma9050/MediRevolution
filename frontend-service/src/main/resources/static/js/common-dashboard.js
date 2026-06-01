const API_BASE = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", function () {
    protectDashboardPage();
    setUserInfo();
    loadCommonNotificationCount();
});

function protectDashboardPage() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
    }
}

function requireRole(requiredRole) {
    const role = localStorage.getItem("role");

    if (role !== requiredRole) {
        alert("Access denied. Only " + requiredRole + " can access this page.");
        window.location.href = "/dashboard";
    }
}

function setUserInfo() {
    const email = localStorage.getItem("email") || "user@email.com";
    const userEmailElement = document.getElementById("userEmail");

    if (userEmailElement) {
        userEmailElement.innerText = email;
    }
}

async function loadCommonNotificationCount() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/notifications/my/unread-count`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (response.ok) {
            const count = await response.json();
            const countElement = document.getElementById("notificationCount");

            if (countElement) {
                countElement.innerText = count;
            }
        }
    } catch (error) {
        console.log("Notification count unavailable");
    }
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("show");
}

function logout() {
    localStorage.clear();
    window.location.href = "/";
}