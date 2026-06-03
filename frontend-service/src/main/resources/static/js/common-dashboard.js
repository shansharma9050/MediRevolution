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

