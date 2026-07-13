document.addEventListener("DOMContentLoaded", function () {
    loadCurrentSubscription();
});

async function loadCurrentSubscription() {
    const token = localStorage.getItem("token");
    const subscriptionBox = document.getElementById("subscriptionBox");

    document.getElementById("msg").innerHTML = "";

    subscriptionBox.innerHTML = `
        <div class="mr-card text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="text-muted mt-3 mb-0">Loading current subscription...</p>
        </div>
    `;

    if (!token) {
        subscriptionBox.innerHTML = "";
        showMsg("Login token not found. Please login again.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/billing/subscriptions/current`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        let result = {};
        try {
            result = await response.json();
        } catch (e) {
            result = {};
        }

        if (!response.ok) {
            renderNoSubscription(result.message || "No active subscription found.");
            return;
        }

        if (!result || Object.keys(result).length === 0) {
            renderNoSubscription("No active subscription found.");
            return;
        }

        renderSubscription(result);

    } catch (error) {
        console.error(error);
        subscriptionBox.innerHTML = "";
        showMsg("Billing service not reachable.");
    }
}

function renderSubscription(sub) {
    const subscriptionBox = document.getElementById("subscriptionBox");

    const planName = safe(sub.planName || sub.plan?.planName);
    const planCode = safe(sub.planCode || sub.plan?.planCode);
    const status = safe(sub.status || sub.subscriptionStatus || "ACTIVE");
    const billingCycle = safe(sub.billingCycle || sub.plan?.billingCycle);
    const startDate = safe(sub.startDate);
    const endDate = safe(sub.endDate);
    const role = safe(sub.role || sub.plan?.role || localStorage.getItem("role"));

    const onlineConsultation =
        sub.onlineConsultationEnabled ??
        sub.videoConsultationAllowed ??
        sub.plan?.onlineConsultationEnabled ??
        sub.plan?.videoConsultationAllowed ??
        false;

    const reportsEnabled =
        sub.reportsEnabled ??
        sub.plan?.reportsEnabled ??
        false;

    const prioritySupport =
        sub.prioritySupportEnabled ??
        sub.plan?.prioritySupportEnabled ??
        false;

    subscriptionBox.innerHTML = `
        <div class="subscription-current-card">

            <div class="subscription-current-header">
                <div>
                    <span class="subscription-active-badge">Current Active Plan</span>
                    <h2>${planName}</h2>
                    <p>${planCode}</p>
                </div>

                <span class="subscription-status ${status === "ACTIVE" ? "active" : "inactive"}">
                    ${status}
                </span>
            </div>

            <div class="subscription-info-grid">

                <div class="subscription-info-item">
                    <span>Role</span>
                    <strong>${role}</strong>
                </div>

                <div class="subscription-info-item">
                    <span>Billing Cycle</span>
                    <strong>${billingCycle}</strong>
                </div>

                <div class="subscription-info-item">
                    <span>Start Date</span>
                    <strong>${startDate}</strong>
                </div>

                <div class="subscription-info-item">
                    <span>End Date</span>
                    <strong>${endDate}</strong>
                </div>

            </div>

            <div class="subscription-benefits mt-4">
                <h5>Plan Benefits</h5>

                <div class="benefit-list">
                    <div class="benefit-item">
                        <span>${onlineConsultation ? "✅" : "❌"}</span>
                        Online Consultation
                    </div>

                    <div class="benefit-item">
                        <span>${reportsEnabled ? "✅" : "❌"}</span>
                        Reports
                    </div>

                    <div class="benefit-item">
                        <span>${prioritySupport ? "✅" : "❌"}</span>
                        Priority Support
                    </div>
                </div>
            </div>

            <div class="subscription-action-row">
                <a href="/subscription/plans" class="btn btn-medi">
                    Upgrade / Change Plan
                </a>

                <button class="btn btn-outline-danger ms-2" onclick="cancelSubscription()">
                    Cancel Subscription
                </button>
            </div>

        </div>
    `;
}

function renderNoSubscription(message) {
    const subscriptionBox = document.getElementById("subscriptionBox");

    subscriptionBox.innerHTML = `
        <div class="subscription-empty-card">
            <div class="subscription-empty-icon">💳</div>

            <h3>No Active Subscription</h3>

            <p>${message || "Please choose a plan to continue using premium features."}</p>

            <a href="/subscription/plans" class="btn btn-medi">
                Choose Plan
            </a>
        </div>
    `;
}

async function cancelSubscription() {
    if (!confirm("Cancel your current subscription?")) {
        return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
        showMsg("Login token not found. Please login again.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/billing/subscriptions/cancel`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        let result = {};
        try {
            result = await response.json();
        } catch (e) {
            result = {};
        }

        if (!response.ok) {
            showMsg(result.message || "Unable to cancel subscription.");
            return;
        }

        showMsg(result.message || "Subscription cancelled successfully.", "success");
        loadCurrentSubscription();

    } catch (error) {
        console.error(error);
        showMsg("Billing service not reachable.");
    }
}

function showMsg(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}