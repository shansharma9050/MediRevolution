document.addEventListener("DOMContentLoaded", function () {
    loadCurrentSubscription();
});

async function loadCurrentSubscription() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/billing/subscriptions/current`, {
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
            document.getElementById("subscriptionBox").innerHTML = `
                <div class="mr-card text-center">
                    <h4>No Active Subscription</h4>
                    <p class="text-muted">Please choose a plan to continue using premium features.</p>
                    <a href="/subscription/plans" class="btn btn-medi">Choose Plan</a>
                </div>
            `;
            return;
        }

        renderSubscription(result);

    } catch (error) {
        console.error(error);
        showMsg("Billing service not reachable.");
    }
}

function renderSubscription(sub) {
    document.getElementById("subscriptionBox").innerHTML = `
        <div class="mr-card">
            <h4 class="fw-bold text-primary">${safe(sub.planName)}</h4>

            <div class="row mt-3">
                <div class="col-md-4">
                    <strong>Status:</strong>
                    <span class="badge bg-success">${safe(sub.status)}</span>
                </div>

                <div class="col-md-4">
                    <strong>Billing:</strong> ${safe(sub.billingCycle)}
                </div>

                <div class="col-md-4">
                    <strong>Valid Till:</strong> ${safe(sub.endDate)}
                </div>
            </div>

            <hr>

            <p>${sub.onlineConsultationEnabled ? "✅" : "❌"} Online Consultation</p>
            <p>${sub.reportsEnabled ? "✅" : "❌"} Reports</p>

            <button class="btn btn-outline-danger mt-3" onclick="cancelSubscription()">
                Cancel Subscription
            </button>
        </div>
    `;
}

async function cancelSubscription() {
    if (!confirm("Cancel your current subscription?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/billing/subscriptions/cancel`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) {
            showMsg("Unable to cancel subscription.");
            return;
        }

        showMsg("Subscription cancelled successfully.", "success");
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